const CompanyInterviewKnowledge = require('../../models/CompanyInterviewKnowledge');
const Interview = require('../../models/Interview');
const geminiClient = require('./geminiClient');

/**
 * CompanyKnowledgeAgent (Section 4)
 * Combines:
 * - Source 1: Internal PrepAgent stored company interview patterns & past interviews
 * - Source 2: Publicly available company + role interview pattern synthesis
 */
class CompanyKnowledgeAgent {
  async retrieveCompanyPatterns({ companyName, targetRole, roleAnalysis, requirements }) {
    const normalizedCompany = (companyName || 'General Tech').trim().toLowerCase();
    const normalizedRole = (targetRole || 'Software Engineer').trim().toLowerCase();

    // 1. Check Source 1: Internal PrepAgent Knowledge DB
    let existingRecord = await CompanyInterviewKnowledge.findOne({
      normalizedCompany,
      normalizedRole,
    }).lean();

    // Also inspect any completed internal interviews for this company + role
    const pastCompanyInterviews = await Interview.find({
      companyName: new RegExp(`^${(companyName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      status: 'COMPLETED',
    })
      .select('coveredTopics weaknesses evaluations interviewType')
      .limit(10)
      .lean();

    const internalWeaknessPatterns = [];
    const internalTestedTopics = [];
    for (const inv of pastCompanyInterviews) {
      if (Array.isArray(inv.coveredTopics)) {
        internalTestedTopics.push(...inv.coveredTopics);
      }
      if (Array.isArray(inv.weaknesses)) {
        internalWeaknessPatterns.push(...inv.weaknesses);
      }
    }

    if (existingRecord && existingRecord.commonTopics?.length > 0) {
      return {
        ...existingRecord,
        internalExperiencesCount: pastCompanyInterviews.length,
        internalTestedTopics: [...new Set(internalTestedTopics)].slice(0, 12),
        observedWeaknessPatterns: [...new Set([
          ...(existingRecord.observedWeaknessPatterns || []),
          ...internalWeaknessPatterns,
        ])].slice(0, 10),
      };
    }

    // 2. Source 2: Synthesize publicly known interview patterns for company + targetRole
    const systemInstruction = `You are the Company Interview Intelligence Agent for PrepAgent AI.
Your job is to extract authentic interview patterns, rounds, frequently tested skills, coding/technical themes, and HR/behavioral themes for a given Company and Target Role.
Do NOT output fixed scripts to blindly copy. Extract structured patterns that guide dynamic question generation.
Return strictly valid JSON.`;

    const userPrompt = `Extract interview patterns for:
Company: "${companyName}"
Target Role: "${targetRole}"
Role Context: ${JSON.stringify(roleAnalysis || {})}
Job Requirements: ${JSON.stringify(requirements || {})}
Internal Observed Topics: ${JSON.stringify([...new Set(internalTestedTopics)].slice(0, 8))}

Return JSON with this exact structure:
{
  "commonTopics": ["string"],
  "frequentlyTestedSkills": ["string"],
  "interviewRounds": [
    { "roundName": "string", "focus": "string", "typicalDifficulty": "EASY|MEDIUM|HARD" }
  ],
  "technicalAreas": ["string"],
  "hrThemes": ["string"],
  "codingPatterns": ["string"],
  "commonBehavioralThemes": ["string"],
  "difficultyProfile": "EASY|MEDIUM|HARD",
  "evaluationFocus": ["string"]
}`;

    const synthesized = await geminiClient.generateStructuredJSON({
      agentName: 'CompanyKnowledgeAgent',
      systemInstruction,
      userPrompt,
      temperature: 0.3,
      fallbackFn: () => this.buildDeterministicFallback({ companyName, targetRole, roleAnalysis, requirements }),
    });

    const knowledgePayload = {
      companyName: companyName || 'Target Company',
      normalizedCompany,
      targetRole: targetRole || 'Software Engineer',
      normalizedRole,
      commonTopics: Array.isArray(synthesized.commonTopics) && synthesized.commonTopics.length
        ? synthesized.commonTopics
        : ['Core Role Architecture', 'Project Deep Dive', 'Problem Solving & Edge Cases', 'System Design & Scalability'],
      frequentlyTestedSkills: Array.isArray(synthesized.frequentlyTestedSkills) && synthesized.frequentlyTestedSkills.length
        ? synthesized.frequentlyTestedSkills
        : (requirements?.mustHave || requirements?.technicalSkills || ['Problem Solving', 'API Design', 'Data Modeling']).slice(0, 8),
      interviewRounds: Array.isArray(synthesized.interviewRounds) && synthesized.interviewRounds.length
        ? synthesized.interviewRounds
        : [
            { roundName: 'Technical & Project Assessment', focus: 'Applied engineering & architecture', typicalDifficulty: 'MEDIUM' },
            { roundName: 'Problem Solving & Design', focus: 'Trade-offs, debugging & scalability', typicalDifficulty: 'HARD' },
            { roundName: 'Culture & Behavioral Alignment', focus: 'Ownership, conflict resolution & delivery', typicalDifficulty: 'MEDIUM' },
          ],
      technicalAreas: Array.isArray(synthesized.technicalAreas) && synthesized.technicalAreas.length
        ? synthesized.technicalAreas
        : (roleAnalysis?.technicalAreas || ['Backend Engineering', 'Database Optimization', 'Security & Authentication']),
      hrThemes: Array.isArray(synthesized.hrThemes) && synthesized.hrThemes.length
        ? synthesized.hrThemes
        : ['Ownership under tight deadlines', 'Cross-functional collaboration', 'Alignment with company mission', 'Handling ambiguous requirements'],
      codingPatterns: Array.isArray(synthesized.codingPatterns) && synthesized.codingPatterns.length
        ? synthesized.codingPatterns
        : ['API endpoint logic & error handling', 'Data transformation & query efficiency', 'Concurrency & state management'],
      commonBehavioralThemes: Array.isArray(synthesized.commonBehavioralThemes) && synthesized.commonBehavioralThemes.length
        ? synthesized.commonBehavioralThemes
        : ['Overcoming a critical technical blocker', 'Trade-off decision in a team project', 'Learning a technology rapidly'],
      difficultyProfile: ['EASY', 'MEDIUM', 'HARD'].includes(synthesized.difficultyProfile)
        ? synthesized.difficultyProfile
        : 'MEDIUM',
      evaluationFocus: Array.isArray(synthesized.evaluationFocus) && synthesized.evaluationFocus.length
        ? synthesized.evaluationFocus
        : ['Depth of real implementation knowledge', 'Structured reasoning', 'Clear communication'],
      internalExperiencesCount: pastCompanyInterviews.length,
      observedWeaknessPatterns: [...new Set(internalWeaknessPatterns)].slice(0, 10),
      lastUpdated: new Date(),
    };

    try {
      await CompanyInterviewKnowledge.findOneAndUpdate(
        { normalizedCompany, normalizedRole },
        { $set: knowledgePayload },
        { upsert: true, new: true }
      );
    } catch (_) {
      // Non-blocking cache persistence
    }

    return knowledgePayload;
  }

  buildDeterministicFallback({ companyName, targetRole, roleAnalysis, requirements }) {
    const reqSkills = [
      ...(requirements?.mustHave || []),
      ...(requirements?.technicalSkills || []),
      ...(roleAnalysis?.technicalAreas || []),
    ].filter(Boolean);

    return {
      commonTopics: reqSkills.length
        ? reqSkills.slice(0, 6)
        : [`${targetRole} Core Concepts`, 'Project Architecture & Trade-offs', 'Debugging & Performance Optimization', 'System Scalability'],
      frequentlyTestedSkills: reqSkills.length
        ? reqSkills.slice(0, 8)
        : ['Architecture Design', 'API Security', 'Database Indexing', 'State Management', 'Problem Solving'],
      interviewRounds: [
        { roundName: `${companyName} Technical Deep Dive`, focus: 'Resume projects and core stack mastery', typicalDifficulty: 'MEDIUM' },
        { roundName: `${companyName} Problem Solving`, focus: 'Real-world engineering scenarios & trade-offs', typicalDifficulty: 'HARD' },
        { roundName: `${companyName} Behavioral & Ownership`, focus: 'Team collaboration, leadership & impact', typicalDifficulty: 'MEDIUM' },
      ],
      technicalAreas: roleAnalysis?.technicalAreas?.length
        ? roleAnalysis.technicalAreas
        : ['System Architecture', 'Data Modeling', 'API Design', 'Performance & Security'],
      hrThemes: [
        `Why ${companyName} and alignment with ${targetRole}`,
        'Ownership of complex deliverables',
        'Constructive conflict resolution in teams',
        'Handling production bugs or tight deadlines',
      ],
      codingPatterns: [
        'Algorithmic logic & edge-case handling',
        'Query optimization & data structures',
        'Modular code design & debugging',
      ],
      commonBehavioralThemes: [
        'STAR method project challenge',
        'Cross-team communication',
        'Continuous learning & adaptability',
      ],
      difficultyProfile: 'MEDIUM',
      evaluationFocus: [
        'Practical depth over rote memorization',
        'Clarity of thought and communication',
        'End-to-end ownership of resume projects',
      ],
    };
  }
}

module.exports = new CompanyKnowledgeAgent();

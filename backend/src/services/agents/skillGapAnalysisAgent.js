const { GoogleGenerativeAI } = require('@google/generative-ai');
const PreparationSession = require('../../models/PreparationSession');

class SkillGapAnalysisAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Main entry point for Phase 5 Skill Gap Analysis Agent
   * @param {string} sessionId - MongoDB ObjectId of the PreparationSession
   * @param {string} userId - MongoDB ObjectId of the authenticated user
   * @param {object} options - Execution options (e.g. { force: true })
   */
  async executeAnalysis(sessionId, userId, options = {}) {
    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      throw new Error('Preparation session not found.');
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== userId.toString()) {
      const error = new Error('Access denied. You do not have permission to analyze this preparation session.');
      error.statusCode = 403;
      throw error;
    }

    // Caching check: return stored result if already completed and not forced
    if (session.skillGapAnalysis?.status === 'completed' && !options.force) {
      return {
        alreadyAnalyzed: true,
        skillGapAnalysis: session.skillGapAnalysis,
        progress: session.progress,
      };
    }

    // Transition state to processing
    session.skillGapAnalysis = {
      status: 'processing',
      analyzedAt: null,
      error: null,
      coverageScore: 0,
      strongSkills: [],
      partialSkills: [],
      needsPractice: [],
      missingSkills: [],
      transferableSkills: [],
      requirementAnalysis: [],
      preparationPriorities: [],
    };
    await session.save();

    const candidateProfile = session.candidateProfile || {};
    const roleAnalysis = session.roleAnalysis || {};
    const requirements = session.requirements || {};
    const displayRole = session.displayRole || session.targetRole || 'Target Role';
    const company = session.company || 'Target Company';
    const jobDescription = session.jobDescription || '';

    // Collect all job requirements to evaluate
    const allJobRequirements = this.extractAllRequirements(requirements, roleAnalysis);

    let analysisResult = null;

    // 1. Try Gemini AI Analysis with Schema Validation
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const prompt = this.buildPrompt(company, displayRole, candidateProfile, allJobRequirements, jobDescription, false);
        const result = await model.generateContent(prompt);
        let parsed = JSON.parse(result.response.text());

        if (!parsed.requirementAnalysis || !Array.isArray(parsed.requirementAnalysis) || parsed.requirementAnalysis.length === 0) {
          console.warn('[SkillGapAnalysisAgent] AI returned empty requirement analysis, retrying...');
          const retryPrompt = this.buildPrompt(company, displayRole, candidateProfile, allJobRequirements, jobDescription, true);
          const retryResult = await model.generateContent(retryPrompt);
          parsed = JSON.parse(retryResult.response.text());
        }

        analysisResult = this.normalizeAndCalculate(parsed, allJobRequirements, candidateProfile);
      } catch (aiErr) {
        console.warn('[SkillGapAnalysisAgent] Gemini API failed, switching to deterministic matcher:', aiErr.message);
      }
    }

    // 2. Deterministic Fallback if AI was unavailable or failed
    if (!analysisResult) {
      analysisResult = this.deterministicAnalysis(allJobRequirements, candidateProfile, requirements);
    }

    // 3. Save structured results into PreparationSession context
    session.skillGapAnalysis = {
      status: 'completed',
      analyzedAt: new Date(),
      error: null,
      coverageScore: analysisResult.coverageScore,
      strongSkills: analysisResult.strongSkills,
      partialSkills: analysisResult.partialSkills,
      needsPractice: analysisResult.needsPractice,
      missingSkills: analysisResult.missingSkills,
      transferableSkills: analysisResult.transferableSkills,
      requirementAnalysis: analysisResult.requirementAnalysis,
      preparationPriorities: analysisResult.preparationPriorities,
    };

    // Backward-compatible summary fields sync
    session.skillGap = {
      matchingSkills: Array.from(new Set([...analysisResult.strongSkills, ...analysisResult.partialSkills])),
      missingSkills: analysisResult.missingSkills,
      weakSkills: analysisResult.needsPractice,
    };

    session.currentStage = 'skill_gap';
    // Advance progress milestone cleanly (e.g. 60% without fake match scores)
    session.progress = Math.max(session.progress || 0, 60);

    await session.save();

    return {
      alreadyAnalyzed: false,
      skillGapAnalysis: session.skillGapAnalysis,
      progress: session.progress,
    };
  }

  /**
   * Extract unified list of requirements to evaluate
   */
  extractAllRequirements(requirements, roleAnalysis) {
    const list = [];
    const seen = new Set();

    const add = (req, category) => {
      if (!req || typeof req !== 'string') return;
      const clean = req.trim();
      if (clean.length > 1 && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        list.push({ requirement: clean, category });
      }
    };

    // Technical skills
    (requirements.technicalSkills || []).forEach((s) => add(s, 'Technical Skill'));
    (requirements.tools || []).forEach((t) => add(t, 'Testing / Dev Tool'));

    // Categorized technical details
    const tech = requirements.technicalDetails || {};
    (tech.programmingLanguages || []).forEach((l) => add(l, 'Programming Language'));
    (tech.testingTools || []).forEach((t) => add(t, 'Testing Tool'));
    (tech.databases || []).forEach((d) => add(d, 'Database'));
    (tech.cloudTechnologies || []).forEach((c) => add(c, 'Cloud / DevOps'));
    (tech.developmentTools || []).forEach((d) => add(d, 'Development Tool'));
    (tech.methodologies || []).forEach((m) => add(m, 'Methodology'));

    // Soft skills
    (requirements.softSkills || []).forEach((s) => add(s, 'Soft Skill'));
    (roleAnalysis.softSkills || []).forEach((s) => add(s, 'Soft Skill'));

    // If still very small, add key areas
    if (list.length < 8) {
      ['Java', 'SQL', 'Selenium', 'API Testing', 'Test Automation', 'Jenkins', 'Git', 'Postman'].forEach((item) =>
        add(item, 'Core Requirement')
      );
    }

    return list;
  }

  /**
   * Build Gemini prompt
   */
  buildPrompt(company, role, candidateProfile, requirementsList, jobDescription, isRetry = false) {
    return `You are PrepAgent AI's Skill Gap Analysis Agent.
Your responsibility is to analyze the candidate's actual profile evidence against the target job requirements.

STRICT RULES:
1. Examine the candidate's actual skills, projects, work experience, education, certifications, and achievements.
2. DO NOT hallucinate candidate experience that is not present.
3. Classify each requirement into exactly one status:
   - "strong": Candidate has direct, verified experience in skills, projects, work, or certifications.
   - "partial": Candidate has related, adjacent, or transferable experience (e.g. built REST APIs for API testing).
   - "needs_practice": Candidate has basic exposure, coursework mention, or elementary usage needing depth.
   - "missing": No evidence found in the resume.
4. For every requirement, provide honest, concise "candidateEvidence" explaining WHY it was classified that way.
5. Provide a confidence rating: "High", "Medium", or "Low".

Target Company: ${company}
Target Role: ${role}

CANDIDATE PROFILE EVIDENCE:
"""
Skills: ${JSON.stringify(candidateProfile.skills || {})}
Projects: ${JSON.stringify((candidateProfile.projects || []).map((p) => ({ name: p.name, tech: p.technologies, desc: p.description, resp: p.responsibilities })))}
Experience / Internships: ${JSON.stringify((candidateProfile.experience || []).map((e) => ({ company: e.company, role: e.role, tech: e.technologies, resp: e.responsibilities })))}
Education: ${JSON.stringify((candidateProfile.education || []).map((ed) => ({ degree: ed.degree, institution: ed.institution, field: ed.fieldOfStudy, score: ed.percentageOrCGPA })))}
Certifications: ${JSON.stringify((candidateProfile.certifications || []).map((c) => ({ name: c.name, issuer: c.issuer })))}
Achievements: ${JSON.stringify(candidateProfile.achievements || [])}
"""

JOB REQUIREMENTS TO EVALUATE:
${JSON.stringify(requirementsList)}

Return ONLY valid JSON matching this structure:
{
  "requirementAnalysis": [
    {
      "requirement": "Requirement name",
      "category": "Category name",
      "candidateEvidence": "Concise factual reason, e.g. 'Used in LeaveEase project' or 'No evidence found'",
      "status": "strong | partial | needs_practice | missing",
      "confidence": "High | Medium | Low",
      "importance": "High | Medium | Low"
    }
  ],
  "preparationPriorities": [
    {
      "rank": 1,
      "skill": "Skill name",
      "priority": "High | Medium | Low",
      "status": "Missing | Partial | Needs Practice",
      "reason": "Clear explanation of why this is a preparation focus"
    }
  ]
}`;
  }

  /**
   * Normalize AI response and mathematically calculate coverage score
   */
  normalizeAndCalculate(parsed, allJobRequirements, candidateProfile) {
    const rawAnalysis = Array.isArray(parsed.requirementAnalysis) ? parsed.requirementAnalysis : [];

    const requirementAnalysis = [];
    const seenReqs = new Set();

    for (const item of rawAnalysis) {
      if (!item.requirement) continue;
      const clean = item.requirement.trim();
      if (seenReqs.has(clean.toLowerCase())) continue;
      seenReqs.add(clean.toLowerCase());

      const validStatuses = ['strong', 'partial', 'needs_practice', 'missing'];
      let status = (item.status || '').toLowerCase().replace(/\s+/g, '_');
      if (!validStatuses.includes(status)) status = 'missing';

      let confidence = item.confidence || 'High';
      if (!['High', 'Medium', 'Low'].includes(confidence)) confidence = 'High';

      requirementAnalysis.push({
        requirement: clean,
        category: item.category || 'Technical',
        candidateEvidence: item.candidateEvidence || (status === 'missing' ? 'No evidence found in resume' : 'Evidence found in profile'),
        status,
        confidence,
        importance: item.importance || 'Normal',
        details: item.details || '',
      });
    }

    // Ensure all target requirements are evaluated
    for (const reqObj of allJobRequirements) {
      if (!seenReqs.has(reqObj.requirement.toLowerCase())) {
        seenReqs.add(reqObj.requirement.toLowerCase());
        requirementAnalysis.push({
          requirement: reqObj.requirement,
          category: reqObj.category || 'General',
          candidateEvidence: 'No evidence found in resume',
          status: 'missing',
          confidence: 'High',
          importance: 'Normal',
          details: '',
        });
      }
    }

    // Categorize skill arrays
    const strongSkills = requirementAnalysis.filter((r) => r.status === 'strong').map((r) => r.requirement);
    const partialSkills = requirementAnalysis.filter((r) => r.status === 'partial').map((r) => r.requirement);
    const needsPractice = requirementAnalysis.filter((r) => r.status === 'needs_practice').map((r) => r.requirement);
    const missingSkills = requirementAnalysis.filter((r) => r.status === 'missing').map((r) => r.requirement);
    const transferableSkills = partialSkills;

    // Mathematical coverage score calculation (DO NOT ALLOW GEMINI TO INVENT)
    const total = requirementAnalysis.length || 1;
    const score = Math.round(((strongSkills.length * 1.0 + partialSkills.length * 0.6 + needsPractice.length * 0.3) / total) * 100);
    const coverageScore = Math.min(100, Math.max(0, score));

    // Priorities
    let preparationPriorities = [];
    if (Array.isArray(parsed.preparationPriorities) && parsed.preparationPriorities.length > 0) {
      preparationPriorities = parsed.preparationPriorities.map((p, idx) => ({
        rank: idx + 1,
        skill: p.skill || missingSkills[idx] || 'Skill',
        priority: p.priority || (idx < 2 ? 'High' : 'Medium'),
        status: p.status || 'Missing',
        reason: p.reason || 'Gap identified against target role requirements',
      }));
    } else {
      preparationPriorities = this.buildPreparationPriorities(missingSkills, needsPractice, partialSkills);
    }

    return {
      coverageScore,
      strongSkills,
      partialSkills,
      needsPractice,
      missingSkills,
      transferableSkills,
      requirementAnalysis,
      preparationPriorities,
    };
  }

  /**
   * Deterministic NLP rule-based matcher (Used as 100% reliable fallback)
   */
  deterministicAnalysis(allJobRequirements, candidateProfile, requirements) {
    // Collect all candidate tokens and evidence
    const candidateTextCorpus = this.buildCandidateCorpus(candidateProfile);

    const requirementAnalysis = [];

    for (const reqObj of allJobRequirements) {
      const req = reqObj.requirement;
      const evaluation = this.evaluateCandidateEvidence(req, candidateProfile, candidateTextCorpus);

      requirementAnalysis.push({
        requirement: req,
        category: reqObj.category || 'Technical',
        candidateEvidence: evaluation.evidence,
        status: evaluation.status,
        confidence: evaluation.confidence,
        importance: evaluation.importance,
        details: evaluation.details || '',
      });
    }

    const strongSkills = requirementAnalysis.filter((r) => r.status === 'strong').map((r) => r.requirement);
    const partialSkills = requirementAnalysis.filter((r) => r.status === 'partial').map((r) => r.requirement);
    const needsPractice = requirementAnalysis.filter((r) => r.status === 'needs_practice').map((r) => r.requirement);
    const missingSkills = requirementAnalysis.filter((r) => r.status === 'missing').map((r) => r.requirement);
    const transferableSkills = partialSkills;

    // Mathematical coverage score calculation
    const total = requirementAnalysis.length || 1;
    const score = Math.round(((strongSkills.length * 1.0 + partialSkills.length * 0.6 + needsPractice.length * 0.3) / total) * 100);
    const coverageScore = Math.min(100, Math.max(0, score));

    const preparationPriorities = this.buildPreparationPriorities(missingSkills, needsPractice, partialSkills);

    return {
      coverageScore,
      strongSkills,
      partialSkills,
      needsPractice,
      missingSkills,
      transferableSkills,
      requirementAnalysis,
      preparationPriorities,
    };
  }

  /**
   * Build text corpus from candidate profile for fast multi-section evidence scanning
   */
  buildCandidateCorpus(candidateProfile) {
    const pieces = [];

    // Skills
    const skills = candidateProfile.skills || {};
    Object.values(skills).forEach((arr) => {
      if (Array.isArray(arr)) pieces.push(...arr);
    });

    // Projects
    (candidateProfile.projects || []).forEach((p) => {
      if (p.name) pieces.push(`Project: ${p.name}`);
      if (Array.isArray(p.technologies)) pieces.push(...p.technologies);
      if (p.description) pieces.push(p.description);
      if (Array.isArray(p.responsibilities)) pieces.push(...p.responsibilities);
    });

    // Experience
    (candidateProfile.experience || []).forEach((e) => {
      if (e.company) pieces.push(`Company: ${e.company}`);
      if (e.role) pieces.push(`Role: ${e.role}`);
      if (Array.isArray(e.technologies)) pieces.push(...e.technologies);
      if (Array.isArray(e.responsibilities)) pieces.push(...e.responsibilities);
    });

    // Education & Certifications
    (candidateProfile.education || []).forEach((ed) => {
      if (ed.degree) pieces.push(ed.degree);
      if (ed.fieldOfStudy) pieces.push(ed.fieldOfStudy);
    });
    (candidateProfile.certifications || []).forEach((c) => {
      if (c.name) pieces.push(`Certification: ${c.name}`);
      if (c.issuer) pieces.push(c.issuer);
    });

    // Achievements & Keywords
    if (Array.isArray(candidateProfile.achievements)) pieces.push(...candidateProfile.achievements);
    if (Array.isArray(candidateProfile.extractedKeywords)) pieces.push(...candidateProfile.extractedKeywords);

    return pieces.join(' | ');
  }

  /**
   * Evaluate specific requirement against candidate profile evidence
   */
  evaluateCandidateEvidence(req, candidateProfile, corpus) {
    const r = req.toLowerCase().trim();

    // Check project usage
    const matchedProject = (candidateProfile.projects || []).find((p) => {
      const pTech = (p.technologies || []).map((t) => t.toLowerCase());
      const pDesc = (p.description || '').toLowerCase();
      return pTech.some((t) => t.includes(r) || r.includes(t)) || pDesc.includes(r);
    });

    // Check experience
    const matchedExperience = (candidateProfile.experience || []).find((e) => {
      const eTech = (e.technologies || []).map((t) => t.toLowerCase());
      const eResp = (e.responsibilities || []).join(' ').toLowerCase();
      return eTech.some((t) => t.includes(r) || r.includes(t)) || eResp.includes(r);
    });

    // Check explicit skills
    const candidateSkills = [];
    const skillsObj = candidateProfile.skills || {};
    Object.values(skillsObj).forEach((arr) => {
      if (Array.isArray(arr)) candidateSkills.push(...arr.map((s) => s.toLowerCase()));
    });
    const hasDirectSkill = candidateSkills.some((s) => s === r || s.includes(r) || r.includes(s));

    // Check certifications
    const matchedCert = (candidateProfile.certifications || []).find((c) =>
      (c.name || '').toLowerCase().includes(r)
    );

    // 1. Direct Strong Evidence
    if (matchedExperience) {
      return {
        status: 'strong',
        confidence: 'High',
        evidence: `Direct experience in ${matchedExperience.company || 'work role'} (${matchedExperience.role || 'Position'})`,
        importance: 'High',
      };
    }

    if (matchedProject && hasDirectSkill) {
      return {
        status: 'strong',
        confidence: 'High',
        evidence: `Used in ${matchedProject.name || 'projects'} and listed in core skills`,
        importance: 'High',
      };
    }

    if (matchedCert) {
      return {
        status: 'strong',
        confidence: 'High',
        evidence: `Certified credential: ${matchedCert.name}`,
        importance: 'Medium',
      };
    }

    if (matchedProject) {
      return {
        status: 'strong',
        confidence: 'High',
        evidence: `Applied in project: ${matchedProject.name}`,
        importance: 'High',
      };
    }

    if (hasDirectSkill) {
      return {
        status: 'strong',
        confidence: 'Medium',
        evidence: 'Listed in technical skills repository',
        importance: 'Medium',
      };
    }

    // 2. Transferable / Partial Evidence
    if (r.includes('api') || r.includes('rest')) {
      if (corpus.toLowerCase().includes('rest') || corpus.toLowerCase().includes('node') || corpus.toLowerCase().includes('express')) {
        return {
          status: 'partial',
          confidence: 'Medium',
          evidence: 'Worked with REST APIs and web backend services (Node.js/Express)',
          importance: 'High',
        };
      }
    }

    if (r.includes('automation') || r.includes('test automation')) {
      if (corpus.toLowerCase().includes('javascript') || corpus.toLowerCase().includes('python') || corpus.toLowerCase().includes('java')) {
        return {
          status: 'needs_practice',
          confidence: 'Medium',
          evidence: 'Programming foundation available; automation framework practice required',
          importance: 'High',
        };
      }
    }

    if (r.includes('testing') || r.includes('qa')) {
      if (corpus.toLowerCase().includes('test') || corpus.toLowerCase().includes('quality')) {
        return {
          status: 'partial',
          confidence: 'Medium',
          evidence: 'Basic software testing exposure in academic or personal projects',
          importance: 'Medium',
        };
      }
    }

    // Check soft skills in corpus
    if (['problem solving', 'communication', 'team collaboration', 'attention to detail', 'analytical thinking'].includes(r)) {
      return {
        status: 'strong',
        confidence: 'High',
        evidence: 'Demonstrated through team projects and academic coursework',
        importance: 'Medium',
      };
    }

    // 3. Missing Evidence
    return {
      status: 'missing',
      confidence: 'High',
      evidence: 'No evidence found in resume',
      importance: this.determineImportance(req),
    };
  }

  /**
   * Determine priority importance of requirement
   */
  determineImportance(req) {
    const r = req.toLowerCase();
    if (r.includes('selenium') || r.includes('automation') || r.includes('sql') || r.includes('java') || r.includes('python')) {
      return 'High';
    }
    if (r.includes('postman') || r.includes('jira') || r.includes('jenkins') || r.includes('git') || r.includes('api')) {
      return 'Medium';
    }
    return 'Low';
  }

  /**
   * Build ranked preparation priorities
   */
  buildPreparationPriorities(missingSkills, needsPractice, partialSkills) {
    const priorities = [];

    // Missing skills take top priority
    missingSkills.slice(0, 3).forEach((skill) => {
      priorities.push({
        rank: priorities.length + 1,
        skill,
        priority: 'High',
        status: 'Missing',
        reason: 'Missing from resume; core requirement for target role',
      });
    });

    // Needs practice / partial skills follow
    needsPractice.slice(0, 2).forEach((skill) => {
      priorities.push({
        rank: priorities.length + 1,
        skill,
        priority: 'Medium',
        status: 'Needs Practice',
        reason: 'Basic exposure identified; needs hands-on depth and test practice',
      });
    });

    partialSkills.slice(0, 2).forEach((skill) => {
      if (priorities.length < 5) {
        priorities.push({
          rank: priorities.length + 1,
          skill,
          priority: 'Medium',
          status: 'Partial',
          reason: 'Related experience found; align terminology with JD specifications',
        });
      }
    });

    // Fallback if empty
    if (!priorities.length) {
      priorities.push(
        { rank: 1, skill: 'Selenium', priority: 'High', status: 'Missing', reason: 'Missing from resume' },
        { rank: 2, skill: 'API Testing', priority: 'Medium', status: 'Partial', reason: 'Related experience found, improve depth' },
        { rank: 3, skill: 'Test Automation', priority: 'Medium', status: 'Needs Practice', reason: 'Basic exposure, need more practice' }
      );
    }

    return priorities;
  }
}

module.exports = new SkillGapAnalysisAgent();

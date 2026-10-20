const { GoogleGenerativeAI } = require('@google/generative-ai');
const PreparationSession = require('../../models/PreparationSession');

/**
 * Job Preparation Plan Agent (Phase 6)
 * Generates structured, deterministic, role-specific preparation roadmaps,
 * technical tables, project prep guides, interactive checklists, and schedules.
 */
class JobPreparationPlanAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Main entry point to generate or retrieve the Job Preparation Plan
   */
  async generatePlan(sessionId, userId, options = {}) {
    const session = await PreparationSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const error = new Error('Preparation session not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Check if already completed and force regeneration is not requested
    if (
      !options.force &&
      session.jobPreparationPlan?.status === 'completed' &&
      session.jobPreparationPlan?.roadmap?.length > 0
    ) {
      return {
        alreadyGenerated: true,
        jobPreparationPlan: session.jobPreparationPlan,
      };
    }

    // Mark as generating
    session.jobPreparationPlan = session.jobPreparationPlan || {};
    session.jobPreparationPlan.status = 'generating';
    await session.save();

    const startedAt = new Date();
    const displayRole =
      session.targetRole === 'Other / Custom Role' && session.customRole
        ? session.customRole
        : session.targetRole || 'Software Engineer';
    const company = session.company || 'Target Company';
    const candidateProfile = session.candidateProfile || {};
    const requirements = session.requirements || {};
    const skillGap = session.skillGapAnalysis || {};
    const roleAnalysis = session.roleAnalysis || {};

    let generatedPlan = null;

    // 1. Attempt Gemini AI Generation if API key is present
    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const prompt = this.buildPrompt(company, displayRole, candidateProfile, requirements, skillGap, roleAnalysis);
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());
        if (parsed && Array.isArray(parsed.roadmap) && parsed.roadmap.length > 0) {
          generatedPlan = parsed;
        }
      } catch (aiErr) {
        console.warn('[JobPreparationPlanAgent] Gemini generation failed, falling back to deterministic generation:', aiErr.message);
      }
    }

    // 2. Deterministic Fallback if AI was unavailable or produced invalid output
    if (!generatedPlan || !generatedPlan.roadmap || generatedPlan.roadmap.length === 0) {
      generatedPlan = this.deterministicPlan(company, displayRole, candidateProfile, requirements, skillGap, roleAnalysis);
    }

    // 3. Calculate dynamic baseline readiness score
    const strongSkills = skillGap.strongSkills || [];
    const transferableSkills = skillGap.transferableSkills || [];
    const needsPractice = skillGap.needsPractice || [];
    const missingSkills = skillGap.missingSkills || [];
    const coverageScore = skillGap.coverageScore ?? 58;

    // Baseline between 50 and 70 based on actual skill coverage
    let baselineScore = Math.round(
      coverageScore * 0.6 +
      (strongSkills.length >= 3 ? 12 : strongSkills.length * 4) +
      (transferableSkills.length >= 2 ? 6 : 2)
    );
    baselineScore = Math.min(75, Math.max(45, baselineScore));

    // Ensure skillGapSummary is accurately synced
    generatedPlan.skillGapSummary = {
      strongCount: strongSkills.length,
      transferableCount: transferableSkills.length,
      needsPracticeCount: needsPractice.length,
      missingCount: missingSkills.length,
    };

    generatedPlan.initialReadinessScore = baselineScore;
    generatedPlan.readinessScore = baselineScore;
    generatedPlan.status = 'completed';
    generatedPlan.generatedAt = new Date();

    // Preserve any existing completed checkboxes if this was an update/regeneration
    const existing = session.jobPreparationPlan;
    if (existing && options.preserveChecklists) {
      if (Array.isArray(existing.resumePreparation)) {
        const completedMap = new Map(existing.resumePreparation.map((item) => [item.id, item.completed]));
        generatedPlan.resumePreparation.forEach((item) => {
          if (completedMap.has(item.id)) item.completed = completedMap.get(item.id);
        });
      }
      if (Array.isArray(existing.readinessChecklist)) {
        const completedMap = new Map(existing.readinessChecklist.map((item) => [item.id, item.completed]));
        generatedPlan.readinessChecklist.forEach((item) => {
          if (completedMap.has(item.id)) item.completed = completedMap.get(item.id);
        });
      }
      if (Array.isArray(existing.schedule)) {
        const completedScheduleMap = new Set();
        existing.schedule.forEach((w) => {
          w.days?.forEach((d) => {
            if (d.completed) completedScheduleMap.add(`${w.weekNumber}-${d.day}`);
          });
        });
        generatedPlan.schedule.forEach((w) => {
          w.days?.forEach((d) => {
            if (completedScheduleMap.has(`${w.weekNumber}-${d.day}`)) d.completed = true;
          });
        });
      }
    }

    // Persist to session
    session.jobPreparationPlan = generatedPlan;
    session.currentStage = 'job_preparation_plan';
    session.lastAgent = 'Job Preparation Plan Agent';

    // Track in agent history
    session.agentHistory = session.agentHistory || [];
    session.agentHistory.push({
      agent: 'Job Preparation Plan Agent',
      status: 'completed',
      startedAt,
      completedAt: new Date(),
      metadata: {
        stagesCount: generatedPlan.stagesCount || 6,
        topicsCount: generatedPlan.topicsCount || 28,
        estimatedWeeks: generatedPlan.estimatedWeeks || 6,
        readinessScore: generatedPlan.readinessScore,
      },
    });

    await session.save();

    return {
      success: true,
      jobPreparationPlan: session.jobPreparationPlan,
    };
  }

  /**
   * Deterministic Plan Generation based on actual profile, requirements, and skill gaps
   */
  deterministicPlan(company, role, candidateProfile, requirements, skillGap, roleAnalysis) {
    const strongSkills = skillGap.strongSkills || [];
    const transferableSkills = skillGap.transferableSkills || [];
    const needsPractice = skillGap.needsPractice || [];
    const missingSkills = skillGap.missingSkills || [];
    const candidateProjects = candidateProfile.projects || [];
    const candidateLangs = candidateProfile.skills?.languages || candidateProfile.skills?.programmingLanguages || [];
    const candidateTech = candidateProfile.skills?.technical || [];
    const reqSkills = requirements.technicalSkills || [];

    // 1. Top 5 Preparation Priorities
    const priorities = [];
    const topGaps = [...missingSkills, ...needsPractice];
    
    // Pick the most critical gaps or requirements
    const primaryPriorityTopics = topGaps.length > 0 ? topGaps.slice(0, 5) : reqSkills.slice(0, 5);
    
    primaryPriorityTopics.forEach((topic, idx) => {
      let reason = `Core requirement for ${role} roles at ${company}.`;
      if (missingSkills.includes(topic)) {
        reason = `Identified as a critical skill gap for ${company} technical interviews.`;
      } else if (needsPractice.includes(topic)) {
        reason = `Strengthen practical depth and advanced optimization patterns.`;
      }
      priorities.push({
        rank: idx + 1,
        topic,
        reason,
        priority: idx < 2 ? 'High' : idx < 4 ? 'Medium' : 'Low',
      });
    });

    // Pad priorities if less than 5
    const fallbackTopics = [
      { topic: `${role} System Architecture & Scalability`, reason: `Fundamental for architectural round at ${company}.`, priority: 'High' },
      { topic: 'Data Structures, Concurrency & Algorithms', reason: 'Coding and problem-solving benchmarks.', priority: 'Medium' },
      { topic: 'CI/CD, Testing & Production Observability', reason: 'High-standard deployment and verification best practices.', priority: 'Medium' },
      { topic: 'Performance Profiling & Optimization', reason: 'Efficiency requirements in enterprise systems.', priority: 'High' },
      { topic: 'Cross-functional Communication & STAR Stories', reason: 'Behavioral and leadership evaluation criteria.', priority: 'Low' },
    ];

    while (priorities.length < 5) {
      const fb = fallbackTopics[priorities.length];
      priorities.push({
        rank: priorities.length + 1,
        topic: fb.topic,
        reason: fb.reason,
        priority: fb.priority,
      });
    }

    // 2. Preparation Roadmap (6 Connected Stages)
    const roadmap = [
      {
        stageNumber: 1,
        title: 'Core Fundamentals & Architecture',
        topicsCount: 4,
        estimatedDuration: 'Week 1',
        description: `Review fundamental concepts in ${candidateLangs[0] || 'Core Stack'} and establish target role alignment with ${company}.`,
      },
      {
        stageNumber: 2,
        title: 'Deep Dive into Critical Skill Gaps',
        topicsCount: 5,
        estimatedDuration: 'Week 2',
        description: `Focus intensive study on ${topGaps.slice(0, 3).join(', ') || 'essential job requirements'}.`,
      },
      {
        stageNumber: 3,
        title: 'System Design & Role Specialization',
        topicsCount: 5,
        estimatedDuration: 'Week 3',
        description: `Design distributed patterns, reliability principles, and ${company} domain-specific scale scenarios.`,
      },
      {
        stageNumber: 4,
        title: 'Behavioral & Project STAR Narratives',
        topicsCount: 4,
        estimatedDuration: 'Week 4',
        description: `Structure real project achievements and behavioral leadership answers using the STAR method.`,
      },
      {
        stageNumber: 5,
        title: 'Hands-on Coding & Problem Drills',
        topicsCount: 6,
        estimatedDuration: 'Week 5',
        description: 'Timed algorithm challenges, debugging drills, and real-world system debugging exercises.',
      },
      {
        stageNumber: 6,
        title: 'Readiness Assessment & Mock Interviews',
        topicsCount: 4,
        estimatedDuration: 'Week 6',
        description: 'Simulate high-pressure technical interviews and validate readiness with the AI Job Readiness Twin.',
      },
    ];

    // 3. Technical Preparation Table (6-8 topics)
    const technicalPreparation = [];
    const allEvalSkills = [
      ...missingSkills.map((s) => ({ topic: s, cat: 'Gap Focus', prio: 'High', cur: 'Beginner', tgt: 'Advanced', time: '1-2 weeks' })),
      ...needsPractice.map((s) => ({ topic: s, cat: 'Core Stack', prio: 'Medium', cur: 'Intermediate', tgt: 'Expert', time: '1 week' })),
      ...strongSkills.map((s) => ({ topic: s, cat: 'Strength', prio: 'Low', cur: 'Advanced', tgt: 'Expert', time: '3 days' })),
    ];

    if (allEvalSkills.length === 0) {
      allEvalSkills.push(
        { topic: 'Core Language Internals', cat: 'Programming', prio: 'High', cur: 'Intermediate', tgt: 'Advanced', time: '1 week' },
        { topic: 'Distributed Architecture', cat: 'System Design', prio: 'High', cur: 'Intermediate', tgt: 'Advanced', time: '1.5 weeks' },
        { topic: 'Database Indexing & Queries', cat: 'Storage', prio: 'Medium', cur: 'Intermediate', tgt: 'Advanced', time: '4 days' },
        { topic: 'Containerization & Cloud Deployments', cat: 'DevOps', prio: 'Medium', cur: 'Beginner', tgt: 'Intermediate', time: '1 week' },
        { topic: 'Unit & Integration Testing Strategy', cat: 'Quality', prio: 'Medium', cur: 'Intermediate', tgt: 'Advanced', time: '3 days' }
      );
    }

    allEvalSkills.slice(0, 7).forEach((item) => {
      technicalPreparation.push({
        topic: item.topic,
        category: item.cat,
        priority: item.prio,
        currentLevel: item.cur,
        targetLevel: item.tgt,
        estimatedTime: item.time,
        completed: false,
      });
    });

    // 4. Project Preparation (2-3 Projects with talking points)
    const projectPreparation = [];
    if (candidateProjects.length > 0) {
      candidateProjects.slice(0, 2).forEach((proj, idx) => {
        const pName = proj.name || `Project ${idx + 1}`;
        const techStack = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : 'Relevant stack';
        projectPreparation.push({
          projectName: pName,
          projectRelevance: `Directly demonstrates competency in ${techStack} for ${company}.`,
          priority: idx === 0 ? 'High' : 'Medium',
          preparationPoints: [
            `Explain the high-level architecture, tech stack (${techStack}), and primary user problem solved.`,
            `Deep dive into critical trade-offs made during development and performance bottlenecks overcome.`,
            `Quantify concrete business or technical impact (e.g. latency reduction, throughput, user adoption).`,
          ],
        });
      });
      if (projectPreparation.length < 2) {
        projectPreparation.push({
          projectName: `${role} Production Showcase`,
          projectRelevance: `End-to-end full life-cycle implementation demonstrating core ${company} job requirements.`,
          priority: 'Medium',
          preparationPoints: [
            'Articulate design choices, clean modularity, and error-handling resilience.',
            'Explain testing strategy including unit, integration, and performance benchmarking.',
            'Discuss production deployment, telemetry, CI/CD pipeline, and reliability safeguards.',
          ],
        });
      }
    } else {
      projectPreparation.push(
        {
          projectName: `${role} Production Showcase`,
          projectRelevance: `End-to-end full life-cycle implementation demonstrating core ${company} job requirements.`,
          priority: 'High',
          preparationPoints: [
            'Articulate design choices, clean modularity, and error-handling resilience.',
            'Explain testing strategy including unit, integration, and performance benchmarking.',
            'Discuss production deployment, telemetry, CI/CD pipeline, and reliability safeguards.',
          ],
        },
        {
          projectName: 'High-Throughput Data Pipeline',
          projectRelevance: 'Demonstrates distributed systems, concurrency, and async processing expertise.',
          priority: 'Medium',
          preparationPoints: [
            'Detail the data ingestion architecture, schema evolution, and storage trade-offs.',
            'Explain how failover, backpressure, and data consistency were managed under peak load.',
            'Highlight automated monitoring, alerting, and SLA maintenance mechanisms.',
          ],
        }
      );
    }

    // 5. Resume Preparation Checklist (4 Interactive items)
    const resumePreparation = [
      {
        id: 'rp-1',
        text: `Align summary and technical keywords with ${company}'s ${role} requirements.`,
        completed: false,
      },
      {
        id: 'rp-2',
        text: 'Quantify impact metrics across experience bullet points (latency, cost, throughput, uptime).',
        completed: false,
      },
      {
        id: 'rp-3',
        text: `Prominently showcase verified skills (${strongSkills.slice(0, 3).join(', ') || 'core competencies'}) at the top.`,
        completed: false,
      },
      {
        id: 'rp-4',
        text: 'Review ATS compatibility score and verify formatting consistency using the tailored editor.',
        completed: false,
      },
    ];

    // 6. Behavioral Preparation Areas (4 Areas)
    const behavioralPreparation = [
      {
        topic: 'Leadership & Conflict Resolution',
        priority: 'High',
        icon: 'users',
      },
      {
        topic: 'Technical Decision Making & Trade-offs',
        priority: 'High',
        icon: 'git-branch',
      },
      {
        topic: 'Handling Failure & Production Incidents',
        priority: 'Medium',
        icon: 'shield-alert',
      },
      {
        topic: 'Cross-functional Collaboration & Influence',
        priority: 'Medium',
        icon: 'message-square',
      },
    ];

    // 7. Preparation Schedule (6 Weeks, 7 Days each)
    const schedule = this.generateSixWeekSchedule(company, role, topGaps, candidateLangs);

    // 8. Readiness Checklist (6 Milestones)
    const readinessChecklist = [
      {
        id: 'rc-1',
        text: `Master critical technical skill gaps identified for ${role}.`,
        completed: false,
      },
      {
        id: 'rc-2',
        text: `Prepare 3 detailed STAR stories for primary projects (${candidateProjects[0]?.name || 'key projects'}).`,
        completed: false,
      },
      {
        id: 'rc-3',
        text: `Complete system architecture and scalability drills tailored to ${company}.`,
        completed: false,
      },
      {
        id: 'rc-4',
        text: 'Review tailored resume and confirm ATS score meets the 80%+ benchmark.',
        completed: false,
      },
      {
        id: 'rc-5',
        text: `Practice behavioral scenarios aligning with ${company} engineering culture.`,
        completed: false,
      },
      {
        id: 'rc-6',
        text: 'Execute AI Job Readiness Twin assessment and achieve target readiness score.',
        completed: false,
      },
    ];

    return {
      headline: 'You are on the right track!',
      explanation: `Based on your skill gap analysis and target role, this plan focuses on the most important areas to help you crack the interview for ${role} at ${company}.`,
      stagesCount: roadmap.length,
      topicsCount: 28,
      estimatedWeeks: 6,
      priorities,
      roadmap,
      technicalPreparation,
      skillGapSummary: {
        strongCount: strongSkills.length,
        transferableCount: transferableSkills.length,
        needsPracticeCount: needsPractice.length,
        missingCount: missingSkills.length,
      },
      projectPreparation,
      resumePreparation,
      behavioralPreparation,
      schedule,
      readinessChecklist,
    };
  }

  /**
   * Generates a 6-week daily schedule (42 tasks) tailored to role and gaps
   */
  generateSixWeekSchedule(company, role, topGaps, candidateLangs) {
    const primaryGap = topGaps[0] || 'System Architecture';
    const secondaryGap = topGaps[1] || 'Concurrency & Performance';
    const lang = candidateLangs[0] || 'Core Language';

    return [
      {
        weekNumber: 1,
        title: 'Week 1: Core Fundamentals & Requirements Review',
        days: [
          { day: 'Day 1', task: `Review ${role} job specifications and breakdown ${company} expectations.`, completed: false },
          { day: 'Day 2', task: `Audit deep-dive into ${lang} fundamentals, memory model, and concurrency.`, completed: false },
          { day: 'Day 3', task: 'Solve 3 medium data structure problems focusing on trees and graphs.', completed: false },
          { day: 'Day 4', task: `Begin targeted study into primary gap: ${primaryGap}.`, completed: false },
          { day: 'Day 5', task: 'Implement a hands-on proof of concept demonstrating core language design patterns.', completed: false },
          { day: 'Day 6', task: 'Review tailored resume and identify missing impact metrics on experience bullets.', completed: false },
          { day: 'Day 7', task: 'Weekly recap: self-quiz on core fundamentals and assess week 1 milestones.', completed: false },
        ],
      },
      {
        weekNumber: 2,
        title: 'Week 2: Deep Dive into Critical Skill Gaps',
        days: [
          { day: 'Day 1', task: `Intensive study of ${primaryGap} fundamentals and standard enterprise architectures.`, completed: false },
          { day: 'Day 2', task: `Complete practical exercises and code snippets for ${primaryGap}.`, completed: false },
          { day: 'Day 3', task: `Transition focus to secondary gap: ${secondaryGap} core principles.`, completed: false },
          { day: 'Day 4', task: 'Build a small prototype combining both primary and secondary gap technologies.', completed: false },
          { day: 'Day 5', task: 'Study common production failure modes and error mitigation techniques.', completed: false },
          { day: 'Day 6', task: 'Write unit and integration tests covering the weekly prototype implementation.', completed: false },
          { day: 'Day 7', task: 'Mark mastered skill gaps in technical checklist and document key takeaways.', completed: false },
        ],
      },
      {
        weekNumber: 3,
        title: 'Week 3: System Design & Scalability for Target Domain',
        days: [
          { day: 'Day 1', task: `Study system design primitives: Load balancers, caching strategies, and CDN caches.`, completed: false },
          { day: 'Day 2', task: 'Analyze database partitioning, sharding, replication, and CAP theorem trade-offs.', completed: false },
          { day: 'Day 3', task: `Draft end-to-end architecture diagram for an enterprise service relevant to ${company}.`, completed: false },
          { day: 'Day 4', task: 'Deep dive into asynchronous messaging: message queues, event streams, and backpressure.', completed: false },
          { day: 'Day 5', task: 'Calculate back-of-the-envelope capacity estimations (QPS, storage, network bandwidth).', completed: false },
          { day: 'Day 6', task: 'Conduct a self-timed 45-minute architectural whiteboard walk-through.', completed: false },
          { day: 'Day 7', task: 'Review architecture trade-offs and evaluate against industry case studies.', completed: false },
        ],
      },
      {
        weekNumber: 4,
        title: 'Week 4: Behavioral Preparation & STAR Narratives',
        days: [
          { day: 'Day 1', task: `Research ${company}'s cultural values, leadership principles, and mission.`, completed: false },
          { day: 'Day 2', task: 'Structure 2 STAR stories for project leadership and technical ownership.', completed: false },
          { day: 'Day 3', task: 'Draft STAR narrative for handling severe production outages or technical disagreements.', completed: false },
          { day: 'Day 4', task: 'Refine project talking points focusing on quantified business metrics and architecture.', completed: false },
          { day: 'Day 5', task: 'Practice answering "Tell me about a time you made a wrong architectural decision".', completed: false },
          { day: 'Day 6', task: 'Record a mock video or audio answer for behavioral questions to check pacing and clarity.', completed: false },
          { day: 'Day 7', task: 'Finalize STAR answer cheat-sheet and review with peer or mentor.', completed: false },
        ],
      },
      {
        weekNumber: 5,
        title: 'Week 5: Hands-on Coding & Timed Problem Drills',
        days: [
          { day: 'Day 1', task: 'Timed coding challenge: 2 medium algorithmic problems in 45 minutes.', completed: false },
          { day: 'Day 2', task: 'Practice code refactoring, defensive programming, and clean modular style.', completed: false },
          { day: 'Day 3', task: 'Concurrency and multithreading exercises with race condition debugging.', completed: false },
          { day: 'Day 4', task: 'Live API design and REST/gRPC contract implementation under time constraints.', completed: false },
          { day: 'Day 5', task: 'Comprehensive debugging drill: find and resolve 3 complex memory or logic bugs.', completed: false },
          { day: 'Day 6', task: 'Simulate a 60-minute technical phone screen with complex edge case handling.', completed: false },
          { day: 'Day 7', task: 'Review code solutions, optimize time/space complexities, and document patterns.', completed: false },
        ],
      },
      {
        weekNumber: 6,
        title: 'Week 6: Final Review & Readiness Twin Verification',
        days: [
          { day: 'Day 1', task: `Comprehensive review of all high-priority technical topics for ${company}.`, completed: false },
          { day: 'Day 2', task: 'Run full AI Job Readiness Twin simulation to identify any remaining weak spots.', completed: false },
          { day: 'Day 3', task: 'Address final flagged areas from readiness twin evaluation report.', completed: false },
          { day: 'Day 4', task: 'Final polish of resume, project portfolios, and GitHub repository links.', completed: false },
          { day: 'Day 5', task: 'Simulate full virtual interview day: 1 behavioral + 1 architecture + 1 coding round.', completed: false },
          { day: 'Day 6', task: 'Review questions to ask interviewers at the end of each session.', completed: false },
          { day: 'Day 7', task: 'Rest, recharge, and finalize logistics for upcoming interviews with confidence!', completed: false },
        ],
      },
    ];
  }

  /**
   * Toggle or update interactive checklist items and deterministically update readiness score
   */
  async updateProgress(sessionId, userId, updateData) {
    const session = await PreparationSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const error = new Error('Preparation session not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    if (!session.jobPreparationPlan || session.jobPreparationPlan.status !== 'completed') {
      const error = new Error('Job Preparation Plan has not been generated yet.');
      error.statusCode = 400;
      throw error;
    }

    const plan = session.jobPreparationPlan;
    const { type, itemId, weekNumber, day, completed, topic } = updateData;

    if (type === 'schedule' && weekNumber && day) {
      const week = plan.schedule?.find((w) => w.weekNumber === Number(weekNumber));
      if (week && Array.isArray(week.days)) {
        const dayItem = week.days.find((d) => d.day === day);
        if (dayItem) {
          dayItem.completed = Boolean(completed);
        }
      }
    } else if (type === 'resume' && itemId) {
      const item = plan.resumePreparation?.find((r) => r.id === itemId);
      if (item) {
        item.completed = Boolean(completed);
      }
    } else if (type === 'readiness' && itemId) {
      const item = plan.readinessChecklist?.find((r) => r.id === itemId);
      if (item) {
        item.completed = Boolean(completed);
      }
    } else if (type === 'technical' && topic) {
      const item = plan.technicalPreparation?.find((t) => t.topic === topic);
      if (item) {
        item.completed = Boolean(completed);
      }
    }

    // Programmatically recalculate readinessScore
    // 1. Calculate completion ratio across all interactive items
    let totalItems = 0;
    let completedItems = 0;

    // Schedule: 42 days
    plan.schedule?.forEach((w) => {
      w.days?.forEach((d) => {
        totalItems++;
        if (d.completed) completedItems++;
      });
    });

    // Resume checklist: 4 items
    plan.resumePreparation?.forEach((r) => {
      totalItems++;
      if (r.completed) completedItems++;
    });

    // Readiness checklist: 6 items
    plan.readinessChecklist?.forEach((r) => {
      totalItems++;
      if (r.completed) completedItems++;
    });

    // Technical table: ~7 items
    plan.technicalPreparation?.forEach((t) => {
      totalItems++;
      if (t.completed) completedItems++;
    });

    const completionRatio = totalItems > 0 ? completedItems / totalItems : 0;

    // Base score from initial readiness score
    const baseScore = plan.initialReadinessScore || 58;

    // New score = baseScore + (remaining potential up to 100 * completionRatio)
    const potentialBonus = 100 - baseScore;
    const newScore = Math.min(100, Math.round(baseScore + potentialBonus * completionRatio));

    plan.readinessScore = newScore;

    // Update headline based on score
    if (newScore >= 90) {
      plan.headline = 'Outstanding! You are fully interview-ready.';
    } else if (newScore >= 75) {
      plan.headline = 'Great progress! Your readiness is accelerating.';
    } else if (newScore >= 60) {
      plan.headline = 'You are on the right track!';
    } else {
      plan.headline = 'Building foundational readiness.';
    }

    session.markModified('jobPreparationPlan');
    await session.save();

    return {
      success: true,
      jobPreparationPlan: session.jobPreparationPlan,
      completedItems,
      totalItems,
      readinessScore: newScore,
    };
  }

  /**
   * Build structured prompt for Gemini
   */
  buildPrompt(company, role, candidateProfile, requirements, skillGap, roleAnalysis) {
    return `You are an expert AI Career Preparation Coach.
Generate a comprehensive, structured Job Preparation Plan for the following candidate target:
Company: ${company}
Target Role: ${role}
Candidate Name: ${candidateProfile.personalInfo?.name || 'Candidate'}
Candidate Known Skills: ${(candidateProfile.skills?.technical || []).concat(candidateProfile.skills?.languages || []).join(', ') || 'General Software Engineering'}
Required Technical Skills: ${(requirements.technicalSkills || []).join(', ') || 'Industry standard skills'}
Missing Skills: ${(skillGap.missingSkills || []).join(', ') || 'None specifically flagged'}
Skills Needing Practice: ${(skillGap.needsPractice || []).join(', ') || 'None specifically flagged'}
Strong Verified Skills: ${(skillGap.strongSkills || []).join(', ') || 'Core CS fundamentals'}

Return a valid JSON object matching EXACTLY this structure with realistic, in-depth content tailored directly to ${company} and ${role}:
{
  "headline": "You are on the right track!",
  "explanation": "Detailed 2-sentence explanation of why this plan was tailored for ${role} at ${company}.",
  "stagesCount": 6,
  "topicsCount": 28,
  "estimatedWeeks": 6,
  "priorities": [
    { "rank": 1, "topic": "Name of topic", "reason": "Why it is critical for ${company}", "priority": "High" },
    { "rank": 2, "topic": "Name of topic", "reason": "Why it is critical for ${company}", "priority": "High" },
    { "rank": 3, "topic": "Name of topic", "reason": "Why it is critical for ${company}", "priority": "Medium" },
    { "rank": 4, "topic": "Name of topic", "reason": "Why it is critical for ${company}", "priority": "Medium" },
    { "rank": 5, "topic": "Name of topic", "reason": "Why it is critical for ${company}", "priority": "Low" }
  ],
  "roadmap": [
    { "stageNumber": 1, "title": "Core Fundamentals & Architecture", "topicsCount": 4, "estimatedDuration": "Week 1", "description": "Short description" },
    { "stageNumber": 2, "title": "Deep Dive into Critical Skill Gaps", "topicsCount": 5, "estimatedDuration": "Week 2", "description": "Short description" },
    { "stageNumber": 3, "title": "System Design & Role Specialization", "topicsCount": 5, "estimatedDuration": "Week 3", "description": "Short description" },
    { "stageNumber": 4, "title": "Behavioral & Project STAR Narratives", "topicsCount": 4, "estimatedDuration": "Week 4", "description": "Short description" },
    { "stageNumber": 5, "title": "Hands-on Coding & Problem Drills", "topicsCount": 6, "estimatedDuration": "Week 5", "description": "Short description" },
    { "stageNumber": 6, "title": "Readiness Assessment & Mock Interviews", "topicsCount": 4, "estimatedDuration": "Week 6", "description": "Short description" }
  ],
  "technicalPreparation": [
    { "topic": "Topic Name", "category": "Category", "priority": "High", "currentLevel": "Beginner", "targetLevel": "Advanced", "estimatedTime": "1-2 weeks", "completed": false }
  ],
  "projectPreparation": [
    { "projectName": "Project Title", "projectRelevance": "Relevance description", "priority": "High", "preparationPoints": ["Point 1", "Point 2", "Point 3"] }
  ],
  "resumePreparation": [
    { "id": "rp-1", "text": "Action item 1", "completed": false },
    { "id": "rp-2", "text": "Action item 2", "completed": false },
    { "id": "rp-3", "text": "Action item 3", "completed": false },
    { "id": "rp-4", "text": "Action item 4", "completed": false }
  ],
  "behavioralPreparation": [
    { "topic": "Leadership & Conflict Resolution", "priority": "High", "icon": "users" },
    { "topic": "Technical Decision Making & Trade-offs", "priority": "High", "icon": "git-branch" },
    { "topic": "Handling Failure & Production Incidents", "priority": "Medium", "icon": "shield-alert" },
    { "topic": "Cross-functional Collaboration & Influence", "priority": "Medium", "icon": "message-square" }
  ],
  "schedule": [
    {
      "weekNumber": 1,
      "title": "Week 1 Title",
      "days": [
        { "day": "Day 1", "task": "Task description", "completed": false },
        { "day": "Day 2", "task": "Task description", "completed": false },
        { "day": "Day 3", "task": "Task description", "completed": false },
        { "day": "Day 4", "task": "Task description", "completed": false },
        { "day": "Day 5", "task": "Task description", "completed": false },
        { "day": "Day 6", "task": "Task description", "completed": false },
        { "day": "Day 7", "task": "Task description", "completed": false }
      ]
    }
  ],
  "readinessChecklist": [
    { "id": "rc-1", "text": "Milestone 1", "completed": false },
    { "id": "rc-2", "text": "Milestone 2", "completed": false },
    { "id": "rc-3", "text": "Milestone 3", "completed": false },
    { "id": "rc-4", "text": "Milestone 4", "completed": false },
    { "id": "rc-5", "text": "Milestone 5", "completed": false },
    { "id": "rc-6", "text": "Milestone 6", "completed": false }
  ]
}`;
  }
}

module.exports = new JobPreparationPlanAgent();

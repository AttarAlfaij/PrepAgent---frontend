/**
 * Shared Preparation Context
 * Encapsulates the unified multi-agent context derived from PreparationSession.
 * Enforces dynamic status evaluation, progress calculation, and clean state representation.
 */
class PreparationContext {
  /**
   * Derive unified agent lifecycle statuses from current session state
   */
  static getAgentStatuses(session) {
    // 1. Resume Analysis status
    let resumeStatus = 'pending';
    if (!session.resumeId && !session.resumeSnapshot?.path) {
      resumeStatus = 'blocked';
    } else if (session.resumeAnalysis?.status === 'completed') {
      resumeStatus = 'completed';
    } else if (session.resumeAnalysis?.status === 'processing') {
      resumeStatus = 'running';
    } else if (session.resumeAnalysis?.status === 'failed') {
      resumeStatus = 'failed';
    } else if (session.resumeAnalysis?.status === 'stale') {
      resumeStatus = 'stale';
    }

    // 2. Company & Role Analysis status
    let companyStatus = 'pending';
    const hasCompanyInputs = Boolean(
      session.company &&
      session.targetRole &&
      session.jobDescription &&
      session.jobDescription.trim().length >= 20
    );
    if (!hasCompanyInputs) {
      companyStatus = 'blocked';
    } else if (session.companyRoleAnalysis?.status === 'completed') {
      companyStatus = 'completed';
    } else if (session.companyRoleAnalysis?.status === 'processing') {
      companyStatus = 'running';
    } else if (session.companyRoleAnalysis?.status === 'failed') {
      companyStatus = 'failed';
    } else if (session.companyRoleAnalysis?.status === 'stale') {
      companyStatus = 'stale';
    }

    // 3. Skill Gap Analysis status
    let skillGapStatus = 'pending';
    if (session.skillGapAnalysis?.status === 'stale') {
      skillGapStatus = 'stale';
    } else if (session.skillGapAnalysis?.status === 'failed') {
      skillGapStatus = 'failed';
    } else if (session.skillGapAnalysis?.status === 'processing') {
      skillGapStatus = 'running';
    } else if (session.skillGapAnalysis?.status === 'completed') {
      skillGapStatus = 'completed';
    } else if (resumeStatus !== 'completed' || companyStatus !== 'completed') {
      skillGapStatus = 'blocked';
    }

    // 4. Resume Tailoring status
    let tailoringStatus = 'pending';
    if (session.tailoredResume?.status === 'stale') {
      tailoringStatus = 'stale';
    } else if (session.tailoredResume?.status === 'failed') {
      tailoringStatus = 'failed';
    } else if (session.tailoredResume?.status === 'generating') {
      tailoringStatus = 'running';
    } else if (
      session.tailoredResume?.status === 'generated' ||
      session.tailoredResume?.status === 'edited'
    ) {
      tailoringStatus = 'completed';
    } else if (skillGapStatus !== 'completed') {
      tailoringStatus = 'blocked';
    }

    // 5. Job Preparation Plan status (Phase 6)
    let planStatus = 'pending';
    if (session.jobPreparationPlan?.status === 'stale') {
      planStatus = 'stale';
    } else if (session.jobPreparationPlan?.status === 'failed') {
      planStatus = 'failed';
    } else if (session.jobPreparationPlan?.status === 'generating') {
      planStatus = 'running';
    } else if (session.jobPreparationPlan?.status === 'completed') {
      planStatus = 'completed';
    } else if (skillGapStatus !== 'completed') {
      planStatus = 'blocked';
    }

    // 6. Job Readiness Twin status (Phase 7)
    let twinStatus = 'pending';
    if (session.jobReadinessTwin?.status === 'stale') {
      twinStatus = 'stale';
    } else if (session.jobReadinessTwin?.status === 'failed') {
      twinStatus = 'failed';
    } else if (session.jobReadinessTwin?.status === 'generating') {
      twinStatus = 'running';
    } else if (session.jobReadinessTwin?.status === 'completed') {
      twinStatus = 'completed';
    } else if (skillGapStatus !== 'completed') {
      twinStatus = 'blocked';
    }

    // 7. Future Agents (Phase 8+)
    const allAnalysisCompleted =
      resumeStatus === 'completed' &&
      companyStatus === 'completed' &&
      skillGapStatus === 'completed' &&
      tailoringStatus === 'completed' &&
      planStatus === 'completed' &&
      twinStatus === 'completed';

    const interviewPlanning = session.interviewPlan
      ? 'completed'
      : allAnalysisCompleted
      ? 'pending'
      : 'blocked';

    let mockInterviewStatus = 'pending';
    if (session.mockInterviewSession?.status === 'completed' || session.interviewHistory?.length > 0) {
      mockInterviewStatus = 'completed';
    } else if (
      session.mockInterviewSession?.status === 'active' ||
      session.mockInterviewSession?.status === 'analyzing'
    ) {
      mockInterviewStatus = 'running';
    } else if (session.mockInterviewSession?.status === 'failed') {
      mockInterviewStatus = 'failed';
    } else if (twinStatus !== 'completed') {
      mockInterviewStatus = 'blocked';
    }

    const evaluation = session.evaluationResults
      ? 'completed'
      : 'blocked';

    return {
      resumeAnalysis: resumeStatus,
      companyRoleAnalysis: companyStatus,
      skillGap: skillGapStatus,
      resumeTailoring: tailoringStatus,
      jobPreparationPlan: planStatus,
      jobReadinessTwin: twinStatus,
      interviewPlanning,
      mockInterview: mockInterviewStatus,
      evaluation,
    };
  }

  /**
   * Programmatic Progress Calculation based on verified completed stages
   * Does NOT hardcode progress.
   */
  static calculateProgress(statuses) {
    let progress = 10; // Setup baseline (resume uploaded, company & JD provided)

    if (statuses.resumeAnalysis === 'completed') {
      progress += 15; // 25%
    }
    if (statuses.companyRoleAnalysis === 'completed') {
      progress += 15; // 40%
    }
    if (statuses.skillGap === 'completed') {
      progress += 20; // 60%
    }
    if (statuses.resumeTailoring === 'completed') {
      progress += 15; // 75%
    }
    if (statuses.jobPreparationPlan === 'completed') {
      progress += 15; // 90%
    }
    if (statuses.jobReadinessTwin === 'completed') {
      progress += 10; // 100% of preliminary analysis, preparation plan & readiness twin
    }

    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Build complete conceptual Preparation Context
   */
  static buildContext(session) {
    const statuses = this.getAgentStatuses(session);
    const progress = this.calculateProgress(statuses);

    const displayRole =
      session.targetRole === 'Other / Custom Role' && session.customRole
        ? session.customRole
        : session.targetRole || 'Software Engineer';

    return {
      preparationId: session._id,
      userId: session.userId,
      session: { id: session._id, userId: session.userId },

      // Target context
      company: session.company,
      targetRole: session.targetRole,
      customRole: session.customRole || '',
      displayRole,
      jobDescription: session.jobDescription,
      experienceLevel: session.experienceLevel,

      // Resume details
      resume: {
        resumeId: session.resumeId,
        status: session.resumeId ? 'attached' : 'missing',
        snapshot: session.resumeSnapshot || null,
      },

      // Agent-specific context partitions
      candidateProfile: {
        status: statuses.resumeAnalysis,
        atsScore: session.resumeAnalysis?.atsScore ?? null,
        data: session.candidateProfile || null,
      },

      companyRoleAnalysis: {
        status: statuses.companyRoleAnalysis,
        company: session.companyAnalysis || null,
        role: session.roleAnalysis || null,
      },

      jobRequirements: {
        status: statuses.companyRoleAnalysis,
        requirements: session.requirements || null,
        map: session.jobRequirementMap || null,
      },

      skillGapAnalysis: {
        status: statuses.skillGap,
        coverageScore: session.skillGapAnalysis?.coverageScore ?? 0,
        strongSkills: session.skillGapAnalysis?.strongSkills || [],
        partialSkills: session.skillGapAnalysis?.partialSkills || [],
        needsPractice: session.skillGapAnalysis?.needsPractice || [],
        missingSkills: session.skillGapAnalysis?.missingSkills || [],
        transferableSkills: session.skillGapAnalysis?.transferableSkills || [],
        requirementAnalysis: session.skillGapAnalysis?.requirementAnalysis || [],
      },

      preparationPriorities: session.skillGapAnalysis?.preparationPriorities || [],

      tailoredResume: {
        status: statuses.resumeTailoring,
        currentVersion: session.tailoredResume?.currentVersion || 1,
        content: session.tailoredResume?.content || null,
      },

      // Phase 6 — Job Preparation Plan partition
      jobPreparationPlan: {
        status: statuses.jobPreparationPlan,
        generatedAt: session.jobPreparationPlan?.generatedAt || null,
        readinessScore: session.jobPreparationPlan?.readinessScore ?? 0,
        headline: session.jobPreparationPlan?.headline || 'You are on the right track!',
        explanation: session.jobPreparationPlan?.explanation || '',
        stagesCount: session.jobPreparationPlan?.stagesCount || 6,
        topicsCount: session.jobPreparationPlan?.topicsCount || 28,
        estimatedWeeks: session.jobPreparationPlan?.estimatedWeeks || 6,
        priorities: session.jobPreparationPlan?.priorities || [],
        roadmap: session.jobPreparationPlan?.roadmap || [],
        technicalPreparation: session.jobPreparationPlan?.technicalPreparation || [],
        skillGapSummary: session.jobPreparationPlan?.skillGapSummary || {
          strongCount: 0,
          transferableCount: 0,
          needsPracticeCount: 0,
          missingCount: 0,
        },
        projectPreparation: session.jobPreparationPlan?.projectPreparation || [],
        resumePreparation: session.jobPreparationPlan?.resumePreparation || [],
        behavioralPreparation: session.jobPreparationPlan?.behavioralPreparation || [],
        schedule: session.jobPreparationPlan?.schedule || [],
        readinessChecklist: session.jobPreparationPlan?.readinessChecklist || [],
      },

      // Phase 7 — AI Job Readiness Twin partition
      jobReadinessTwin: {
        status: statuses.jobReadinessTwin,
        overallScore: session.jobReadinessTwin?.overallScore ?? 0,
        readinessStatus: session.jobReadinessTwin?.readinessStatus ?? 'Not Started',
        previousScore: session.jobReadinessTwin?.previousScore ?? null,
        scoreDelta: session.jobReadinessTwin?.scoreDelta ?? 0,
        headlineInsight: session.jobReadinessTwin?.headlineInsight ?? '',
        dimensions: session.jobReadinessTwin?.dimensions ?? null,
        topStrengths: session.jobReadinessTwin?.topStrengths ?? [],
        topRisks: session.jobReadinessTwin?.topRisks ?? [],
        nextBestAction: session.jobReadinessTwin?.nextBestAction ?? null,
        skillWiseReadiness: session.jobReadinessTwin?.skillWiseReadiness ?? [],
        nextSteps: session.jobReadinessTwin?.nextSteps ?? [],
        insights: session.jobReadinessTwin?.insights ?? [],
        proTip: session.jobReadinessTwin?.proTip ?? '',
        readinessHistory: session.jobReadinessTwin?.readinessHistory ?? [],
        calculatedAt: session.jobReadinessTwin?.calculatedAt ?? null,
      },

      userResume: {
        status: session.userResume?.status || 'original',
        currentVersion: session.userResume?.currentVersion || 1,
        lastSavedAt: session.userResume?.lastSavedAt || null,
      },

      // Future stages partition
      interviewPlan: {
        status: statuses.interviewPlanning,
        data: session.interviewPlan || null,
      },

      mockInterview: {
        status: statuses.mockInterview,
        session: session.mockInterviewSession || null,
        history: session.interviewHistory || [],
      },

      evaluations: session.evaluationResults ? [session.evaluationResults] : [],
      mistakes: session.mistakes || { weakTopics: [], strongTopics: [] },

      // Orchestration metadata
      progress,
      currentStage: session.currentStage,
      nextAction: session.nextAction,
      lastAgent: session.lastAgent || null,
      agentHistory: session.agentHistory || [],
      agentStatuses: statuses,
    };
  }
}

module.exports = PreparationContext;

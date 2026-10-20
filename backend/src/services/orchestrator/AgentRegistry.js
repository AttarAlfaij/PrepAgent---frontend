const resumeAnalysisAgent = require('../agents/resumeAnalysisAgent');
const companyRoleAnalysisAgent = require('../agents/companyRoleAnalysisAgent');
const skillGapAnalysisAgent = require('../agents/skillGapAnalysisAgent');
const resumeTailoringAgent = require('../agents/resumeTailoringAgent');
const jobPreparationPlanAgent = require('../agents/jobPreparationPlanAgent');
const jobReadinessTwinAgent = require('../agents/jobReadinessTwinAgent');
const mockInterviewAgent = require('../agents/mockInterviewAgent');

/**
 * Central Agent Registry
 * Manages registration, prerequisites, execution dispatch, and output validation
 * across all existing and future PrepAgent AI agents.
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.registerCoreAgents();
  }

  registerCoreAgents() {
    // 1. Phase 3: Resume Analysis Agent
    this.register('resume_analysis', {
      id: 'resume_analysis',
      name: 'Resume Analysis Agent',
      stage: 'resume_analysis',
      nextActionName: 'RUN_RESUME_ANALYSIS',
      retryActionName: 'RETRY_RESUME_ANALYSIS',
      requires: ['resume'],
      produces: ['candidateProfile', 'resumeUnderstandingMap', 'atsScore'],

      checkPrerequisites: (session) => {
        if (!session.resumeId && !session.resumeSnapshot?.path) {
          return {
            satisfied: false,
            reason: 'Resume file is required before running resume analysis.',
            missing: ['resume'],
            waitingForUser: true,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await resumeAnalysisAgent.executeAnalysis(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const profile = output?.candidateProfile || session?.candidateProfile;
        if (!profile || typeof profile !== 'object') {
          return { valid: false, error: 'Candidate profile output was empty or invalid.' };
        }
        const hasIdentity = Boolean(profile.personalInfo?.name || profile.personalInfo?.email);
        const hasSections = Boolean(
          (profile.skills?.programmingLanguages?.length || 0) +
          (profile.skills?.frameworks?.length || 0) +
          (profile.education?.length || 0) +
          (profile.projects?.length || 0) +
          (profile.experience?.length || 0)
        );
        if (!hasIdentity && !hasSections) {
          return { valid: false, error: 'Resume extraction yielded no recognizable candidate information.' };
        }
        return { valid: true };
      },
    });

    // 2. Phase 4: Company & Role Analysis Agent
    this.register('company_role_analysis', {
      id: 'company_role_analysis',
      name: 'Company & Role Analysis Agent',
      stage: 'company_role_analysis',
      nextActionName: 'RUN_COMPANY_ROLE_ANALYSIS',
      retryActionName: 'RETRY_COMPANY_ROLE_ANALYSIS',
      requires: ['company', 'targetRole', 'jobDescription'],
      produces: ['companyAnalysis', 'roleAnalysis', 'requirements', 'jobRequirementMap'],

      checkPrerequisites: (session) => {
        const missing = [];
        if (!session.company || !session.company.trim()) missing.push('company');
        if (!session.targetRole || !session.targetRole.trim()) missing.push('targetRole');
        if (!session.jobDescription || session.jobDescription.trim().length < 20) missing.push('jobDescription');

        if (missing.length > 0) {
          return {
            satisfied: false,
            reason: `Target company, role, and a detailed Job Description are required (${missing.join(', ')} missing).`,
            missing,
            waitingForUser: true,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await companyRoleAnalysisAgent.executeAnalysis(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const role = output?.roleAnalysis || session?.roleAnalysis;
        const reqs = output?.requirements || session?.requirements;
        if (!role || !reqs) {
          return { valid: false, error: 'Company & Role analysis yielded empty requirements or role definition.' };
        }
        const hasReqs = Boolean(
          (reqs.technicalSkills?.length || 0) +
          (reqs.primaryResponsibilities?.length || 0) +
          (role.primaryResponsibilities?.length || 0) +
          (reqs.mustHave?.length || 0)
        );
        if (!hasReqs) {
          return { valid: false, error: 'No actionable job requirements or responsibilities were extracted.' };
        }
        return { valid: true };
      },
    });

    // 3. Phase 5: Skill Gap Analysis Agent
    this.register('skill_gap', {
      id: 'skill_gap',
      name: 'Skill Gap Analysis Agent',
      stage: 'skill_gap_analysis',
      nextActionName: 'RUN_SKILL_GAP_ANALYSIS',
      retryActionName: 'RETRY_SKILL_GAP_ANALYSIS',
      requires: ['candidateProfile', 'requirements'],
      produces: ['skillGapAnalysis', 'preparationPriorities', 'coverageScore'],

      checkPrerequisites: (session) => {
        const missing = [];
        const isProfileReady = session.resumeAnalysis?.status === 'completed' && session.candidateProfile;
        const isRoleReady = session.companyRoleAnalysis?.status === 'completed' && session.requirements;

        if (!isProfileReady) missing.push('candidateProfile (Phase 3 Resume Analysis)');
        if (!isRoleReady) missing.push('jobRequirements (Phase 4 Company & Role Analysis)');

        if (missing.length > 0) {
          return {
            satisfied: false,
            reason: `Skill gap analysis requires completed prerequisites: ${missing.join(' and ')}.`,
            missing,
            waitingForUser: false,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await skillGapAnalysisAgent.executeAnalysis(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const matrix = output?.skillGapAnalysis?.requirementAnalysis || session?.skillGapAnalysis?.requirementAnalysis;
        if (!Array.isArray(matrix) || matrix.length === 0) {
          return { valid: false, error: 'Skill gap evaluation produced an empty requirement analysis matrix.' };
        }
        return { valid: true };
      },
    });

    // 4. Phase 5: AI Resume Tailoring Agent
    this.register('resume_tailoring', {
      id: 'resume_tailoring',
      name: 'Resume Tailoring Agent',
      stage: 'resume_tailoring',
      nextActionName: 'RUN_RESUME_TAILORING',
      retryActionName: 'RETRY_RESUME_TAILORING',
      requires: ['candidateProfile', 'requirements', 'skillGapAnalysis'],
      produces: ['tailoredResume'],

      checkPrerequisites: (session) => {
        const missing = [];
        const isProfileReady = session.candidateProfile?.personalInfo?.name || session.userResume?.content?.personalInfo?.name;
        const isRoleReady = session.requirements && session.companyRoleAnalysis?.status === 'completed';
        const isGapReady = session.skillGapAnalysis?.status === 'completed';

        if (!isProfileReady) missing.push('candidateProfile');
        if (!isRoleReady) missing.push('requirements');
        if (!isGapReady) missing.push('skillGapAnalysis');

        if (missing.length > 0) {
          return {
            satisfied: false,
            reason: `Resume tailoring requires completed analysis: ${missing.join(', ')}.`,
            missing,
            waitingForUser: false,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await resumeTailoringAgent.generateTailoredResume(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const content = output?.tailoredResume?.content || session?.tailoredResume?.content;
        if (!content || !content.personalInfo?.name) {
          return { valid: false, error: 'Tailored resume generation returned empty or incomplete resume content.' };
        }
        return { valid: true };
      },
    });

    // 5. Phase 6: Job Preparation Plan Agent
    this.register('job_preparation_plan', {
      id: 'job_preparation_plan',
      name: 'Job Preparation Plan Agent',
      stage: 'job_preparation_plan',
      nextActionName: 'RUN_JOB_PREPARATION_PLAN',
      retryActionName: 'RETRY_JOB_PREPARATION_PLAN',
      requires: ['candidateProfile', 'requirements', 'skillGapAnalysis'],
      produces: ['jobPreparationPlan'],

      checkPrerequisites: (session) => {
        const missing = [];
        const isProfileReady = Boolean(session.candidateProfile && session.resumeAnalysis?.status === 'completed');
        const isRoleReady = Boolean(session.requirements && session.companyRoleAnalysis?.status === 'completed');
        const isGapReady = Boolean(
          session.skillGapAnalysis?.requirementAnalysis?.length > 0 ||
          session.skillGapAnalysis?.status === 'completed'
        );

        if (!isProfileReady) missing.push('Candidate Profile (Phase 3)');
        if (!isRoleReady) missing.push('Job Requirements (Phase 4)');
        if (!isGapReady) missing.push('Skill Gap Analysis (Phase 5)');

        if (missing.length > 0) {
          return {
            satisfied: false,
            reason: `Job Preparation Plan requires completed prerequisites: ${missing.join(', ')}.`,
            missing,
            waitingForUser: false,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await jobPreparationPlanAgent.generatePlan(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const plan = output?.jobPreparationPlan || session?.jobPreparationPlan || output;
        if (!plan || !Array.isArray(plan.roadmap) || plan.roadmap.length === 0) {
          return { valid: false, error: 'Job Preparation Plan generation produced invalid or missing roadmap stages.' };
        }
        if (!Array.isArray(plan.priorities) || plan.priorities.length === 0) {
          return { valid: false, error: 'Job Preparation Plan missing top preparation priorities.' };
        }
        return { valid: true };
      },
    });

    // 6. Phase 7: AI Job Readiness Twin Agent
    this.register('job_readiness_twin', {
      id: 'job_readiness_twin',
      name: 'AI Job Readiness Twin Agent',
      stage: 'job_readiness_twin',
      nextActionName: 'RUN_JOB_READINESS_TWIN',
      retryActionName: 'RETRY_JOB_READINESS_TWIN',
      requires: ['candidateProfile', 'requirements', 'skillGapAnalysis'],
      produces: ['jobReadinessTwin', 'overallScore', 'topRisks', 'nextBestAction'],

      checkPrerequisites: (session) => {
        const missing = [];
        const isProfileReady = Boolean(session.candidateProfile && session.resumeAnalysis?.status === 'completed');
        const isRoleReady = Boolean(session.requirements && session.companyRoleAnalysis?.status === 'completed');
        const isGapReady = Boolean(session.skillGapAnalysis?.requirementAnalysis?.length > 0 || session.skillGapAnalysis?.status === 'completed');

        if (!isProfileReady) missing.push('Candidate Profile (Phase 3)');
        if (!isRoleReady) missing.push('Job Requirements (Phase 4)');
        if (!isGapReady) missing.push('Skill Gap Analysis (Phase 5)');

        if (missing.length > 0) {
          return {
            satisfied: false,
            reason: `Job Readiness Twin requires completed prerequisites: ${missing.join(', ')}.`,
            missing,
            waitingForUser: false,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await jobReadinessTwinAgent.calculateReadinessTwin(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const twin = output?.jobReadinessTwin || session?.jobReadinessTwin || output;
        if (!twin || typeof twin.overallScore !== 'number') {
          return { valid: false, error: 'Job Readiness Twin generation produced invalid or missing scores.' };
        }
        if (!twin.dimensions?.technical || !twin.dimensions?.jobRequirements) {
          return { valid: false, error: 'Job Readiness Twin missing required core dimension calculations.' };
        }
        return { valid: true };
      },
    });

    // 6. Future Phases Extension Stubs (Phase 8+)
    this.register('interview_planning', {
      id: 'interview_planning',
      name: 'Interview Planning Agent',
      stage: 'interview_planning',
      nextActionName: 'RUN_INTERVIEW_PLANNING',
      retryActionName: 'RETRY_INTERVIEW_PLANNING',
      isFuture: true,
      requires: ['candidateProfile', 'requirements', 'skillGapAnalysis'],
      checkPrerequisites: (session) => {
        const ready = session.skillGapAnalysis?.status === 'completed' && session.tailoredResume?.status !== 'not_started';
        return { satisfied: ready, reason: ready ? '' : 'Complete resume tailoring before planning interviews.' };
      },
    });

    // 7. Phase 8: Real-Time AI Avatar Mock Interview Agent
    this.register('mock_interview', {
      id: 'mock_interview',
      name: 'Mock Interview Agent',
      stage: 'mock_interview',
      nextActionName: 'RUN_MOCK_INTERVIEW',
      retryActionName: 'RETRY_MOCK_INTERVIEW',
      requires: [
        'candidateProfile',
        'companyRoleAnalysis',
        'jobRequirements',
        'skillGapAnalysis',
        'preparationPlan',
        'jobReadinessTwin',
      ],
      produces: ['mockInterviewSession'],

      checkPrerequisites: (session) => {
        const missing = [];
        const isProfileReady = Boolean(session.candidateProfile && session.resumeAnalysis?.status === 'completed');
        const isRoleReady = Boolean(session.requirements && session.companyRoleAnalysis?.status === 'completed');
        const isGapReady = Boolean(
          session.skillGapAnalysis?.requirementAnalysis?.length > 0 ||
          session.skillGapAnalysis?.status === 'completed'
        );
        const isTwinReady = Boolean(
          session.jobReadinessTwin?.status === 'completed' ||
          (typeof session.jobReadinessTwin?.overallScore === 'number' && session.jobReadinessTwin.overallScore > 0)
        );

        if (!isProfileReady) missing.push('Candidate Profile (Phase 3)');
        if (!isRoleReady) missing.push('Job Requirements (Phase 4)');
        if (!isGapReady) missing.push('Skill Gap Analysis (Phase 5)');
        if (!isTwinReady) missing.push('Job Readiness Twin (Phase 7)');

        if (missing.length > 0) {
          const reason = !isTwinReady && isProfileReady && isRoleReady && isGapReady
            ? 'Complete your Job Readiness Twin before starting the mock interview.'
            : `Mock Interview requires completed prerequisites: ${missing.join(', ')}.`;
          return {
            satisfied: false,
            reason,
            missing,
            waitingForUser: false,
          };
        }
        return { satisfied: true };
      },

      execute: async (sessionId, userId, options = {}) => {
        return await mockInterviewAgent.startInterview(sessionId, userId, options);
      },

      validateOutput: (output, session) => {
        const mockSession = output?.mockInterviewSession || session?.mockInterviewSession;
        if (!mockSession || !mockSession.currentQuestion?.question) {
          return { valid: false, error: 'Mock Interview failed to initialize or generate question 1.' };
        }
        return { valid: true };
      },
    });

    this.register('evaluation', {
      id: 'evaluation',
      name: 'Evaluation Agent',
      stage: 'evaluation',
      nextActionName: 'RUN_EVALUATION',
      retryActionName: 'RETRY_EVALUATION',
      isFuture: true,
      requires: ['mockInterviewAnswers'],
      checkPrerequisites: () => ({ satisfied: false, reason: 'Requires completed mock interview' }),
    });

    this.register('mistake_progress', {
      id: 'mistake_progress',
      name: 'Mistake & Progress Agent',
      stage: 'mistake_progress',
      nextActionName: 'RUN_MISTAKE_PROGRESS',
      retryActionName: 'RETRY_MISTAKE_PROGRESS',
      isFuture: true,
      requires: ['evaluations'],
      checkPrerequisites: () => ({ satisfied: false, reason: 'Requires interview evaluations' }),
    });
  }

  register(agentId, definition) {
    this.agents.set(agentId, definition);
  }

  get(agentId) {
    return this.agents.get(agentId);
  }

  has(agentId) {
    return this.agents.has(agentId);
  }

  getAll() {
    return Array.from(this.agents.values());
  }
}

const agentRegistry = new AgentRegistry();
module.exports = agentRegistry;

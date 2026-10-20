const PreparationSession = require('../../models/PreparationSession');
const agentRegistry = require('./AgentRegistry');
const PreparationContext = require('./PreparationContext');

/**
 * Central Agent Orchestrator
 * Deterministic state machine coordinating PrepAgent AI agents.
 * Evaluates state, enforces dependencies, dispatches agents, validates outputs,
 * tracks history, and manages automatic handoffs.
 */
class AgentOrchestrator {
  /**
   * Determine current orchestration state, agent lifecycle, nextAction, and progress
   */
  async getOrchestrationState(sessionId, userId) {
    const session = await PreparationSession.findById(sessionId);
    if (!session) {
      const err = new Error('Preparation session not found.');
      err.statusCode = 404;
      throw err;
    }

    // STRICT USER ISOLATION CHECK
    if (session.userId.toString() !== userId.toString()) {
      const err = new Error('Access denied. You do not have permission to access this preparation session.');
      err.statusCode = 403;
      throw err;
    }

    const statuses = PreparationContext.getAgentStatuses(session);
    const progress = PreparationContext.calculateProgress(statuses);

    let nextAction = 'READY_FOR_INTERVIEW_PLANNING';
    let currentStage = 'interview_planning';

    // 1. Evaluate Resume Analysis prerequisites & state
    if (!session.resumeId && !session.resumeSnapshot?.path) {
      nextAction = 'WAITING_FOR_USER';
      currentStage = 'setup';
    } else if (statuses.resumeAnalysis === 'failed') {
      nextAction = 'RETRY_RESUME_ANALYSIS';
      currentStage = 'resume_analysis';
    } else if (statuses.resumeAnalysis !== 'completed') {
      nextAction = 'RUN_RESUME_ANALYSIS';
      currentStage = 'resume_analysis';
    }
    // 2. Evaluate Company & Role Analysis prerequisites & state
    else if (
      !session.company ||
      !session.company.trim() ||
      !session.targetRole ||
      !session.targetRole.trim() ||
      !session.jobDescription ||
      session.jobDescription.trim().length < 20
    ) {
      nextAction = 'WAITING_FOR_USER';
      currentStage = 'setup';
    } else if (statuses.companyRoleAnalysis === 'failed') {
      nextAction = 'RETRY_COMPANY_ROLE_ANALYSIS';
      currentStage = 'company_role_analysis';
    } else if (statuses.companyRoleAnalysis !== 'completed') {
      nextAction = 'RUN_COMPANY_ROLE_ANALYSIS';
      currentStage = 'company_role_analysis';
    }
    // 3. Evaluate Skill Gap Analysis prerequisites & state
    else if (statuses.skillGap === 'failed') {
      nextAction = 'RETRY_SKILL_GAP_ANALYSIS';
      currentStage = 'skill_gap_analysis';
    } else if (statuses.skillGap !== 'completed') {
      nextAction = 'RUN_SKILL_GAP_ANALYSIS';
      currentStage = 'skill_gap_analysis';
    }
    // 4. Evaluate Resume Tailoring prerequisites & state
    else if (statuses.resumeTailoring === 'failed') {
      nextAction = 'RETRY_RESUME_TAILORING';
      currentStage = 'resume_tailoring';
    } else if (statuses.resumeTailoring !== 'completed') {
      nextAction = 'RUN_RESUME_TAILORING';
      currentStage = 'resume_tailoring';
    }
    // 5. Evaluate Job Preparation Plan prerequisites & state (Phase 6)
    else if (statuses.jobPreparationPlan === 'failed') {
      nextAction = 'RETRY_JOB_PREPARATION_PLAN';
      currentStage = 'job_preparation_plan';
    } else if (statuses.jobPreparationPlan !== 'completed') {
      nextAction = 'RUN_JOB_PREPARATION_PLAN';
      currentStage = 'job_preparation_plan';
    }
    // 6. Evaluate Job Readiness Twin prerequisites & state (Phase 7)
    else if (statuses.jobReadinessTwin === 'failed') {
      nextAction = 'RETRY_JOB_READINESS_TWIN';
      currentStage = 'job_readiness_twin';
    } else if (statuses.jobReadinessTwin !== 'completed') {
      nextAction = 'RUN_JOB_READINESS_TWIN';
      currentStage = 'job_readiness_twin';
    }
    // 7. Evaluate Mock Interview prerequisites & state (Phase 8)
    else if (statuses.mockInterview === 'failed') {
      nextAction = 'RETRY_MOCK_INTERVIEW';
      currentStage = 'mock_interview';
    } else if (statuses.mockInterview !== 'completed') {
      nextAction = 'RUN_MOCK_INTERVIEW';
      currentStage = 'mock_interview';
    }
    // 8. All Preliminary & Mock Interview Completed
    else {
      nextAction = 'READY_FOR_EVALUATION';
      currentStage = 'evaluation';
    }

    // Persist updated state to database if changed
    if (
      session.currentStage !== currentStage ||
      session.nextAction !== nextAction ||
      session.progress !== progress
    ) {
      session.currentStage = currentStage;
      session.nextAction = nextAction;
      session.progress = progress;
      await session.save();
    }

    const context = PreparationContext.buildContext(session);

    return {
      success: true,
      sessionId: session._id,
      currentStage,
      nextAction,
      progress,
      lastAgent: session.lastAgent || null,
      agents: statuses,
      context,
    };
  }

  /**
   * Execute the next required agent based on the current state.
   * Validates prerequisites, executes agent, validates output, and updates context.
   */
  async runNextAgent(sessionId, userId, options = {}) {
    const currentState = await this.getOrchestrationState(sessionId, userId);
    const { nextAction } = currentState;

    if (nextAction === 'READY_FOR_INTERVIEW_PLANNING') {
      return {
        success: true,
        alreadyCompleted: true,
        message: 'All preliminary preparation agents are complete. Ready for interview planning.',
        ...currentState,
      };
    }

    if (nextAction === 'WAITING_FOR_USER') {
      return {
        success: false,
        waitingForUser: true,
        message: 'Preparation inputs incomplete. Please provide target role, company, JD, or resume.',
        ...currentState,
      };
    }

    // Map nextAction to agent key
    let agentKey = null;
    let isRetry = false;

    switch (nextAction) {
      case 'RUN_RESUME_ANALYSIS':
        agentKey = 'resume_analysis';
        break;
      case 'RETRY_RESUME_ANALYSIS':
        agentKey = 'resume_analysis';
        isRetry = true;
        break;
      case 'RUN_COMPANY_ROLE_ANALYSIS':
        agentKey = 'company_role_analysis';
        break;
      case 'RETRY_COMPANY_ROLE_ANALYSIS':
        agentKey = 'company_role_analysis';
        isRetry = true;
        break;
      case 'RUN_SKILL_GAP_ANALYSIS':
        agentKey = 'skill_gap';
        break;
      case 'RETRY_SKILL_GAP_ANALYSIS':
        agentKey = 'skill_gap';
        isRetry = true;
        break;
      case 'RUN_RESUME_TAILORING':
        agentKey = 'resume_tailoring';
        break;
      case 'RETRY_RESUME_TAILORING':
        agentKey = 'resume_tailoring';
        isRetry = true;
        break;
      case 'RUN_JOB_PREPARATION_PLAN':
        agentKey = 'job_preparation_plan';
        break;
      case 'RETRY_JOB_PREPARATION_PLAN':
        agentKey = 'job_preparation_plan';
        isRetry = true;
        break;
      case 'RUN_JOB_READINESS_TWIN':
        agentKey = 'job_readiness_twin';
        break;
      case 'RETRY_JOB_READINESS_TWIN':
        agentKey = 'job_readiness_twin';
        isRetry = true;
        break;
      case 'RUN_MOCK_INTERVIEW':
        agentKey = 'mock_interview';
        break;
      case 'RETRY_MOCK_INTERVIEW':
        agentKey = 'mock_interview';
        isRetry = true;
        break;
      default:
        throw new Error(`Unrecognized orchestration nextAction: ${nextAction}`);
    }

    const agentDef = agentRegistry.get(agentKey);
    if (!agentDef) {
      throw new Error(`Agent not registered in AgentRegistry: ${agentKey}`);
    }

    const session = await PreparationSession.findById(sessionId);
    const prereqs = agentDef.checkPrerequisites(session);
    if (!prereqs.satisfied) {
      return {
        success: false,
        blocked: true,
        reason: prereqs.reason,
        ...currentState,
      };
    }

    console.log(`[Orchestrator] Session ${sessionId}: Starting agent ${agentDef.name} (Action: ${nextAction})`);
    const startedAt = new Date();

    try {
      // Execute the agent via registry
      const agentOptions = { ...options, force: options.force || isRetry };
      const output = await agentDef.execute(sessionId, userId, agentOptions);

      // Fetch fresh session state after agent execution
      const freshSession = await PreparationSession.findById(sessionId);

      // Validate output
      const validation = agentDef.validateOutput(output, freshSession);
      if (!validation.valid) {
        console.error(`[Orchestrator] Agent ${agentDef.name} validation failed: ${validation.error}`);
        freshSession.agentHistory.push({
          agent: agentDef.name,
          status: 'failed',
          startedAt,
          completedAt: new Date(),
          error: validation.error,
          retryCount: isRetry ? 1 : 0,
        });
        freshSession.lastAgent = agentDef.name;
        freshSession.nextAction = agentDef.retryActionName;
        await freshSession.save();

        const failureState = await this.getOrchestrationState(sessionId, userId);
        return {
          success: false,
          error: validation.error,
          ...failureState,
        };
      }

      // Record successful history entry
      freshSession.agentHistory = freshSession.agentHistory || [];
      freshSession.agentHistory.push({
        agent: agentDef.name,
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        error: null,
        retryCount: isRetry ? 1 : 0,
      });
      freshSession.lastAgent = agentDef.name;
      await freshSession.save();

      console.log(`[Orchestrator] Session ${sessionId}: Agent ${agentDef.name} completed successfully.`);

      // Compute and return new state
      const newState = await this.getOrchestrationState(sessionId, userId);
      return {
        success: true,
        executedAgent: agentDef.name,
        message: `${agentDef.name} executed successfully.`,
        ...newState,
      };
    } catch (err) {
      console.error(`[Orchestrator] Session ${sessionId}: Agent ${agentDef.name} error: ${err.message}`);

      const failSession = await PreparationSession.findById(sessionId);
      if (failSession) {
        failSession.agentHistory = failSession.agentHistory || [];
        failSession.agentHistory.push({
          agent: agentDef.name,
          status: 'failed',
          startedAt,
          completedAt: new Date(),
          error: err.message,
          retryCount: isRetry ? 1 : 0,
        });
        failSession.lastAgent = agentDef.name;
        failSession.nextAction = agentDef.retryActionName;
        await failSession.save();
      }

      const updatedFailureState = await this.getOrchestrationState(sessionId, userId);
      return {
        success: false,
        error: err.message,
        ...updatedFailureState,
      };
    }
  }

  /**
   * Run automatic pipeline chain
   * Dispatches next required agent iteratively until all completed, waiting for user, or failed.
   * Protected with maximum loop limit to prevent unbounded recursion.
   */
  async runAutoFlow(sessionId, userId, options = {}) {
    const executed = [];
    const maxIterations = 5;
    let iteration = 0;

    let currentState = await this.getOrchestrationState(sessionId, userId);

    while (
      iteration < maxIterations &&
      (currentState.nextAction.startsWith('RUN_') || currentState.nextAction.startsWith('RETRY_'))
    ) {
      iteration++;
      const result = await this.runNextAgent(sessionId, userId, options);

      if (!result.success) {
        return {
          success: false,
          executed,
          stoppedAt: currentState.nextAction,
          error: result.error || result.message,
          state: result,
        };
      }

      executed.push(result.executedAgent);
      currentState = result;

      // Stop if reached terminal state
      if (
        currentState.nextAction === 'READY_FOR_INTERVIEW_PLANNING' ||
        currentState.nextAction === 'WAITING_FOR_USER'
      ) {
        break;
      }
    }

    return {
      success: true,
      iterations: iteration,
      executedAgents: executed,
      state: currentState,
    };
  }

  /**
   * Change detection & Stale state invalidation
   * Marks dependent downstream stages stale when inputs are modified.
   */
  async handleSessionChange(sessionId, userId, changedFields = []) {
    const session = await PreparationSession.findOne({ _id: sessionId, userId });
    if (!session) return;

    let needsSave = false;

    // 1. Resume changed -> Invalidate Resume Analysis, Skill Gap, Tailored Resume, Job Readiness Twin
    if (changedFields.includes('resume') || changedFields.includes('resumeId')) {
      console.log(`[Orchestrator] Session ${sessionId}: Resume changed, invalidating dependent stages.`);
      if (session.resumeAnalysis) session.resumeAnalysis.status = 'stale';
      if (session.skillGapAnalysis) session.skillGapAnalysis.status = 'stale';
      if (session.tailoredResume) session.tailoredResume.status = 'stale';
      if (session.jobReadinessTwin) session.jobReadinessTwin.status = 'stale';
      needsSave = true;
    }

    // 2. Company / Role / JD changed -> Invalidate Company Analysis, Skill Gap, Tailored Resume, Job Readiness Twin
    const jobFields = ['company', 'targetRole', 'customRole', 'jobDescription', 'experienceLevel'];
    const hasJobChanges = changedFields.some((field) => jobFields.includes(field));

    if (hasJobChanges) {
      console.log(`[Orchestrator] Session ${sessionId}: Job details changed, invalidating role & skill gap stages.`);
      if (session.companyRoleAnalysis) session.companyRoleAnalysis.status = 'stale';
      if (session.skillGapAnalysis) session.skillGapAnalysis.status = 'stale';
      if (session.tailoredResume) session.tailoredResume.status = 'stale';
      if (session.jobReadinessTwin) session.jobReadinessTwin.status = 'stale';
      needsSave = true;
    }

    if (needsSave) {
      await session.save();
    }

    return await this.getOrchestrationState(sessionId, userId);
  }

  /**
   * Safely retry a failed agent
   */
  async retryAgent(sessionId, userId, agentKey) {
    const session = await PreparationSession.findOne({ _id: sessionId, userId });
    if (!session) {
      const err = new Error('Preparation session not found.');
      err.statusCode = 404;
      throw err;
    }

    if (agentKey === 'resume_analysis' && session.resumeAnalysis) {
      session.resumeAnalysis.status = 'not_started';
      session.resumeAnalysis.error = null;
    } else if (agentKey === 'company_role_analysis' && session.companyRoleAnalysis) {
      session.companyRoleAnalysis.status = 'not_started';
      session.companyRoleAnalysis.error = null;
    } else if (agentKey === 'skill_gap' && session.skillGapAnalysis) {
      session.skillGapAnalysis.status = 'not_started';
      session.skillGapAnalysis.error = null;
    } else if (agentKey === 'resume_tailoring' && session.tailoredResume) {
      session.tailoredResume.status = 'not_started';
    } else if (agentKey === 'job_readiness_twin' && session.jobReadinessTwin) {
      session.jobReadinessTwin.status = 'not_started';
    }

    await session.save();
    return await this.runNextAgent(sessionId, userId, { force: true });
  }
}

const agentOrchestrator = new AgentOrchestrator();
module.exports = agentOrchestrator;

const Interview = require('../../models/Interview');
const PreparationSession = require('../../models/PreparationSession');
const CompanyKnowledgeAgent = require('./CompanyKnowledgeAgent');
const QuestionGenerationAgent = require('./QuestionGenerationAgent');
const AnswerEvaluationAgent = require('./AnswerEvaluationAgent');
const MistakeMemoryAgent = require('./MistakeMemoryAgent');
const NextQuestionDecisionAgent = require('./NextQuestionDecisionAgent');
const FinalEvaluationAgent = require('./FinalEvaluationAgent');

/**
 * InterviewOrchestratorAgent (Section 5A & 26)
 * Central autonomous controller managing the interview lifecycle, multi-agent calls,
 * automatic duration computation, adaptive state updates, and security sanitization.
 */
class InterviewOrchestratorAgent {
  /**
   * Collects unified context from PreparationSession, past interviews, and MistakeMemory
   */
  async buildInterviewContext({ userId, sessionId, companyName, targetRole, interviewType }) {
    let prepSession = null;
    if (sessionId) {
      prepSession = await PreparationSession.findOne({ _id: sessionId, userId }).lean();
    }
    if (!prepSession) {
      prepSession = await PreparationSession.findOne({ userId })
        .sort({ updatedAt: -1 })
        .lean();
    }

    const resolvedCompany = (companyName || prepSession?.company || 'Tech Corp').trim();
    const resolvedRole = (targetRole || prepSession?.targetRole || 'Software Engineer').trim();
    const normalizedType = ['Technical', 'HR', 'Mixed'].includes(interviewType)
      ? interviewType
      : prepSession?.interviewType === 'Behavioral / HR'
      ? 'HR'
      : ['Technical', 'Mixed'].includes(prepSession?.interviewType)
      ? prepSession.interviewType
      : 'Mixed';

    const candidateProfile = prepSession?.candidateProfile || {};
    const resumeAnalysis = prepSession?.resumeAnalysis || {};
    const skillGapAnalysis = prepSession?.skillGapAnalysis || prepSession?.skillGap || {};
    const jobPreparationPlan = prepSession?.jobPreparationPlan || {};
    const roleAnalysis = prepSession?.roleAnalysis || {};
    const requirements = prepSession?.requirements || {};

    // Fetch persistent mistake memory (Section 18)
    const previousMistakes = await MistakeMemoryAgent.getCandidateMistakes(userId, 20);

    // Fetch previous completed interviews for performance trajectory
    const pastInterviews = await Interview.find({
      userId,
      status: 'COMPLETED',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('companyName targetRole interviewType finalReport.overallPerformance createdAt')
      .lean();

    const previousInterviewPerformance = pastInterviews.map((p) => ({
      companyName: p.companyName,
      targetRole: p.targetRole,
      interviewType: p.interviewType,
      overallScore: p.finalReport?.overallPerformance?.overallScore || 0,
      date: p.createdAt,
    }));

    // Fetch Company + Target Role interview patterns (Section 4)
    const companyPatterns = await CompanyKnowledgeAgent.retrieveCompanyPatterns({
      companyName: resolvedCompany,
      targetRole: resolvedRole,
      roleAnalysis,
      requirements,
    });

    return {
      preparationSessionId: prepSession?._id || null,
      companyName: resolvedCompany,
      targetRole: resolvedRole,
      interviewType: normalizedType,
      experienceLevel: prepSession?.experienceLevel || 'Entry Level',
      candidateProfile,
      resumeAnalysis: {
        atsScore: resumeAnalysis.atsScore,
        strengths: resumeAnalysis.atsStrengths || [],
      },
      skillGapAnalysis: {
        coverageScore: skillGapAnalysis.coverageScore || 0,
        strongSkills: skillGapAnalysis.strongSkills || skillGapAnalysis.matchingSkills || [],
        missingSkills: skillGapAnalysis.missingSkills || [],
        needsPractice: skillGapAnalysis.needsPractice || skillGapAnalysis.weakSkills || [],
        preparationPriorities: skillGapAnalysis.preparationPriorities || [],
      },
      interviewPlan: {
        readinessScore: jobPreparationPlan.readinessScore || 0,
        priorities: (jobPreparationPlan.priorities || []).slice(0, 6),
        technicalPreparation: (jobPreparationPlan.technicalPreparation || []).slice(0, 6),
      },
      companyPatterns,
      previousMistakes,
      previousInterviewPerformance,
    };
  }

  /**
   * Automatically calculates optimal interview duration in seconds (Section 14)
   */
  calculateAutomaticDuration(context) {
    let baseMinutes = 15; // 900s baseline

    if (context.interviewType === 'Mixed') {
      baseMinutes += 5;
    } else if (context.interviewType === 'Technical') {
      baseMinutes += 3;
    }

    const projectCount = (context.candidateProfile?.projects || []).length;
    const priorityGapsCount = (context.skillGapAnalysis?.preparationPriorities || []).length;
    const unresolvedMistakesCount = (context.previousMistakes || []).filter((m) => !m.resolved).length;

    if (projectCount >= 2) baseMinutes += 2;
    if (priorityGapsCount >= 3) baseMinutes += 2;
    if (unresolvedMistakesCount >= 2) baseMinutes += 2;
    if (['Intermediate', 'Experienced'].includes(context.experienceLevel)) {
      baseMinutes += 3;
    }

    const clampedMinutes = Math.max(12, Math.min(30, baseMinutes));
    return {
      durationSeconds: clampedMinutes * 60,
      reasoning: `Automatically set to ${clampedMinutes} minutes based on ${context.companyName} ${context.targetRole} (${context.interviewType} focus), ${projectCount} resume project(s), ${priorityGapsCount} skill-gap priority area(s), and ${unresolvedMistakesCount} persistent memory concept(s).`,
    };
  }

  /**
   * Builds ordered list of priority topics to cover dynamically during the session
   */
  buildInitialTopicQueue(context) {
    const topics = [];

    // 1. Unresolved past mistakes to retest
    for (const m of (context.previousMistakes || []).filter((x) => !x.resolved).slice(0, 2)) {
      if (m.concept) topics.push(m.concept);
    }

    // 2. Resume projects
    for (const proj of (context.candidateProfile?.projects || []).slice(0, 2)) {
      if (proj.name) topics.push(`${proj.name} (${(proj.technologies || []).slice(0, 2).join(', ') || 'Architecture'})`);
    }

    // 3. Skill gap priority topics
    for (const p of (context.skillGapAnalysis?.preparationPriorities || []).slice(0, 3)) {
      if (p.skill) topics.push(p.skill);
    }

    // 4. Company interview pattern topics
    if (context.interviewType === 'HR') {
      topics.push(...(context.companyPatterns?.hrThemes || []).slice(0, 3));
      topics.push(...(context.companyPatterns?.commonBehavioralThemes || []).slice(0, 2));
    } else if (context.interviewType === 'Technical') {
      topics.push(...(context.companyPatterns?.frequentlyTestedSkills || []).slice(0, 3));
      topics.push(...(context.companyPatterns?.codingPatterns || []).slice(0, 2));
    } else {
      topics.push(...(context.companyPatterns?.frequentlyTestedSkills || []).slice(0, 2));
      topics.push(...(context.companyPatterns?.hrThemes || []).slice(0, 2));
    }

    const deduplicated = [...new Set(topics.filter(Boolean))];
    return deduplicated.length
      ? deduplicated.slice(0, 8)
      : [
          'Resume Project Architecture',
          'Core Role Technical Depth',
          'Problem Solving & Edge Cases',
          'System Scalability & Security',
          'Team Ownership & Behavioral Alignment',
        ];
  }

  /**
   * Starts a brand-new autonomous interview session
   */
  async startInterview({ userId, sessionId, companyName, targetRole, interviewType, totalQuestions }) {
    const context = await this.buildInterviewContext({
      userId,
      sessionId,
      companyName,
      targetRole,
      interviewType,
    });

    const { durationSeconds, reasoning } = this.calculateAutomaticDuration(context);
    const initialTopics = this.buildInitialTopicQueue(context);

    const firstQuestion = await QuestionGenerationAgent.generateFirstQuestion({
      companyName: context.companyName,
      targetRole: context.targetRole,
      interviewType: context.interviewType,
      candidateProfile: context.candidateProfile,
      skillGapAnalysis: context.skillGapAnalysis,
      jobPreparationPlan: context.interviewPlan,
      companyPatterns: context.companyPatterns,
      previousMistakes: context.previousMistakes,
    });

    const firstTopic = firstQuestion.topic || initialTopics[0] || 'Introduction';
    const remainingTopics = initialTopics.filter(
      (t) => t.toLowerCase() !== firstTopic.toLowerCase()
    );

    const interview = await Interview.create({
      userId,
      preparationSessionId: context.preparationSessionId,
      companyName: context.companyName,
      targetRole: context.targetRole,
      interviewType: context.interviewType,
      totalQuestions: totalQuestions ? Math.min(20, Math.max(1, Number(totalQuestions))) : 10,
      startTime: new Date(),
      duration: durationSeconds,
      durationReasoning: reasoning,
      elapsedSeconds: 0,
      status: 'IN_PROGRESS',
      currentStage: 'INTRODUCTION',
      currentDifficulty: firstQuestion.difficulty || 'MEDIUM',
      avatarState: 'SPEAKING',
      currentQuestion: firstQuestion,
      questions: [firstQuestion],
      answers: [],
      evaluations: [],
      coveredTopics: [firstTopic],
      uncoveredTopics: remainingTopics,
      strengths: [],
      weaknesses: [],
      mistakes: [],
      consecutiveStrongAnswers: 0,
      consecutiveWeakAnswers: 0,
      contextSnapshot: context,
      agentDecisionHistory: [
        {
          step: 1,
          decision: 'INITIAL',
          difficulty: firstQuestion.difficulty || 'MEDIUM',
          targetTopic: firstTopic,
          reason: firstQuestion.reason || 'Generated opening interview question from candidate context',
          terminationDecision: 'CONTINUE',
          timestamp: new Date(),
        },
      ],
    });

    return this.sanitizeInterviewForLiveView(interview);
  }

  /**
   * Step 1 of Answer Processing: Records candidate's spoken/typed answer
   */
  async recordCandidateAnswer({
    userId,
    interviewId,
    answerText,
    transcription,
    answerMode = 'voice',
    durationSeconds = 0,
    elapsedSeconds = 0,
    silenceDetected = false,
    hintUsed = false,
  }) {
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    if (interview.status === 'COMPLETED') {
      return { interview, alreadyCompleted: true };
    }

    const currentQ = interview.currentQuestion || interview.questions[interview.questions.length - 1];
    if (!currentQ) {
      throw new Error('No active question found in interview state');
    }

    const finalAnswerText = (answerText || transcription || '').trim();

    // Update or append answer for current questionId
    const existingAnswerIdx = interview.answers.findIndex(
      (a) => a.questionId === currentQ.questionId
    );
    const answerPayload = {
      questionId: currentQ.questionId,
      text: finalAnswerText || '(Candidate provided no verbal/written response)',
      transcription: transcription || finalAnswerText || '',
      answerMode: answerMode === 'text' ? 'text' : 'voice',
      durationSeconds: Number(durationSeconds) || 0,
      silenceDetected: Boolean(silenceDetected),
      hintUsed: Boolean(hintUsed),
      timestamp: new Date(),
    };

    if (existingAnswerIdx >= 0) {
      interview.answers[existingAnswerIdx] = answerPayload;
    } else {
      interview.answers.push(answerPayload);
    }

    if (Number(elapsedSeconds) > interview.elapsedSeconds) {
      interview.elapsedSeconds = Number(elapsedSeconds);
    } else {
      interview.elapsedSeconds = Math.round(
        (Date.now() - new Date(interview.startTime).getTime()) / 1000
      );
    }

    interview.avatarState = 'THINKING';
    await interview.save();
    return { interview, currentQ, answerPayload };
  }

  /**
   * Step 2 of Answer Processing: Internally evaluates answer & updates persistent MistakeMemory
   */
  async evaluateLatestAnswer({ userId, interviewId }) {
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    const currentQ = interview.currentQuestion || interview.questions[interview.questions.length - 1];
    const latestAnswer =
      interview.answers.find((a) => a.questionId === currentQ?.questionId) ||
      interview.answers[interview.answers.length - 1];

    if (!currentQ || !latestAnswer) {
      throw new Error('Cannot evaluate before an answer is recorded');
    }

    // Check if already evaluated
    const alreadyEvaluated = interview.evaluations.find(
      (e) => e.questionId === currentQ.questionId
    );
    if (alreadyEvaluated) {
      return { interview, evaluation: alreadyEvaluated };
    }

    const evaluation = await AnswerEvaluationAgent.evaluateAnswer({
      companyName: interview.companyName,
      targetRole: interview.targetRole,
      interviewType: interview.interviewType,
      currentQuestion: currentQ,
      answerText: latestAnswer.text,
      answerDurationSeconds: latestAnswer.durationSeconds,
      silenceDetected: latestAnswer.silenceDetected,
      hintUsed: latestAnswer.hintUsed,
      candidateProfile: interview.contextSnapshot?.candidateProfile,
      skillGapAnalysis: interview.contextSnapshot?.skillGapAnalysis,
    });

    interview.evaluations.push(evaluation);
    interview.avatarState = evaluation.avatarReaction || 'THINKING';

    // Aggregate strengths, weaknesses, and mistakes in interview memory state
    if (Array.isArray(evaluation.strengths)) {
      interview.strengths = [...new Set([...(interview.strengths || []), ...evaluation.strengths])];
    }
    if (Array.isArray(evaluation.weaknesses)) {
      interview.weaknesses = [...new Set([...(interview.weaknesses || []), ...evaluation.weaknesses])];
    }
    if (Array.isArray(evaluation.mistakes) && evaluation.mistakes.length) {
      interview.mistakes = [...(interview.mistakes || []), ...evaluation.mistakes];
    }

    // Update persistent MistakeMemory in MongoDB (Section 18)
    await MistakeMemoryAgent.updateMemoryFromEvaluation({
      userId,
      interviewId: interview._id,
      preparationSessionId: interview.preparationSessionId,
      companyName: interview.companyName,
      targetRole: interview.targetRole,
      currentQuestion: currentQ,
      evaluation,
    });

    await interview.save();
    return { interview, evaluation };
  }

  /**
   * Step 3 of Answer Processing: Runs NextQuestionDecisionAgent & either generates next question or ends interview
   */
  async decideAndGenerateNext({ userId, interviewId }) {
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    if (interview.status === 'COMPLETED') {
      return {
        action: 'END_INTERVIEW',
        interview: this.sanitizeInterviewForLiveView(interview),
      };
    }

    const latestEvaluation = interview.evaluations[interview.evaluations.length - 1];
    const candidateMistakes = await MistakeMemoryAgent.getCandidateMistakes(userId, 20);

    const decisionResult = await NextQuestionDecisionAgent.decideNextAction({
      interview,
      latestEvaluation,
      candidateMistakes,
    });

    interview.consecutiveStrongAnswers = decisionResult.consecutiveStrongAnswers || 0;
    interview.consecutiveWeakAnswers = decisionResult.consecutiveWeakAnswers || 0;
    interview.currentDifficulty = decisionResult.nextDifficulty || interview.currentDifficulty;

    interview.agentDecisionHistory.push({
      step: (interview.questions || []).length + 1,
      decision: decisionResult.decision,
      difficulty: decisionResult.nextDifficulty,
      targetTopic: decisionResult.targetTopic,
      reason: decisionResult.reason,
      terminationDecision: decisionResult.terminationDecision,
      timestamp: new Date(),
    });

    if (decisionResult.terminationDecision === 'END_INTERVIEW') {
      await interview.save();
      const completedInterview = await this.finalizeInterview({ userId, interviewId: interview._id });
      return {
        action: 'END_INTERVIEW',
        avatarState: 'COMPLETED',
        interview: this.sanitizeInterviewForLiveView(completedInterview),
      };
    }

    // Generate next dynamic question
    const nextQuestion = await QuestionGenerationAgent.generateNextQuestion({
      interview,
      decisionResult,
      latestEvaluation,
      candidateMistakes,
    });

    interview.currentQuestion = nextQuestion;
    interview.questions.push(nextQuestion);
    interview.currentStage = decisionResult.decision;
    interview.avatarState = 'SPEAKING';

    // Update covered and uncovered topics
    const nextTopic = (nextQuestion.topic || decisionResult.targetTopic || '').trim();
    if (nextTopic && !interview.coveredTopics.includes(nextTopic)) {
      interview.coveredTopics.push(nextTopic);
    }
    interview.uncoveredTopics = (interview.uncoveredTopics || []).filter(
      (t) => t.toLowerCase() !== nextTopic.toLowerCase()
    );

    await interview.save();

    return {
      action: 'NEXT_QUESTION',
      avatarState: latestEvaluation?.avatarReaction || 'SPEAKING',
      nextQuestion: this.sanitizeQuestionForLiveView(nextQuestion),
      interview: this.sanitizeInterviewForLiveView(interview),
    };
  }

  /**
   * Unified pipeline helper for submitting an answer and executing the full agent loop
   */
  async processCompleteTurn({
    userId,
    interviewId,
    answerText,
    transcription,
    answerMode,
    durationSeconds,
    elapsedSeconds,
    silenceDetected,
    hintUsed,
  }) {
    await this.recordCandidateAnswer({
      userId,
      interviewId,
      answerText,
      transcription,
      answerMode,
      durationSeconds,
      elapsedSeconds,
      silenceDetected,
      hintUsed,
    });

    await this.evaluateLatestAnswer({ userId, interviewId });
    return await this.decideAndGenerateNext({ userId, interviewId });
  }

  /**
   * Finalizes the interview and invokes FinalEvaluationAgent to create the detailed report
   */
  async finalizeInterview({ userId, interviewId }) {
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      const err = new Error('Interview session not found');
      err.statusCode = 404;
      throw err;
    }

    if (interview.status === 'COMPLETED' && interview.finalReport) {
      return interview;
    }

    // Ensure if the last question had an answer that wasn't evaluated yet, evaluate it first
    const lastAnswer = interview.answers[interview.answers.length - 1];
    if (
      lastAnswer &&
      !interview.evaluations.some((e) => e.questionId === lastAnswer.questionId)
    ) {
      await this.evaluateLatestAnswer({ userId, interviewId });
    }

    const refreshedInterview = await Interview.findOne({ _id: interviewId, userId });
    const persistentMistakes = await MistakeMemoryAgent.getCandidateMistakes(userId, 25);

    const finalReport = await FinalEvaluationAgent.generateFinalReport({
      interview: refreshedInterview,
      persistentMistakes,
    });

    refreshedInterview.status = 'COMPLETED';
    refreshedInterview.endTime = new Date();
    refreshedInterview.avatarState = 'COMPLETED';
    refreshedInterview.elapsedSeconds = Math.max(
      refreshedInterview.elapsedSeconds || 0,
      Math.round((refreshedInterview.endTime.getTime() - new Date(refreshedInterview.startTime).getTime()) / 1000)
    );
    refreshedInterview.finalReport = finalReport;

    await refreshedInterview.save();

    // Update PreparationSession progress if linked
    if (refreshedInterview.preparationSessionId) {
      try {
        await PreparationSession.findOneAndUpdate(
          { _id: refreshedInterview.preparationSessionId, userId },
          {
            $set: {
              currentStage: 'evaluation',
              progress: 90,
            },
          }
        );
      } catch (_) {
        // Non-blocking sync
      }
    }

    return refreshedInterview;
  }

  /**
   * Sanitizes question object so internal agent prompts/targetMemoryIds are not leaked during live interview
   */
  sanitizeQuestionForLiveView(q) {
    if (!q) return null;
    return {
      questionId: q.questionId,
      question: q.question,
      type: q.type,
      difficulty: q.difficulty,
      topic: q.topic,
      hint: q.hint,
      timestamp: q.timestamp,
    };
  }

  /**
   * Sanitizes the interview state during the live interview (Section 17 & 28)
   * Hides internal evaluations, scores, AI prompts, and decision logs until status === 'COMPLETED'
   */
  sanitizeInterviewForLiveView(interviewDoc) {
    const obj = interviewDoc.toObject ? interviewDoc.toObject() : interviewDoc;
    const isCompleted = obj.status === 'COMPLETED';

    const totalTargetTopics =
      (obj.coveredTopics?.length || 0) + (obj.uncoveredTopics?.length || 0);

    return {
      _id: obj._id,
      interviewId: obj._id,
      preparationSessionId: obj.preparationSessionId,
      companyName: obj.companyName,
      targetRole: obj.targetRole,
      interviewType: obj.interviewType,
      totalQuestions: obj.totalQuestions || 10,
      status: obj.status,
      startTime: obj.startTime,
      endTime: obj.endTime,
      duration: obj.duration,
      durationReasoning: obj.durationReasoning,
      elapsedSeconds: obj.elapsedSeconds,
      currentDifficulty: obj.currentDifficulty,
      avatarState: obj.avatarState,
      currentQuestion: this.sanitizeQuestionForLiveView(obj.currentQuestion),
      questionsAnsweredCount: (obj.answers || []).length,
      questionsAskedCount: (obj.questions || []).length,
      coveredTopicsCount: (obj.coveredTopics || []).length,
      estimatedTotalTopics: Math.max(totalTargetTopics, (obj.questions || []).length + 1, 6),
      // Only include finalReport & internal evaluations when COMPLETED
      finalReport: isCompleted ? obj.finalReport : null,
      evaluations: isCompleted ? obj.evaluations : undefined,
    };
  }
}

module.exports = new InterviewOrchestratorAgent();

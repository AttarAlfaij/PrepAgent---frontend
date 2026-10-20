const Interview = require('../models/Interview');
const InterviewMemory = require('../models/InterviewMemory');
const PreparationSession = require('../models/PreparationSession');
const InterviewOrchestratorAgent = require('../services/interviewAgents/InterviewOrchestratorAgent');
const QuestionGenerationAgent = require('../services/interviewAgents/QuestionGenerationAgent');
const MistakeMemoryAgent = require('../services/interviewAgents/MistakeMemoryAgent');

/**
 * GET /api/interviews/context/:sessionId
 * Retrieves pre-interview context (company, role, resume highlights, skill gaps, active session, mistake memory)
 */
const getInterviewPreContext = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    let prepSession = null;
    if (sessionId && sessionId !== 'default') {
      prepSession = await PreparationSession.findOne({ _id: sessionId, userId }).lean();
    }
    if (!prepSession) {
      prepSession = await PreparationSession.findOne({ userId }).sort({ updatedAt: -1 }).lean();
    }

    // Check if there is an active IN_PROGRESS interview for this session
    const activeInterviewQuery = {
      userId,
      status: 'IN_PROGRESS',
    };
    if (prepSession?._id) {
      activeInterviewQuery.preparationSessionId = prepSession._id;
    }
    const activeInterview = await Interview.findOne(activeInterviewQuery)
      .sort({ createdAt: -1 })
      .lean();

    const latestCompletedInterview = await Interview.findOne({
      userId,
      ...(prepSession?._id ? { preparationSessionId: prepSession._id } : {}),
      status: 'COMPLETED',
    })
      .sort({ createdAt: -1 })
      .select('_id companyName targetRole interviewType finalReport.overallPerformance createdAt')
      .lean();

    const mistakes = await MistakeMemoryAgent.getCandidateMistakes(userId, 15);

    const projects = (prepSession?.candidateProfile?.projects || []).map((p) => ({
      name: p.name,
      technologies: p.technologies || [],
    }));

    const skillsObj = prepSession?.candidateProfile?.skills || {};
    const flatSkills = [
      ...(skillsObj.programmingLanguages || []),
      ...(skillsObj.frontend || []),
      ...(skillsObj.backend || []),
      ...(skillsObj.frameworks || []),
      ...(skillsObj.databases || []),
      ...(skillsObj.cloud || []),
      ...(skillsObj.tools || []),
    ].filter(Boolean);

    res.status(200).json({
      success: true,
      data: {
        sessionId: prepSession?._id || null,
        companyName: prepSession?.company || 'Target Company',
        targetRole: prepSession?.targetRole || 'Software Engineer',
        defaultInterviewType:
          prepSession?.interviewType === 'Behavioral / HR'
            ? 'HR'
            : ['Technical', 'HR', 'Mixed'].includes(prepSession?.interviewType)
            ? prepSession.interviewType
            : 'Mixed',
        experienceLevel: prepSession?.experienceLevel || 'Entry Level',
        resumeSummary: {
          projectsCount: projects.length,
          projects: projects.slice(0, 4),
          skills: [...new Set(flatSkills)].slice(0, 12),
        },
        skillGapSummary: {
          coverageScore: prepSession?.skillGapAnalysis?.coverageScore || 0,
          missingSkills: (prepSession?.skillGapAnalysis?.missingSkills || []).slice(0, 6),
          needsPractice: (prepSession?.skillGapAnalysis?.needsPractice || []).slice(0, 6),
        },
        previousMistakesCount: mistakes.filter((m) => !m.resolved).length,
        activeInterview: activeInterview
          ? InterviewOrchestratorAgent.sanitizeInterviewForLiveView(activeInterview)
          : null,
        latestCompletedInterviewId: latestCompletedInterview?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/start
 * Starts a new autonomous interview session
 */
const startInterview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sessionId, companyName, targetRole, interviewType, totalQuestions } = req.body;

    if (interviewType && !['Technical', 'HR', 'Mixed'].includes(interviewType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interviewType. Must be Technical, HR, or Mixed.',
      });
    }

    const sanitizedInterview = await InterviewOrchestratorAgent.startInterview({
      userId,
      sessionId,
      companyName,
      targetRole,
      interviewType: interviewType || 'Mixed',
      totalQuestions: totalQuestions ? Math.min(20, Math.max(1, Number(totalQuestions))) : 10,
    });

    if (sanitizedInterview?._id && (req.body.identityVerification || req.body.livenessVerification)) {
      await Interview.findByIdAndUpdate(sanitizedInterview._id, {
        $set: {
          ...(req.body.identityVerification ? { identityVerification: req.body.identityVerification } : {}),
          ...(req.body.livenessVerification ? { livenessVerification: req.body.livenessVerification } : {}),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: sanitizedInterview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/answer
 * Submits an answer for the current question.
 * If req.body.autoOrchestrate is true, runs answer -> evaluate -> next-question in one turn.
 */
const submitAnswer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;
    const {
      answerText,
      transcription,
      answerMode,
      durationSeconds,
      elapsedSeconds,
      silenceDetected,
      hintUsed,
      autoOrchestrate,
    } = req.body;

    if (autoOrchestrate) {
      const turnResult = await InterviewOrchestratorAgent.processCompleteTurn({
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

      return res.status(200).json({
        success: true,
        data: turnResult,
      });
    }

    const { interview } = await InterviewOrchestratorAgent.recordCandidateAnswer({
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

    res.status(200).json({
      success: true,
      data: {
        status: 'ANSWER_RECORDED',
        avatarState: 'THINKING',
        interview: InterviewOrchestratorAgent.sanitizeInterviewForLiveView(interview),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/evaluate
 * Internally evaluates the latest submitted answer and updates persistent MistakeMemory.
 * Does NOT expose internal scores to the live interview UI (Section 17).
 */
const evaluateAnswer = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;

    const { interview, evaluation } = await InterviewOrchestratorAgent.evaluateLatestAnswer({
      userId,
      interviewId,
    });

    res.status(200).json({
      success: true,
      data: {
        status: 'EVALUATED_INTERNALLY',
        avatarState: evaluation?.avatarReaction || 'THINKING',
        interview: InterviewOrchestratorAgent.sanitizeInterviewForLiveView(interview),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/next-question
 * Runs NextQuestionDecisionAgent + QuestionGenerationAgent (or ends interview if sufficient coverage reached)
 */
const getNextQuestion = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;

    const result = await InterviewOrchestratorAgent.decideAndGenerateNext({
      userId,
      interviewId,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/hint
 * Generates a contextual silence hint for the candidate without giving away the answer (Section 9)
 */
const requestSilenceHint = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;
    const { partialTranscript } = req.body;

    const interview = await Interview.findOne({ _id: interviewId, userId }).lean();
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    const hint = await QuestionGenerationAgent.generateSilenceHint({
      currentQuestion: interview.currentQuestion,
      partialTranscript,
      companyName: interview.companyName,
      targetRole: interview.targetRole,
    });

    res.status(200).json({
      success: true,
      data: {
        hint,
        avatarState: 'ENCOURAGING',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/end
 * Ends the interview and triggers the FinalEvaluationAgent
 */
const endInterview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;
    const { elapsedSeconds, environmentSummary, monitoringIncidents } = req.body || {};

    const updateFields = {};
    if (elapsedSeconds !== undefined) {
      updateFields.elapsedSeconds = Number(elapsedSeconds);
    }
    if (environmentSummary) {
      updateFields.environmentSummary = environmentSummary;
    }
    if (Array.isArray(monitoringIncidents)) {
      updateFields.monitoringIncidents = monitoringIncidents;
    }

    if (Object.keys(updateFields).length > 0) {
      await Interview.findOneAndUpdate(
        { _id: interviewId, userId },
        { $set: updateFields }
      );
    }

    const completedInterview = await InterviewOrchestratorAgent.finalizeInterview({
      userId,
      interviewId,
    });

    res.status(200).json({
      success: true,
      data: {
        interviewId: completedInterview._id,
        status: completedInterview.status,
        finalReport: completedInterview.finalReport,
        environmentSummary: completedInterview.environmentSummary,
        monitoringIncidents: completedInterview.monitoringIncidents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/:id
 * Retrieves interview state (sanitized if still IN_PROGRESS)
 */
const getInterviewById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;

    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview session not found',
      });
    }

    res.status(200).json({
      success: true,
      data: InterviewOrchestratorAgent.sanitizeInterviewForLiveView(interview),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/:id/report
 * Retrieves the complete Final Interview Report (only available when COMPLETED, or auto-finalizes if needed)
 */
const getInterviewReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;

    let interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview report not found',
      });
    }

    if (interview.status !== 'COMPLETED' || !interview.finalReport) {
      interview = await InterviewOrchestratorAgent.finalizeInterview({
        userId,
        interviewId,
      });
    }

    const persistentMistakes = await MistakeMemoryAgent.getCandidateMistakes(userId, 30);

    res.status(200).json({
      success: true,
      data: {
        interviewId: interview._id,
        preparationSessionId: interview.preparationSessionId,
        companyName: interview.companyName,
        targetRole: interview.targetRole,
        interviewType: interview.interviewType,
        startTime: interview.startTime,
        endTime: interview.endTime,
        duration: interview.duration,
        elapsedSeconds: interview.elapsedSeconds,
        status: interview.status,
        finalReport: interview.finalReport,
        persistentMistakes,
        identityVerification: interview.identityVerification,
        livenessVerification: interview.livenessVerification,
        monitoringIncidents: interview.monitoringIncidents || [],
        environmentSummary: interview.environmentSummary || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/history
 * Retrieves user's interview history (optionally filtered by sessionId)
 */
const getInterviewHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.query;

    const filter = { userId };
    if (sessionId) {
      filter.preparationSessionId = sessionId;
    }

    const interviews = await Interview.find(filter)
      .sort({ createdAt: -1 })
      .limit(25)
      .select(
        '_id preparationSessionId companyName targetRole interviewType status startTime endTime duration elapsedSeconds coveredTopics answers finalReport.overallPerformance createdAt'
      )
      .lean();

    const formatted = interviews.map((inv) => ({
      _id: inv._id,
      preparationSessionId: inv.preparationSessionId,
      companyName: inv.companyName,
      targetRole: inv.targetRole,
      interviewType: inv.interviewType,
      status: inv.status,
      startTime: inv.startTime,
      endTime: inv.endTime,
      duration: inv.duration,
      elapsedSeconds: inv.elapsedSeconds,
      questionsAnswered: (inv.answers || []).length,
      topicsCoveredCount: (inv.coveredTopics || []).length,
      overallScore:
        inv.status === 'COMPLETED'
          ? inv.finalReport?.overallPerformance?.overallScore ?? null
          : null,
      readinessVerdict:
        inv.status === 'COMPLETED'
          ? inv.finalReport?.overallPerformance?.readinessVerdict ?? null
          : null,
      createdAt: inv.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/mistakes
 * Retrieves persistent Mistake Memory records for the user
 */
const getInterviewMistakes = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const mistakes = await InterviewMemory.find({ userId })
      .sort({ resolved: 1, frequency: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: mistakes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/readiness/ping
 * Low-latency network roundtrip test for Interview Readiness Check
 */
const pingReadiness = async (req, res) => {
  res.status(200).json({
    success: true,
    timestamp: Date.now(),
    message: 'PrepAgent readiness connection alive',
  });
};

/**
 * POST /api/interviews/:id/monitoring/incident
 * Records a real-time monitoring incident during the interview
 */
const recordMonitoringIncident = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;
    const { incidentId, type, timestamp, duration, severity, resolved, details } = req.body;

    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    const newIncident = {
      incidentId: incidentId || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      duration: Number(duration) || 0,
      severity: severity || 'warning',
      resolved: resolved !== undefined ? Boolean(resolved) : true,
      details: details || '',
    };

    if (!Array.isArray(interview.monitoringIncidents)) {
      interview.monitoringIncidents = [];
    }
    interview.monitoringIncidents.push(newIncident);

    if (!interview.environmentSummary) {
      interview.environmentSummary = {};
    }

    if (type === 'CAMERA_DISCONNECTED') {
      interview.environmentSummary.cameraRemainedConnected = false;
    } else if (type === 'MICROPHONE_DISCONNECTED') {
      interview.environmentSummary.microphoneRemainedAvailable = false;
    } else if (type === 'NETWORK_DISCONNECTED') {
      interview.environmentSummary.networkRemainedConnected = false;
    } else if (type === 'MULTIPLE_PERSONS_DETECTED') {
      interview.environmentSummary.onePersonEnvironmentMaintained = false;
    }

    interview.environmentSummary.totalWarningsCount = interview.monitoringIncidents.length;
    interview.environmentSummary.totalWarningDurationSeconds = interview.monitoringIncidents.reduce(
      (sum, inc) => sum + (inc.duration || 0),
      0
    );

    await interview.save();

    res.status(200).json({
      success: true,
      data: {
        incident: newIncident,
        totalIncidents: interview.monitoringIncidents.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/monitoring/summary
 * Saves or updates complete monitoring readiness & environment summary
 */
const updateMonitoringSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const interviewId = req.params.id;
    const { identityVerification, livenessVerification, environmentSummary, incidents } = req.body;

    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found' });
    }

    if (identityVerification) {
      interview.identityVerification = {
        ...interview.identityVerification?.toObject?.(),
        ...identityVerification,
        verifiedAt: identityVerification.verifiedAt ? new Date(identityVerification.verifiedAt) : new Date(),
      };
    }

    if (livenessVerification) {
      interview.livenessVerification = {
        ...interview.livenessVerification?.toObject?.(),
        ...livenessVerification,
        verifiedAt: livenessVerification.verifiedAt ? new Date(livenessVerification.verifiedAt) : new Date(),
      };
    }

    if (environmentSummary) {
      interview.environmentSummary = {
        ...interview.environmentSummary?.toObject?.(),
        ...environmentSummary,
      };
    }

    if (Array.isArray(incidents)) {
      interview.monitoringIncidents = incidents.map((inc) => ({
        incidentId: inc.incidentId || `inc_${Date.now()}`,
        type: inc.type,
        timestamp: inc.timestamp ? new Date(inc.timestamp) : new Date(),
        duration: Number(inc.duration) || 0,
        severity: inc.severity || 'warning',
        resolved: inc.resolved !== undefined ? Boolean(inc.resolved) : true,
        details: inc.details || '',
      }));
    }

    await interview.save();

    res.status(200).json({
      success: true,
      data: {
        identityVerification: interview.identityVerification,
        livenessVerification: interview.livenessVerification,
        environmentSummary: interview.environmentSummary,
        monitoringIncidentsCount: interview.monitoringIncidents?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterviewPreContext,
  startInterview,
  submitAnswer,
  evaluateAnswer,
  getNextQuestion,
  requestSilenceHint,
  endInterview,
  getInterviewById,
  getInterviewReport,
  getInterviewHistory,
  getInterviewMistakes,
  pingReadiness,
  recordMonitoringIncident,
  updateMonitoringSummary,
};

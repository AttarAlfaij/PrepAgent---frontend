import api from './api';

const interviewAgentService = {
  /**
   * Retrieve pre-interview context (company, role, resume highlights, skill gaps, active interview)
   */
  getPreContext: async (sessionId = 'default') => {
    const response = await api.get(`/interviews/context/${sessionId || 'default'}`);
    return response.data;
  },

  /**
   * Start a new autonomous AI mock interview
   */
  startInterview: async ({
    sessionId,
    companyName,
    targetRole,
    interviewType,
    totalQuestions,
    identityVerification,
    livenessVerification,
  }) => {
    const response = await api.post('/interviews/start', {
      sessionId,
      companyName,
      targetRole,
      interviewType,
      totalQuestions,
      identityVerification,
      livenessVerification,
    });
    return response.data;
  },

  /**
   * Record candidate's spoken or typed answer
   */
  submitAnswer: async (interviewId, payload) => {
    const response = await api.post(`/interviews/${interviewId}/answer`, payload);
    return response.data;
  },

  /**
   * Trigger internal Answer Evaluation Agent + Mistake Memory Agent
   */
  evaluateAnswer: async (interviewId) => {
    const response = await api.post(`/interviews/${interviewId}/evaluate`);
    return response.data;
  },

  /**
   * Trigger Next Question Decision Agent + Question Generation Agent (or Termination Evaluator)
   */
  getNextQuestion: async (interviewId) => {
    const response = await api.post(`/interviews/${interviewId}/next-question`);
    return response.data;
  },

  /**
   * Request a contextual hint when silence is detected during voice answer
   */
  requestSilenceHint: async (interviewId, partialTranscript = '') => {
    const response = await api.post(`/interviews/${interviewId}/hint`, {
      partialTranscript,
    });
    return response.data;
  },

  /**
   * End the interview and generate the Final Interview Report
   */
  endInterview: async (interviewId, elapsedSeconds = 0, environmentSummary = null, monitoringIncidents = []) => {
    const response = await api.post(`/interviews/${interviewId}/end`, {
      elapsedSeconds,
      environmentSummary,
      monitoringIncidents,
    });
    return response.data;
  },

  /**
   * Get current interview state (for session persistence across refresh)
   */
  getInterview: async (interviewId) => {
    const response = await api.get(`/interviews/${interviewId}`);
    return response.data;
  },

  /**
   * Get complete Final Interview Report
   */
  getInterviewReport: async (interviewId) => {
    const response = await api.get(`/interviews/${interviewId}/report`);
    return response.data;
  },

  /**
   * Get user's interview history
   */
  getInterviewHistory: async (sessionId = null) => {
    const params = sessionId ? { sessionId } : {};
    const response = await api.get('/interviews/history', { params });
    return response.data;
  },

  /**
   * Get persistent mistake memory across interviews
   */
  getInterviewMistakes: async () => {
    const response = await api.get('/interviews/mistakes');
    return response.data;
  },

  /**
   * Measure real-time round-trip latency to PrepAgent API
   */
  pingReadiness: async () => {
    const startTime = performance.now();
    const response = await api.get('/interviews/readiness/ping');
    const latency = Math.round(performance.now() - startTime);
    return {
      ...response.data,
      latency,
    };
  },

  /**
   * Warm up the backend and measure a fair round-trip latency.
   *
   * Free-tier hosts (e.g. Render) sleep after inactivity, so the first request
   * can take several seconds purely due to a cold start. We fire an initial
   * wake-up ping (whose time we discard) and then measure a second ping for the
   * real latency. Both use the readiness endpoint.
   *
   * @returns {Promise<{ reachable: boolean, latency: number|null, warmed: boolean }>}
   */
  measureReadiness: async () => {
    // 1. Warm-up ping — absorbs any cold-start delay. Errors here are ignored;
    // the measured ping below is the authoritative signal.
    try {
      await api.get('/interviews/readiness/ping', { timeout: 20000 });
    } catch (_) {
      // Fall through to the measured attempt, which will surface real failures.
    }

    // 2. Measured ping
    const startTime = performance.now();
    const response = await api.get('/interviews/readiness/ping', { timeout: 15000 });
    const latency = Math.round(performance.now() - startTime);
    return {
      ...response.data,
      latency,
      reachable: true,
    };
  },

  /**
   * Log an incident during continuous monitoring
   */
  recordMonitoringIncident: async (interviewId, incident) => {
    const response = await api.post(`/interviews/${interviewId}/monitoring/incident`, incident);
    return response.data;
  },

  /**
   * Save or update complete monitoring environment summary
   */
  updateMonitoringSummary: async (interviewId, summaryPayload) => {
    const response = await api.post(`/interviews/${interviewId}/monitoring/summary`, summaryPayload);
    return response.data;
  },
};

export default interviewAgentService;

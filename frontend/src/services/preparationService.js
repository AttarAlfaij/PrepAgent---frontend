import api from './api';

export const preparationService = {
  // Create a new preparation session (supports multipart/form-data for file upload or JSON for resume reuse)
  async createPreparation(data) {
    let headers = {};
    let payload = data;

    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    const response = await api.post('/preparations', payload, { headers });
    return response.data;
  },

  // Get all preparation sessions for current user
  async getPreparations() {
    const response = await api.get('/preparations');
    return response.data;
  },

  // Get single preparation session by ID
  async getPreparationById(sessionId) {
    const response = await api.get(`/preparations/${sessionId}`);
    return response.data;
  },

  // Update session
  async updatePreparation(sessionId, data) {
    const response = await api.put(`/preparations/${sessionId}`, data);
    return response.data;
  },

  // Get user's most recent uploaded resume for fast reuse
  async getLatestResume() {
    const response = await api.get('/resumes/latest');
    return response.data;
  },

  // Download resume file securely using authenticated Axios request with Blob response
  async downloadResume(resumeId, disposition = 'attachment') {
    const response = await api.get(`/resumes/download/${resumeId}?disposition=${disposition}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Get resume file for inline preview or download by resumeId
  async getResumeFile(identifier, disposition = 'inline') {
    const response = await api.get(`/resumes/${identifier}?disposition=${disposition}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Get resume file for inline preview or download by sessionId
  async getSessionResumeFile(sessionId, disposition = 'inline') {
    const response = await api.get(`/preparations/${sessionId}/resume?disposition=${disposition}`, {
      responseType: 'blob',
    });
    return response;
  },

  // Phase 3 — Start Resume Analysis Agent (supports force: true for re-analysis)
  async analyzeResume(sessionId, force = false) {
    const response = await api.post(`/preparations/${sessionId}/resume-analysis`, { force });
    return response.data;
  },

  // Phase 3 — Get existing Resume Analysis & Understanding Map
  async getResumeAnalysis(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/resume-analysis`);
    return response.data;
  },

  // Phase 4 — Start Company & Role Analysis Agent (supports force: true for re-analysis)
  async analyzeCompanyRole(sessionId, force = false) {
    const response = await api.post(`/preparations/${sessionId}/company-role-analysis`, { force });
    return response.data;
  },

  // Phase 4 — Get existing Company & Role Analysis
  async getCompanyRoleAnalysis(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/company-role-analysis`);
    return response.data;
  },

  // Phase 5 — Start Skill Gap Analysis Agent
  async analyzeSkillGap(sessionId, force = false) {
    const response = await api.post(`/preparations/${sessionId}/skill-gap`, { force });
    return response.data;
  },

  // Phase 5 — Get existing Skill Gap Analysis
  async getSkillGapAnalysis(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/skill-gap`);
    return response.data;
  },

  // Phase 5 — Generate / Tailor Resume with AI
  async generateTailoredResume(sessionId) {
    const response = await api.post(`/preparations/${sessionId}/tailored-resume`);
    return response.data;
  },

  // Phase 5 — Get Tailored Resume
  async getTailoredResume(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/tailored-resume`);
    return response.data;
  },

  // Phase 5 — Update Editable Tailored Resume Content
  async updateTailoredResume(sessionId, content) {
    const response = await api.put(`/preparations/${sessionId}/tailored-resume`, { content });
    return response.data;
  },

  // Phase 5 — Download Tailored Resume as PDF
  async downloadTailoredResumePdf(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/tailored-resume/download/pdf`, {
      responseType: 'blob',
    });
    return response;
  },

  // Phase 5 — Download Tailored Resume as DOCX
  async downloadTailoredResumeDocx(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/tailored-resume/download/docx`, {
      responseType: 'blob',
    });
    return response;
  },

  // Phase 5 — Get User's Uploaded / Editable Resume
  async getUserResume(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/user-resume`);
    return response.data;
  },

  // Phase 5 — Update User's Editable Resume Content
  async updateUserResume(sessionId, content) {
    const response = await api.put(`/preparations/${sessionId}/user-resume`, { content });
    return response.data;
  },

  // Phase 5 — Reset User's Editable Resume to Original
  async resetUserResume(sessionId) {
    const response = await api.post(`/preparations/${sessionId}/user-resume/reset`);
    return response.data;
  },

  // Phase 5 — Download User's Edited Resume as PDF (accepts latest content or falls back to saved)
  async downloadUserResumePdf(sessionId, content = null) {
    if (content && typeof content === 'object') {
      const response = await api.post(
        `/preparations/${sessionId}/user-resume/download/pdf`,
        { content },
        { responseType: 'blob' }
      );
      return response;
    }
    const response = await api.get(`/preparations/${sessionId}/user-resume/download/pdf`, {
      responseType: 'blob',
    });
    return response;
  },

  // Phase 5 — Download User's Edited Resume as DOCX
  async downloadUserResumeDocx(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/user-resume/download/docx`, {
      responseType: 'blob',
    });
    return response;
  },

  // Phase 6 — Central Agent Orchestrator: Get Status & Context
  async getOrchestrationStatus(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/orchestrator/status`);
    return response.data;
  },

  // Phase 6 — Central Agent Orchestrator: Run Next Required Agent
  async runNextAgent(sessionId, options = {}) {
    const response = await api.post(`/preparations/${sessionId}/orchestrator/run`, options);
    return response.data;
  },

  // Phase 6 — Central Agent Orchestrator: Run Auto Pipeline Chain
  async runAutoOrchestrator(sessionId, options = {}) {
    const response = await api.post(`/preparations/${sessionId}/orchestrator/auto`, options);
    return response.data;
  },

  // Phase 6 — Central Agent Orchestrator: Retry Failed Agent
  async retryAgent(sessionId, agentKey) {
    const response = await api.post(`/preparations/${sessionId}/orchestrator/retry`, { agentKey });
    return response.data;
  },

  // Phase 6 — Job Preparation Plan: Get Plan
  async getPreparationPlan(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/preparation-plan`);
    return response.data;
  },

  // Phase 6 — Job Preparation Plan: Generate Plan
  async generatePreparationPlan(sessionId, force = false) {
    const response = await api.post(`/preparations/${sessionId}/preparation-plan`, { force });
    return response.data;
  },

  // Phase 6 — Job Preparation Plan: Update Checklist / Daily Task Progress
  async updatePreparationPlanProgress(sessionId, updateData) {
    const response = await api.put(`/preparations/${sessionId}/preparation-plan/progress`, updateData);
    return response.data;
  },

  // Phase 6 — Job Preparation Plan: Force Regenerate
  async regeneratePreparationPlan(sessionId) {
    const response = await api.post(`/preparations/${sessionId}/preparation-plan/regenerate`);
    return response.data;
  },

  // Phase 7 — AI Job Readiness Twin: Get State
  async getJobReadinessTwin(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/readiness-twin`);
    return response.data;
  },

  // Phase 7 — AI Job Readiness Twin: Recalculate
  async recalculateJobReadinessTwin(sessionId) {
    const response = await api.post(`/preparations/${sessionId}/readiness-twin/recalculate`);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: Get State
  async getMockInterviewState(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/mock-interview`);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: Start Session
  async startMockInterview(sessionId, options = {}) {
    const response = await api.post(`/preparations/${sessionId}/mock-interview/start`, options);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: Submit Answer & Get Next Question
  async submitMockInterviewAnswer(sessionId, data) {
    const response = await api.post(`/preparations/${sessionId}/mock-interview/answer`, data);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: Record Integrity Signal
  async recordMockInterviewIntegritySignal(sessionId, signalData) {
    const response = await api.post(`/preparations/${sessionId}/mock-interview/integrity-signal`, signalData);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: End Interview Early
  async endMockInterview(sessionId) {
    const response = await api.post(`/preparations/${sessionId}/mock-interview/end`);
    return response.data;
  },

  // Phase 8 — AI Mock Interview: Get Full Evaluation Report
  async getInterviewReport(sessionId) {
    const response = await api.get(`/preparations/${sessionId}/mock-interview/report`);
    return response.data;
  },

  // Dynamically recommend interview difficulty using Gemini AI
  async recommendDifficulty(data) {
    let headers = {};
    let payload = data;
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    const response = await api.post('/preparations/recommend-difficulty', payload, { headers });
    return response.data;
  },

  // Dynamically infer target role using Gemini AI from JD / Resume
  async inferTargetRole(data) {
    let headers = {};
    let payload = data;
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    const response = await api.post('/preparations/infer-role', payload, { headers });
    return response.data;
  },
};





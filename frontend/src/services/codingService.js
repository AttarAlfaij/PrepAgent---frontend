import api from './api';

export const codingService = {
  // Get all problems with filters and search
  getProblems: async (params = {}) => {
    const response = await api.get('/coding/problems', { params });
    return response.data;
  },

  // Get problem details by ID or slug
  getProblemById: async (id) => {
    const response = await api.get(`/coding/problems/${id}`);
    return response.data;
  },

  // Run code against test cases (sample or custom)
  runCode: async ({ problemId, language, code, customTestCases }) => {
    const response = await api.post('/coding/run', {
      problemId,
      language,
      code,
      customTestCases,
    });
    return response.data;
  },

  // Submit code for full evaluation
  submitCode: async ({ problemId, sessionId, language, code }) => {
    const response = await api.post('/coding/submit', {
      problemId,
      sessionId,
      language,
      code,
    });
    return response.data;
  },

  // Get user coding statistics and progress
  getProgress: async (sessionId) => {
    const response = await api.get('/coding/progress', {
      params: sessionId ? { sessionId } : {},
    });
    return response.data;
  },

  // Get user submission history
  getSubmissions: async (params = {}) => {
    const response = await api.get('/coding/submissions', { params });
    return response.data;
  },

  // Get AI Mentor assistance
  getAiHelp: async ({ action, problemId, code, language, error, currentHintIndex }) => {
    const response = await api.post('/coding/ai-help', {
      action,
      problemId,
      code,
      language,
      error,
      currentHintIndex,
    });
    return response.data;
  },
};

export default codingService;

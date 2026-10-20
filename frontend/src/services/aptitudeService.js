import api from './api';

export const aptitudeService = {
  // Get all aptitude categories and topics
  getCategories: async () => {
    const response = await api.get('/aptitude/categories');
    return response.data;
  },

  // Start a new practice session or aptitude test
  startTest: async (config = {}) => {
    const response = await api.post('/aptitude/test/start', config);
    return response.data;
  },

  // Record an answer on the active test
  recordAnswer: async (testId, payload) => {
    const response = await api.post(`/aptitude/test/${testId}/answer`, payload);
    return response.data;
  },

  // Submit test for full evaluation
  submitTest: async (testId) => {
    const response = await api.post(`/aptitude/test/${testId}/submit`);
    return response.data;
  },

  // Get completed test result with full solutions
  getTestResult: async (testId) => {
    const response = await api.get(`/aptitude/test/${testId}/result`);
    return response.data;
  },

  // Get test attempt history
  getHistory: async (limit = 20) => {
    const response = await api.get('/aptitude/history', { params: { limit } });
    return response.data;
  },

  // Get user aptitude progress & topic mastery
  getProgress: async (sessionId) => {
    const response = await api.get('/aptitude/progress', {
      params: sessionId ? { sessionId } : {},
    });
    return response.data;
  },

  // Get personalized practice recommendations
  getRecommendations: async (sessionId) => {
    const response = await api.get('/aptitude/recommendations', {
      params: sessionId ? { sessionId } : {},
    });
    return response.data;
  },

  // Request AI Aptitude Coach guidance
  getAiHelp: async (payload) => {
    const response = await api.post('/aptitude/ai-help', payload);
    return response.data;
  },
};

export default aptitudeService;

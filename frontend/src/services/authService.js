import api from './api';

export const authService = {
  // Register user
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Login user
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Get current authenticated user
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('prepagent_token');
      localStorage.removeItem('prepagent_user');
    }
  },

  // Update profile
  async updateProfile(data) {
    const response = await api.put('/users/profile', data);
    return response.data;
  },
};

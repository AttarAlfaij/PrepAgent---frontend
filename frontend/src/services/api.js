import axios from 'axios';

// Resolve the API base URL from the build-time environment (Vite).
// VITE_API_URL should be the full API root including the /api prefix, e.g.
// https://prepagent-backend-lf3g.onrender.com/api
// Falls back to localhost for local development.
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Normalize: strip any trailing slash, then ensure the /api prefix is present
// exactly once so we never produce duplicated or missing path segments.
const trimmed = rawBaseUrl.replace(/\/+$/, '');
const baseURL = /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('prepagent_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 unauth session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is expired or invalid
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/') {
        localStorage.removeItem('prepagent_token');
        localStorage.removeItem('prepagent_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

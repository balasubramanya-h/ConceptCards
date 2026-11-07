import axios from 'axios';

// Base URL configuration:
// 1. If VITE_API_URL is provided and valid, use it (preventing localhost in production HTTPS)
// 2. In Vite dev server, Vite proxy handles '/api' -> http://localhost:5000
// 3. On Vercel, relative requests to '/api' route directly to the serverless function
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl.includes('localhost')) {
      console.warn('VITE_API_URL points to localhost in HTTPS production. Falling back to same-origin relative /api routes.');
      return '';
    }
    return envUrl.replace(/\/$/, '');
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Normalizes /api path prefix and injects JWT Bearer token
api.interceptors.request.use(
  (config) => {
    // Ensure relative endpoints always include the /api prefix for Vercel serverless routing
    if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      if (!config.url.startsWith('/api') && !config.url.startsWith('api')) {
        config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
      }
    }

    const token = localStorage.getItem('conceptcards_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles 401 errors & cleans expired credentials
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid looping if the failing request is login or register
      const isAuthRoute =
        error.config.url &&
        (error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register'));
      if (!isAuthRoute) {
        localStorage.removeItem('conceptcards_token');
        localStorage.removeItem('conceptcards_user');
        window.dispatchEvent(new Event('conceptcards_auth_expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

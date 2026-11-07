import axios from 'axios';

// In development, Vite proxies '/api' to backend port 5000
// In Vercel production, '/api' routes directly to the serverless entrypoint
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Injects JWT Bearer token into outgoing HTTP requests
api.interceptors.request.use(
  (config) => {
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
      const isAuthRoute = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
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


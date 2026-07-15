import axios from 'axios';

// Create Axios instance with base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request Interceptor: Automatically attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle common errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle unauthorized errors (token expiration, invalid token)
      if (error.response.status === 401) {
        console.warn('Unauthorized access - redirecting to login');
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // window.location.href = '/login'; // Uncomment when routing is fully integrated
      }
    }
    return Promise.reject(error);
  }
);

export default api;

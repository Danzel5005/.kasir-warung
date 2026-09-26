import axios from 'axios';

// Base API URL - uses proxy in dev, can be overridden by env in production
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('monitor_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - clear and redirect to login
      localStorage.removeItem('monitor_token');
      localStorage.removeItem('monitor_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.success && response.data.token) {
      localStorage.setItem('monitor_token', response.data.token);
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('monitor_token');
      localStorage.removeItem('monitor_user');
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

// Data API
export const dataApi = {
  async getHealth() {
    const response = await api.get('/data/health');
    return response.data;
  },

  async getStatus() {
    const response = await api.get('/data/status');
    return response.data;
  },

  async getTransactions(filters = {}) {
    const response = await api.get('/data/transactions', { params: filters });
    return response.data;
  },

  async getShifts() {
    const response = await api.get('/data/shifts');
    return response.data;
  },

  async getDailyStats(date) {
    const response = await api.get('/data/stats/daily', { params: { date } });
    return response.data;
  },

  async getMenu() {
    const response = await api.get('/data/menu');
    return response.data;
  },

  async getLaporan(shiftId) {
    const response = await api.get('/data/reports/laporan', { 
      params: shiftId ? { shiftId } : {} 
    });
    return response.data;
  },

  async getRiwayat(filters = {}) {
    const response = await api.get('/data/reports/riwayat', { params: filters });
    return response.data;
  },

  async triggerSync() {
    const response = await api.post('/data/sync');
    return response.data;
  }
};

export default api;

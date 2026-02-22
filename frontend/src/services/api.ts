import axios from 'axios';

const fallbackBaseUrl = 'http://localhost:4000/api/v1';
const configuredBaseUrl = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: configuredBaseUrl || fallbackBaseUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const API_BASE_URL = configuredBaseUrl || fallbackBaseUrl;
export default api;

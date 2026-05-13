import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

if (isProduction && !publicApiUrl) {
  throw new Error('Missing NEXT_PUBLIC_API_URL in production. Configure the deployed API base URL.');
}

export const api = axios.create({
  baseURL: publicApiUrl ?? 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

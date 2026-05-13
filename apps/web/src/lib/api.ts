'use client';

import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const isProduction = process.env.NODE_ENV === 'production';
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

if (isProduction && !publicApiUrl) {
  throw new Error('Missing NEXT_PUBLIC_API_URL in production. Configure the deployed API base URL.');
}

export const api = axios.create({
  baseURL: publicApiUrl ?? 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
});

// Agrega el token de next-auth en cada request
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token = (session as any)?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si recibe 401 redirige al login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ callbackUrl: '/auth/login' });
    }
    return Promise.reject(error);
  },
);

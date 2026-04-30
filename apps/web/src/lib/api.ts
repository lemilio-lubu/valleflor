'use client';

import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
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

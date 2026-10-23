/* ─────────────────────────────────────────────────────────────
   src/lib/api-client.ts  –  Typed API client for browser
   ───────────────────────────────────────────────────────────── */
'use client';

import { getIdToken } from './firebase/auth';
import type { ApiResponse } from './types';

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getIdToken();
  if (!token) {
    return { success: false, error: 'Not authenticated', code: 'UNAUTHENTICATED' };
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  return data as ApiResponse<T>;
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, body: unknown) =>
    apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
};

import { clearAuth, getToken } from '@/utils/auth';
import { buildLoginPath } from '@/utils/redirect';

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:4000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function makeClient(baseUrl: string) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });

    let payload: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (res.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isPublicAuth = path === '/login' || path === '/register';
        if (!isPublicAuth) {
          const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(buildLoginPath(returnTo));
        }
      }
    }

    if (!res.ok) {
      const message =
        payload && typeof payload === 'object' &&
        ('error' in (payload as Record<string, unknown>) ||
         'detail' in (payload as Record<string, unknown>))
          ? String(
              (payload as Record<string, unknown>).error ??
              (payload as Record<string, unknown>).detail,
            )
          : `Request failed: ${res.status}`;
      throw new ApiError(res.status, message, payload);
    }

    return payload as T;
  }

  return {
    get:    <T = unknown>(path: string,                init?: RequestInit) => request<T>('GET',    path, undefined, init),
    post:   <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST',   path, body, init),
    put:    <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT',    path, body, init),
    patch:  <T = unknown>(path: string, body?: unknown, init?: RequestInit) => request<T>('PATCH',  path, body, init),
    delete: <T = unknown>(path: string,                init?: RequestInit) => request<T>('DELETE', path, undefined, init),
  };
}

export const authApi = makeClient(API_BASE);

export interface CorebackendUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUDITOR';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: CorebackendUser;
}

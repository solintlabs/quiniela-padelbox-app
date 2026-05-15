import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getToken, setToken, setEmail, clearToken } from './auth';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? 'https://quiniela-padelbox.vercel.app';

export class UnauthenticatedError extends Error {
  constructor() { super('Sesión caducada'); }
}

/** Cliente fetch con token JWT automático. Lanza si la respuesta no es OK. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (e) {
    console.warn('[api] fetch failed:', path, e);
    throw new Error('Sin conexión con el servidor');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? body?.error ?? message;
    } catch {
      // ignore
    }
    console.warn('[api]', path, res.status, message);
    if (res.status === 401) {
      await clearToken();
      setTimeout(() => {
        try { router.replace('/(auth)/login'); } catch {}
      }, 0);
      throw new UnauthenticatedError();
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Auth (código numérico) ----

export async function requestLoginCode(email: string): Promise<void> {
  await request('/api/auth/code/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

interface VerifyResponse {
  token: string;
  user: { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN'; hasPaid: boolean };
}

export async function verifyLoginCode(email: string, code: string, name?: string): Promise<VerifyResponse> {
  const data = await request<VerifyResponse>('/api/auth/code/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code, name }),
  });
  await setToken(data.token);
  await setEmail(data.user.email);
  return data;
}

// ---- Dominio ----

export interface ApiMatch {
  id: string;
  externalId: number;
  stage: 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';
  group: string | null;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  lockedAt: string | null;
  predictions?: Array<{ homeScore: number; awayScore: number; points: number | null }>;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  hasPaid: boolean;
  paidAt: string | null;
  championPick: string | null;
  championLockedAt: string | null;
  createdAt: string;
}

export interface ApiRanking {
  ranking: Array<{
    userId: string;
    name: string | null;
    email: string;
    played: number;
    exact: number;
    points: number;
  }>;
  meId: string;
}

export const api = {
  matches: () => request<{ matches: ApiMatch[] }>('/api/matches'),
  match: (id: string) => request<{ match: ApiMatch }>(`/api/matches/${id}`),
  ranking: () => request<ApiRanking>('/api/ranking'),
  me: () => request<{ me: ApiUser }>('/api/me'),
  predict: (matchId: string, homeScore: number, awayScore: number) =>
    request<{ prediction: { id: string; homeScore: number; awayScore: number } }>('/api/predictions', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),
  predictBatch: (predictions: Array<{ matchId: string; homeScore: number; awayScore: number }>) =>
    request<{ saved: number; skipped: Array<{ matchId: string; reason: string }> }>(
      '/api/predictions/batch',
      { method: 'POST', body: JSON.stringify({ predictions }) },
    ),
  matchPredictions: (matchId: string) =>
    request<{
      match: { id: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null };
      predictions: Array<{
        id: string;
        homeScore: number;
        awayScore: number;
        points: number | null;
        user: { id: string; name: string | null; email: string };
        isMe: boolean;
      }>;
    }>(`/api/matches/${matchId}/predictions`),
  myPredictions: () =>
    request<{ predictions: Array<{ id: string; matchId: string; homeScore: number; awayScore: number; points: number | null; match: ApiMatch }> }>(
      '/api/predictions/me',
    ),
};

export { API_URL };

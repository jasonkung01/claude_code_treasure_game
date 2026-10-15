export interface User {
  id: number;
  username: string;
}

export interface ScoreRecord {
  id: number;
  score: number;
  treasureFound: boolean;
  playedAt: string;
}

export interface ScoreHistory {
  scores: ScoreRecord[];
  games: number;
  best: number | null;
  average: number | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error ?? '請求失敗') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export const api = {
  // Returns null when nobody is logged in (401), so the caller can show the auth screen
  me: async (): Promise<User | null> => {
    try {
      return await request<User>('/api/me');
    } catch (err) {
      if ((err as { status?: number }).status === 401) return null;
      throw err;
    }
  },
  register: (username: string, password: string) =>
    request<User>('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<User>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: boolean }>('/api/logout', { method: 'POST' }),
  saveScore: (score: number, treasureFound: boolean) =>
    request<{ ok: boolean }>('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ score, treasureFound }),
    }),
  myScores: () => request<ScoreHistory>('/api/scores'),
};

'use server';

import { serverFetch } from './_fetch';

export interface Session {
  id: number;
  class_id: number;
  teacher_id: string;
  session_name: string;
  status: 'PLANNING' | 'ACTIVE' | 'FINISHED';
  explanation?: string | null;
  objective?: string | null;
  session_prompt?: string | null;
  period?: number | null;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface CreateSessionBody {
  class_id: number;
  session_name: string;
  objective?: string;
  session_prompt?: string;
  explanation?: string;
  scheduled_date?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  period?: number;
}

export type UpdateSessionBody = Partial<CreateSessionBody>;

export async function createSession(body: CreateSessionBody): Promise<Session> {
  return serverFetch('/sessions', { method: 'POST', body: JSON.stringify(body) });
}

export async function getSessionsByClass(classId: number | string): Promise<Session[]> {
  return serverFetch(`/sessions/class/${classId}`);
}

export async function getSession(id: number | string): Promise<Session> {
  return serverFetch(`/sessions/${id}`);
}

export async function updateSession(id: number | string, body: UpdateSessionBody): Promise<Session> {
  return serverFetch(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteSession(id: number | string): Promise<void> {
  return serverFetch(`/sessions/${id}`, { method: 'DELETE' });
}

export interface AttendanceStudent {
  userId: string;
  name: string;
  joinedAt: string;
}

export async function startSession(sessionId: string): Promise<void> {
  return serverFetch(`/sessions/${sessionId}/start`, { method: 'POST' });
}

export async function finishSession(sessionId: string): Promise<void> {
  return serverFetch(`/sessions/${sessionId}/finish`, { method: 'POST' });
}

export interface JoinSessionResult {
  dialog: { id: number; [key: string]: unknown };
  session_status: string;
}

export async function joinSession(sessionId: string): Promise<JoinSessionResult> {
  return serverFetch(`/sessions/${sessionId}/join`, { method: 'POST' });
}

export async function getAttendance(sessionId: string): Promise<AttendanceStudent[]> {
  const raw: { id: string; name: string; attended_at: string }[] =
    await serverFetch(`/sessions/${sessionId}/attendance`);
  return raw.map(r => ({ userId: r.id, name: r.name, joinedAt: r.attended_at }));
}

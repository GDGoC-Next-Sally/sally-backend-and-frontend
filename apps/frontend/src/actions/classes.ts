'use server';

import { serverFetch } from './_fetch';

export interface ClassItem {
  id: number;
  subject: string;
  grade: number | null;
  homeroom: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  explanation: string | null;
  theme: string | null;
  invite_code?: string;
  registerable?: boolean;
  schedule?: string | null;
  created_at?: string;
}

export interface CreateClassBody {
  subject: string;
  grade: number;
  homeroom?: string;
  explanation?: string;
  theme?: string;
}

// ── Teacher ──────────────────────────────────────────────────────────────────

export async function getTeacherClasses(): Promise<ClassItem[]> {
  return serverFetch('/classes/teacher');
}

export async function getClass(id: number | string): Promise<ClassItem> {
  return serverFetch(`/classes/${id}`);
}

export async function createClass(body: CreateClassBody): Promise<ClassItem> {
  return serverFetch('/classes', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateClass(id: number, body: Partial<CreateClassBody>): Promise<ClassItem> {
  return serverFetch(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteClass(id: number): Promise<void> {
  return serverFetch(`/classes/${id}`, { method: 'DELETE' });
}

export async function refreshInviteCode(classId: number): Promise<{ invite_code: string }> {
  return serverFetch(`/classes/${classId}/invite`, { method: 'PATCH' });
}

export async function toggleRegisterable(classId: number): Promise<void> {
  return serverFetch(`/classes/${classId}/registerable`, { method: 'PATCH' });
}

// ── Student ───────────────────────────────────────────────────────────────────

export async function getStudentClasses(): Promise<ClassItem[]> {
  return serverFetch('/classes/student');
}

export async function joinClass(inviteCode: string): Promise<void> {
  return serverFetch('/classes/student/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

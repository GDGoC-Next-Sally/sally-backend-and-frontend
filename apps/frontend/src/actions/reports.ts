'use server';

import { serverFetch } from './_fetch';

export interface SessionListItem {
  sessionId: number;
  sessionName: string;
  finishedAt: string | null;
  teacherName: string;
  subject: string;
}

export async function getStudentSessionList(classId?: number | string): Promise<SessionListItem[]> {
  const url = classId ? `/reports/student/sessions?classId=${classId}` : '/reports/student/sessions';
  return serverFetch(url);
}

export async function getStudentSessionReport(sessionId: number | string): Promise<unknown> {
  return serverFetch(`/reports/session/${sessionId}/me`);
}

export async function getSessionStudentReports(sessionId: number | string): Promise<unknown[]> {
  return serverFetch(`/reports/session/${sessionId}/students`);
}

export async function getSessionSummaryReport(sessionId: number | string): Promise<unknown> {
  return serverFetch(`/reports/session/${sessionId}/summary`);
}

export async function getClassReport(classId: number | string): Promise<unknown> {
  return serverFetch(`/reports/class/${classId}/summary`);
}

export async function requestSessionSummary(sessionId: number | string): Promise<void> {
  await serverFetch(`/reports/session/${sessionId}/request-summary`, { method: 'POST' });
}

export async function requestStudentReport(sessionId: number | string, studentId: string): Promise<void> {
  await serverFetch(`/reports/session/${sessionId}/request-student/${studentId}`, { method: 'POST' });
}

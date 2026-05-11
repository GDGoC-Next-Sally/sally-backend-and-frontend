'use server';

import { serverFetch } from './_fetch';

export interface SessionListItem {
  sessionId: number;
  sessionName: string;
  finishedAt: string | null;
  teacherName: string;
  subject: string;
}

export async function getStudentSessionList(): Promise<SessionListItem[]> {
  return serverFetch('/reports/student/sessions');
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

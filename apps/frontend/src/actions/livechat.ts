'use server';

import { serverFetch } from './_fetch';

export interface ChatMessage {
  id: number;
  dialog_id: number;
  sender_type: 'STUDENT' | 'AI' | 'TEACHER';
  content: string;
  created_at: string;
}

export async function getMessages(dialogId: number): Promise<ChatMessage[]> {
  return serverFetch(`/livechat/dialog/${dialogId}`);
}

export interface SessionStudentMonitor {
  dialogId: number;
  studentId: string;
  name: string;
  latestAnalysis: unknown | null;
}

export async function getSessionStudents(sessionId: string): Promise<SessionStudentMonitor[]> {
  return serverFetch(`/monitoring/session/${sessionId}/students`);
}

export interface StudentDetail {
  dialogId: number;
  studentId: string;
  messages: ChatMessage[];
  analysisHistory: unknown[];
}

export async function getStudentDetail(dialogId: number): Promise<StudentDetail> {
  return serverFetch(`/monitoring/dialog/${dialogId}`);
}

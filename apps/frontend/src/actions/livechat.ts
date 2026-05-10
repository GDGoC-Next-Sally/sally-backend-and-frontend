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

export interface SessionDialog {
  student_id: string;
  dialog_id: number;
}

export async function getSessionDialogs(sessionId: string): Promise<SessionDialog[]> {
  return serverFetch(`/sessions/${sessionId}/dialogs`);
}

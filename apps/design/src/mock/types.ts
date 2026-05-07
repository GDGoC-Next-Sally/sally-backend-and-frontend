export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
}

export interface ClassItem {
  id: number;
  invite_code: string;
  registerable: boolean;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  grade: number | null;
  homeroom: string | null;
  subject: string;
  explanation: string | null;
  theme: string | null;
  created_at: string;
  schedule: string;
}

export interface Student {
  id: number;
  name: string;
  progress: number;
  active: boolean;
  summary: string;
}

export interface ClassFormData {
  subject: string;
  semester: string;
  grade: string;
  homeroom: string;
  theme: number;
  classType: string;
}

export interface RecentSession {
  title: string;
  teacher: string;
  status: string;
  type: 'live' | 'wait' | 'done';
}

export interface LiveClass {
  subject: string;
  period: number;
  studentCount: number;
}

export interface ProgressData {
  value: number;
  delta: number;
}

export interface InviteCodeData {
  invite_code: string;
  registerable: boolean;
  currentStudents: number;
  maxStudents: number;
}

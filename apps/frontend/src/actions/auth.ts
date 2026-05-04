'use server';

import { serverFetch } from './_fetch';

export interface Profile {
  userId: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export async function getProfile(): Promise<Profile> {
  return serverFetch('/auth/profile');
}

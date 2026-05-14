'use server';

import { serverFetch } from './_fetch';

// ── Textbooks ─────────────────────────────────────────────────────────────────

export interface Textbook {
  id: number;
  subject: string;
  publisher: string;
  year_published: number | null;
  _count?: { unit_prompts: number };
}

export async function getPublishers(): Promise<string[]> {
  return serverFetch('/supplementary/publishers');
}

export async function getTextbooks(params?: { query?: string; publisher?: string }): Promise<Textbook[]> {
  const qs = new URLSearchParams();
  if (params?.query)     qs.set('query',     params.query);
  if (params?.publisher) qs.set('publisher', params.publisher);
  const suffix = qs.toString() ? `?${qs}` : '';
  return serverFetch(`/supplementary/textbooks${suffix}`);
}

// ── Unit Prompts ──────────────────────────────────────────────────────────────

export interface UnitPrompt {
  id: number;
  textbook_id: number | null;
  unit_number: number | null;
  subunit_number: number | null;
  unit_title: string | null;
  subunit_title: string | null;
  objective: string | null;
  prompt: string | null;
  creator_id: string | null;
  textbooks?: { subject: string; publisher: string } | null;
  users?: { id: string; name: string } | null;
}

export async function getUnitPrompts(params?: { textbookId?: number; query?: string }): Promise<UnitPrompt[]> {
  const qs = new URLSearchParams();
  if (params?.textbookId) qs.set('textbookId', String(params.textbookId));
  if (params?.query)      qs.set('query',      params.query);
  const suffix = qs.toString() ? `?${qs}` : '';
  return serverFetch(`/supplementary/unit-prompts${suffix}`);
}

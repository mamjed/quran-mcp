import type { Verse } from './types.js';
import { API_BASE, API_REQUEST_BODY, VERSE_CHUNK_SIZE } from './types.js';

export function transformApiVerse(raw: any): Verse {
  return {
    chapter: raw.ch,
    verse: raw.v,
    arabic: raw.ar ?? '',
    english: raw.en?.text ?? '',
    urdu: raw.ur?.text ?? '',
    short_commentary: raw.sc?.text ?? '',
    five_volume_commentary: raw.v5?.text ?? '',
    tafsir_saghir: raw.ts?.text ?? '',
    topics: raw.topics ?? [],
    tafaseer: raw.tafaseer ?? [],
    citations: raw.citations ?? [],
    hadiths: raw.hadiths ?? [],
  };
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    lastError = new Error(`API error: ${response.status} ${response.statusText}`);
  }
  throw lastError;
}

export async function fetchVerses(chapter: number, startVerse: number, endVerse: number): Promise<Verse[]> {
  const verses: Verse[] = [];

  for (let start = startVerse; start <= endVerse; start += VERSE_CHUNK_SIZE) {
    const end = Math.min(start + VERSE_CHUNK_SIZE - 1, endVerse);
    const url = `${API_BASE}/chapter/${chapter}:${start}-${end}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(API_REQUEST_BODY),
    });

    const data = await response.json();
    const rawVerses = Array.isArray(data) ? data : [];
    verses.push(...rawVerses.map(transformApiVerse));
  }

  return verses;
}

export async function fetchIntro(chapter: number): Promise<{ english: string; urdu: string }> {
  const url = `${API_BASE}/chapter/intro/${chapter}`;
  const response = await fetchWithRetry(url, { method: 'GET' });
  const data = await response.json();
  return {
    english: data.english ?? data.en ?? '',
    urdu: data.urdu ?? data.ur ?? '',
  };
}

export async function searchByTheme(theme: string): Promise<any> {
  const url = `${API_BASE}/rq_search`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: theme }),
  });
  return response.json();
}

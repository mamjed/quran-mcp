import { Cache } from '../cache.js';
import type { Verse } from '../types.js';

const MAX_RESULTS = 20;

function matchesQuery(verse: Verse, query: string, searchIn: string): boolean {
  const q = query.toLowerCase();

  if (searchIn === 'english' || searchIn === 'all') {
    if (verse.english.toLowerCase().includes(q)) return true;
  }
  if (searchIn === 'arabic' || searchIn === 'all') {
    if (verse.arabic.includes(query)) return true; // Arabic: no case conversion
  }
  if (searchIn === 'urdu' || searchIn === 'all') {
    if (verse.urdu.includes(query)) return true;
  }
  if (searchIn === 'commentary' || searchIn === 'all') {
    if (verse.short_commentary.toLowerCase().includes(q)) return true;
    if (verse.five_volume_commentary.toLowerCase().includes(q)) return true;
    if (verse.tafsir_saghir.toLowerCase().includes(q)) return true;
  }

  return false;
}

export async function handleSearchQuran(
  args: { query: string; search_in?: string },
  cache: Cache
) {
  const { query, search_in = 'all' } = args;
  const status = await cache.getStatus();
  const cachedChapters = status.cached_chapters;

  const results: { chapter: number; verse: number; english: string }[] = [];

  for (const ch of cachedChapters) {
    if (results.length >= MAX_RESULTS) break;

    const chapterData = await cache.getChapter(ch);
    if (!chapterData) continue;

    for (const verse of chapterData.verses) {
      if (results.length >= MAX_RESULTS) break;
      if (matchesQuery(verse, query, search_in)) {
        results.push({
          chapter: verse.chapter,
          verse: verse.verse,
          english: verse.english,
        });
      }
    }
  }

  const uncachedCount = 114 - cachedChapters.length;
  const footer = `\nSearched ${cachedChapters.length} of 114 chapters.${uncachedCount > 0 ? ` ${uncachedCount} chapters not yet cached.` : ''}`;

  if (results.length === 0) {
    return {
      content: [{ type: 'text' as const, text: `No results found for "${query}".${footer}` }],
    };
  }

  const lines = results.map(r =>
    `${r.chapter}:${r.verse} — ${r.english.substring(0, 120)}${r.english.length > 120 ? '...' : ''}`
  );

  const header = `Found ${results.length}${results.length >= MAX_RESULTS ? '+' : ''} results for "${query}":`;
  return {
    content: [{ type: 'text' as const, text: `${header}\n\n${lines.join('\n')}${footer}` }],
  };
}

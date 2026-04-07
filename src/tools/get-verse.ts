import { Cache } from '../cache.js';
import { fetchVerses } from '../api.js';
import { getSurahMeta, isValidReference } from '../data/surah-index.js';
import type { Verse, CachedChapter } from '../types.js';

function formatVerse(verse: Verse): string {
  const sections: string[] = [
    `═══ ${verse.chapter}:${verse.verse} ═══`,
    '',
    `Arabic: ${verse.arabic}`,
    '',
    `English (Maulawi Sher Ali):`,
    verse.english,
  ];

  if (verse.urdu) {
    sections.push('', `Urdu:`, verse.urdu);
  }

  if (verse.short_commentary) {
    sections.push('', `Short Commentary:`, verse.short_commentary);
  }

  if (verse.five_volume_commentary) {
    sections.push('', `Five Volume Commentary:`, verse.five_volume_commentary);
  }

  if (verse.tafsir_saghir) {
    sections.push('', `Tafsir Saghir:`, verse.tafsir_saghir);
  }

  return sections.join('\n');
}

async function ensureChapterCached(chapter: number, cache: Cache): Promise<CachedChapter | null> {
  const cached = await cache.getChapter(chapter);
  if (cached) return cached;

  const meta = getSurahMeta(chapter);
  if (!meta) return null;

  try {
    const verses = await fetchVerses(chapter, 1, meta.verse_count);
    const chapterData: CachedChapter = {
      chapter,
      name_arabic: meta.name_arabic,
      name_english: meta.name_english,
      verse_count: meta.verse_count,
      cached_at: new Date().toISOString(),
      verses,
    };
    await cache.saveChapter(chapterData);
    return chapterData;
  } catch (err) {
    return null;
  }
}

export async function handleGetVerse(
  args: { chapter: number; verse: string },
  cache: Cache
) {
  const { chapter, verse: verseStr } = args;

  // Parse verse: single number or range "start-end"
  let startVerse: number;
  let endVerse: number;

  if (verseStr.includes('-')) {
    const [s, e] = verseStr.split('-').map(Number);
    startVerse = s;
    endVerse = e;
  } else {
    startVerse = Number(verseStr);
    endVerse = startVerse;
  }

  // Validate
  if (!isValidReference(chapter, startVerse) || !isValidReference(chapter, endVerse)) {
    const meta = getSurahMeta(chapter);
    const maxVerse = meta?.verse_count ?? '?';
    return {
      content: [{ type: 'text' as const, text: `Invalid reference: ${chapter}:${verseStr}. Valid range for this surah is 1-${maxVerse}.` }],
      isError: true,
    };
  }

  // Get chapter data (from cache or fetch)
  const chapterData = await ensureChapterCached(chapter, cache);
  if (!chapterData) {
    return {
      content: [{ type: 'text' as const, text: `Failed to retrieve chapter ${chapter}. Check your internet connection.` }],
      isError: true,
    };
  }

  // Extract requested verses
  const verses = chapterData.verses.filter(v => v.verse >= startVerse && v.verse <= endVerse);

  if (verses.length === 0) {
    return {
      content: [{ type: 'text' as const, text: `No verses found for ${chapter}:${verseStr}.` }],
      isError: true,
    };
  }

  const formatted = verses.map(formatVerse).join('\n\n');
  return {
    content: [{ type: 'text' as const, text: formatted }],
  };
}

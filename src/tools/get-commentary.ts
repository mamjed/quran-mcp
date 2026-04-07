import { Cache } from '../cache.js';
import { fetchVerses } from '../api.js';
import { getSurahMeta, isValidReference } from '../data/surah-index.js';
import type { CachedChapter } from '../types.js';

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
  } catch {
    return null;
  }
}

export async function handleGetCommentary(
  args: { chapter: number; verse: number; type?: string },
  cache: Cache
) {
  const { chapter, verse, type = 'all' } = args;

  if (!isValidReference(chapter, verse)) {
    return {
      content: [{ type: 'text' as const, text: `Invalid reference: ${chapter}:${verse}.` }],
      isError: true,
    };
  }

  const chapterData = await ensureChapterCached(chapter, cache);
  if (!chapterData) {
    return {
      content: [{ type: 'text' as const, text: `Failed to retrieve chapter ${chapter}. Check your internet connection.` }],
      isError: true,
    };
  }

  const verseData = chapterData.verses.find(v => v.verse === verse);
  if (!verseData) {
    return {
      content: [{ type: 'text' as const, text: `Verse ${chapter}:${verse} not found.` }],
      isError: true,
    };
  }

  const sections: string[] = [`Commentary for ${chapter}:${verse}`, ''];

  const commentaries: { label: string; text: string; key: string }[] = [
    { label: 'Short Commentary', text: verseData.short_commentary, key: 'short' },
    { label: 'Five Volume Commentary', text: verseData.five_volume_commentary, key: 'five_volume' },
    { label: 'Tafsir Saghir', text: verseData.tafsir_saghir, key: 'tafsir_saghir' },
  ];

  const filtered = type === 'all' ? commentaries : commentaries.filter(c => c.key === type);
  const hasContent = filtered.some(c => c.text);

  if (!hasContent) {
    sections.push('No commentary available for this verse.');
  } else {
    for (const c of filtered) {
      if (c.text) {
        sections.push(`── ${c.label} ──`, c.text, '');
      }
    }
  }

  return {
    content: [{ type: 'text' as const, text: sections.join('\n') }],
  };
}

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

export async function handleGetTopics(
  args: { chapter: number; verse: number },
  cache: Cache
) {
  const { chapter, verse } = args;

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

  if (!verseData.topics || verseData.topics.length === 0) {
    return {
      content: [{ type: 'text' as const, text: `No topics found for ${chapter}:${verse}.` }],
    };
  }

  const sections: string[] = [`Topics for ${chapter}:${verse}`, ''];

  for (const topic of verseData.topics) {
    sections.push(`• ${topic.name}`);
    sections.push(`  Related: ${topic.refs.join(', ')}`);
    sections.push('');
  }

  return {
    content: [{ type: 'text' as const, text: sections.join('\n') }],
  };
}

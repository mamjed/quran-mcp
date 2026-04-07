import { Cache } from '../cache.js';
import { fetchIntro } from '../api.js';
import { getSurahMeta } from '../data/surah-index.js';

export async function handleGetSurahInfo(
  args: { chapter: number },
  cache: Cache
) {
  const { chapter } = args;
  const meta = getSurahMeta(chapter);

  if (!meta) {
    return {
      content: [{ type: 'text' as const, text: `Invalid chapter: ${chapter}. Must be between 1 and 114.` }],
      isError: true,
    };
  }

  const sections: string[] = [
    `══ Surah ${meta.chapter}: ${meta.name_english} (${meta.name_arabic}) ══`,
    `Transliteration: ${meta.name_transliteration}`,
    `Verses: ${meta.verse_count} | Revelation: ${meta.revelation_type}`,
  ];

  // Get introduction
  let intro = await cache.getIntro(chapter);
  if (!intro) {
    try {
      const introData = await fetchIntro(chapter);
      intro = {
        chapter,
        cached_at: new Date().toISOString(),
        ...introData,
      };
      await cache.saveIntro(intro);
    } catch {
      // Introduction fetch failed — continue without it
    }
  }

  if (intro?.english) {
    sections.push('', '── Introduction ──', intro.english);
  }

  return {
    content: [{ type: 'text' as const, text: sections.join('\n') }],
  };
}

import { SURAH_INDEX } from '../data/surah-index.js';

export async function handleListSurahs() {
  const lines = SURAH_INDEX.map(s =>
    `${s.chapter}. ${s.name_english} (${s.name_arabic}) — ${s.verse_count} verses — ${s.revelation_type}`
  );
  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}

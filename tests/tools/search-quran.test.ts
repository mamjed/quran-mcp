import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../../src/cache.js';
import { handleSearchQuran } from '../../src/tools/search-quran.js';
import type { CachedChapter } from '../../src/types.js';

const makeVerse = (ch: number, v: number, overrides: Partial<import('../../src/types.js').Verse> = {}) => ({
  chapter: ch, verse: v,
  arabic: 'عربي', english: 'default english', urdu: 'اردو',
  short_commentary: '', five_volume_commentary: '', tafsir_saghir: '',
  topics: [], tafaseer: [], citations: [], hadiths: [],
  ...overrides,
});

const chapter1: CachedChapter = {
  chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
  verse_count: 3, cached_at: new Date().toISOString(),
  verses: [
    makeVerse(1, 1, { english: 'In the name of Allah, the Gracious, the Merciful' }),
    makeVerse(1, 2, { english: 'All praise belongs to Allah, Lord of all the worlds' }),
    makeVerse(1, 3, { english: 'The Gracious, the Merciful', short_commentary: 'Commentary about mercy and grace' }),
  ],
};

const chapter2: CachedChapter = {
  chapter: 2, name_arabic: 'البقرة', name_english: 'Al-Baqarah',
  verse_count: 2, cached_at: new Date().toISOString(),
  verses: [
    makeVerse(2, 1, { english: 'In the name of Allah, the Gracious, the Merciful' }),
    makeVerse(2, 2, { english: 'This is a perfect Book; there is no doubt in it' }),
  ],
};

describe('search_quran tool', () => {
  let cacheDir: string;
  let cache: Cache;

  beforeEach(async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-mcp-test-'));
    cache = new Cache(cacheDir);
    await cache.init();
    await cache.saveChapter(chapter1);
    await cache.saveChapter(chapter2);
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it('finds matching verses across cached chapters', async () => {
    const result = await handleSearchQuran({ query: 'Merciful' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('1:1');
    expect(text).toContain('1:3');
    expect(text).toContain('2:1');
  });

  it('respects search_in filter for english only', async () => {
    const result = await handleSearchQuran({ query: 'mercy', search_in: 'english' }, cache);
    const text = result.content[0].text;
    // "mercy" is not in english text (only "Merciful"), but IS in commentary
    expect(text).not.toContain('1:3');
  });

  it('respects search_in filter for commentary', async () => {
    const result = await handleSearchQuran({ query: 'mercy', search_in: 'commentary' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('1:3');
  });

  it('is case-insensitive', async () => {
    const result = await handleSearchQuran({ query: 'merciful' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('1:1');
  });

  it('returns no results message when nothing matches', async () => {
    const result = await handleSearchQuran({ query: 'xyznonexistent' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('No results');
  });

  it('reports cached chapter count', async () => {
    const result = await handleSearchQuran({ query: 'Allah' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('Searched 2 of 114');
  });
});

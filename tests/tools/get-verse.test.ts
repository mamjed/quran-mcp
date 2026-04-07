import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../../src/cache.js';
import { handleGetVerse } from '../../src/tools/get-verse.js';
import type { CachedChapter } from '../../src/types.js';

// Mock the API module so no real HTTP calls are made
vi.mock('../../src/api.js', () => ({
  fetchVerses: vi.fn(),
}));

import { fetchVerses } from '../../src/api.js';
const mockFetchVerses = vi.mocked(fetchVerses);

const sampleVerse = {
  chapter: 1, verse: 1,
  arabic: 'بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ',
  english: 'In the name of Allah, the Gracious, the Merciful.',
  urdu: 'اللہ کے نام کے ساتھ جو بے انتہا رحم کرنے والا، بِن مانگے دینے والا، بار بار رحم کرنے والا ہے۔',
  short_commentary: 'This is a short commentary.',
  five_volume_commentary: 'This is the five volume commentary.',
  tafsir_saghir: 'This is tafsir saghir.',
  topics: [{ name: 'Attributes of Allah', refs: ['1:1', '2:256'] }],
  tafaseer: ['SB'],
  citations: [],
  hadiths: [],
};

const sampleChapter: CachedChapter = {
  chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
  verse_count: 7, cached_at: new Date().toISOString(),
  verses: [
    sampleVerse,
    { ...sampleVerse, verse: 2, arabic: 'verse 2 arabic', english: 'verse 2 english' },
    { ...sampleVerse, verse: 3, arabic: 'verse 3 arabic', english: 'verse 3 english' },
  ],
};

describe('get_verse tool', () => {
  let cacheDir: string;
  let cache: Cache;

  beforeEach(async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-mcp-test-'));
    cache = new Cache(cacheDir);
    await cache.init();
    mockFetchVerses.mockReset();
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it('returns single verse from cache', async () => {
    await cache.saveChapter(sampleChapter);

    const result = await handleGetVerse({ chapter: 1, verse: '1' }, cache);
    const text = result.content[0].text;

    expect(text).toContain('بِسۡمِ اللّٰہِ');
    expect(text).toContain('In the name of Allah');
    expect(text).toContain('short commentary');
    expect(text).toContain('five volume commentary');
    expect(mockFetchVerses).not.toHaveBeenCalled();
  });

  it('returns verse range from cache', async () => {
    await cache.saveChapter(sampleChapter);

    const result = await handleGetVerse({ chapter: 1, verse: '1-3' }, cache);
    const text = result.content[0].text;

    expect(text).toContain('1:1');
    expect(text).toContain('1:2');
    expect(text).toContain('1:3');
  });

  it('returns error for invalid chapter', async () => {
    const result = await handleGetVerse({ chapter: 0, verse: '1' }, cache);
    expect(result.content[0].text).toContain('Invalid');
    expect(result.isError).toBe(true);
  });

  it('returns error for invalid verse number', async () => {
    const result = await handleGetVerse({ chapter: 1, verse: '99' }, cache);
    expect(result.content[0].text).toContain('Invalid');
    expect(result.isError).toBe(true);
  });

  it('fetches from API on cache miss', async () => {
    mockFetchVerses.mockResolvedValueOnce([sampleVerse]);

    const result = await handleGetVerse({ chapter: 1, verse: '1' }, cache);
    const text = result.content[0].text;

    expect(mockFetchVerses).toHaveBeenCalledOnce();
    expect(text).toContain('In the name of Allah');
    // Verify it was cached
    expect(await cache.isChapterCached(1)).toBe(true);
  });
});

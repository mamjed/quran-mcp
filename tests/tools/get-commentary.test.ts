import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../../src/cache.js';
import { handleGetCommentary } from '../../src/tools/get-commentary.js';
import type { CachedChapter } from '../../src/types.js';

vi.mock('../../src/api.js', () => ({
  fetchVerses: vi.fn(),
}));

const sampleChapter: CachedChapter = {
  chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
  verse_count: 7, cached_at: new Date().toISOString(),
  verses: [{
    chapter: 1, verse: 1,
    arabic: 'بسم الله', english: 'In the name of Allah', urdu: 'اللہ کے نام سے',
    short_commentary: 'SC text here',
    five_volume_commentary: 'FVC text here',
    tafsir_saghir: 'TS text here',
    topics: [], tafaseer: [], citations: [], hadiths: [],
  }, {
    chapter: 1, verse: 2,
    arabic: 'الحمد', english: 'All praise', urdu: 'تمام تعریفیں',
    short_commentary: '', five_volume_commentary: '', tafsir_saghir: '',
    topics: [], tafaseer: [], citations: [], hadiths: [],
  }],
};

describe('get_commentary tool', () => {
  let cacheDir: string;
  let cache: Cache;

  beforeEach(async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-mcp-test-'));
    cache = new Cache(cacheDir);
    await cache.init();
    await cache.saveChapter(sampleChapter);
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it('returns all commentaries when type is "all"', async () => {
    const result = await handleGetCommentary({ chapter: 1, verse: 1, type: 'all' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('SC text here');
    expect(text).toContain('FVC text here');
    expect(text).toContain('TS text here');
  });

  it('returns only Five Volume Commentary when type is "five_volume"', async () => {
    const result = await handleGetCommentary({ chapter: 1, verse: 1, type: 'five_volume' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('FVC text here');
    expect(text).not.toContain('SC text here');
    expect(text).not.toContain('TS text here');
  });

  it('returns only Short Commentary when type is "short"', async () => {
    const result = await handleGetCommentary({ chapter: 1, verse: 1, type: 'short' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('SC text here');
    expect(text).not.toContain('FVC text here');
  });

  it('returns only Tafsir Saghir when type is "tafsir_saghir"', async () => {
    const result = await handleGetCommentary({ chapter: 1, verse: 1, type: 'tafsir_saghir' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('TS text here');
    expect(text).not.toContain('FVC text here');
  });

  it('handles verse with empty commentary gracefully', async () => {
    const result = await handleGetCommentary({ chapter: 1, verse: 2, type: 'all' }, cache);
    const text = result.content[0].text;
    expect(text).toContain('No commentary available');
  });

  it('returns error for invalid chapter', async () => {
    const result = await handleGetCommentary({ chapter: 0, verse: 1 }, cache);
    expect(result.isError).toBe(true);
  });
});

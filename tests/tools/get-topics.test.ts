import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../../src/cache.js';
import { handleGetTopics } from '../../src/tools/get-topics.js';
import type { CachedChapter } from '../../src/types.js';

vi.mock('../../src/api.js', () => ({
  fetchVerses: vi.fn(),
}));

const sampleChapter: CachedChapter = {
  chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
  verse_count: 7, cached_at: new Date().toISOString(),
  verses: [{
    chapter: 1, verse: 1,
    arabic: 'بسم الله', english: 'In the name', urdu: 'بسم اللہ',
    short_commentary: '', five_volume_commentary: '', tafsir_saghir: '',
    topics: [
      { name: 'Attributes of Allah', refs: ['1:1', '2:256', '59:23'] },
      { name: 'Mercy of God', refs: ['1:1', '6:12', '7:156'] },
    ],
    tafaseer: [], citations: [], hadiths: [],
  }, {
    chapter: 1, verse: 2,
    arabic: 'الحمد', english: 'All praise', urdu: 'حمد',
    short_commentary: '', five_volume_commentary: '', tafsir_saghir: '',
    topics: [],
    tafaseer: [], citations: [], hadiths: [],
  }],
};

describe('get_topics tool', () => {
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

  it('returns topics with related verse references', async () => {
    const result = await handleGetTopics({ chapter: 1, verse: 1 }, cache);
    const text = result.content[0].text;
    expect(text).toContain('Attributes of Allah');
    expect(text).toContain('2:256');
    expect(text).toContain('Mercy of God');
    expect(text).toContain('7:156');
  });

  it('handles verse with no topics', async () => {
    const result = await handleGetTopics({ chapter: 1, verse: 2 }, cache);
    const text = result.content[0].text;
    expect(text).toContain('No topics');
  });

  it('returns error for invalid verse', async () => {
    const result = await handleGetTopics({ chapter: 0, verse: 1 }, cache);
    expect(result.isError).toBe(true);
  });
});

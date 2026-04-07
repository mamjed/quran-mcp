import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../../src/cache.js';
import { handleGetSurahInfo } from '../../src/tools/get-surah-info.js';

vi.mock('../../src/api.js', () => ({
  fetchIntro: vi.fn(),
}));

import { fetchIntro } from '../../src/api.js';
const mockFetchIntro = vi.mocked(fetchIntro);

describe('get_surah_info tool', () => {
  let cacheDir: string;
  let cache: Cache;

  beforeEach(async () => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-mcp-test-'));
    cache = new Cache(cacheDir);
    await cache.init();
    mockFetchIntro.mockReset();
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it('returns surah metadata', async () => {
    mockFetchIntro.mockResolvedValueOnce({ english: 'Intro text', urdu: 'اردو' });
    const result = await handleGetSurahInfo({ chapter: 1 }, cache);
    const text = result.content[0].text;
    expect(text).toContain('Al-Fatiha');
    expect(text).toContain('الفاتحة');
    expect(text).toContain('7');
    expect(text).toContain('Meccan');
  });

  it('includes cached introduction', async () => {
    await cache.saveIntro({
      chapter: 1, cached_at: new Date().toISOString(),
      english: 'Cached intro text', urdu: 'اردو متن',
    });
    const result = await handleGetSurahInfo({ chapter: 1 }, cache);
    const text = result.content[0].text;
    expect(text).toContain('Cached intro text');
    expect(mockFetchIntro).not.toHaveBeenCalled();
  });

  it('fetches and caches introduction on miss', async () => {
    mockFetchIntro.mockResolvedValueOnce({ english: 'Fetched intro', urdu: 'اردو' });
    const result = await handleGetSurahInfo({ chapter: 1 }, cache);
    const text = result.content[0].text;
    expect(text).toContain('Fetched intro');
    expect(mockFetchIntro).toHaveBeenCalledOnce();
    expect(await cache.isIntroCached(1)).toBe(true);
  });

  it('returns error for invalid chapter', async () => {
    const result = await handleGetSurahInfo({ chapter: 0 }, cache);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid');
  });
});

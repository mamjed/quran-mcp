import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Cache } from '../src/cache.js';

describe('Cache', () => {
  let cacheDir: string;
  let cache: Cache;

  beforeEach(() => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-mcp-test-'));
    cache = new Cache(cacheDir);
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it('initializes cache directory and status file', async () => {
    await cache.init();
    expect(fs.existsSync(path.join(cacheDir, 'status.json'))).toBe(true);
  });

  it('reports chapter as not cached initially', async () => {
    await cache.init();
    expect(await cache.isChapterCached(1)).toBe(false);
  });

  it('saves and loads a chapter', async () => {
    await cache.init();
    const chapter = {
      chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
      verse_count: 7, cached_at: new Date().toISOString(), verses: [],
    };
    await cache.saveChapter(chapter);
    expect(await cache.isChapterCached(1)).toBe(true);

    const loaded = await cache.getChapter(1);
    expect(loaded?.chapter).toBe(1);
    expect(loaded?.name_english).toBe('Al-Fatiha');
  });

  it('saves and loads an intro', async () => {
    await cache.init();
    const intro = {
      chapter: 1, cached_at: new Date().toISOString(),
      english: 'Intro text', urdu: 'اردو متن',
    };
    await cache.saveIntro(intro);
    expect(await cache.isIntroCached(1)).toBe(true);

    const loaded = await cache.getIntro(1);
    expect(loaded?.english).toBe('Intro text');
  });

  it('getStatus returns current cache status', async () => {
    await cache.init();
    const status = await cache.getStatus();
    expect(status.cached_chapters).toEqual([]);
    expect(status.seed_complete).toBe(false);
  });

  it('updateStatus merges partial updates', async () => {
    await cache.init();
    await cache.updateStatus({ seed_in_progress: true });
    const status = await cache.getStatus();
    expect(status.seed_in_progress).toBe(true);
    expect(status.seed_complete).toBe(false);
  });

  it('cached chapters are sorted', async () => {
    await cache.init();
    await cache.saveChapter({
      chapter: 36, name_arabic: 'يس', name_english: 'Ya Sin',
      verse_count: 84, cached_at: new Date().toISOString(), verses: [],
    });
    await cache.saveChapter({
      chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha',
      verse_count: 7, cached_at: new Date().toISOString(), verses: [],
    });
    const status = await cache.getStatus();
    expect(status.cached_chapters).toEqual([1, 36]);
  });
});

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CachedChapter, CachedIntro, CacheStatus } from './types.js';

const DEFAULT_CACHE_DIR = path.join(os.homedir(), '.quran-mcp', 'cache');

export class Cache {
  constructor(private cacheDir: string = DEFAULT_CACHE_DIR) {}

  async init(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const statusPath = path.join(this.cacheDir, 'status.json');
    try {
      await fs.access(statusPath);
    } catch {
      const initial: CacheStatus = {
        cached_chapters: [],
        cached_intros: [],
        seed_complete: false,
        seed_in_progress: false,
        last_updated: new Date().toISOString(),
      };
      await fs.writeFile(statusPath, JSON.stringify(initial, null, 2));
    }
  }

  async getStatus(): Promise<CacheStatus> {
    const data = await fs.readFile(path.join(this.cacheDir, 'status.json'), 'utf-8');
    return JSON.parse(data);
  }

  async updateStatus(update: Partial<CacheStatus>): Promise<void> {
    const status = await this.getStatus();
    const updated = { ...status, ...update, last_updated: new Date().toISOString() };
    await fs.writeFile(path.join(this.cacheDir, 'status.json'), JSON.stringify(updated, null, 2));
  }

  async isChapterCached(chapter: number): Promise<boolean> {
    const status = await this.getStatus();
    return status.cached_chapters.includes(chapter);
  }

  async isIntroCached(chapter: number): Promise<boolean> {
    const status = await this.getStatus();
    return status.cached_intros.includes(chapter);
  }

  async getChapter(chapter: number): Promise<CachedChapter | null> {
    try {
      const data = await fs.readFile(path.join(this.cacheDir, `chapter-${chapter}.json`), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveChapter(chapter: CachedChapter): Promise<void> {
    await fs.writeFile(
      path.join(this.cacheDir, `chapter-${chapter.chapter}.json`),
      JSON.stringify(chapter, null, 2)
    );
    const status = await this.getStatus();
    if (!status.cached_chapters.includes(chapter.chapter)) {
      await this.updateStatus({
        cached_chapters: [...status.cached_chapters, chapter.chapter].sort((a, b) => a - b),
      });
    }
  }

  async getIntro(chapter: number): Promise<CachedIntro | null> {
    try {
      const data = await fs.readFile(path.join(this.cacheDir, `intro-${chapter}.json`), 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveIntro(intro: CachedIntro): Promise<void> {
    await fs.writeFile(
      path.join(this.cacheDir, `intro-${intro.chapter}.json`),
      JSON.stringify(intro, null, 2)
    );
    const status = await this.getStatus();
    if (!status.cached_intros.includes(intro.chapter)) {
      await this.updateStatus({
        cached_intros: [...status.cached_intros, intro.chapter].sort((a, b) => a - b),
      });
    }
  }
}

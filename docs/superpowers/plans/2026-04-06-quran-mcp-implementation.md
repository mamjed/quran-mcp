# Quran MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server that gives AI tools access to Quran translations and Ahmadiyya commentary from api.readquran.app, with lazy caching and 7 research-oriented tools.

**Architecture:** Stdio-based MCP server using `@modelcontextprotocol/sdk`. Data flows through a cache layer that stores JSON files in `~/.quran-mcp/cache/`. On cache miss, the API client fetches from `api.readquran.app` and caches permanently. 10 seed chapters are pre-fetched on first run.

**Tech Stack:** TypeScript, Node.js >= 18, `@modelcontextprotocol/sdk`, `zod`, `vitest` (testing)

**Spec:** `docs/superpowers/specs/2026-04-06-quran-mcp-design.md`

---

## File Map

```
src/
  index.ts              # MCP server entry point — registers all 7 tools, starts stdio transport
  types.ts              # Shared TypeScript interfaces (Verse, Chapter, SurahMeta, CacheStatus, etc.)
  api.ts                # API client — fetchVerses(), fetchIntro(), searchByTheme()
  cache.ts              # Cache layer — getChapter(), saveChapter(), getStatus(), ensureSeeded()
  tools/
    get-verse.ts        # get_verse tool handler
    get-surah-info.ts   # get_surah_info tool handler
    list-surahs.ts      # list_surahs tool handler
    search-quran.ts     # search_quran tool handler
    get-topics.ts       # get_topics tool handler
    get-commentary.ts   # get_commentary tool handler
    search-by-theme.ts  # search_by_theme tool handler
  data/
    surah-index.ts      # Hardcoded array of 114 surah metadata objects
tests/
  types.test.ts         # Type validation tests
  surah-index.test.ts   # Surah index data validation tests
  api.test.ts           # API client tests (mocked fetch)
  cache.test.ts         # Cache layer tests (temp directory)
  tools/
    get-verse.test.ts
    get-surah-info.test.ts
    list-surahs.test.ts
    search-quran.test.ts
    get-topics.test.ts
    get-commentary.test.ts
    search-by-theme.test.ts
```

---

## Task 1: Project Setup & Test Framework

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/types.ts`
- Create: `tests/types.test.ts`

This task installs dependencies, sets up vitest, and defines the core TypeScript types that everything else depends on.

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/mamjed/Documents/GitHub/quran-mcp
npm install
npm install -D vitest
```

- [ ] **Step 2: Add test script to package.json**

Add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` section in `package.json`.

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Create src/types.ts with all shared interfaces**

Define these types based on the spec's cache schema and API response format:

```ts
export interface SurahMeta {
  chapter: number;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  verse_count: number;
  revelation_type: 'Meccan' | 'Medinan';
}

export interface Topic {
  name: string;
  refs: string[];
}

export interface Citation {
  book: string;
  ref: string;
}

export interface HadithRef {
  ref: string;
}

export interface Verse {
  chapter: number;
  verse: number;
  arabic: string;
  english: string;
  urdu: string;
  short_commentary: string;
  five_volume_commentary: string;
  tafsir_saghir: string;
  topics: Topic[];
  tafaseer: string[];
  citations: Citation[];
  hadiths: HadithRef[];
}

export interface CachedChapter {
  chapter: number;
  name_arabic: string;
  name_english: string;
  verse_count: number;
  cached_at: string;
  verses: Verse[];
}

export interface CachedIntro {
  chapter: number;
  cached_at: string;
  english: string;
  urdu: string;
}

export interface CacheStatus {
  cached_chapters: number[];
  cached_intros: number[];
  seed_complete: boolean;
  seed_in_progress: boolean;
  last_updated: string;
}

export const SEED_CHAPTERS = [1, 2, 3, 18, 19, 24, 36, 55, 62, 67];

export const API_BASE = 'https://api.readquran.app';

export const VERSE_CHUNK_SIZE = 50;

export const API_REQUEST_BODY = {
  en: true, sc: true, v5: true, ur: true, ts: true,
  sp_en: false, sp_ur: false, hover: false,
};
```

- [ ] **Step 5: Write a basic type validation test**

```ts
// tests/types.test.ts
import { describe, it, expect } from 'vitest';
import { SEED_CHAPTERS, API_BASE, VERSE_CHUNK_SIZE } from '../src/types.js';

describe('types constants', () => {
  it('has 10 seed chapters', () => {
    expect(SEED_CHAPTERS).toHaveLength(10);
  });

  it('seed chapters are valid surah numbers', () => {
    for (const ch of SEED_CHAPTERS) {
      expect(ch).toBeGreaterThanOrEqual(1);
      expect(ch).toBeLessThanOrEqual(114);
    }
  });

  it('has correct API base URL', () => {
    expect(API_BASE).toBe('https://api.readquran.app');
  });

  it('chunk size is 50', () => {
    expect(VERSE_CHUNK_SIZE).toBe(50);
  });
});
```

- [ ] **Step 6: Run tests to verify setup works**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/types.ts tests/types.test.ts tsconfig.json
git commit -m "feat: project setup with types and vitest"
```

---

## Task 2: Surah Index Data

**Files:**
- Create: `src/data/surah-index.ts`
- Create: `tests/surah-index.test.ts`

Hardcoded metadata for all 114 surahs. This powers `list_surahs` and validates chapter/verse inputs throughout the server. The data never changes.

- [ ] **Step 1: Write tests for surah index**

```ts
// tests/surah-index.test.ts
import { describe, it, expect } from 'vitest';
import { SURAH_INDEX } from '../src/data/surah-index.js';

describe('surah index', () => {
  it('has exactly 114 surahs', () => {
    expect(SURAH_INDEX).toHaveLength(114);
  });

  it('first surah is Al-Fatiha with 7 verses', () => {
    expect(SURAH_INDEX[0].chapter).toBe(1);
    expect(SURAH_INDEX[0].name_english).toBe('Al-Fatiha');
    expect(SURAH_INDEX[0].verse_count).toBe(7);
  });

  it('last surah is An-Nas with 7 verses', () => {
    expect(SURAH_INDEX[113].chapter).toBe(114);
    expect(SURAH_INDEX[113].name_english).toBe('An-Nas');
    expect(SURAH_INDEX[113].verse_count).toBe(7);
  });

  it('Al-Baqarah has 287 verses', () => {
    const baqarah = SURAH_INDEX.find(s => s.chapter === 2);
    expect(baqarah?.verse_count).toBe(287);
  });

  it('every surah has required fields', () => {
    for (const surah of SURAH_INDEX) {
      expect(surah.chapter).toBeGreaterThanOrEqual(1);
      expect(surah.chapter).toBeLessThanOrEqual(114);
      expect(surah.name_arabic).toBeTruthy();
      expect(surah.name_english).toBeTruthy();
      expect(surah.name_transliteration).toBeTruthy();
      expect(surah.verse_count).toBeGreaterThan(0);
      expect(['Meccan', 'Medinan']).toContain(surah.revelation_type);
    }
  });

  it('chapters are sequential 1-114', () => {
    SURAH_INDEX.forEach((surah, i) => {
      expect(surah.chapter).toBe(i + 1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/surah-index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/data/surah-index.ts**

Create the full array of 114 `SurahMeta` objects. Use the Ahmadiyya verse count convention (Bismillah = verse 1).

Reference data: https://alislam.org/quran/app/ — use the surah list in the app. Key verse counts to get right:
- Al-Fatiha: 7, Al-Baqarah: 287, Al-Imran: 201, An-Nisa: 177, Al-Ma'idah: 121
- Ya-Sin: 84, Ar-Rahman: 79, Al-Mulk: 31, An-Nas: 7

```ts
import type { SurahMeta } from '../types.js';

export const SURAH_INDEX: SurahMeta[] = [
  { chapter: 1, name_arabic: 'الفاتحة', name_english: 'Al-Fatiha', name_transliteration: 'Al-Fatihah', verse_count: 7, revelation_type: 'Meccan' },
  { chapter: 2, name_arabic: 'البقرة', name_english: 'Al-Baqarah', name_transliteration: 'Al-Baqarah', verse_count: 287, revelation_type: 'Medinan' },
  // ... all 114 surahs
  // IMPORTANT: Use Ahmadiyya verse counts (Bismillah = verse 1, so counts are +1 compared to some other traditions)
  { chapter: 114, name_arabic: 'الناس', name_english: 'An-Nas', name_transliteration: 'An-Nas', verse_count: 7, revelation_type: 'Meccan' },
];

export function getSurahMeta(chapter: number): SurahMeta | undefined {
  return SURAH_INDEX.find(s => s.chapter === chapter);
}

export function isValidReference(chapter: number, verse?: number): boolean {
  const surah = getSurahMeta(chapter);
  if (!surah) return false;
  if (verse !== undefined) return verse >= 1 && verse <= surah.verse_count;
  return true;
}
```

The implementer must fill in all 114 entries. Source the data from the alislam.org Quran app (inspect the JS bundle or API responses for the surah list with Arabic names and verse counts).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/surah-index.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/surah-index.ts tests/surah-index.test.ts
git commit -m "feat: add surah index with 114 surah metadata"
```

---

## Task 3: API Client

**Files:**
- Create: `src/api.ts`
- Create: `tests/api.test.ts`

Wraps all HTTP calls to `api.readquran.app`. Three functions: `fetchVerses()`, `fetchIntro()`, `searchByTheme()`. Handles chunking for large chapters and retry-once on failure.

- [ ] **Step 1: Write API client tests with mocked fetch**

```ts
// tests/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVerses, fetchIntro, transformApiVerse } from '../src/api.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('transformApiVerse', () => {
  it('maps API response fields to cache format', () => {
    const apiVerse = {
      ch: 1, v: 1,
      ar: 'بِسۡمِ اللّٰہِ',
      en: { text: 'In the name of Allah', notes: '' },
      ur: { text: 'اللہ کے نام سے', notes: '' },
      sc: { text: 'Short commentary' },
      v5: { text: 'Five volume commentary' },
      ts: { text: 'Tafsir saghir' },
      topics: [{ name: 'Mercy', refs: ['1:1'] }],
      tafaseer: ['SB'],
      citations: [{ book: 'EoI', ref: 'v1 p50' }],
      hadiths: [{ ref: 'Bukhari' }],
    };

    const result = transformApiVerse(apiVerse);

    expect(result.chapter).toBe(1);
    expect(result.verse).toBe(1);
    expect(result.arabic).toBe('بِسۡمِ اللّٰہِ');
    expect(result.english).toBe('In the name of Allah');
    expect(result.urdu).toBe('اللہ کے نام سے');
    expect(result.short_commentary).toBe('Short commentary');
    expect(result.five_volume_commentary).toBe('Five volume commentary');
    expect(result.tafsir_saghir).toBe('Tafsir saghir');
    expect(result.topics).toHaveLength(1);
  });

  it('handles missing optional fields gracefully', () => {
    const apiVerse = {
      ch: 1, v: 2,
      ar: 'text',
      en: { text: 'english' },
      ur: { text: 'urdu' },
    };

    const result = transformApiVerse(apiVerse);

    expect(result.short_commentary).toBe('');
    expect(result.topics).toEqual([]);
  });
});

describe('fetchVerses', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('fetches verses for a small chapter in one request', async () => {
    const mockResponse = [{ ch: 1, v: 1, ar: 'test', en: { text: 'test' }, ur: { text: 'test' } }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchVerses(1, 1, 7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('chunks requests for large chapters (>50 verses)', async () => {
    // 120 verses = 3 chunks: 1-50, 51-100, 101-120
    const chunk1 = Array.from({ length: 50 }, (_, i) => ({ ch: 2, v: i + 1, ar: 'a', en: { text: 'e' }, ur: { text: 'u' } }));
    const chunk2 = Array.from({ length: 50 }, (_, i) => ({ ch: 2, v: i + 51, ar: 'a', en: { text: 'e' }, ur: { text: 'u' } }));
    const chunk3 = Array.from({ length: 20 }, (_, i) => ({ ch: 2, v: i + 101, ar: 'a', en: { text: 'e' }, ur: { text: 'u' } }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chunk1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chunk2) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(chunk3) });

    const result = await fetchVerses(2, 1, 120);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(120);
  });

  it('retries once on failure then throws', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    await expect(fetchVerses(1, 1, 7)).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement src/api.ts**

```ts
import type { Verse } from './types.js';
import { API_BASE, API_REQUEST_BODY, VERSE_CHUNK_SIZE } from './types.js';

export function transformApiVerse(raw: any): Verse {
  return {
    chapter: raw.ch,
    verse: raw.v,
    arabic: raw.ar ?? '',
    english: raw.en?.text ?? '',
    urdu: raw.ur?.text ?? '',
    short_commentary: raw.sc?.text ?? '',
    five_volume_commentary: raw.v5?.text ?? '',
    tafsir_saghir: raw.ts?.text ?? '',
    topics: raw.topics ?? [],
    tafaseer: raw.tafaseer ?? [],
    citations: raw.citations ?? [],
    hadiths: raw.hadiths ?? [],
  };
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    lastError = new Error(`API error: ${response.status} ${response.statusText}`);
  }
  throw lastError;
}

export async function fetchVerses(chapter: number, startVerse: number, endVerse: number): Promise<Verse[]> {
  const verses: Verse[] = [];

  for (let start = startVerse; start <= endVerse; start += VERSE_CHUNK_SIZE) {
    const end = Math.min(start + VERSE_CHUNK_SIZE - 1, endVerse);
    const url = `${API_BASE}/chapter/${chapter}:${start}-${end}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(API_REQUEST_BODY),
    });

    const data = await response.json();
    const rawVerses = Array.isArray(data) ? data : [];
    verses.push(...rawVerses.map(transformApiVerse));
  }

  return verses;
}

export async function fetchIntro(chapter: number): Promise<{ english: string; urdu: string }> {
  const url = `${API_BASE}/chapter/intro/${chapter}`;
  const response = await fetchWithRetry(url, { method: 'GET' });
  const data = await response.json();
  // Intro response structure needs discovery — extract english/urdu sections
  return {
    english: data.english ?? data.en ?? '',
    urdu: data.urdu ?? data.ur ?? '',
  };
}

export async function searchByTheme(theme: string): Promise<any> {
  const url = `${API_BASE}/rq_search`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: theme }),
  });
  return response.json();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/api.ts tests/api.test.ts
git commit -m "feat: API client with verse fetching, retry, and field mapping"
```

---

## Task 4: Cache Layer

**Files:**
- Create: `src/cache.ts`
- Create: `tests/cache.test.ts`

Manages reading/writing JSON files in `~/.quran-mcp/cache/`. Handles status tracking, seed initialization, and the lazy-fetch-on-miss pattern. This is the central data access layer — tools call cache functions, not the API directly.

- [ ] **Step 1: Write cache layer tests using a temp directory**

```ts
// tests/cache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement src/cache.ts**

The `Cache` class takes a cache directory path (default `~/.quran-mcp/cache/`). Methods:
- `init()` — creates directory and status.json if missing
- `isChapterCached(ch)` / `isIntroCached(ch)` — checks status.json
- `getChapter(ch)` / `getIntro(ch)` — reads JSON file
- `saveChapter(data)` / `saveIntro(data)` — writes JSON file, updates status.json
- `getStatus()` / `updateStatus(partial)` — reads/updates status.json

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cache.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/cache.ts tests/cache.test.ts
git commit -m "feat: cache layer with JSON file storage and status tracking"
```

---

## Task 5: list_surahs Tool

**Files:**
- Create: `src/tools/list-surahs.ts`
- Create: `tests/tools/list-surahs.test.ts`

Simplest tool — just returns the hardcoded surah index. Good starting point to establish the tool handler pattern.

- [ ] **Step 1: Write test**

```ts
// tests/tools/list-surahs.test.ts
import { describe, it, expect } from 'vitest';
import { handleListSurahs } from '../../src/tools/list-surahs.js';

describe('list_surahs tool', () => {
  it('returns all 114 surahs', async () => {
    const result = await handleListSurahs();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = result.content[0].text;
    expect(text).toContain('Al-Fatiha');
    expect(text).toContain('An-Nas');
    expect(text).toContain('114.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/list-surahs.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement src/tools/list-surahs.ts**

Each tool handler returns `{ content: [{ type: 'text', text: string }] }` — the MCP tool response format.

```ts
import { SURAH_INDEX } from '../data/surah-index.js';

export async function handleListSurahs() {
  const lines = SURAH_INDEX.map(s =>
    `${s.chapter}. ${s.name_english} (${s.name_arabic}) — ${s.verse_count} verses — ${s.revelation_type}`
  );
  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tools/list-surahs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/list-surahs.ts tests/tools/list-surahs.test.ts
git commit -m "feat: list_surahs tool"
```

---

## Task 6: get_verse Tool

**Files:**
- Create: `src/tools/get-verse.ts`
- Create: `tests/tools/get-verse.test.ts`

Core tool — fetches verses from cache (or API on miss), formats them with all translations and commentary. Supports single verse and range.

- [ ] **Step 1: Write tests**

Test with a pre-populated cache (no real API calls). Test cases:
- Single verse lookup from cache
- Verse range lookup from cache
- Invalid chapter number returns error
- Invalid verse number returns error
- Cache miss triggers fetch (mock the API module)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/get-verse.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement src/tools/get-verse.ts**

The handler:
1. Validates chapter/verse against surah index
2. Checks cache — if hit, reads from JSON
3. If cache miss, calls `fetchVerses()` from api.ts, saves entire chapter to cache
4. Extracts requested verse(s) from chapter data
5. Formats output with clear sections: Arabic, English (Sher Ali), Urdu, Short Commentary, Five Volume Commentary, Tafsir Saghir

The function signature:
```ts
import { Cache } from '../cache.js';
import { fetchVerses } from '../api.js';
import { getSurahMeta } from '../data/surah-index.js';
import type { Verse, CachedChapter } from '../types.js';

export async function handleGetVerse(
  args: { chapter: number; verse: string },
  cache: Cache
) { ... }
```

Parse `verse` param: if it contains `-`, split into start-end range. Otherwise single verse.

Format each verse as:
```
═══ [Chapter]:[Verse] ═══

Arabic: ...

English (Maulawi Sher Ali):
...

Urdu:
...

Short Commentary:
...

Five Volume Commentary:
...

Tafsir Saghir:
...
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/get-verse.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-verse.ts tests/tools/get-verse.test.ts
git commit -m "feat: get_verse tool with cache integration"
```

---

## Task 7: get_surah_info Tool

**Files:**
- Create: `src/tools/get-surah-info.ts`
- Create: `tests/tools/get-surah-info.test.ts`

Returns surah metadata from index + chapter introduction from cache/API.

- [ ] **Step 1: Write tests**

Test cases:
- Returns surah metadata (name, verse count, revelation type)
- Includes cached introduction if available
- Fetches and caches introduction on miss
- Invalid chapter returns error

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement src/tools/get-surah-info.ts**

```ts
export async function handleGetSurahInfo(
  args: { chapter: number },
  cache: Cache
) { ... }
```

Format output:
```
══ Surah [N]: [English Name] ([Arabic Name]) ══
Verses: [count] | Revelation: [type]

── Introduction ──
[English introduction text]
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-surah-info.ts tests/tools/get-surah-info.test.ts
git commit -m "feat: get_surah_info tool with chapter introductions"
```

---

## Task 8: get_commentary Tool

**Files:**
- Create: `src/tools/get-commentary.ts`
- Create: `tests/tools/get-commentary.test.ts`

Returns just the commentary for a verse — Five Volume, Short, or Tafsir Saghir. Optimized for speech research where you need the commentary without the full verse payload.

- [ ] **Step 1: Write tests**

Test cases:
- Returns all commentaries when type is "all"
- Returns only Five Volume Commentary when type is "five_volume"
- Returns only Short Commentary when type is "short"
- Returns only Tafsir Saghir when type is "tafsir_saghir"
- Handles verse with empty commentary gracefully

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement src/tools/get-commentary.ts**

```ts
export async function handleGetCommentary(
  args: { chapter: number; verse: number; type?: string },
  cache: Cache
) { ... }
```

Reuses the same cache-or-fetch pattern from get_verse. Extracts only the commentary fields.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-commentary.ts tests/tools/get-commentary.test.ts
git commit -m "feat: get_commentary tool for focused research"
```

---

## Task 9: get_topics Tool

**Files:**
- Create: `src/tools/get-topics.ts`
- Create: `tests/tools/get-topics.test.ts`

Returns cross-reference topics and related verse references for a given verse. Reads from the `topics` field in cached verse data.

- [ ] **Step 1: Write tests**

Test cases:
- Returns topics with related verse references
- Handles verse with no topics
- Invalid verse returns error

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement src/tools/get-topics.ts**

```ts
export async function handleGetTopics(
  args: { chapter: number; verse: number },
  cache: Cache
) { ... }
```

Format:
```
Topics for [Chapter]:[Verse]

• [Topic Name]
  Related: 2:256, 3:19, 5:3

• [Topic Name]
  Related: ...
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-topics.ts tests/tools/get-topics.test.ts
git commit -m "feat: get_topics tool for cross-reference exploration"
```

---

## Task 10: search_quran Tool

**Files:**
- Create: `src/tools/search-quran.ts`
- Create: `tests/tools/search-quran.test.ts`

Searches cached chapters for keyword matches. Supports filtering by field (arabic, english, urdu, commentary, all).

- [ ] **Step 1: Write tests**

Test cases:
- Finds matching verses in cached chapters
- Respects `search_in` filter (english only, commentary only, etc.)
- Reports which chapters aren't cached
- Returns "no results" when nothing matches
- Case-insensitive search

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement src/tools/search-quran.ts**

```ts
export async function handleSearchQuran(
  args: { query: string; search_in?: string },
  cache: Cache
) { ... }
```

Algorithm:
1. Read status.json to get list of cached chapters
2. For each cached chapter, load the JSON and search verse fields
3. Match query case-insensitively against selected fields
4. Return matching verses (limit to 20 results to avoid overwhelming output)
5. Append note: "Searched X of 114 chapters. Not yet cached: [list]"

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/tools/search-quran.ts tests/tools/search-quran.test.ts
git commit -m "feat: search_quran tool with field filtering"
```

---

## Task 11: search_by_theme Tool

**Files:**
- Create: `src/tools/search-by-theme.ts`
- Create: `tests/tools/search-by-theme.test.ts`

Uses the API's AI-powered `rq_search` endpoint for conceptual/thematic searches. Always hits the API (not local-only).

- [ ] **Step 0: Discover the `rq_search` API response format**

Open https://alislam.org/quran/app/ in browser with DevTools Network tab open. Use the search/AI assistant feature, search for a theme like "patience". Inspect the POST request to `rq_search` — capture the full request body and response JSON. Document the response shape as a comment in the test file so the mock is accurate.

If the endpoint is unavailable or behaves differently than expected, implement this tool as a wrapper around `search_quran` (local keyword search) with a note that theme search can be upgraded when the API schema is known.

- [ ] **Step 1: Write tests**

Test with mocked `searchByTheme` from api.ts (use `vi.mock('../src/api.js')`). Test cases:
- Returns formatted results from API (use discovered response shape for mock)
- Handles API error gracefully (returns user-friendly message)
- Handles empty results

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement src/tools/search-by-theme.ts**

```ts
export async function handleSearchByTheme(
  args: { theme: string }
) { ... }
```

Note: The `rq_search` response format needs to be discovered during implementation. The implementer should:
1. Open https://alislam.org/quran/app/ in browser dev tools
2. Use the search feature and inspect the network request/response
3. Map the response fields to a readable output format
4. Update the spec with the discovered schema

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/tools/search-by-theme.ts tests/tools/search-by-theme.test.ts
git commit -m "feat: search_by_theme tool with API AI search"
```

---

## Task 12: MCP Server Entry Point

**Files:**
- Create: `src/index.ts`

Wires everything together: creates the MCP server, registers all 7 tools with their zod schemas, initializes the cache, kicks off seed fetching, and starts the stdio transport.

- [ ] **Step 1: Implement src/index.ts**

```ts
#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Cache } from './cache.js';
import { handleGetVerse } from './tools/get-verse.js';
import { handleGetSurahInfo } from './tools/get-surah-info.js';
import { handleListSurahs } from './tools/list-surahs.js';
import { handleSearchQuran } from './tools/search-quran.js';
import { handleGetTopics } from './tools/get-topics.js';
import { handleGetCommentary } from './tools/get-commentary.js';
import { handleSearchByTheme } from './tools/search-by-theme.js';
import { SEED_CHAPTERS } from './types.js';
import { fetchVerses, fetchIntro } from './api.js';
import { getSurahMeta } from './data/surah-index.js';

const cache = new Cache();

const server = new McpServer({
  name: 'quran-mcp',
  version: '0.1.0',
});

// Register all 7 tools with zod schemas
server.tool('list_surahs', 'List all 114 surahs with names, verse counts, and revelation type', {}, async () => {
  return handleListSurahs();
});

server.tool('get_verse', 'Get Quran verse(s) with Arabic, English (Sher Ali), Urdu translations and commentary', {
  chapter: z.number().int().min(1).max(114).describe('Surah number (1-114)'),
  verse: z.string().describe('Verse number or range (e.g., "1" or "1-5")'),
}, async (args) => {
  return handleGetVerse(args, cache);
});

server.tool('get_surah_info', 'Get surah metadata and chapter introduction', {
  chapter: z.number().int().min(1).max(114).describe('Surah number (1-114)'),
}, async (args) => {
  return handleGetSurahInfo(args, cache);
});

server.tool('search_quran', 'Search cached Quran verses by keyword', {
  query: z.string().describe('Search query'),
  search_in: z.enum(['arabic', 'english', 'urdu', 'commentary', 'all']).optional().default('all')
    .describe('Which fields to search'),
}, async (args) => {
  return handleSearchQuran(args, cache);
});

server.tool('get_topics', 'Get cross-reference topics and related verses', {
  chapter: z.number().int().min(1).max(114).describe('Surah number (1-114)'),
  verse: z.number().int().min(1).describe('Verse number'),
}, async (args) => {
  return handleGetTopics(args, cache);
});

server.tool('get_commentary', 'Get commentary for a verse (Five Volume, Short, Tafsir Saghir)', {
  chapter: z.number().int().min(1).max(114).describe('Surah number (1-114)'),
  verse: z.number().int().min(1).describe('Verse number'),
  type: z.enum(['five_volume', 'short', 'tafsir_saghir', 'all']).optional().default('all')
    .describe('Commentary type'),
}, async (args) => {
  return handleGetCommentary(args, cache);
});

server.tool('search_by_theme', 'Find verses by theme using AI-powered search (requires internet)', {
  theme: z.string().describe('Theme or concept to search for (e.g., "patience", "mercy", "prayer")'),
}, async (args) => {
  return handleSearchByTheme(args);
});

// Initialize and start
async function main() {
  await cache.init();

  // Seed chapters in background (non-blocking)
  seedCache().catch(err => console.error('Seed error:', err));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function seedCache() {
  const status = await cache.getStatus();
  if (status.seed_complete || status.seed_in_progress) return;

  await cache.updateStatus({ seed_in_progress: true });

  for (const ch of SEED_CHAPTERS) {
    if (await cache.isChapterCached(ch)) continue;
    try {
      const meta = getSurahMeta(ch);
      if (!meta) continue;
      const verses = await fetchVerses(ch, 1, meta.verse_count);
      await cache.saveChapter({
        chapter: ch,
        name_arabic: meta.name_arabic,
        name_english: meta.name_english,
        verse_count: meta.verse_count,
        cached_at: new Date().toISOString(),
        verses,
      });
      // Small delay between chapters to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Failed to seed chapter ${ch}:`, err);
    }
  }

  // Also seed intros for seed chapters
  for (const ch of SEED_CHAPTERS) {
    if (await cache.isIntroCached(ch)) continue;
    try {
      const introData = await fetchIntro(ch);
      await cache.saveIntro({
        chapter: ch,
        cached_at: new Date().toISOString(),
        ...introData,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Failed to seed intro ${ch}:`, err);
    }
  }

  await cache.updateStatus({ seed_complete: true, seed_in_progress: false });
}

main().catch(console.error);
```

- [ ] **Step 2: Build and verify TypeScript compiles**

Run: `npx tsc`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: MCP server entry point with all tools and seed logic"
```

---

## Task 13: Integration Test — Manual Verification

**Files:** none (manual testing)

Verify the server works end-to-end with a real MCP client.

- [ ] **Step 1: Build the project**

```bash
npm run build
```

- [ ] **Step 2: Test with MCP inspector (if available) or direct stdio**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
```

Verify it responds with server capabilities listing all 7 tools.

- [ ] **Step 3: Test list_surahs tool**

Send a `tools/call` request for `list_surahs` and verify it returns 114 surahs.

- [ ] **Step 4: Wait for seed to complete, then test get_verse**

After a minute or two, test `get_verse` with chapter 1, verse 1 to verify cached data is returned with Arabic, English, Urdu, and commentaries.

- [ ] **Step 5: Add server to Claude Code config**

Add to `~/.claude/claude_desktop_config.json` or Claude Code MCP settings:

```json
{
  "mcpServers": {
    "quran": {
      "command": "node",
      "args": ["/Users/mamjed/Documents/GitHub/quran-mcp/dist/index.js"]
    }
  }
}
```

- [ ] **Step 6: Commit any fixes discovered during integration testing**

---

## Task 14: Run All Tests & Final Commit

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

- [ ] **Step 3: Final commit if any loose changes**

```bash
git add -A
git commit -m "chore: final cleanup and all tests passing"
```

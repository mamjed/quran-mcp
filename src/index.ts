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
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Failed to seed chapter ${ch}:`, err);
    }
  }

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

async function main() {
  await cache.init();
  seedCache().catch(err => console.error('Seed error:', err));
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

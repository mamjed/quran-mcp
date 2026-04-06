#!/usr/bin/env node
/**
 * Quran MCP Server
 * Powered by alislam.org/quran/app (Ahmadiyya Muslim Community)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getVerses,
  getChapterIntro,
  searchQuran,
  CHAPTERS,
  type VerseOptions,
  type Verse,
  type TranslationId,
} from "./quran-api.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "quran-mcp",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const TranslationSchema = z
  .enum(["en", "zk", "sc", "v5", "ur", "ts", "fr", "es", "de", "it", "my", "bn", "cn", "nw", "sv"])
  .describe(
    "Translation ID: en=Maulawi Sher Ali (English, default), zk=Zafrulla Khan (English), " +
    "sc=Short Commentary (English), v5=Five Volume Commentary (English), " +
    "ur=Urdu (Mirza Tahir Ahmad), ts=Tafsir Saghir (Urdu), fr=French, es=Spanish, " +
    "de=German, it=Italian, my=Myanmar, bn=Bangla, cn=Chinese, nw=Norwegian, sv=Swedish"
  );

/** Convert a comma-separated translation string to VerseOptions */
function buildOptions(translations: string): VerseOptions {
  const ids = translations.split(",").map((t) => t.trim()) as TranslationId[];
  const opts: VerseOptions = {};
  for (const id of ids) {
    (opts as Record<string, boolean>)[id] = true;
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Helper: format verses as readable text
// ---------------------------------------------------------------------------

function formatVerses(verses: Verse[], translations: string): string {
  const ids = translations.split(",").map((t) => t.trim()) as TranslationId[];
  return verses
    .map((v) => {
      const ref = `[${v.ch}:${v.v}]`;
      const lines: string[] = [ref];
      if (v.ar) lines.push(`Arabic: ${v.ar.replace(/<[^>]+>/g, "")}`);
      for (const id of ids) {
        const t = v[id as keyof Verse] as { text: string; notes: Array<{ ref: string; note: string }> } | undefined;
        if (t?.text) {
          const label = id.toUpperCase();
          const clean = t.text.replace(/<[^>]+>/g, "").replace(/\[([a-z\d]+)\]/g, "").trim();
          lines.push(`${label}: ${clean}`);
          // Append footnotes inline if present
          if (t.notes.length > 0) {
            const noteLines = t.notes
              .map((n) => `  [${n.ref}] ${n.note.replace(/<[^>]+>/g, "").trim()}`)
              .join("\n");
            lines.push(noteLines);
          }
        }
      }
      if (v.topics && v.topics.length > 0) {
        lines.push(`Topics: ${v.topics.map((tp) => tp.topic.replace(/<[^>]+>/g, "")).join("; ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Tool: list_chapters
// ---------------------------------------------------------------------------

server.tool(
  "list_chapters",
  "List all 114 chapters (surahs) of the Holy Quran with their names, verse counts, and revelation type.",
  {
    filter: z
      .string()
      .optional()
      .describe("Optional keyword to filter by name (e.g. 'al', 'maryam')"),
  },
  async ({ filter }) => {
    let chapters = CHAPTERS;
    if (filter) {
      const q = filter.toLowerCase();
      chapters = CHAPTERS.filter(
        (c) => c.name.toLowerCase().includes(q) || c.arabic.includes(q)
      );
    }
    const text = chapters
      .map(
        (c) =>
          `${c.number}. ${c.name} (${c.arabic}) — ${c.verses} verses — ${c.type}`
      )
      .join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_verses
// ---------------------------------------------------------------------------

server.tool(
  "get_verses",
  "Retrieve one or more verses from a chapter of the Holy Quran with translations and footnotes.",
  {
    chapter: z
      .number()
      .int()
      .min(1)
      .max(114)
      .describe("Chapter (surah) number, 1–114"),
    from_verse: z
      .number()
      .int()
      .min(1)
      .describe("Starting verse number (1-based)"),
    to_verse: z
      .number()
      .int()
      .min(1)
      .describe("Ending verse number (inclusive). Use the same value as from_verse for a single verse."),
    translations: z
      .string()
      .optional()
      .default("en")
      .describe(
        "Comma-separated translation IDs to include. " +
        "Examples: 'en', 'en,sc', 'en,ur'. " +
        "Available: en, zk, sc, v5, ur, ts, fr, es, de, it, my, bn, cn, nw, sv"
      ),
  },
  async ({ chapter, from_verse, to_verse, translations }) => {
    const opts = buildOptions(translations);
    const verses = await getVerses(chapter, from_verse, to_verse, opts);
    const chapterMeta = CHAPTERS[chapter - 1];
    const header = `${chapterMeta.name} (Chapter ${chapter}) — Verses ${from_verse}–${to_verse}\n${"─".repeat(60)}`;
    const body = formatVerses(verses, translations);
    return { content: [{ type: "text", text: `${header}\n${body}` }] };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_chapter
// ---------------------------------------------------------------------------

server.tool(
  "get_chapter",
  "Retrieve an entire chapter (surah) of the Holy Quran.",
  {
    chapter: z
      .number()
      .int()
      .min(1)
      .max(114)
      .describe("Chapter (surah) number, 1–114"),
    translations: z
      .string()
      .optional()
      .default("en")
      .describe("Comma-separated translation IDs (e.g. 'en', 'en,sc')"),
  },
  async ({ chapter, translations }) => {
    const meta = CHAPTERS[chapter - 1];
    const opts = buildOptions(translations);
    const verses = await getVerses(chapter, 1, meta.verses, opts);
    const header = `${meta.name} (Chapter ${chapter}, ${meta.type}) — ${meta.verses} verses\n${"─".repeat(60)}`;
    const body = formatVerses(verses, translations);
    return { content: [{ type: "text", text: `${header}\n${body}` }] };
  }
);

// ---------------------------------------------------------------------------
// Tool: get_chapter_intro
// ---------------------------------------------------------------------------

server.tool(
  "get_chapter_intro",
  "Get the scholarly introduction to a chapter of the Quran, covering history, names, and subject matter. Content from the Five Volume Commentary (Ahmadiyya Muslim Community).",
  {
    chapter: z
      .number()
      .int()
      .min(1)
      .max(114)
      .describe("Chapter (surah) number, 1–114"),
    language: z
      .enum(["en", "ur"])
      .optional()
      .default("en")
      .describe("Language for the introduction: 'en' (English) or 'ur' (Urdu)"),
  },
  async ({ chapter, language }) => {
    const intro = await getChapterIntro(chapter);
    const html = language === "ur" ? intro.intro_ur : intro.intro_en;
    // Strip HTML tags for clean text
    const clean = html
      .replace(/<h[1-6][^>]*>/gi, "\n\n### ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<i>/gi, "_")
      .replace(/<\/i>/gi, "_")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const header = `### ${intro.chapter_name} — Chapter ${chapter} Introduction\n${"─".repeat(60)}`;
    return { content: [{ type: "text", text: `${header}\n${clean}` }] };
  }
);

// ---------------------------------------------------------------------------
// Tool: search_quran
// ---------------------------------------------------------------------------

server.tool(
  "search_quran",
  'Search for a word, phrase, or topic across the Holy Quran. Wrap a phrase in quotes for exact matching, e.g. "in the name of Allah". Supports AI-enhanced contextual search.',
  {
    query: z
      .string()
      .min(1)
      .describe(
        'Search term or phrase. Use quotes for exact phrase search, e.g. "believers who do good"'
      ),
    translations: z
      .string()
      .optional()
      .default("en")
      .describe("Comma-separated translation IDs to search within and return (e.g. 'en', 'en,sc')"),
    ai: z
      .boolean()
      .optional()
      .default(false)
      .describe("Use AI-enhanced contextual/semantic search (default: false = keyword search)"),
    max_results: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of verses to return (1–50, default: 10)"),
  },
  async ({ query, translations, ai, max_results }) => {
    const opts = buildOptions(translations);
    const result = await searchQuran(query, opts, ai);
    const shown = result.verses.slice(0, max_results);
    const header =
      `Search: "${query}" — ${result.total_hits} total hits (showing ${shown.length})\n` +
      `${"─".repeat(60)}`;
    const body = formatVerses(shown, translations);
    return { content: [{ type: "text", text: `${header}\n${body}` }] };
  }
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use stderr so it doesn't pollute the MCP stdio channel
  process.stderr.write("Quran MCP server running\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});

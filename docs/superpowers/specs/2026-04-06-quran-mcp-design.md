# Quran MCP Server — Design Spec

## Overview

A TypeScript MCP server that gives AI tools access to the Quran and Ahmadiyya translations/commentary via data from `api.readquran.app`. Designed for personal use with Claude Code/Claude Desktop to support research and speech-writing.

## Data Sources

- **API:** `api.readquran.app` (private REST API powering alislam.org/quran/app)
- **No existing MCP server** provides Ahmadiyya translations (Maulawi Sher Ali, Five Volume Commentary, etc.)

## Translations & Content

Each verse includes:

| Key | Content |
|-----|---------|
| `arabic` | Arabic text with diacritical marks |
| `english` | Maulawi Sher Ali English translation |
| `urdu` | Urdu translation |
| `short_commentary` | Short Commentary (SC) |
| `five_volume_commentary` | Five Volume Commentary (V5) |
| `tafsir_saghir` | Tafsir Saghir (TS) |

Additional metadata per verse: topics, tafseer references, citations, hadith links.

## Architecture

```
AI Agent  ->  MCP Server (stdio)  ->  Cache Layer  ->  Local JSON files
                                          | (cache miss)
                                          v
                                    api.readquran.app
```

- **Transport:** stdio (standard for local MCP servers)
- **Runtime:** Node.js >= 18, TypeScript, ES modules
- **Dependencies:** `@modelcontextprotocol/sdk`, `zod`

## MCP Tools

### 1. `get_verse`
Get specific verse(s) with all translations and commentary.
- **Params:** `chapter` (1-114), `verse` (number or range string like `"1-5"`)
- **Returns:** Arabic, English, Urdu, commentaries, metadata

### 2. `get_surah_info`
Get surah metadata and chapter introduction.
- **Params:** `chapter` (1-114)
- **Returns:** Name (Arabic/English), verse count, revelation type, introduction text

### 3. `list_surahs`
List all 114 surahs with names and verse counts.
- **Params:** none
- **Returns:** Array of surah metadata (served from local index, no API call)

### 4. `search_quran`
Search verses by keyword/phrase across cached chapters.
- **Params:** `query` (string), `search_in` (optional: `"arabic"`, `"english"`, `"urdu"`, `"commentary"`, `"all"` — default `"all"`)
- **Returns:** Matching verses with context
- **Note:** Only searches cached chapters; reports which chapters are not yet cached

### 5. `get_topics`
Get cross-reference topics and related verses for a given verse.
- **Params:** `chapter`, `verse`
- **Returns:** Topic list with related verse references

### 6. `get_commentary`
Get just the commentary for a verse (optimized for research deep-dives).
- **Params:** `chapter`, `verse`, `type` (optional: `"five_volume"`, `"short"`, `"tafsir_saghir"`, `"all"` — default `"all"`)
- **Returns:** Requested commentary text

### 7. `search_by_theme`
Find verses related to a theme/concept using the API's AI-powered search.
- **Params:** `theme` (string, e.g., "patience in adversity", "prayer", "justice")
- **Returns:** Relevant verses with translations
- **Note:** Always hits API (not local-only)

## Caching Strategy

### Location
`~/.quran-mcp/cache/`

### File Structure
```
~/.quran-mcp/cache/
  index.json          # All 114 surah names, verse counts, metadata
  status.json         # Tracks which chapters are cached (schema below)
  chapter-1.json      # Verse data for Al-Fatiha
  chapter-2.json      # Verse data for Al-Baqarah
  intro-1.json        # Chapter introduction for Al-Fatiha
  intro-2.json        # Chapter introduction for Al-Baqarah
  ...
```

### Chapter File Format
```json
{
  "chapter": 1,
  "name_arabic": "الفاتحة",
  "name_english": "Al-Fatiha",
  "verse_count": 7,
  "cached_at": "2026-04-06T12:00:00Z",
  "verses": [
    {
      "chapter": 1,
      "verse": 1,
      "arabic": "...",
      "english": "...",
      "urdu": "...",
      "short_commentary": "...",
      "five_volume_commentary": "...",
      "tafsir_saghir": "...",
      "topics": [],
      "tafaseer": [],
      "citations": [],
      "hadiths": []
    }
  ]
}
```

### Status File Format (`status.json`)
```json
{
  "cached_chapters": [1, 2, 3],
  "cached_intros": [1, 2, 3],
  "seed_complete": true,
  "seed_in_progress": false,
  "last_updated": "2026-04-06T12:00:00Z"
}
```

### Lazy Caching with Seed
- **On first run:** Fetch 10 seed chapters in the background (non-blocking)
- **On cache miss:** Fetch chapter from API, cache locally, then return
- **Cache is permanent:** Quran text doesn't change; no expiry needed
- **Seed failure handling:** Seed fetching is best-effort; incomplete seeds are retried on next startup. `seed_in_progress` flag in `status.json` prevents concurrent fetching

### Seed Chapters
1. Al-Fatiha (1)
2. Al-Baqarah (2)
3. Al-Imran (3)
4. Al-Kahf (18)
5. Maryam (19)
6. An-Nur (24)
7. Ya-Sin (36)
8. Ar-Rahman (55)
9. Al-Jumu'ah (62)
10. Al-Mulk (67)

## API Integration

### Verse Numbering
The Ahmadiyya convention counts Bismillah as verse 1 for every surah (except At-Tawbah). The `api.readquran.app` API follows this convention. All tools use this numbering.

### Verse Retrieval
```
POST https://api.readquran.app/chapter/{ch}:{startVerse}-{endVerse}
Body: { "en": true, "sc": true, "v5": true, "ur": true, "ts": true, "sp_en": false, "sp_ur": false, "hover": false }
```

Fetch in chunks of 50 verses for large chapters (keeps response size manageable and avoids timeouts), then combine.

**API Response Format (abbreviated):**
```json
[
  {
    "ch": 1, "v": 1,
    "ar": "بِسۡمِ اللّٰہِ الرَّحۡمٰنِ الرَّحِیۡمِ",
    "en": { "text": "In the name of Allah...", "notes": "..." },
    "ur": { "text": "...", "notes": "..." },
    "sc": { "text": "Short commentary text..." },
    "v5": { "text": "Five volume commentary text..." },
    "ts": { "text": "Tafsir Saghir text..." },
    "words": [ { "ar": "بِسۡمِ", "en": "In the name" } ],
    "topics": [ { "name": "Attributes of Allah", "refs": ["1:1", "2:256"] } ],
    "tafaseer": ["SB", "P", "H"],
    "citations": [ { "book": "Essence of Islam", "ref": "Vol. 1, p. 50" } ],
    "hadiths": [ { "ref": "Sahih Bukhari, Kitab al-Tafsir" } ],
    "tq": "https://youtube.com/..."
  }
]
```

**Field mapping (API -> Cache):**
| API key | Cache key | Notes |
|---------|-----------|-------|
| `ar` | `arabic` | Direct copy |
| `en.text` | `english` | Extract `.text`; discard `.notes` unless useful |
| `ur.text` | `urdu` | Extract `.text` |
| `sc.text` | `short_commentary` | Extract `.text` |
| `v5.text` | `five_volume_commentary` | Extract `.text` |
| `ts.text` | `tafsir_saghir` | Extract `.text` |
| `topics` | `topics` | Direct copy — this is where `get_topics` reads from |
| `tafaseer` | `tafaseer` | Direct copy |
| `citations` | `citations` | Direct copy |
| `hadiths` | `hadiths` | Direct copy |

### Chapter Introduction
```
GET https://api.readquran.app/chapter/intro/{ch}
```

**Response:** HTML-formatted introduction text with English and Urdu sections.

**Intro cache file format** (`intro-{n}.json`):
```json
{
  "chapter": 1,
  "cached_at": "2026-04-06T12:00:00Z",
  "english": "Introduction text in English...",
  "urdu": "Introduction text in Urdu..."
}
```

### AI-Powered Search
```
POST https://api.readquran.app/rq_search
Body: { "query": "patience in adversity" }
```

**Note:** The exact request/response schema for `rq_search` needs to be discovered via network inspection during implementation. The implementer should capture a sample request/response and update this section.

## Error Handling

- **No internet:** Serve cached chapters; return clear message for uncached ones
- **API errors:** Retry once, then surface error to agent
- **Invalid references:** Validate against surah index before API calls
- **Large chapters:** Chunk requests (50 verses per call)

## Project Structure
```
src/
  index.ts          # MCP server entry point, tool registration (includes #!/usr/bin/env node shebang)
  api.ts            # API client for api.readquran.app
  cache.ts          # Cache read/write/status logic
  tools/
    get-verse.ts
    get-surah-info.ts
    list-surahs.ts
    search-quran.ts
    get-topics.ts
    get-commentary.ts
    search-by-theme.ts
  data/
    surah-index.ts  # Hardcoded 114 surah metadata
  types.ts          # Shared TypeScript types
```

## Out of Scope
- npm publishing / packaging for others
- Audio playback
- Word-by-word translation
- Translations beyond English (Sher Ali), Urdu
- UI or web interface

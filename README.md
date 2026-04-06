# quran-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the Holy Quran, powered by the [Ahmadiyya Muslim Community](https://alislam.org) Quran app backend (`api.readquran.app`).

Gives any MCP-compatible AI assistant (Claude, Warp Oz, etc.) direct access to:
- All 114 chapters with verse-by-verse translations
- 15 languages / translation editions
- Short Commentary & Five Volume Commentary footnotes
- Full-text keyword and AI-enhanced semantic search
- Scholarly chapter introductions

---

## Tools

| Tool | Description |
|---|---|
| `list_chapters` | List all 114 surahs with names, verse counts, and revelation type |
| `get_verses` | Get specific verse range with translations and footnotes |
| `get_chapter` | Get an entire chapter |
| `get_chapter_intro` | Get the scholarly introduction to a chapter |
| `search_quran` | Keyword or AI-enhanced search across all verses |

### Translations

Pass a comma-separated string of IDs to the `translations` parameter:

| ID | Language / Edition |
|---|---|
| `en` | English — Maulawi Sher Ali *(default)* |
| `zk` | English — Muhammad Zafrulla Khan |
| `sc` | English — Short Commentary (ed. Malik Ghulam Farid) |
| `v5` | English — Five Volume Commentary |
| `ur` | Urdu — Hazrat Mirza Tahir Ahmad |
| `ts` | Urdu — Tafsir Saghir |
| `fr` | French |
| `es` | Spanish |
| `de` | German |
| `it` | Italian |
| `my` | Myanmar |
| `bn` | Bangla |
| `cn` | Chinese (Short Commentary) |
| `nw` | Norwegian (Short Commentary) |
| `sv` | Swedish |

---

## Installation

### Prerequisites
- Node.js ≥ 18

### From source

```bash
git clone https://github.com/mamjed/quran-mcp.git
cd quran-mcp
npm install
npm run build
```

---

## Add to Warp (MCP config)

Open **Warp Settings → AI → MCP Servers** and add:

```json
{
  "quran-mcp": {
    "command": "node",
    "args": ["/absolute/path/to/quran-mcp/dist/index.js"]
  }
}
```

---

## Example queries

Once connected in Warp, you can ask:

- *"Recite Al-Fatihah with the Short Commentary"*
- *"Search for verses about patience in the Quran"*
- *"Get the introduction to Surah Al-Baqarah"*
- *"Show me 2:255 (Ayatul Kursi) in English and Urdu"*
- *"Find all verses mentioning the Day of Judgment (AI search)"*

---

## Data sources

All Quran content is © [Ahmadiyya Muslim Community](https://alislam.org). This MCP server is an unofficial client of the public API backing [alislam.org/quran/app](https://alislam.org/quran/app).

- API: `https://api.readquran.app`
- Short Commentary PDF: [files.alislam.cloud](https://files.alislam.cloud/pdf/Holy-Quran-English.pdf)
- Five Volume Commentary: [new.alislam.org](https://new.alislam.org/library/books/quran-english-short-commentary)

---

## Development

```bash
npm run dev        # watch mode (TypeScript)
npm run typecheck  # type-check without building
npm run build      # compile to dist/
```

## License

MIT
A Model Context Protocol (MCP) server for Quran data — search ayahs, browse surahs, retrieve translations, and more.

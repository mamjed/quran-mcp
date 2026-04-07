import { searchByTheme } from '../api.js';

function formatResults(data: any, theme: string): string {
  const sections: string[] = [`Theme search results for "${theme}"`, ''];

  // Try to parse as array of results
  const results = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

  if (Array.isArray(results) && results.length > 0) {
    for (const item of results.slice(0, 20)) {
      const ref = item.ch && item.v ? `${item.ch}:${item.v}` : '';
      const text = item.text ?? item.en?.text ?? item.english ?? '';
      if (ref || text) {
        sections.push(`${ref}${ref && text ? ' — ' : ''}${text}`);
      } else {
        // Unknown item format, stringify it
        sections.push(JSON.stringify(item));
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Unknown response format — return raw JSON for the AI to interpret
    sections.push('Raw API response (format not yet mapped):');
    sections.push(JSON.stringify(data, null, 2).substring(0, 3000));
  } else {
    sections.push('No results found.');
  }

  return sections.join('\n');
}

export async function handleSearchByTheme(
  args: { theme: string }
) {
  const { theme } = args;

  try {
    const data = await searchByTheme(theme);
    const text = formatResults(data, theme);
    return {
      content: [{ type: 'text' as const, text }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text' as const, text: `Search error: ${message}. This tool requires internet access.` }],
      isError: true,
    };
  }
}

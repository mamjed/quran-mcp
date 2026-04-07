import { describe, it, expect, vi } from 'vitest';
import { handleSearchByTheme } from '../../src/tools/search-by-theme.js';

vi.mock('../../src/api.js', () => ({
  searchByTheme: vi.fn(),
}));

import { searchByTheme } from '../../src/api.js';
const mockSearchByTheme = vi.mocked(searchByTheme);

describe('search_by_theme tool', () => {
  it('returns formatted results from API', async () => {
    // Mock a possible response shape — array of verse references
    mockSearchByTheme.mockResolvedValueOnce({
      results: [
        { ch: 2, v: 153, text: 'O ye who believe! seek help with patience and Prayer' },
        { ch: 3, v: 187, text: 'And Allah loves the steadfast' },
      ],
    });

    const result = await handleSearchByTheme({ theme: 'patience' });
    const text = result.content[0].text;
    expect(text).toContain('patience');
    expect(result.isError).toBeUndefined();
  });

  it('handles API error gracefully', async () => {
    mockSearchByTheme.mockRejectedValueOnce(new Error('Network error'));

    const result = await handleSearchByTheme({ theme: 'patience' });
    const text = result.content[0].text;
    expect(text).toContain('error');
    expect(result.isError).toBe(true);
  });

  it('handles empty results', async () => {
    mockSearchByTheme.mockResolvedValueOnce({ results: [] });

    const result = await handleSearchByTheme({ theme: 'xyznonexistent' });
    const text = result.content[0].text;
    expect(text).toBeTruthy();
  });
});

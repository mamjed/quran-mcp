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

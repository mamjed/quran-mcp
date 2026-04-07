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

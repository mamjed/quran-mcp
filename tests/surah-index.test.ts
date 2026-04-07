import { describe, it, expect } from 'vitest';
import { SURAH_INDEX, getSurahMeta, isValidReference } from '../src/data/surah-index.js';

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

  it('getSurahMeta returns correct surah', () => {
    const meta = getSurahMeta(1);
    expect(meta?.name_english).toBe('Al-Fatiha');
  });

  it('getSurahMeta returns undefined for invalid chapter', () => {
    expect(getSurahMeta(0)).toBeUndefined();
    expect(getSurahMeta(115)).toBeUndefined();
  });

  it('isValidReference validates correctly', () => {
    expect(isValidReference(1)).toBe(true);
    expect(isValidReference(1, 1)).toBe(true);
    expect(isValidReference(1, 7)).toBe(true);
    expect(isValidReference(1, 8)).toBe(false);
    expect(isValidReference(0)).toBe(false);
    expect(isValidReference(115)).toBe(false);
  });
});

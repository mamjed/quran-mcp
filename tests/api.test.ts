import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVerses, transformApiVerse } from '../src/api.js';

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

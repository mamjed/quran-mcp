export interface SurahMeta {
  chapter: number;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  verse_count: number;
  revelation_type: 'Meccan' | 'Medinan';
}

export interface Topic {
  name: string;
  refs: string[];
}

export interface Citation {
  book: string;
  ref: string;
}

export interface HadithRef {
  ref: string;
}

export interface Verse {
  chapter: number;
  verse: number;
  arabic: string;
  english: string;
  urdu: string;
  short_commentary: string;
  five_volume_commentary: string;
  tafsir_saghir: string;
  topics: Topic[];
  tafaseer: string[];
  citations: Citation[];
  hadiths: HadithRef[];
}

export interface CachedChapter {
  chapter: number;
  name_arabic: string;
  name_english: string;
  verse_count: number;
  cached_at: string;
  verses: Verse[];
}

export interface CachedIntro {
  chapter: number;
  cached_at: string;
  english: string;
  urdu: string;
}

export interface CacheStatus {
  cached_chapters: number[];
  cached_intros: number[];
  seed_complete: boolean;
  seed_in_progress: boolean;
  last_updated: string;
}

export const SEED_CHAPTERS = [1, 2, 3, 18, 19, 24, 36, 55, 62, 67];

export const API_BASE = 'https://api.readquran.app';

export const VERSE_CHUNK_SIZE = 50;

export const API_REQUEST_BODY = {
  en: true, sc: true, v5: true, ur: true, ts: true,
  sp_en: false, sp_ur: false, hover: false,
};

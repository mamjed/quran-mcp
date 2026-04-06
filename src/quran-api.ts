/**
 * API client for api.readquran.app — the backend powering alislam.org/quran/app
 * All Quran content © Ahmadiyya Muslim Community (alislam.org)
 */

const BASE_URL = "https://api.readquran.app";
const SEARCH_URL = `${BASE_URL}/rq_search`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TranslationId =
  | "en"   // Maulawi Sher Ali (English)
  | "zk"   // Muhammad Zafrulla Khan (English)
  | "sc"   // Short Commentary (English)
  | "v5"   // Five Volume Commentary (English)
  | "ur"   // Urdu — Hazrat Mirza Tahir Ahmad
  | "ts"   // Tafsir Saghir (Urdu)
  | "fr"   // French
  | "es"   // Spanish
  | "de"   // German
  | "it"   // Italian
  | "my"   // Myanmar
  | "bn"   // Bangla
  | "cn"   // Chinese (Short Commentary)
  | "nw"   // Norwegian (Short Commentary)
  | "sv";  // Swedish

export interface TranslationText {
  text: string;
  notes: Array<{ ref: string; note: string }>;
}

export interface Topic {
  id: number;
  topic: string;
  verses: string | null;
}

export interface TqLink {
  ch: number;
  v: number;
  url: string;
}

export interface WordTranslation {
  t: string;
}

export interface Verse {
  ch: number;
  v: number;
  v_: number;
  ar?: string; // Arabic text (present in search results)
  topics: Topic[];
  tq?: TqLink;
  tafaseer: string[];
  citations?: Array<{ title: string; slug: string; language: string }>;
  en?: TranslationText;
  zk?: TranslationText;
  sc?: TranslationText;
  v5?: TranslationText;
  ur?: TranslationText;
  ts?: TranslationText;
  fr?: TranslationText;
  es?: TranslationText;
  de?: TranslationText;
  it?: TranslationText;
  my?: TranslationText;
  bn?: TranslationText;
  cn?: TranslationText;
  nw?: TranslationText;
  sv?: TranslationText;
  words?: WordTranslation[]; // split-word translations
}

export interface ChapterIntro {
  chapter_name: string;
  chapter_name_ur: string;
  ch: number;
  intro_en: string;
  intro_ur: string;
}

export interface SearchResult {
  total_hits: number;
  time: string;
  verses: Verse[];
  landmark?: boolean;
}

export type VerseOptions = Partial<Record<TranslationId, boolean>> & {
  sp_en?: boolean; // split-word English
  sp_ur?: boolean; // split-word Urdu
  f?: number;      // font style
  hover?: number;
  ai?: boolean;    // AI-enhanced contextual search
};

// ---------------------------------------------------------------------------
// Chapter metadata (static — 114 surahs)
// ---------------------------------------------------------------------------

export interface ChapterMeta {
  number: number;
  name: string;      // English transliteration
  arabic: string;    // Arabic name
  verses: number;    // total verse count (including Bismillah where applicable)
  type: "Meccan" | "Medinan";
}

export const CHAPTERS: ChapterMeta[] = [
  { number: 1,   name: "Al-Fatihah",         arabic: "الفاتحة",    verses: 7,   type: "Meccan"  },
  { number: 2,   name: "Al-Baqarah",         arabic: "البقرة",     verses: 287, type: "Medinan" },
  { number: 3,   name: "Aal-e-Imran",        arabic: "آل عمران",   verses: 201, type: "Medinan" },
  { number: 4,   name: "An-Nisa",            arabic: "النساء",     verses: 177, type: "Medinan" },
  { number: 5,   name: "Al-Ma'idah",         arabic: "المائدة",    verses: 121, type: "Medinan" },
  { number: 6,   name: "Al-An'am",           arabic: "الأنعام",    verses: 166, type: "Meccan"  },
  { number: 7,   name: "Al-A'raf",           arabic: "الأعراف",    verses: 207, type: "Meccan"  },
  { number: 8,   name: "Al-Anfal",           arabic: "الأنفال",    verses: 76,  type: "Medinan" },
  { number: 9,   name: "At-Taubah",          arabic: "التوبة",     verses: 130, type: "Medinan" },
  { number: 10,  name: "Yunus",              arabic: "يونس",       verses: 110, type: "Meccan"  },
  { number: 11,  name: "Hud",                arabic: "هود",        verses: 124, type: "Meccan"  },
  { number: 12,  name: "Yusuf",              arabic: "يوسف",       verses: 112, type: "Meccan"  },
  { number: 13,  name: "Ar-Ra'd",            arabic: "الرعد",      verses: 44,  type: "Medinan" },
  { number: 14,  name: "Ibrahim",            arabic: "إبراهيم",    verses: 53,  type: "Meccan"  },
  { number: 15,  name: "Al-Hijr",            arabic: "الحجر",      verses: 100, type: "Meccan"  },
  { number: 16,  name: "An-Nahl",            arabic: "النحل",      verses: 129, type: "Meccan"  },
  { number: 17,  name: "Bani Isra'il",       arabic: "الإسراء",    verses: 112, type: "Meccan"  },
  { number: 18,  name: "Al-Kahf",            arabic: "الكهف",      verses: 111, type: "Meccan"  },
  { number: 19,  name: "Maryam",             arabic: "مريم",       verses: 99,  type: "Meccan"  },
  { number: 20,  name: "Ta Ha",              arabic: "طه",         verses: 136, type: "Meccan"  },
  { number: 21,  name: "Al-Anbiya",          arabic: "الأنبياء",   verses: 113, type: "Meccan"  },
  { number: 22,  name: "Al-Hajj",            arabic: "الحج",       verses: 79,  type: "Medinan" },
  { number: 23,  name: "Al-Mu'minun",        arabic: "المؤمنون",   verses: 119, type: "Meccan"  },
  { number: 24,  name: "An-Nur",             arabic: "النور",      verses: 65,  type: "Medinan" },
  { number: 25,  name: "Al-Furqan",          arabic: "الفرقان",    verses: 78,  type: "Meccan"  },
  { number: 26,  name: "Ash-Shu'ara",        arabic: "الشعراء",    verses: 228, type: "Meccan"  },
  { number: 27,  name: "An-Naml",            arabic: "النمل",      verses: 94,  type: "Meccan"  },
  { number: 28,  name: "Al-Qasas",           arabic: "القصص",      verses: 89,  type: "Meccan"  },
  { number: 29,  name: "Al-'Ankabut",        arabic: "العنكبوت",   verses: 70,  type: "Meccan"  },
  { number: 30,  name: "Ar-Rum",             arabic: "الروم",      verses: 61,  type: "Meccan"  },
  { number: 31,  name: "Luqman",             arabic: "لقمان",      verses: 35,  type: "Meccan"  },
  { number: 32,  name: "As-Sajdah",          arabic: "السجدة",     verses: 31,  type: "Meccan"  },
  { number: 33,  name: "Al-Ahzab",           arabic: "الأحزاب",    verses: 74,  type: "Medinan" },
  { number: 34,  name: "Saba",               arabic: "سبأ",        verses: 55,  type: "Meccan"  },
  { number: 35,  name: "Fatir",              arabic: "فاطر",       verses: 46,  type: "Meccan"  },
  { number: 36,  name: "Ya Sin",             arabic: "يس",         verses: 84,  type: "Meccan"  },
  { number: 37,  name: "As-Saffat",          arabic: "الصافات",    verses: 183, type: "Meccan"  },
  { number: 38,  name: "Sad",                arabic: "ص",          verses: 89,  type: "Meccan"  },
  { number: 39,  name: "Az-Zumar",           arabic: "الزمر",      verses: 76,  type: "Meccan"  },
  { number: 40,  name: "Al-Mu'min",          arabic: "غافر",       verses: 86,  type: "Meccan"  },
  { number: 41,  name: "Ha Mim As-Sajdah",   arabic: "فصلت",       verses: 55,  type: "Meccan"  },
  { number: 42,  name: "Ash-Shura",          arabic: "الشورى",     verses: 54,  type: "Meccan"  },
  { number: 43,  name: "Az-Zukhruf",         arabic: "الزخرف",     verses: 90,  type: "Meccan"  },
  { number: 44,  name: "Ad-Dukhan",          arabic: "الدخان",     verses: 60,  type: "Meccan"  },
  { number: 45,  name: "Al-Jathiyah",        arabic: "الجاثية",    verses: 38,  type: "Meccan"  },
  { number: 46,  name: "Al-Ahqaf",           arabic: "الأحقاف",    verses: 36,  type: "Meccan"  },
  { number: 47,  name: "Muhammad",           arabic: "محمد",       verses: 39,  type: "Medinan" },
  { number: 48,  name: "Al-Fath",            arabic: "الفتح",      verses: 30,  type: "Medinan" },
  { number: 49,  name: "Al-Hujurat",         arabic: "الحجرات",    verses: 19,  type: "Medinan" },
  { number: 50,  name: "Qaf",                arabic: "ق",          verses: 46,  type: "Meccan"  },
  { number: 51,  name: "Adh-Dhariyat",       arabic: "الذاريات",   verses: 61,  type: "Meccan"  },
  { number: 52,  name: "At-Tur",             arabic: "الطور",      verses: 50,  type: "Meccan"  },
  { number: 53,  name: "An-Najm",            arabic: "النجم",      verses: 63,  type: "Meccan"  },
  { number: 54,  name: "Al-Qamar",           arabic: "القمر",      verses: 56,  type: "Meccan"  },
  { number: 55,  name: "Ar-Rahman",          arabic: "الرحمن",     verses: 79,  type: "Medinan" },
  { number: 56,  name: "Al-Waqi'ah",         arabic: "الواقعة",    verses: 97,  type: "Meccan"  },
  { number: 57,  name: "Al-Hadid",           arabic: "الحديد",     verses: 30,  type: "Medinan" },
  { number: 58,  name: "Al-Mujadalah",       arabic: "المجادلة",   verses: 23,  type: "Medinan" },
  { number: 59,  name: "Al-Hashr",           arabic: "الحشر",      verses: 25,  type: "Medinan" },
  { number: 60,  name: "Al-Mumtahinah",      arabic: "الممتحنة",   verses: 14,  type: "Medinan" },
  { number: 61,  name: "As-Saff",            arabic: "الصف",       verses: 15,  type: "Medinan" },
  { number: 62,  name: "Al-Jumu'ah",         arabic: "الجمعة",     verses: 12,  type: "Medinan" },
  { number: 63,  name: "Al-Munafiqun",       arabic: "المنافقون",  verses: 12,  type: "Medinan" },
  { number: 64,  name: "At-Taghabun",        arabic: "التغابن",    verses: 19,  type: "Medinan" },
  { number: 65,  name: "At-Talaq",           arabic: "الطلاق",     verses: 13,  type: "Medinan" },
  { number: 66,  name: "At-Tahrim",          arabic: "التحريم",    verses: 13,  type: "Medinan" },
  { number: 67,  name: "Al-Mulk",            arabic: "الملك",      verses: 31,  type: "Meccan"  },
  { number: 68,  name: "Al-Qalam",           arabic: "القلم",      verses: 53,  type: "Meccan"  },
  { number: 69,  name: "Al-Haqqah",          arabic: "الحاقة",     verses: 53,  type: "Meccan"  },
  { number: 70,  name: "Al-Ma'arij",         arabic: "المعارج",    verses: 45,  type: "Meccan"  },
  { number: 71,  name: "Nooh",               arabic: "نوح",        verses: 29,  type: "Meccan"  },
  { number: 72,  name: "Al-Jinn",            arabic: "الجن",       verses: 29,  type: "Meccan"  },
  { number: 73,  name: "Al-Muzzammil",       arabic: "المزمل",     verses: 21,  type: "Meccan"  },
  { number: 74,  name: "Al-Muddaththir",     arabic: "المدثر",     verses: 57,  type: "Meccan"  },
  { number: 75,  name: "Al-Qiyamah",         arabic: "القيامة",    verses: 41,  type: "Meccan"  },
  { number: 76,  name: "Ad-Dahr",            arabic: "الإنسان",    verses: 32,  type: "Medinan" },
  { number: 77,  name: "Al-Mursalat",        arabic: "المرسلات",   verses: 51,  type: "Meccan"  },
  { number: 78,  name: "An-Naba",            arabic: "النبأ",      verses: 41,  type: "Meccan"  },
  { number: 79,  name: "An-Nazi'at",         arabic: "النازعات",   verses: 47,  type: "Meccan"  },
  { number: 80,  name: "'Abasa",             arabic: "عبس",        verses: 43,  type: "Meccan"  },
  { number: 81,  name: "At-Takwir",          arabic: "التكوير",    verses: 30,  type: "Meccan"  },
  { number: 82,  name: "Al-Infitar",         arabic: "الانفطار",   verses: 20,  type: "Meccan"  },
  { number: 83,  name: "At-Tatfif",          arabic: "المطففين",   verses: 37,  type: "Meccan"  },
  { number: 84,  name: "Al-Inshiqaq",        arabic: "الانشقاق",   verses: 26,  type: "Meccan"  },
  { number: 85,  name: "Al-Buruj",           arabic: "البروج",     verses: 23,  type: "Meccan"  },
  { number: 86,  name: "At-Tariq",           arabic: "الطارق",     verses: 18,  type: "Meccan"  },
  { number: 87,  name: "Al-A'la",            arabic: "الأعلى",     verses: 20,  type: "Meccan"  },
  { number: 88,  name: "Al-Ghashiyah",       arabic: "الغاشية",    verses: 27,  type: "Meccan"  },
  { number: 89,  name: "Al-Fajr",            arabic: "الفجر",      verses: 31,  type: "Meccan"  },
  { number: 90,  name: "Al-Balad",           arabic: "البلد",      verses: 21,  type: "Meccan"  },
  { number: 91,  name: "Ash-Shams",          arabic: "الشمس",      verses: 16,  type: "Meccan"  },
  { number: 92,  name: "Al-Lail",            arabic: "الليل",      verses: 22,  type: "Meccan"  },
  { number: 93,  name: "Ad-Duha",            arabic: "الضحى",      verses: 12,  type: "Meccan"  },
  { number: 94,  name: "Al-Inshirah",        arabic: "الشرح",      verses: 9,   type: "Meccan"  },
  { number: 95,  name: "At-Tin",             arabic: "التين",      verses: 9,   type: "Meccan"  },
  { number: 96,  name: "Al-'Alaq",           arabic: "العلق",      verses: 20,  type: "Meccan"  },
  { number: 97,  name: "Al-Qadr",            arabic: "القدر",      verses: 6,   type: "Meccan"  },
  { number: 98,  name: "Al-Bayyinah",        arabic: "البينة",     verses: 9,   type: "Medinan" },
  { number: 99,  name: "Az-Zilzal",          arabic: "الزلزلة",    verses: 9,   type: "Medinan" },
  { number: 100, name: "Al-'Adiyat",         arabic: "العاديات",   verses: 12,  type: "Meccan"  },
  { number: 101, name: "Al-Qari'ah",         arabic: "القارعة",    verses: 12,  type: "Meccan"  },
  { number: 102, name: "At-Takathur",        arabic: "التكاثر",    verses: 9,   type: "Meccan"  },
  { number: 103, name: "Al-'Asr",            arabic: "العصر",      verses: 4,   type: "Meccan"  },
  { number: 104, name: "Al-Humazah",         arabic: "الهمزة",     verses: 10,  type: "Meccan"  },
  { number: 105, name: "Al-Fil",             arabic: "الفيل",      verses: 6,   type: "Meccan"  },
  { number: 106, name: "Quraish",            arabic: "قريش",       verses: 5,   type: "Meccan"  },
  { number: 107, name: "Al-Ma'un",           arabic: "الماعون",    verses: 8,   type: "Meccan"  },
  { number: 108, name: "Al-Kauthar",         arabic: "الكوثر",     verses: 4,   type: "Meccan"  },
  { number: 109, name: "Al-Kafirun",         arabic: "الكافرون",   verses: 7,   type: "Meccan"  },
  { number: 110, name: "An-Nasr",            arabic: "النصر",      verses: 4,   type: "Medinan" },
  { number: 111, name: "Al-Lahab",           arabic: "المسد",      verses: 6,   type: "Meccan"  },
  { number: 112, name: "Al-Ikhlas",          arabic: "الإخلاص",    verses: 5,   type: "Meccan"  },
  { number: 113, name: "Al-Falaq",           arabic: "الفلق",      verses: 6,   type: "Meccan"  },
  { number: 114, name: "An-Nas",             arabic: "الناس",      verses: 7,   type: "Meccan"  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Get verses from a chapter.
 * @param chapter  Surah number (1–114)
 * @param from     Starting verse number (1-based, inclusive)
 * @param to       Ending verse number (1-based, inclusive)
 * @param options  Which translations to include (default: English by Maulawi Sher Ali)
 */
export async function getVerses(
  chapter: number,
  from: number,
  to: number,
  options: VerseOptions = { en: true }
): Promise<Verse[]> {
  const url = `${BASE_URL}/chapter/${chapter}:${from}-${to}`;
  return apiFetch<Verse[]>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
}

/**
 * Get the full introduction for a chapter (English + Urdu HTML).
 */
export async function getChapterIntro(chapter: number): Promise<ChapterIntro> {
  return apiFetch<ChapterIntro>(`${BASE_URL}/chapter/intro/${chapter}`);
}

/**
 * Search for a keyword/phrase across all Quran text.
 * @param query    Search term. Wrap in quotes for exact phrase: `"in the name"`
 * @param options  Which translations to search within (default: English)
 * @param ai       Use AI-enhanced contextual search (default: false)
 */
export async function searchQuran(
  query: string,
  options: VerseOptions = { en: true },
  ai = false
): Promise<SearchResult> {
  // Sticky key: deterministic hash of query (mirrors the app behaviour)
  const key = simpleHash(query + (ai ? "ai" : ""));
  return apiFetch<SearchResult>(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sticky-key": key,
    },
    body: JSON.stringify({ s: query, options: { ...options, ai }, concordance: "" }),
  });
}

/** Deterministic hash matching the app's x-sticky-key logic. */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return new Uint32Array([h])[0].toString(36);
}

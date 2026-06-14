// Lightweight Arabic → Latin transliteration. Not linguistically perfect —
// it gives a sensible romanization the user can tweak. Handles the common
// letters, short-vowel harakat, shadda (gemination), and the al- article.

const LETTERS: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "ā", "ٱ": "a",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "ḥ", "خ": "kh",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ى": "ā", "ة": "a",
  "ء": "ʾ", "ؤ": "ʾ", "ئ": "ʾ",
  "ﻻ": "lā", "لا": "lā",
};

const HARAKAT: Record<string, string> = {
  "َ": "a",  // fatha
  "ُ": "u",  // damma
  "ِ": "i",  // kasra
  "ً": "an", // fathatan
  "ٌ": "un", // dammatan
  "ٍ": "in", // kasratan
  "ْ": "",   // sukun
};

const SHADDA = "ّ";
const TATWEEL = "ـ";

export function arabicToLatin(input: string): string {
  if (!input) return "";

  const words = input.trim().split(/\s+/);

  const out = words.map((word) => {
    let w = word;

    // Definite article ال at the start → "al-"
    let prefix = "";
    if (w.startsWith("ال") && w.length > 2) {
      prefix = "al-";
      w = w.slice(2);
    }

    let res = "";
    let lastConsonant = "";
    for (const ch of w) {
      if (ch === TATWEEL) continue;
      if (ch === SHADDA) {
        // Gemination — double the last emitted consonant.
        if (lastConsonant) res += lastConsonant;
        continue;
      }
      if (ch in HARAKAT) {
        res += HARAKAT[ch];
        lastConsonant = "";
        continue;
      }
      if (ch in LETTERS) {
        const v = LETTERS[ch];
        res += v;
        lastConsonant = v;
        continue;
      }
      // Punctuation / latin / digits — pass through.
      res += ch;
      lastConsonant = "";
    }

    return prefix + res;
  });

  return out.join(" ").replace(/\s+/g, " ").trim();
}

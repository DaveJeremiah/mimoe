export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Known acceptable alternatives for French phrases/words.
 * Maps normalized expected → array of normalized acceptable alternatives.
 */
const ACCEPTABLE_ALTERNATIVES: Record<string, string[]> = {
  // Greetings
  "comment allez-vous": ["comment allez vous", "comment ca va", "comment sa va", "ca va", "sa va", "comment vas tu", "comment tu vas"],
  "bonjour": ["bon jour", "bonsoir"],
  "au revoir": ["a bientot", "aurevoir", "salut"],
  // Politeness
  "s'il vous plait": ["sil vous plait", "s'il te plait", "sil te plait", "svp"],
  "merci": ["merci beaucoup", "merci bien"],
  // Common phrases
  "je m'appelle": ["je mappelle", "je m appelle", "mon nom est", "je suis"],
  "je ne comprends pas": ["je comprends pas", "je ne comprend pas", "je comprend pas"],
  "ou sont les toilettes": ["ou est la toilette", "ou sont les toilette", "ou est les toilettes"],
  "combien ca coute": ["combien sa coute", "ca coute combien", "c'est combien", "cest combien"],
  "je voudrais": ["je voudrai", "je voudrais"],
  "excusez-moi": ["excusez moi", "excuse moi", "excuse-moi", "pardon"],
  "je suis desole": ["je suis desolee", "desole", "desolee", "pardon"],
  "je ne sais pas": ["je sais pas", "je ne sai pas", "sais pas"],
  "j'ai besoin d'aide": ["jai besoin daide", "j'ai besoin d'aide", "aide moi", "aidez moi", "au secours"],
  "l'eau": ["de leau", "de l'eau", "eau", "lo"],
  "la nourriture": ["nourriture", "de la nourriture", "la nouriture"],
  "l'argent": ["argent", "de largent", "de l'argent"],
  "aujourd'hui": ["aujourdhui", "aujourd hui"],
  "ami": ["amie", "un ami", "une amie", "mon ami"],
  "maison": ["la maison", "une maison"],
  "travail": ["le travail", "du travail"],
  "aide": ["de l'aide", "de laide", "aidez", "aider"],
};

/**
 * Levenshtein distance for fuzzy matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Check similarity ratio (0-1). 1 = identical.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Common French phonetic confusions for speech recognition.
 * Normalize these before comparing.
 */
function phoneticNormalize(str: string): string {
  return str
    // Common speech recognition confusions
    .replace(/\bsa\b/g, "ca")
    .replace(/\bser\b/g, "ce")
    .replace(/\bse\b/g, "ce")
    .replace(/\bje\s+suis\b/g, "je suis")
    .replace(/\bvous\s+etes\b/g, "vous etes")
    // Contractions
    .replace(/\bl\s+/g, "l")
    .replace(/\bd\s+/g, "d")
    .replace(/\bj\s+/g, "j")
    .replace(/\bn\s+/g, "n")
    // Articles often dropped by speech rec
    .replace(/^(le |la |les |un |une |des |du |de la |de l)/, "")
    .trim();
}

export function isMatch(spoken: string, expected: string): boolean {
  const normSpoken = normalize(spoken);
  const normExpected = normalize(expected);

  // 1. Exact match
  if (normSpoken === normExpected) return true;

  // 2. Check known alternatives
  for (const [key, alts] of Object.entries(ACCEPTABLE_ALTERNATIVES)) {
    const normKey = normalize(key);
    if (normKey === normExpected || normExpected.includes(normKey)) {
      if (alts.some(alt => normalize(alt) === normSpoken || normSpoken.includes(normalize(alt)))) {
        return true;
      }
    }
    // Also check if spoken matches the key and expected is an alt
    if (alts.some(alt => normalize(alt) === normExpected)) {
      if (normSpoken === normKey || normSpoken.includes(normKey)) {
        return true;
      }
    }
  }

  // 3. Phonetic normalization comparison
  const phoneticSpoken = phoneticNormalize(normSpoken);
  const phoneticExpected = phoneticNormalize(normExpected);
  if (phoneticSpoken === phoneticExpected) return true;

  // 4. Fuzzy match — allow ~80% similarity for short words, ~75% for phrases
  const threshold = normExpected.length <= 6 ? 0.75 : 0.7;
  if (similarity(normSpoken, normExpected) >= threshold) return true;
  if (similarity(phoneticSpoken, phoneticExpected) >= threshold) return true;

  // 5. Check if spoken contains the expected or vice versa (for articles/extras)
  if (normSpoken.includes(normExpected) || normExpected.includes(normSpoken)) {
    // Only if the shorter is at least 60% of the longer
    const ratio = Math.min(normSpoken.length, normExpected.length) / Math.max(normSpoken.length, normExpected.length);
    if (ratio >= 0.5) return true;
  }

  return false;
}

let voicesLoaded = false;
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;
let primedUtterance: SpeechSynthesisUtterance | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
}

async function getBestFrenchVoice(): Promise<SpeechSynthesisVoice | null> {
  if (voicesLoaded && cachedFrenchVoice) return cachedFrenchVoice;

  const voices = await loadVoices();
  voicesLoaded = true;

  const priorities = [
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("amelie"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("thomas"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("google") && v.name.toLowerCase().includes("français"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("google"),
    (v: SpeechSynthesisVoice) => v.lang === "fr-FR" && !v.localService,
    (v: SpeechSynthesisVoice) => v.lang === "fr-FR",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr"),
  ];

  for (const check of priorities) {
    const match = voices.find(check);
    if (match) {
      cachedFrenchVoice = match;
      return match;
    }
  }
  return null;
}

function applyFrenchVoice(utterance: SpeechSynthesisUtterance): void {
  utterance.lang = "fr-FR";
  utterance.rate = 0.88;
  utterance.pitch = 1.0;

  if (cachedFrenchVoice) {
    utterance.voice = cachedFrenchVoice;
    return;
  }

  const voices = speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang === "fr-FR") || voices.find((v) => v.lang.startsWith("fr"));
  if (frVoice) {
    utterance.voice = frVoice;
    cachedFrenchVoice = frVoice;
  }
}

export function primeFrenchSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  if (!primedUtterance) {
    primedUtterance = new SpeechSynthesisUtterance("");
  }

  applyFrenchVoice(primedUtterance);
  if (!voicesLoaded) getBestFrenchVoice();
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  getBestFrenchVoice();
}

export function speakFrench(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  applyFrenchVoice(utterance);
  speechSynthesis.speak(utterance);

  if (!voicesLoaded) getBestFrenchVoice();
}

export function speakCorrect(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  applyFrenchVoice(utterance);
  utterance.rate = 0.95;
  speechSynthesis.speak(utterance);
}

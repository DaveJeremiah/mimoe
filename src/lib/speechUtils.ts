

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
 */
const ACCEPTABLE_ALTERNATIVES: Record<string, string[]> = {
  "comment allez-vous": ["comment allez vous", "comment ca va", "comment sa va", "ca va", "sa va", "comment vas tu", "comment tu vas"],
  "bonjour": ["bon jour", "bonsoir"],
  "au revoir": ["a bientot", "aurevoir", "salut"],
  "s'il vous plait": ["sil vous plait", "s'il te plait", "sil te plait", "svp"],
  "merci": ["merci beaucoup", "merci bien"],
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

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function phoneticNormalize(str: string): string {
  return str
    .replace(/\bsa\b/g, "ca")
    .replace(/\bser\b/g, "ce")
    .replace(/\bse\b/g, "ce")
    .replace(/\bje\s+suis\b/g, "je suis")
    .replace(/\bvous\s+etes\b/g, "vous etes")
    .replace(/\bl\s+/g, "l")
    .replace(/\bd\s+/g, "d")
    .replace(/\bj\s+/g, "j")
    .replace(/\bn\s+/g, "n")
    .replace(/^(le |la |les |un |une |des |du |de la |de l)/, "")
    .trim();
}

export function isMatch(spoken: string, expected: string): boolean {
  const normSpoken = normalize(spoken);
  const normExpected = normalize(expected);

  if (normSpoken === normExpected) return true;

  for (const [key, alts] of Object.entries(ACCEPTABLE_ALTERNATIVES)) {
    const normKey = normalize(key);
    if (normKey === normExpected || normExpected.includes(normKey)) {
      if (alts.some(alt => normalize(alt) === normSpoken || normSpoken.includes(normalize(alt)))) {
        return true;
      }
    }
    if (alts.some(alt => normalize(alt) === normExpected)) {
      if (normSpoken === normKey || normSpoken.includes(normKey)) {
        return true;
      }
    }
  }

  const phoneticSpoken = phoneticNormalize(normSpoken);
  const phoneticExpected = phoneticNormalize(normExpected);
  if (phoneticSpoken === phoneticExpected) return true;

  const threshold = normExpected.length <= 6 ? 0.75 : 0.7;
  if (similarity(normSpoken, normExpected) >= threshold) return true;
  if (similarity(phoneticSpoken, phoneticExpected) >= threshold) return true;

  if (normSpoken.includes(normExpected) || normExpected.includes(normSpoken)) {
    const ratio = Math.min(normSpoken.length, normExpected.length) / Math.max(normSpoken.length, normExpected.length);
    if (ratio >= 0.5) return true;
  }

  return false;
}

// ── Cloud TTS via ElevenLabs with localStorage caching ──

/** In-memory URL cache for current session */
const memCache = new Map<string, string>();

const LS_PREFIX = "tts_cache_";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getCachedAudioUrl(key: string): string | null {
  if (memCache.has(key)) return memCache.get(key)!;
  try {
    const stored = localStorage.getItem(LS_PREFIX + key);
    if (stored) {
      const url = stored; // data URI works directly with Audio
      memCache.set(key, url);
      return url;
    }
  } catch { /* quota or access error */ }
  return null;
}

async function fetchTTSAudio(text: string, rate: number): Promise<string | null> {
  const cacheKey = `${text}__${rate}`;
  const cached = getCachedAudioUrl(cacheKey);
  if (cached) return cached;

  try {
    // Use raw fetch — supabase.functions.invoke decodes audio/mpeg as text and corrupts it
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text, rate }),
    });

    if (!res.ok) {
      console.warn("Cloud TTS failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const blob = await res.blob();
    const dataUri = await blobToBase64(blob);

    // Save to localStorage for persistence across sessions
    try { localStorage.setItem(LS_PREFIX + cacheKey, dataUri); } catch { /* quota */ }
    memCache.set(cacheKey, dataUri);
    return dataUri;
  } catch (e) {
    console.warn("Cloud TTS error, falling back to browser:", e);
    return null;
  }
}

// Single reusable audio element — unlocked on first user gesture
let sharedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

export function unlockAudio(): void {
  // Call this from a direct user gesture (button tap etc)
  const audio = getAudio();
  audio.src =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAEAAQARAAIAIgACABAAEABkYXRhAgAAAAEA";
  audio.play().catch(() => {});
}

function playAudioUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = getAudio();
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.src = url;
    audio.play().catch((err) => {
      console.warn("Audio play blocked, falling back to browser TTS:", err);
      resolve();
    });
  });
}

export async function prefetchAudio(texts: string[]): Promise<void> {
  // Fire all fetches in parallel, silently — just warming the cache
  await Promise.allSettled(texts.map((text) => fetchTTSAudio(text, 0.88)));
}

// ── Browser TTS fallback ──

let voicesLoaded = false;
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}

async function getBestFrenchVoice(): Promise<SpeechSynthesisVoice | null> {
  if (voicesLoaded && cachedFrenchVoice) return cachedFrenchVoice;
  const voices = await loadVoices();
  voicesLoaded = true;

  const priorities = [
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("amelie"),
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("thomas"),
    (v: SpeechSynthesisVoice) => v.lang === "fr-FR" && !v.localService,
    (v: SpeechSynthesisVoice) => v.lang === "fr-FR",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("fr"),
  ];

  for (const check of priorities) {
    const match = voices.find(check);
    if (match) { cachedFrenchVoice = match; return match; }
  }
  return null;
}

function browserSpeak(text: string, rate: number): void {
  if (!window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = rate;
  utterance.pitch = 1.0;
  if (cachedFrenchVoice) utterance.voice = cachedFrenchVoice;
  synth.speak(utterance);
}

// ── Public API ──

export function primeFrenchSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis && !voicesLoaded) {
    getBestFrenchVoice();
  }
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  getBestFrenchVoice();
}

export async function speakFrench(text: string, onEnd?: () => void): Promise<void> {
  if (!text.trim()) { onEnd?.(); return; }
  const url = await fetchTTSAudio(text, 0.88);
  if (url) { await playAudioUrl(url); onEnd?.(); return; }
  browserSpeak(text, 0.88);
  onEnd?.();
}

export async function speakCorrect(text: string, onEnd?: () => void): Promise<void> {
  if (!text.trim()) { onEnd?.(); return; }
  const url = await fetchTTSAudio(text, 0.95);
  if (url) { await playAudioUrl(url); onEnd?.(); return; }
  browserSpeak(text, 0.95);
  onEnd?.();
}

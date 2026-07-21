import type { LanguageConfig } from "./languageConfig";
import { LANGUAGE_CONFIGS } from "./languageConfig";

const DEFAULT_LANG = LANGUAGE_CONFIGS.french;

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Arabic normalization
    .replace(/[\u064B-\u065F\u0670]/g, "")     // tashkeel/diacritics
    .replace(/\u0640/g, "")                     // tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // alef variants -> ا
    .replace(/\u0649/g, "\u064A")              // alef maksura -> ya
    .replace(/\u0629/g, "\u0647")              // ta marbuta -> ha
    .replace(/[\u0624\u0626]/g, "")             // hamza on waw/ya -> drop hamza carrier
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' \u0600-\u06ff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
  "0": ["zero", "zéro", "sifr"],
  "1": ["un", "une", "wahid", "wahed", "1"],
  "2": ["deux", "ithnan", "jouj", "2"],
  "3": ["trois", "thalatha", "tlata", "3"],
  "4": ["quatre", "arba'a", "arbaa", "4"],
  "5": ["cinq", "khamsa", "5"],
  "6": ["six", "sitta", "6"],
  "7": ["sept", "sab'a", "sabaa", "7"],
  "8": ["huit", "thamaniya", "tmania", "8"],
  "9": ["neuf", "tis'a", "tesaa", "9"],
  "10": ["dix", "ashara", "achara", "10"],
  "11": ["onze", "ahada ashar", "11"],
  "12": ["douze", "ithna ashar", "12"],
  "13": ["treize", "13"],
  "14": ["quatorze", "14"],
  "15": ["quinze", "15"],
  "16": ["seize", "16"],
  "17": ["dix-sept", "dix sept", "17"],
  "18": ["dix-huit", "dix huit", "18"],
  "19": ["dix-neuf", "dix neuf", "19"],
  "20": ["vingt", "ishroun", "20"],
  "30": ["trente", "thalathoun", "30"],
  "40": ["quarante", "arba'oun", "40"],
  "50": ["cinquante", "khamsoun", "50"],
  "60": ["soixante", "sittoun", "60"],
  "70": ["soixante-dix", "soixante dix", "septante", "70"],
  "80": ["quatre-vingts", "quatre vingts", "quatre vingt", "huitante", "80"],
  "90": ["quatre-vingt-dix", "quatre vingt dix", "nonante", "90"],
  "100": ["cent", "mi'a", "100"],
  "1000": ["mille", "alf", "1000"],
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

  const isArabic = /[\u0600-\u06ff]/.test(normExpected);
  // Strip common Arabic prefixes (definite article + conjunctions/prepositions)
  const stripAr = (s: string) => s
    .split(" ")
    .map(w => w.replace(/^(وال|فال|بال|كال|لل|ال)/, "").replace(/^[وفبكل]/, ""))
    .join(" ")
    .trim();
  const arSpoken = isArabic ? stripAr(normSpoken) : normSpoken;
  const arExpected = isArabic ? stripAr(normExpected) : normExpected;
  if (isArabic && arSpoken === arExpected) return true;

  const threshold = isArabic
    ? (arExpected.length <= 4 ? 0.7 : 0.6)
    : (normExpected.length <= 6 ? 0.75 : 0.7);
  if (similarity(normSpoken, normExpected) >= threshold) return true;
  if (similarity(phoneticSpoken, phoneticExpected) >= threshold) return true;
  if (isArabic && similarity(arSpoken, arExpected) >= threshold) return true;

  if (normSpoken.includes(normExpected) || normExpected.includes(normSpoken)) {
    const ratio = Math.min(normSpoken.length, normExpected.length) / Math.max(normSpoken.length, normExpected.length);
    if (ratio >= 0.5) return true;
  }
  if (isArabic && (arSpoken.includes(arExpected) || arExpected.includes(arSpoken))) {
    const ratio = Math.min(arSpoken.length, arExpected.length) / Math.max(arSpoken.length, arExpected.length);
    if (ratio >= 0.5) return true;
  }

  return false;
}

const memCache = new Map<string, string>()

let sharedAudio: HTMLAudioElement | null = null
function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio()
  return sharedAudio
}

// Immediately stop any TTS currently playing (both the audio-file element and
// browser speechSynthesis), so audio never bleeds into the next card.
export function stopAudio(): void {
  try {
    window.speechSynthesis?.cancel()
  } catch { /* ignore */ }
  if (sharedAudio) {
    try {
      sharedAudio.onended = null
      sharedAudio.onerror = null
      sharedAudio.pause()
      sharedAudio.currentTime = 0
      // Release the audio element so iOS frees the AVAudioSession immediately
      // rather than holding .playback mode during teardown (which blocks the mic).
      sharedAudio.removeAttribute('src')
      sharedAudio.load()
    } catch { /* ignore */ }
  }
}

// ── Voice cache ──────────────────────────────────────────────────────────────
// getVoices() is empty on first call in Chrome until voices load asynchronously.
// We cache them and refresh on the voiceschanged event so browserSpeak always
// has a real French voice to choose (otherwise it reads French in an English voice).
let cachedVoices: SpeechSynthesisVoice[] = []
function refreshVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const v = window.speechSynthesis.getVoices()
  if (v.length) cachedVoices = v
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices()
  // onvoiceschanged fires once voices are ready (Chrome / Android)
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

function pickVoice(ttsLang: string): SpeechSynthesisVoice | undefined {
  const voices = cachedVoices.length ? cachedVoices : (window.speechSynthesis?.getVoices() ?? [])
  if (voices.length && !cachedVoices.length) cachedVoices = voices
  const base = ttsLang.split('-')[0]   // e.g. 'fr'
  // Exact lang match first, then any voice in the same language family
  return voices.find(v => v.lang === ttsLang)
    || voices.find(v => v.lang.replace('_', '-') === ttsLang)
    || voices.find(v => v.lang.toLowerCase().startsWith(base))
}

let speechWarmed = false
export function unlockAudio(): void {
  const audio = getAudio()
  audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAA' +
    'EAAQARAAIAIgACABAAEABkYXRhAgAAAAEA'
  audio.play().catch(() => {})

  // Warm up speechSynthesis inside this user gesture so iOS Safari will allow
  // later programmatic speak() calls (iOS blocks speech started outside a gesture).
  if (!speechWarmed && typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      refreshVoices()
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
      speechWarmed = true
    } catch { /* ignore */ }
  }
}

function getCached(key: string): string | null {
  if (memCache.has(key)) return memCache.get(key)!
  try {
    const stored = localStorage.getItem(key)
    if (stored) { memCache.set(key, stored); return stored }
  } catch { /* quota */ }
  return null
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Native-accent TTS via our public proxy (Supabase edge function that relays
// Google Translate TTS). Returns an MP3 we play through the unlocked <audio>
// element — this is the path that actually works on iOS Safari, and it gives a
// proper French/Arabic accent regardless of the device's installed voices.
const TTS_PROXY_URL  = 'https://ovunaubwudiyodywsdfz.supabase.co/functions/v1/tts'
const AZURE_TTS_URL  = 'https://zwjydluacxsbfdxhanol.supabase.co/functions/v1/azure-tts'
const TTS_PROXY_KEY  = 'sb_publishable_wtThLbWFuenbMjGhJPtO9A_GrMInBNm'
const AZURE_TTS_KEY  = 'sb_publishable_qW88wOpvd4NT1OIiIaFFCA_0eD52E7q'

async function fetchProxyTTS(text: string, langConfig: LanguageConfig = DEFAULT_LANG): Promise<string | null> {
  const key = langConfig.cachePrefix + text.trim().toLowerCase()
  const cached = getCached(key)
  if (cached) return cached
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null

  const lang = langConfig.ttsLang.split('-')[0]   // 'fr' | 'ar'
  try {
    const url = `${TTS_PROXY_URL}?lang=${encodeURIComponent(lang)}&text=${encodeURIComponent(text.slice(0, 200))}`
    const res = await fetch(url, { headers: { apikey: TTS_PROXY_KEY } })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUri = await blobToBase64(blob)
    try { localStorage.setItem(key, dataUri) } catch { /* quota */ }
    memCache.set(key, dataUri)
    return dataUri
  } catch {
    return null
  }
}

// Arabic goes straight to Azure Neural TTS (proper dialect voices).
// French uses the Google proxy first, Azure as fallback.
async function fetchRemoteTTS(text: string, langConfig: LanguageConfig = DEFAULT_LANG): Promise<string | null> {
  if (langConfig.code === 'arabic') {
    return fetchAzureTTS(text, langConfig)
  }
  const proxied = await fetchProxyTTS(text, langConfig)
  if (proxied) return proxied
  return fetchAzureTTS(text, langConfig)
}

async function fetchAzureTTS(text: string, langConfig: LanguageConfig = DEFAULT_LANG): Promise<string | null> {
  const key = langConfig.cachePrefix + text.trim().toLowerCase()
  const cached = getCached(key)
  if (cached) return cached
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null

  try {
    const res = await fetch(AZURE_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: AZURE_TTS_KEY,
      },
      body: JSON.stringify({ text, lang: langConfig.ttsLang, voice: langConfig.ttsVoice }),
    })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUri = await blobToBase64(blob)
    try { localStorage.setItem(key, dataUri) } catch { /* quota */ }
    memCache.set(key, dataUri)
    return dataUri
  } catch {
    return null
  }
}

function browserSpeak(text: string, langConfig: LanguageConfig = DEFAULT_LANG, onEnd?: () => void): void {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = langConfig.ttsLang
  utter.rate = 0.85
  if (onEnd) { utter.onend = onEnd; utter.onerror = onEnd }
  const voice = pickVoice(langConfig.ttsLang)
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

function playDataUri(uri: string, onEnd?: () => void): void {
  const audio = getAudio()
  let ended = false
  const done = () => {
    if (ended) return
    ended = true
    audio.onended = null
    audio.onerror = null
    // Release the element so iOS frees the shared audio session — otherwise the
    // session stays occupied and the microphone can't reacquire it afterwards.
    try { audio.pause(); audio.removeAttribute('src'); audio.load() } catch { /* ignore */ }
    onEnd?.()
  }
  audio.onended = done
  audio.onerror = done
  audio.src = uri
  audio.play().catch(done)
}

export function primeFrenchSpeech(): void {}

export async function prefetchAudio(texts: string[], langConfig: LanguageConfig = DEFAULT_LANG): Promise<void> {
  await Promise.allSettled(texts.map(t => fetchRemoteTTS(t, langConfig)))
}

export function speakFrench(text: string, onEnd?: () => void, langConfig: LanguageConfig = DEFAULT_LANG): void {
  if (!text.trim()) { onEnd?.(); return }

  // Kill anything currently playing so two clips never overlap.
  stopAudio()

  let done = false
  const finish = () => { if (done) return; done = true; onEnd?.() }

  // Play EXACTLY ONE source. Prefer the native-accent MP3 (works on iOS, proper
  // accent); it's normally already cached via prefetch so it resolves instantly.
  // Only if the file is unavailable do we fall back to the browser voice — this
  // prevents the "two voices at once" problem on Android.
  fetchRemoteTTS(text, langConfig).then(uri => {
    if (done) return
    if (uri) playDataUri(uri, finish)
    else browserSpeak(text, langConfig, finish)
  }).catch(() => { if (!done) browserSpeak(text, langConfig, finish) })
}

export function speakCorrect(text: string, onEnd?: () => void, langConfig: LanguageConfig = DEFAULT_LANG): void {
  speakFrench(text, onEnd, langConfig)
}

// Play user-supplied audio (a data URI or remote URL) through the same unlocked
// <audio> element used for TTS, so it works on iOS and never overlaps a clip.
export function speakAudioUrl(uri: string, onEnd?: () => void): void {
  if (!uri) { onEnd?.(); return }
  stopAudio()
  let done = false
  const finish = () => { if (done) return; done = true; onEnd?.() }
  playDataUri(uri, finish)
}

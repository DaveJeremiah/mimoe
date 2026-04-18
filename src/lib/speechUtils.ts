

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

// ── Azure TTS with localStorage caching ──

const memCache = new Map<string, string>()
const LS_PREFIX = 'tts_az_'

// Single shared Audio element — avoids autoplay blocks on repeated calls
let sharedAudio: HTMLAudioElement | null = null
function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio()
  return sharedAudio
}

export function unlockAudio(): void {
  // Call once from any direct user gesture to unblock autoplay
  const audio = getAudio()
  // Play a silent 1-frame wav to unlock the element
  audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAA' +
    'EAAQARAAIAIgACABAAEABkYXRhAgAAAAEA'
  audio.play().catch(() => {})
}

function getCached(key: string): string | null {
  if (memCache.has(key)) return memCache.get(key)!
  try {
    const stored = localStorage.getItem(LS_PREFIX + key)
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

async function fetchAzureTTS(text: string): Promise<string | null> {
  const key = text.trim().toLowerCase()
  const cached = getCached(key)
  if (cached) return cached

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/azure-tts`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      console.warn('Azure TTS failed:', res.status)
      return null
    }

    const blob = await res.blob()
    const dataUri = await blobToBase64(blob)
    try { localStorage.setItem(LS_PREFIX + key, dataUri) } catch { /* quota */ }
    memCache.set(key, dataUri)
    return dataUri
  } catch (e) {
    console.warn('Azure TTS error:', e)
    return null
  }
}

function browserSpeak(text: string, onEnd?: () => void): void {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'fr-FR'
  utter.rate = 0.85
  if (onEnd) utter.onend = onEnd
  const voices = window.speechSynthesis.getVoices()
  const frVoice = voices.find(v => v.lang === 'fr-FR') || voices.find(v => v.lang.startsWith('fr'))
  if (frVoice) utter.voice = frVoice
  window.speechSynthesis.speak(utter)
}

function playDataUri(uri: string, onEnd?: () => void): void {
  const audio = getAudio()
  audio.onended = () => onEnd?.()
  audio.onerror = () => onEnd?.()
  audio.src = uri
  audio.play().catch(() => { onEnd?.() })
}

// ── Public API ──

export function primeFrenchSpeech(): void {
  // no-op — kept for compatibility, Azure has no warm-up needed
}

export async function prefetchAudio(texts: string[]): Promise<void> {
  await Promise.allSettled(texts.map(t => fetchAzureTTS(t)))
}

export function speakFrench(text: string, onEnd?: () => void): void {
  if (!text.trim()) { onEnd?.(); return }
  fetchAzureTTS(text).then(uri => {
    if (uri) {
      playDataUri(uri, onEnd)
    } else {
      browserSpeak(text, onEnd)
    }
  })
}

export function speakCorrect(text: string, onEnd?: () => void): void {
  speakFrench(text, onEnd)
}


export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, "")
    .trim();
}

export function isMatch(spoken: string, expected: string): boolean {
  return normalize(spoken) === normalize(expected);
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

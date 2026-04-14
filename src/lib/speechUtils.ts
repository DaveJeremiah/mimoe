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

  // Priority order for natural-sounding French voices
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

// Pre-load voices on module init
if (typeof window !== "undefined" && window.speechSynthesis) {
  getBestFrenchVoice();
}

export function speakFrench(text: string): void {
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.82;
  utterance.pitch = 1.05;

  getBestFrenchVoice().then((voice) => {
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  });
}

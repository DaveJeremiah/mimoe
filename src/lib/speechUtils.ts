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

export function speakFrench(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.85;

  const voices = speechSynthesis.getVoices();
  const frenchVoice = voices.find(
    (v) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("google")
  ) || voices.find((v) => v.lang.startsWith("fr"));

  if (frenchVoice) utterance.voice = frenchVoice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

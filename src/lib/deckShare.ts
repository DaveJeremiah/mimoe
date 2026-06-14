import type { Collection, CollectionFormData } from "./collectionTypes";

// A shareable deck code: anyone with an account can paste it to import the deck
// into their own collections. Audio is omitted (recordings are personal and too
// large for a copy-paste code); text + transliteration travel with it.

const PREFIX = "mimoe1:";

export function encodeDeck(c: Pick<Collection, "title" | "language" | "dialect" | "category" | "entries">): string {
  const payload = {
    t: c.title,
    l: c.language,
    d: c.dialect,
    c: c.category,
    e: c.entries.map(e => ({
      en: e.english,
      ta: e.target ?? e.french,
      ...(e.alternatives?.length ? { al: e.alternatives } : {}),
      ...(e.transliteration ? { tr: e.transliteration } : {}),
    })),
  };
  const json = JSON.stringify(payload);
  // btoa can't handle unicode (Arabic) directly — escape first.
  return PREFIX + btoa(unescape(encodeURIComponent(json)));
}

export function decodeDeck(code: string): CollectionFormData | null {
  try {
    const trimmed = code.trim();
    const b64 = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
    const json = decodeURIComponent(escape(atob(b64)));
    const p = JSON.parse(json);
    if (!p || !Array.isArray(p.e)) return null;
    return {
      title: typeof p.t === "string" ? p.t : "Imported deck",
      language: p.l === "arabic" ? "arabic" : "french",
      dialect: p.d || undefined,
      category: p.c || undefined,
      entries: p.e.map((x: any) => ({
        english: String(x.en ?? ""),
        french: String(x.ta ?? ""),
        target: String(x.ta ?? ""),
        ...(Array.isArray(x.al) && x.al.length ? { alternatives: x.al.map(String) } : {}),
        ...(x.tr ? { transliteration: String(x.tr) } : {}),
      })).filter((e: any) => e.english && e.target),
    };
  } catch {
    return null;
  }
}

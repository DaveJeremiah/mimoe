export interface CollectionEntry {
  english: string;
  french: string;
  target?: string;
  alternatives?: string[];
  dialect?: string;
}

export type CollectionCategory = "lyrics" | "poem" | "dialogue" | "phrases" | "vocabulary" | "other";

export const COLLECTION_CATEGORIES: { value: CollectionCategory; label: string; emoji: string }[] = [
  { value: "lyrics",     label: "Lyrics",     emoji: "🎵" },
  { value: "poem",       label: "Poem",       emoji: "📜" },
  { value: "dialogue",   label: "Dialogue",   emoji: "💬" },
  { value: "phrases",    label: "Phrases",    emoji: "🗣️" },
  { value: "vocabulary", label: "Vocabulary", emoji: "📚" },
  { value: "other",      label: "Other",      emoji: "✨" },
];

export interface Collection {
  id: string;
  title: string;
  language?: "french" | "arabic";
  dialect?: string;
  category?: CollectionCategory;
  entries: CollectionEntry[];
  createdAt: string;
}

export type CollectionFormData = {
  title: string;
  language?: "french" | "arabic";
  dialect?: string;
  category?: CollectionCategory;
  entries: CollectionEntry[];
};

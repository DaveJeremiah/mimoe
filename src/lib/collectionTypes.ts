export interface CollectionEntry {
  english: string;
  french: string;
  target?: string;
  alternatives?: string[];
  dialect?: string;
}

export interface Collection {
  id: string;
  title: string;
  language?: "french" | "arabic";
  dialect?: string;
  entries: CollectionEntry[];
  createdAt: string;
}

export type CollectionFormData = {
  title: string;
  language?: "french" | "arabic";
  dialect?: string;
  entries: CollectionEntry[];
};

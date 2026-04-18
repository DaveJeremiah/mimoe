export interface CollectionEntry {
  english: string;
  french: string;
  /** Additional accepted French answers (synonyms/alternatives) */
  alternatives?: string[];
}

export interface Collection {
  id: string;
  title: string;
  entries: CollectionEntry[];
  createdAt: string;
}

export type CollectionFormData = {
  title: string;
  entries: CollectionEntry[];
};

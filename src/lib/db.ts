import { supabase } from "@/integrations/supabase/client";
import type { Collection, CollectionEntry } from "./collectionTypes";
import type { FlashcardItem } from "./flashcardData";
import type { Language } from "./languageConfig";

type Tab = "vocabulary" | "phrases";

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Custom Levels ----------
export interface CustomLevelRow {
  id: string;
  title: string;
  tab: Tab;
  language: Language;
  dialect: string | null;
}

export const db = {
  // Custom levels
  async listCustomLevels(tab: Tab, language: Language): Promise<CustomLevelRow[]> {
    const { data, error } = await supabase
      .from("custom_levels")
      .select("id, title, tab, language, dialect")
      .eq("tab", tab)
      .eq("language", language)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CustomLevelRow[];
  },

  async createCustomLevel(input: { title: string; tab: Tab; language: Language; dialect?: string }): Promise<CustomLevelRow> {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("custom_levels")
      .insert({ user_id, title: input.title, tab: input.tab, language: input.language, dialect: input.dialect ?? null })
      .select("id, title, tab, language, dialect")
      .single();
    if (error) throw error;
    return data as CustomLevelRow;
  },

  async deleteCustomLevel(id: string): Promise<void> {
    const { error } = await supabase.from("custom_levels").delete().eq("id", id);
    if (error) throw error;
  },

  // Custom cards
  async listCustomCards(levelId: string): Promise<FlashcardItem[]> {
    const { data, error } = await supabase
      .from("custom_cards")
      .select("id, english, target, alternatives, position")
      .eq("level_id", levelId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      english: r.english as string,
      french: r.target as string,
      target: r.target as string,
      ...(Array.isArray(r.alternatives) && r.alternatives.length > 0 ? { alternatives: r.alternatives as string[] } : {}),
    }));
  },

  async createCustomCard(input: { levelId: string; english: string; target: string; alternatives?: string[]; position?: number }): Promise<FlashcardItem> {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("custom_cards")
      .insert({
        user_id,
        level_id: input.levelId,
        english: input.english,
        target: input.target,
        alternatives: input.alternatives ?? [],
        position: input.position ?? 0,
      })
      .select("id, english, target, alternatives")
      .single();
    if (error) throw error;
    const r: any = data;
    return {
      id: r.id,
      english: r.english,
      french: r.target,
      target: r.target,
      ...(Array.isArray(r.alternatives) && r.alternatives.length > 0 ? { alternatives: r.alternatives } : {}),
    };
  },

  async updateCustomCard(id: string, input: { english: string; target: string; alternatives?: string[] }): Promise<void> {
    const { error } = await supabase
      .from("custom_cards")
      .update({ english: input.english, target: input.target, alternatives: input.alternatives ?? [] })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteCustomCard(id: string): Promise<void> {
    const { error } = await supabase.from("custom_cards").delete().eq("id", id);
    if (error) throw error;
  },

  async bulkCreateCustomCards(levelId: string, entries: { english: string; target: string; alternatives?: string[] }[]): Promise<FlashcardItem[]> {
    if (entries.length === 0) return [];
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const rows = entries.map((e, i) => ({
      user_id,
      level_id: levelId,
      english: e.english,
      target: e.target,
      alternatives: e.alternatives ?? [],
      position: i,
    }));
    const { data, error } = await supabase.from("custom_cards").insert(rows).select("id, english, target, alternatives");
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      english: r.english,
      french: r.target,
      target: r.target,
      ...(Array.isArray(r.alternatives) && r.alternatives.length > 0 ? { alternatives: r.alternatives } : {}),
    }));
  },

  // Collections
  async listCollections(): Promise<Collection[]> {
    const { data: cols, error } = await supabase
      .from("collections")
      .select("id, title, language, dialect, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!cols || cols.length === 0) return [];
    const ids = cols.map((c: any) => c.id);
    const { data: entries, error: e2 } = await supabase
      .from("collection_entries")
      .select("id, collection_id, english, target, alternatives, position")
      .in("collection_id", ids)
      .order("position", { ascending: true });
    if (e2) throw e2;
    const grouped = new Map<string, CollectionEntry[]>();
    (entries ?? []).forEach((r: any) => {
      const list = grouped.get(r.collection_id) ?? [];
      list.push({
        english: r.english,
        french: r.target,
        target: r.target,
        ...(Array.isArray(r.alternatives) && r.alternatives.length > 0 ? { alternatives: r.alternatives as string[] } : {}),
      });
      grouped.set(r.collection_id, list);
    });
    return cols.map((c: any) => ({
      id: c.id,
      title: c.title,
      language: c.language,
      dialect: c.dialect ?? undefined,
      entries: grouped.get(c.id) ?? [],
      createdAt: c.created_at,
    }));
  },

  async createCollection(input: { title: string; language: Language; dialect?: string; entries: CollectionEntry[] }): Promise<Collection> {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { data: col, error } = await supabase
      .from("collections")
      .insert({ user_id, title: input.title, language: input.language, dialect: input.dialect ?? null })
      .select("id, title, language, dialect, created_at")
      .single();
    if (error) throw error;
    if (input.entries.length > 0) {
      const rows = input.entries.map((e, i) => ({
        user_id,
        collection_id: (col as any).id,
        english: e.english,
        target: e.target ?? e.french,
        alternatives: e.alternatives ?? [],
        position: i,
      }));
      const { error: e2 } = await supabase.from("collection_entries").insert(rows);
      if (e2) throw e2;
    }
    return {
      id: (col as any).id,
      title: (col as any).title,
      language: (col as any).language,
      dialect: (col as any).dialect ?? undefined,
      entries: input.entries,
      createdAt: (col as any).created_at,
    };
  },

  async updateCollection(id: string, input: { title: string; dialect?: string; entries: CollectionEntry[] }): Promise<void> {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { error } = await supabase
      .from("collections")
      .update({ title: input.title, dialect: input.dialect ?? null })
      .eq("id", id);
    if (error) throw error;
    // Replace entries
    const { error: eDel } = await supabase.from("collection_entries").delete().eq("collection_id", id);
    if (eDel) throw eDel;
    if (input.entries.length > 0) {
      const rows = input.entries.map((e, i) => ({
        user_id,
        collection_id: id,
        english: e.english,
        target: e.target ?? e.french,
        alternatives: e.alternatives ?? [],
        position: i,
      }));
      const { error: eIns } = await supabase.from("collection_entries").insert(rows);
      if (eIns) throw eIns;
    }
  },

  async deleteCollection(id: string): Promise<void> {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) throw error;
  },

  // Bookmarks
  async listBookmarks(language: Language): Promise<string[]> {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("card_id")
      .eq("language", language);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.card_id as string);
  },

  async toggleBookmark(cardId: string, english: string, target: string, language: Language, source: "level" | "collection" = "level"): Promise<boolean> {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("card_id", cardId)
      .eq("language", language)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("bookmarks").delete().eq("id", (existing as any).id);
      if (error) throw error;
      return false;
    }
    const { error } = await supabase.from("bookmarks").insert({
      user_id, card_id: cardId, english, target, language, source,
    });
    if (error) throw error;
    return true;
  },

  // Sessions / results / streaks (available for future use)
  async startSession(input: { language: Language; source: string; sourceId?: string; totalCards: number }) {
    const user_id = await uid();
    if (!user_id) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id,
        language: input.language,
        source: input.source,
        source_id: input.sourceId ?? null,
        total_cards: input.totalCards,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  },

  async endSession(id: string, correctCount: number) {
    const { error } = await supabase
      .from("study_sessions")
      .update({ correct_count: correctCount, ended_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async recordResult(input: { sessionId?: string | null; cardId: string; english: string; target: string; language: Language; correct: boolean; attempts: number }) {
    const user_id = await uid();
    if (!user_id) return;
    await supabase.from("card_results").insert({
      user_id,
      session_id: input.sessionId ?? null,
      card_id: input.cardId,
      english: input.english,
      target: input.target,
      language: input.language,
      correct: input.correct,
      attempts: input.attempts,
    });
  },

  async getStreak() {
    const { data } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date")
      .maybeSingle();
    return data as { current_streak: number; longest_streak: number; last_active_date: string | null } | null;
  },
};

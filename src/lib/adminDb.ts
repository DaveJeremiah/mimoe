import { supabase } from "@/integrations/supabase/client";
import type { FlashcardItem } from "./flashcardData";

export interface AdminLevelRow {
  id: string;
  title: string;
  tab: "vocabulary" | "phrases";
  language: string;
  dialect: string | null;
  cefr: "A1" | "A2" | "B1" | null;
  position: number;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string;
  country: string;
  current_streak: number;
  longest_streak: number;
  session_count: number;
  collections_count: number;
  bookmarks_count: number;
  custom_levels_count: number;
}

export interface AdminStats {
  total_users: number;
  sessions_today: number;
  sessions_this_week: number;
  total_sessions: number;
  streak_leaderboard: { user_id: string; display_name: string; email: string; current_streak: number; longest_streak: number }[];
  top_cards: { card_id: string; english: string; target: string; language: string; study_count: number; accuracy_pct: number }[];
}

export interface SessionTrend {
  day: string;
  sessions: number;
  active_users: number;
  correct_cards: number;
}

export interface CardPair {
  english: string;
  target: string;
  alternatives: string[];
  transliteration: string;
  position: number;
}

export interface BuiltinOverrideRow {
  id: string;
  builtin_level_id: string;
  card_id: string;
  english: string;
  target: string;
  alternatives: string[];
  transliteration: string | null;
  position: number;
  hidden: boolean;
  imageUrl?: string;
}

export const adminDb = {
  async getStats(): Promise<AdminStats> {
    const { data, error } = await supabase.rpc("get_admin_stats");
    if (error) throw error;
    return data as AdminStats;
  },

  async getAllUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase.rpc("get_all_users");
    if (error) throw error;
    return (data as AdminUser[]) ?? [];
  },

  async getSessionTrends(daysBack = 30): Promise<SessionTrend[]> {
    const { data, error } = await supabase.rpc("get_session_trends", { days_back: daysBack });
    if (error) throw error;
    return (data as SessionTrend[]) ?? [];
  },

  // ── Admin levels (public-read, admin-write) ──────────────────────────────

  async listAdminLevels(tab: "vocabulary" | "phrases", language: string): Promise<AdminLevelRow[]> {
    const { data, error } = await supabase
      .from("admin_levels")
      .select("id, title, tab, language, dialect, cefr, position")
      .eq("tab", tab)
      .eq("language", language)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AdminLevelRow[];
  },

  async listAllAdminLevels(): Promise<AdminLevelRow[]> {
    const { data, error } = await supabase
      .from("admin_levels")
      .select("id, title, tab, language, dialect, cefr, position")
      .order("language", { ascending: true })
      .order("tab", { ascending: true })
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AdminLevelRow[];
  },

  async listAdminCards(levelId: string): Promise<FlashcardItem[]> {
    const { data, error } = await supabase
      .from("admin_cards")
      .select("id, english, target, alternatives, transliteration, position")
      .eq("level_id", levelId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      english: r.english as string,
      target: r.target as string,
      french: r.target as string,
      ...(Array.isArray(r.alternatives) && r.alternatives.length > 0 ? { alternatives: r.alternatives as string[] } : {}),
      ...(r.transliteration ? { transliteration: r.transliteration as string } : {}),
    }));
  },

  async upsertLevel(level: {
    id?: string | null;
    title: string;
    tab: "vocabulary" | "phrases";
    language: string;
    dialect?: string | null;
    cefr?: string | null;
    position: number;
  }): Promise<string> {
    const { data, error } = await supabase.rpc("admin_upsert_level", {
      p_id: level.id ?? null,
      p_title: level.title,
      p_tab: level.tab,
      p_language: level.language,
      p_dialect: level.dialect ?? null,
      p_cefr: level.cefr ?? null,
      p_position: level.position,
    });
    if (error) throw error;
    return data as string;
  },

  async deleteLevel(id: string): Promise<void> {
    const { error } = await supabase.rpc("admin_delete_level", { p_id: id });
    if (error) throw error;
  },

  async replaceCards(levelId: string, cards: CardPair[]): Promise<void> {
    const { error } = await supabase.rpc("admin_replace_cards", {
      p_level_id: levelId,
      p_cards: cards.map((c, i) => ({
        english: c.english,
        target: c.target,
        alternatives: c.alternatives,
        transliteration: c.transliteration,
        position: i,
      })),
    });
    if (error) throw error;
  },

  // ── Built-in level card overrides ──────────────────────────────────────

  async listBuiltinOverrides(levelId: string): Promise<BuiltinOverrideRow[]> {
    const { data, error } = await supabase
      .from("admin_builtin_overrides")
      .select("*")
      .eq("builtin_level_id", levelId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as BuiltinOverrideRow[];
  },

  async saveBuiltinOverrides(levelId: string, cards: BuiltinOverrideRow[]): Promise<void> {
    const { error } = await supabase.rpc("admin_save_builtin_overrides", {
      p_level_id: levelId,
      p_overrides: cards.map((c, i) => ({
        card_id: c.card_id,
        english: c.english,
        target: c.target,
        alternatives: c.alternatives ?? [],
        transliteration: c.transliteration ?? null,
        position: i,
        hidden: c.hidden,
        imageUrl: c.imageUrl ?? null,
      })),
    });
    if (error) throw error;
  },
};

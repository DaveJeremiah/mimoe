export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          card_id: string
          created_at: string
          english: string
          id: string
          language: string
          source: string
          target: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          english: string
          id?: string
          language?: string
          source?: string
          target: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          english?: string
          id?: string
          language?: string
          source?: string
          target?: string
          user_id?: string
        }
        Relationships: []
      }
      card_results: {
        Row: {
          attempts: number
          card_id: string
          correct: boolean
          created_at: string
          english: string
          id: string
          language: string
          session_id: string | null
          target: string
          user_id: string
        }
        Insert: {
          attempts?: number
          card_id: string
          correct?: boolean
          created_at?: string
          english: string
          id?: string
          language: string
          session_id?: string | null
          target: string
          user_id: string
        }
        Update: {
          attempts?: number
          card_id?: string
          correct?: boolean
          created_at?: string
          english?: string
          id?: string
          language?: string
          session_id?: string | null
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_entries: {
        Row: {
          alternatives: Json
          collection_id: string
          created_at: string
          english: string
          id: string
          position: number
          target: string
          user_id: string
        }
        Insert: {
          alternatives?: Json
          collection_id: string
          created_at?: string
          english: string
          id?: string
          position?: number
          target: string
          user_id: string
        }
        Update: {
          alternatives?: Json
          collection_id?: string
          created_at?: string
          english?: string
          id?: string
          position?: number
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          dialect: string | null
          id: string
          language: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dialect?: string | null
          id?: string
          language?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dialect?: string | null
          id?: string
          language?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_cards: {
        Row: {
          alternatives: Json
          created_at: string
          english: string
          id: string
          level_id: string
          position: number
          target: string
          user_id: string
        }
        Insert: {
          alternatives?: Json
          created_at?: string
          english: string
          id?: string
          level_id: string
          position?: number
          target: string
          user_id: string
        }
        Update: {
          alternatives?: Json
          created_at?: string
          english?: string
          id?: string
          level_id?: string
          position?: number
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_cards_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "custom_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_levels: {
        Row: {
          created_at: string
          dialect: string | null
          id: string
          language: string
          tab: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dialect?: string | null
          id?: string
          language?: string
          tab: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dialect?: string | null
          id?: string
          language?: string
          tab?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          correct_count: number
          ended_at: string | null
          id: string
          language: string
          source: string
          source_id: string | null
          started_at: string
          total_cards: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          ended_at?: string | null
          id?: string
          language: string
          source: string
          source_id?: string | null
          started_at?: string
          total_cards?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          ended_at?: string | null
          id?: string
          language?: string
          source?: string
          source_id?: string | null
          started_at?: string
          total_cards?: number
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          all_correct: boolean
          completed_at: string
          id: string
          level_id: string
          tab: string
          user_id: string
        }
        Insert: {
          all_correct?: boolean
          completed_at?: string
          id?: string
          level_id: string
          tab: string
          user_id: string
        }
        Update: {
          all_correct?: boolean
          completed_at?: string
          id?: string
          level_id?: string
          tab?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

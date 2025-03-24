export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_models: {
        Row: {
          api_key: string
          base_url: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          model_name: string
          name: string
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          model_name: string
          name: string
          provider: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          model_name?: string
          name?: string
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_pdfs: {
        Row: {
          batch_id: string
          id: string
          pdf_id: string
        }
        Insert: {
          batch_id: string
          id?: string
          pdf_id: string
        }
        Update: {
          batch_id?: string
          id?: string
          pdf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_pdfs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pdf_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_pdfs_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdf_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      firecrawl_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      papers: {
        Row: {
          abstract: string | null
          author: string
          created_at: string
          doi: string | null
          id: string
          name: string
          search_id: string | null
          year: number | null
        }
        Insert: {
          abstract?: string | null
          author: string
          created_at?: string
          doi?: string | null
          id?: string
          name: string
          search_id?: string | null
          year?: number | null
        }
        Update: {
          abstract?: string | null
          author?: string
          created_at?: string
          doi?: string | null
          id?: string
          name?: string
          search_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "papers_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_batches: {
        Row: {
          id: string
          name: string
          timestamp: string
        }
        Insert: {
          id?: string
          name: string
          timestamp?: string
        }
        Update: {
          id?: string
          name?: string
          timestamp?: string
        }
        Relationships: []
      }
      pdf_uploads: {
        Row: {
          authors: string | null
          background: string | null
          created_at: string
          doi: string | null
          filename: string
          full_text: string | null
          id: string
          major_findings: string | null
          markdown_content: string | null
          research_question: string | null
          suggestions: string | null
          title: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          background?: string | null
          created_at?: string
          doi?: string | null
          filename: string
          full_text?: string | null
          id?: string
          major_findings?: string | null
          markdown_content?: string | null
          research_question?: string | null
          suggestions?: string | null
          title?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          background?: string | null
          created_at?: string
          doi?: string | null
          filename?: string
          full_text?: string | null
          id?: string
          major_findings?: string | null
          markdown_content?: string | null
          research_question?: string | null
          suggestions?: string | null
          title?: string | null
          year?: number | null
        }
        Relationships: []
      }
      searches: {
        Row: {
          id: string
          query: string
          timestamp: string
        }
        Insert: {
          id?: string
          query: string
          timestamp?: string
        }
        Update: {
          id?: string
          query?: string
          timestamp?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

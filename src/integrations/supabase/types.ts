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
      code_submissions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          attempt_id: string
          code: string
          created_at: string
          id: string
          language: Database["public"]["Enums"]["code_language"]
          last_output: string | null
          last_stderr: string | null
          paste_flagged: boolean | null
          question_id: string
          time_to_solve_seconds: number | null
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id: string
          code?: string
          created_at?: string
          id?: string
          language: Database["public"]["Enums"]["code_language"]
          last_output?: string | null
          last_stderr?: string | null
          paste_flagged?: boolean | null
          question_id: string
          time_to_solve_seconds?: number | null
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          attempt_id?: string
          code?: string
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["code_language"]
          last_output?: string | null
          last_stderr?: string | null
          paste_flagged?: boolean | null
          question_id?: string
          time_to_solve_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_submissions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      proctor_violations: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          resolved: boolean
          resolved_at: string | null
          resume_code: string
          violation_type: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resume_code: string
          violation_type: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resume_code?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "proctor_violations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          college_uid: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          college_uid?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          college_uid?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_attempts: {
        Row: {
          code_score: number | null
          created_at: string
          final_score: number | null
          id: string
          pause_code: string | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_college_uid: string
          student_full_name: string
          student_id: string
          submitted_at: string | null
          test_id: string
          updated_at: string
          violation_count: number
          viva_score: number | null
        }
        Insert: {
          code_score?: number | null
          created_at?: string
          final_score?: number | null
          id?: string
          pause_code?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_college_uid: string
          student_full_name: string
          student_id: string
          submitted_at?: string | null
          test_id: string
          updated_at?: string
          violation_count?: number
          viva_score?: number | null
        }
        Update: {
          code_score?: number | null
          created_at?: string
          final_score?: number | null
          id?: string
          pause_code?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_college_uid?: string
          student_full_name?: string
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          updated_at?: string
          violation_count?: number
          viva_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string
          description: string
          expected_output: string | null
          hidden_tests: Json
          id: string
          max_score: number
          position: number
          sample_input: string | null
          starter_code: string | null
          test_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          expected_output?: string | null
          hidden_tests?: Json
          id?: string
          max_score?: number
          position?: number
          sample_input?: string | null
          starter_code?: string | null
          test_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          expected_output?: string | null
          hidden_tests?: Json
          id?: string
          max_score?: number
          position?: number
          sample_input?: string | null
          starter_code?: string | null
          test_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          branch: string | null
          code_weight: number
          created_at: string
          duration_minutes: number
          exam_date: string | null
          id: string
          is_active: boolean
          language: Database["public"]["Enums"]["code_language"]
          section: string | null
          strictness: Database["public"]["Enums"]["strictness_level"]
          teacher_id: string
          test_code: string
          title: string
          updated_at: string
          viva_weight: number
        }
        Insert: {
          branch?: string | null
          code_weight?: number
          created_at?: string
          duration_minutes?: number
          exam_date?: string | null
          id?: string
          is_active?: boolean
          language?: Database["public"]["Enums"]["code_language"]
          section?: string | null
          strictness?: Database["public"]["Enums"]["strictness_level"]
          teacher_id: string
          test_code: string
          title: string
          updated_at?: string
          viva_weight?: number
        }
        Update: {
          branch?: string | null
          code_weight?: number
          created_at?: string
          duration_minutes?: number
          exam_date?: string | null
          id?: string
          is_active?: boolean
          language?: Database["public"]["Enums"]["code_language"]
          section?: string | null
          strictness?: Database["public"]["Enums"]["strictness_level"]
          teacher_id?: string
          test_code?: string
          title?: string
          updated_at?: string
          viva_weight?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viva_responses: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          created_at: string
          flagged_injection: boolean | null
          id: string
          needs_review: boolean | null
          question_index: number
          question_text: string
          student_answer: string | null
          submission_id: string
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          flagged_injection?: boolean | null
          id?: string
          needs_review?: boolean | null
          question_index: number
          question_text: string
          student_answer?: string | null
          submission_id: string
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          flagged_injection?: boolean | null
          id?: string
          needs_review?: boolean | null
          question_index?: number
          question_text?: string
          student_answer?: string | null
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "code_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "teacher" | "student"
      attempt_status: "in_progress" | "paused" | "submitted"
      code_language: "c" | "java" | "python"
      strictness_level: "low" | "medium" | "high"
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
    Enums: {
      app_role: ["teacher", "student"],
      attempt_status: ["in_progress", "paused", "submitted"],
      code_language: ["c", "java", "python"],
      strictness_level: ["low", "medium", "high"],
    },
  },
} as const

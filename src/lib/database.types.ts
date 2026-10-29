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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          category: string | null
          channel: string | null
          city: string | null
          company: string | null
          connects_spent: number | null
          created_at: string
          deal_value: number | null
          email: string | null
          id: string
          last_touch_at: string | null
          linkedin_url: string | null
          lost_reason: string | null
          maps_url: string | null
          met_where: string | null
          name: string
          next_follow_up: string | null
          notes: Json
          phone: string | null
          priority: string
          proposal_status: string | null
          role: string | null
          source: string
          stage: string
          tags: string[]
          upwork_budget: number | null
          upwork_job_title: string | null
          upwork_job_url: string | null
          user_id: string
          website: string | null
          won_amount: number | null
          won_month: string | null
        }
        Insert: {
          category?: string | null
          channel?: string | null
          city?: string | null
          company?: string | null
          connects_spent?: number | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          lost_reason?: string | null
          maps_url?: string | null
          met_where?: string | null
          name: string
          next_follow_up?: string | null
          notes?: Json
          phone?: string | null
          priority?: string
          proposal_status?: string | null
          role?: string | null
          source?: string
          stage?: string
          tags?: string[]
          upwork_budget?: number | null
          upwork_job_title?: string | null
          upwork_job_url?: string | null
          user_id?: string
          website?: string | null
          won_amount?: number | null
          won_month?: string | null
        }
        Update: {
          category?: string | null
          channel?: string | null
          city?: string | null
          company?: string | null
          connects_spent?: number | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          id?: string
          last_touch_at?: string | null
          linkedin_url?: string | null
          lost_reason?: string | null
          maps_url?: string | null
          met_where?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: Json
          phone?: string | null
          priority?: string
          proposal_status?: string | null
          role?: string | null
          source?: string
          stage?: string
          tags?: string[]
          upwork_budget?: number | null
          upwork_job_title?: string | null
          upwork_job_url?: string | null
          user_id?: string
          website?: string | null
          won_amount?: number | null
          won_month?: string | null
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          energy?: number | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      experiments: {
        Row: {
          before_value: number | null
          created_at: string
          during_value: number | null
          end_date: string
          hypothesis: string
          id: string
          metric: string
          result: string
          start_date: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          before_value?: number | null
          created_at?: string
          during_value?: number | null
          end_date: string
          hypothesis?: string
          id?: string
          metric?: string
          result?: string
          start_date?: string
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          before_value?: number | null
          created_at?: string
          during_value?: number | null
          end_date?: string
          hypothesis?: string
          id?: string
          metric?: string
          result?: string
          start_date?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          deadline: string
          id: string
          include_pipeline: boolean
          short_label: string
          source_id: string
          source_kind: string
          start_date: string
          target: number
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          include_pipeline?: boolean
          short_label: string
          source_id: string
          source_kind?: string
          start_date?: string
          target: number
          title: string
          type?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          include_pipeline?: boolean
          short_label?: string
          source_id?: string
          source_kind?: string
          start_date?: string
          target?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          created_at: string
          id: string
          status: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          area: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          area?: string
          created_at?: string
          id?: string
          text: string
          user_id?: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      metric_entries: {
        Row: {
          contact_id: string | null
          created_at: string
          entry_date: string
          id: string
          metric_id: string
          note: string | null
          user_id: string
          value: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          metric_id: string
          note?: string | null
          user_id?: string
          value: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          metric_id?: string
          note?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contact_outreach_facts"
            referencedColumns: ["contact_id", "user_id"]
          },
          {
            foreignKeyName: "metric_entries_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "metric_entries_metric_fkey"
            columns: ["metric_id", "user_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      metrics: {
        Row: {
          builtin: string | null
          created_at: string
          id: string
          log_every: string
          name: string
          position: number
          unit: string
          user_id: string
          yearly_goal: number | null
        }
        Insert: {
          builtin?: string | null
          created_at?: string
          id?: string
          log_every?: string
          name: string
          position?: number
          unit?: string
          user_id?: string
          yearly_goal?: number | null
        }
        Update: {
          builtin?: string | null
          created_at?: string
          id?: string
          log_every?: string
          name?: string
          position?: number
          unit?: string
          user_id?: string
          yearly_goal?: number | null
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          key: string
          time: string | null
          time_end: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          time?: string | null
          time_end?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          time?: string | null
          time_end?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          backup_enabled: boolean
          created_at: string
          day_end_hour: number
          display_name: string | null
          id: string
          language: string
          theme: string
          timezone: string
          user_id: string
          week_start: number
          weekly_targets: Json
        }
        Insert: {
          backup_enabled?: boolean
          created_at?: string
          day_end_hour?: number
          display_name?: string | null
          id: string
          language?: string
          theme?: string
          timezone?: string
          user_id?: string
          week_start?: number
          weekly_targets?: Json
        }
        Update: {
          backup_enabled?: boolean
          created_at?: string
          day_end_hour?: number
          display_name?: string | null
          id?: string
          language?: string
          theme?: string
          timezone?: string
          user_id?: string
          week_start?: number
          weekly_targets?: Json
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          focus: string
          id: string
          lesson: string
          misses: string
          stats_snapshot: Json
          status: string
          user_id: string
          week_start: string
          wins: string
        }
        Insert: {
          created_at?: string
          focus?: string
          id?: string
          lesson?: string
          misses?: string
          stats_snapshot: Json
          status?: string
          user_id?: string
          week_start: string
          wins?: string
        }
        Update: {
          created_at?: string
          focus?: string
          id?: string
          lesson?: string
          misses?: string
          stats_snapshot?: Json
          status?: string
          user_id?: string
          week_start?: string
          wins?: string
        }
        Relationships: []
      }
      routine_checks: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          miss_reason: string | null
          routine_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          done?: boolean
          id?: string
          miss_reason?: string | null
          routine_item_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          miss_reason?: string | null
          routine_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_checks_routine_item_fkey"
            columns: ["routine_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      routine_items: {
        Row: {
          active: boolean
          created_at: string
          days: boolean[]
          id: string
          position: number
          time: string | null
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days?: boolean[]
          id?: string
          position?: number
          time?: string | null
          title: string
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: boolean[]
          id?: string
          position?: number
          time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      stage_history: {
        Row: {
          changed_at: string
          contact_id: string
          created_at: string
          from_stage: string | null
          id: string
          to_stage: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          contact_id: string
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage: string
          user_id?: string
        }
        Update: {
          changed_at?: string
          contact_id?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_history_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contact_outreach_facts"
            referencedColumns: ["contact_id", "user_id"]
          },
          {
            foreignKeyName: "stage_history_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          position: number
          priority: string
          status: string
          tag: string | null
          time: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          status?: string
          tag?: string | null
          time?: string | null
          title: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          status?: string
          tag?: string | null
          time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contact_outreach_facts"
            referencedColumns: ["contact_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          channel: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string | null
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          body?: string
          channel?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      touches: {
        Row: {
          body: string | null
          channel: string
          contact_id: string
          created_at: string
          direction: string
          got_reply: boolean
          id: string
          occurred_at: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string
          contact_id: string
          created_at?: string
          direction?: string
          got_reply?: boolean
          id?: string
          occurred_at?: string
          template_id?: string | null
          user_id?: string
        }
        Update: {
          body?: string | null
          channel?: string
          contact_id?: string
          created_at?: string
          direction?: string
          got_reply?: boolean
          id?: string
          occurred_at?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touches_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contact_outreach_facts"
            referencedColumns: ["contact_id", "user_id"]
          },
          {
            foreignKeyName: "touches_contact_fkey"
            columns: ["contact_id", "user_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "touches_template_fkey"
            columns: ["template_id", "user_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      contact_outreach_facts: {
        Row: {
          channel: string | null
          contact_id: string | null
          first_contacted_on: string | null
          furthest_step: number | null
          source: string | null
          stage: string | null
          template_id: string | null
          user_id: string | null
          won_amount: number | null
          won_on: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_default_notification_prefs: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_notifications: { Args: never; Returns: number }
      my_time_zone: { Args: never; Returns: string }
      restore_user_data: { Args: { p_tables: Json }; Returns: Json }
      stats_daily_completion: {
        Args: { p_from: string; p_to: string }
        Returns: {
          day: string
          done: number
          percent: number
          routine_done: number
          routine_total: number
          tasks_done: number
          tasks_total: number
          total: number
        }[]
      }
      stats_outreach_funnel: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          contacts: number
          pct_of_previous: number
          stage: string
          step: number
        }[]
      }
      stats_reply_rates: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          dimension: string
          key: string
          label: string
          rate: number
          replies: number
          sent: number
        }[]
      }
      stats_revenue: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          amount: number
          deals: number
          dimension: string
          key: string
          label: string
        }[]
      }
      stats_routine_days: {
        Args: { p_from: string; p_to: string }
        Returns: {
          day: string
          done: boolean
          miss_reason: string
          routine_item_id: string
          scheduled: boolean
          title: string
        }[]
      }
      stats_tasks_by_tag: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          done: number
          tag: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

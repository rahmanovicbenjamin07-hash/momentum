// Hand-written to match supabase/migrations (up to 20261029090100_stats_views) until the project is linked.
// Regenerate with: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          day_end_hour: number
          display_name: string | null
          id: string
          language: string
          theme: string
          timezone: string
          user_id: string
          week_start: number
        }
        Insert: {
          created_at?: string
          day_end_hour?: number
          display_name?: string | null
          id: string
          language?: string
          theme?: string
          timezone?: string
          user_id?: string
          week_start?: number
        }
        Update: {
          created_at?: string
          day_end_hour?: number
          display_name?: string | null
          id?: string
          language?: string
          theme?: string
          timezone?: string
          user_id?: string
          week_start?: number
        }
        Relationships: []
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
            foreignKeyName: 'routine_checks_routine_item_fkey'
            columns: ['routine_item_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'routine_items'
            referencedColumns: ['id', 'user_id']
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
            foreignKeyName: 'tasks_contact_fkey'
            columns: ['contact_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id', 'user_id']
          },
        ]
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
            foreignKeyName: 'touches_contact_fkey'
            columns: ['contact_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'touches_template_fkey'
            columns: ['template_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'templates'
            referencedColumns: ['id', 'user_id']
          },
        ]
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
            foreignKeyName: 'stage_history_contact_fkey'
            columns: ['contact_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id', 'user_id']
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
            foreignKeyName: 'metric_entries_metric_fkey'
            columns: ['metric_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'metrics'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'metric_entries_contact_fkey'
            columns: ['contact_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id', 'user_id']
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
      my_time_zone: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      stats_daily_completion: {
        Args: { p_from: string; p_to: string }
        Returns: {
          day: string
          tasks_done: number
          tasks_total: number
          routine_done: number
          routine_total: number
          done: number
          total: number
          percent: number | null
        }[]
      }
      stats_outreach_funnel: {
        Args: { p_from?: string | null; p_to?: string | null }
        Returns: {
          stage: string
          step: number
          contacts: number
          pct_of_previous: number | null
        }[]
      }
      stats_reply_rates: {
        Args: { p_from?: string | null; p_to?: string | null }
        Returns: {
          dimension: string
          key: string | null
          label: string | null
          sent: number
          replies: number
          rate: number
        }[]
      }
      stats_revenue: {
        Args: { p_from?: string | null; p_to?: string | null }
        Returns: {
          dimension: string
          key: string | null
          label: string | null
          deals: number
          amount: number
        }[]
      }
      stats_tasks_by_tag: {
        Args: { p_from?: string | null; p_to?: string | null }
        Returns: {
          tag: string | null
          done: number
        }[]
      }
      stats_routine_days: {
        Args: { p_from: string; p_to: string }
        Returns: {
          routine_item_id: string
          title: string
          day: string
          scheduled: boolean
          done: boolean
          miss_reason: string | null
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

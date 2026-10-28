// Hand-written to match supabase/migrations (up to 20261028200000_outreach) until the project is linked.
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

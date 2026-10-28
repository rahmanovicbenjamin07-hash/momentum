// Hand-written to match supabase/migrations (up to 20261028192411_today) until the project is linked.
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

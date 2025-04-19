export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      action_flows: {
        Row: {
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          sections: Json
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          sections: Json
          status: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          sections?: Json
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_flows_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          priority: number | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: number | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          priority?: number | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          flow_id: string
          id: string
          message: string
          read: boolean | null
          sender_id: string
          sender_name: string
          section_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          flow_id: string
          id?: string
          message: string
          read?: boolean | null
          sender_id: string
          sender_name: string
          section_id: string
          task_id: string
          user_id: string
        }
        Update: {
          flow_id?: string
          id?: string
          message?: string
          read?: boolean | null
          sender_id?: string
          sender_name?: string
          section_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_flow_id_fkey"
            columns: ["flow_id"]
            referencedRelation: "action_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
          status: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_messages_to_tasks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      add_requires_approval_to_tasks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_access_action_flow: {
        Args: { flow_id: string }
        Returns: boolean
      }
      create_admin_user_manual: {
        Args: { admin_email: string; admin_password: string }
        Returns: string
      }
      create_is_admin_function: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_storage_policy: {
        Args: { bucket_name: string }
        Returns: undefined
      }
      execute_sql: {
        Args: { sql_string: string }
        Returns: undefined
      }
      fix_action_flows_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_user_integration: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_users_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      setup_storage_policies: {
        Args: { sql_query: string }
        Returns: undefined
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

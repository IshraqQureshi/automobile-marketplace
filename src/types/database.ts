export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_vehicles: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          vehicle_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          vehicle_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_vehicles_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          booking_reference: string
          created_at: string
          customer_id: string
          customer_notes: string | null
          end_time: string
          id: string
          showroom_id: string
          showroom_notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          booking_reference: string
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          end_time: string
          id?: string
          showroom_id: string
          showroom_notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          booking_reference?: string
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          end_time?: string
          id?: string
          showroom_id?: string
          showroom_notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string
          recorded_by: string
          reference: string | null
          status: Database["public"]["Enums"]["manual_payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          recorded_by: string
          reference?: string | null
          status?: Database["public"]["Enums"]["manual_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          recorded_by?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["manual_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error_message: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      showroom_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          showroom_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          showroom_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          showroom_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "showroom_availability_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      showroom_documents: {
        Row: {
          created_at: string
          document_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          showroom_id: string
          status: Database["public"]["Enums"]["showroom_document_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          showroom_id: string
          status?: Database["public"]["Enums"]["showroom_document_status"]
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          showroom_id?: string
          status?: Database["public"]["Enums"]["showroom_document_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "showroom_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_documents_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showroom_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      showrooms: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          created_at: string
          description: string | null
          email: string
          id: string
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          owner_user_id: string
          phone: string
          status: Database["public"]["Enums"]["showroom_status"]
          updated_at: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          description?: string | null
          email: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          owner_user_id: string
          phone: string
          status?: Database["public"]["Enums"]["showroom_status"]
          updated_at?: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          owner_user_id?: string
          phone?: string
          status?: Database["public"]["Enums"]["showroom_status"]
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "showrooms_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_editable: boolean
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
          value_type: Database["public"]["Enums"]["system_setting_value_type"]
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_editable?: boolean
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
          value_type: Database["public"]["Enums"]["system_setting_value_type"]
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_editable?: boolean
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          value_type?: Database["public"]["Enums"]["system_setting_value_type"]
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_imports: {
        Row: {
          created_at: string
          error_report: Json | null
          failed_rows: number
          file_name: string
          id: string
          showroom_id: string
          status: Database["public"]["Enums"]["vehicle_import_status"]
          storage_path: string | null
          successful_rows: number
          total_rows: number
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          error_report?: Json | null
          failed_rows?: number
          file_name: string
          id?: string
          showroom_id: string
          status?: Database["public"]["Enums"]["vehicle_import_status"]
          storage_path?: string | null
          successful_rows?: number
          total_rows?: number
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          error_report?: Json | null
          failed_rows?: number
          file_name?: string
          id?: string
          showroom_id?: string
          status?: Database["public"]["Enums"]["vehicle_import_status"]
          storage_path?: string | null
          successful_rows?: number
          total_rows?: number
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_imports_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_imports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inquiries: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          message: string
          showroom_id: string
          status: Database["public"]["Enums"]["vehicle_inquiry_status"]
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          message: string
          showroom_id: string
          status?: Database["public"]["Enums"]["vehicle_inquiry_status"]
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          showroom_id?: string
          status?: Database["public"]["Enums"]["vehicle_inquiry_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inquiries_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inquiries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_media: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          media_type: string
          sort_order: number
          storage_path: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          media_type?: string
          sort_order?: number
          storage_path: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          media_type?: string
          sort_order?: number
          storage_path?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          body_type: string | null
          color: string | null
          created_at: string
          description: string | null
          financing_down_payment_percent: number | null
          financing_insurance_percent: number | null
          financing_interest_rate: number | null
          financing_partner: string | null
          financing_tenure_options_months: number[] | null
          financing_tracker_options: Json | null
          fuel_type: string | null
          id: string
          make: string
          mileage: number | null
          model: string
          price: number
          showroom_id: string
          status: Database["public"]["Enums"]["vehicle_status"]
          title: string
          transmission: string | null
          updated_at: string
          variant: string | null
          year: number
        }
        Insert: {
          body_type?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          financing_down_payment_percent?: number | null
          financing_insurance_percent?: number | null
          financing_interest_rate?: number | null
          financing_partner?: string | null
          financing_tenure_options_months?: number[] | null
          financing_tracker_options?: Json | null
          fuel_type?: string | null
          id?: string
          make: string
          mileage?: number | null
          model: string
          price: number
          showroom_id: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          title: string
          transmission?: string | null
          updated_at?: string
          variant?: string | null
          year: number
        }
        Update: {
          body_type?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          financing_down_payment_percent?: number | null
          financing_insurance_percent?: number | null
          financing_interest_rate?: number | null
          financing_partner?: string | null
          financing_tenure_options_months?: number[] | null
          financing_tracker_options?: Json | null
          fuel_type?: string | null
          id?: string
          make?: string
          mileage?: number | null
          model?: string
          price?: number
          showroom_id?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          title?: string
          transmission?: string | null
          updated_at?: string
          variant?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_showroom_id_fkey"
            columns: ["showroom_id"]
            isOneToOne: false
            referencedRelation: "showrooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      owns_showroom: { Args: { target_showroom_id: string }; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "PENDING"
        | "CONFIRMED"
        | "RESCHEDULED"
        | "DECLINED"
        | "CANCELLED"
        | "COMPLETED"
      manual_payment_status: "RECORDED" | "VOIDED"
      notification_channel: "EMAIL" | "WHATSAPP"
      notification_status: "PENDING" | "SENT" | "FAILED"
      notification_type:
        | "BOOKING_CREATED"
        | "BOOKING_CONFIRMED"
        | "BOOKING_RESCHEDULED"
        | "BOOKING_DECLINED"
        | "BOOKING_CANCELLED"
        | "BOOKING_REMINDER"
      showroom_document_status: "PENDING" | "APPROVED" | "REJECTED"
      showroom_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED"
      system_setting_value_type: "STRING" | "NUMBER" | "BOOLEAN" | "JSON"
      user_role: "CUSTOMER" | "SHOWROOM" | "ADMIN"
      vehicle_import_status:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "COMPLETED_WITH_ERRORS"
        | "FAILED"
      vehicle_inquiry_status: "NEW" | "VIEWED"
      vehicle_status:
        | "DRAFT"
        | "PENDING_REVIEW"
        | "ACTIVE"
        | "SOLD"
        | "INACTIVE"
        | "REJECTED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: [
        "PENDING",
        "CONFIRMED",
        "RESCHEDULED",
        "DECLINED",
        "CANCELLED",
        "COMPLETED",
      ],
      manual_payment_status: ["RECORDED", "VOIDED"],
      notification_channel: ["EMAIL", "WHATSAPP"],
      notification_status: ["PENDING", "SENT", "FAILED"],
      notification_type: [
        "BOOKING_CREATED",
        "BOOKING_CONFIRMED",
        "BOOKING_RESCHEDULED",
        "BOOKING_DECLINED",
        "BOOKING_CANCELLED",
        "BOOKING_REMINDER",
      ],
      showroom_document_status: ["PENDING", "APPROVED", "REJECTED"],
      showroom_status: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      system_setting_value_type: ["STRING", "NUMBER", "BOOLEAN", "JSON"],
      user_role: ["CUSTOMER", "SHOWROOM", "ADMIN"],
      vehicle_import_status: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "COMPLETED_WITH_ERRORS",
        "FAILED",
      ],
      vehicle_inquiry_status: ["NEW", "VIEWED"],
      vehicle_status: [
        "DRAFT",
        "PENDING_REVIEW",
        "ACTIVE",
        "SOLD",
        "INACTIVE",
        "REJECTED",
      ],
    },
  },
} as const


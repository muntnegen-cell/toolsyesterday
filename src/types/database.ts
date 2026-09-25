// Mirrors supabase/migrations/20260925000000_init.sql.
// Regenerate with: npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DocumentStatus = "uploaded" | "analyzing" | "analyzed" | "failed";

export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          storage_path: string;
          file_size_bytes: number;
          page_count: number | null;
          status: DocumentStatus;
          risk_score: number | null;
          teaser: Json | null;
          error_message: string | null;
          ip_hash: string | null;
          unlocked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          storage_path: string;
          file_size_bytes: number;
          page_count?: number | null;
          status?: DocumentStatus;
          risk_score?: number | null;
          teaser?: Json | null;
          error_message?: string | null;
          ip_hash?: string | null;
          unlocked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          storage_path?: string;
          file_size_bytes?: number;
          page_count?: number | null;
          status?: DocumentStatus;
          risk_score?: number | null;
          teaser?: Json | null;
          error_message?: string | null;
          ip_hash?: string | null;
          unlocked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_reports: {
        Row: {
          document_id: string;
          report: Json;
          model: string;
          created_at: string;
        };
        Insert: {
          document_id: string;
          report: Json;
          model: string;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          report?: Json;
          model?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_reports_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: true;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          price_id: string;
          amount_cents: number;
          currency: string;
          interval: "day" | "week" | "month" | "year";
          cancel_at_period_end: boolean;
          current_period_start: string | null;
          current_period_end: string | null;
          canceled_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          price_id: string;
          amount_cents: number;
          currency?: string;
          interval?: "day" | "week" | "month" | "year";
          cancel_at_period_end?: boolean;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: SubscriptionStatus;
          price_id?: string;
          amount_cents?: number;
          currency?: string;
          interval?: "day" | "week" | "month" | "year";
          cancel_at_period_end?: boolean;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          document_id: string | null;
          subscription_id: string | null;
          kind: "report" | "subscription";
          amount_cents: number;
          currency: string;
          status: "succeeded" | "refunded" | "failed";
          customer_email: string | null;
          stripe_checkout_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          document_id?: string | null;
          subscription_id?: string | null;
          kind: "report" | "subscription";
          amount_cents: number;
          currency?: string;
          status: "succeeded" | "refunded" | "failed";
          customer_email?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          document_id?: string | null;
          subscription_id?: string | null;
          kind?: "report" | "subscription";
          amount_cents?: number;
          currency?: string;
          status?: "succeeded" | "refunded" | "failed";
          customer_email?: string | null;
          stripe_checkout_session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      has_active_subscription: {
        Args: { uid: string };
        Returns: boolean;
      };
      can_view_full_report: {
        Args: { doc_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      document_status: DocumentStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; email: string; company: string; avatar: string; pin_lock: boolean; pin_code: string; dark_mode: boolean; monthly_salary_goal: number; created_at: string; updated_at: string };
        Insert: { id?: string; name?: string; email?: string; company?: string; avatar?: string; pin_lock?: boolean; pin_code?: string; dark_mode?: boolean; monthly_salary_goal?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; email?: string; company?: string; avatar?: string; pin_lock?: boolean; pin_code?: string; dark_mode?: boolean; monthly_salary_goal?: number; created_at?: string; updated_at?: string };
      };
      sessions: {
        Row: { id: string; user_id: string; token: string; device: string; browser: string; ip: string; location: string; current: boolean; created_at: string; last_active: string };
        Insert: { id?: string; user_id: string; token: string; device?: string; browser?: string; ip?: string; location?: string; current?: boolean; created_at?: string; last_active?: string };
        Update: { id?: string; user_id?: string; token?: string; device?: string; browser?: string; ip?: string; location?: string; current?: boolean; created_at?: string; last_active?: string };
      };
      salaries: {
        Row: { id: string; user_id: string; amount: number; payment_date: string; month: string; sender_name: string; company_name: string; income_source: string; payment_method: string; bkash_number: string; transaction_id: string; notes: string; screenshot: string; status: string; tags: string[]; created_at: string };
        Insert: { id?: string; user_id: string; amount: number; payment_date: string; month: string; sender_name?: string; company_name?: string; income_source?: string; payment_method?: string; bkash_number?: string; transaction_id?: string; notes?: string; screenshot?: string; status?: string; tags?: string[]; created_at?: string };
        Update: { id?: string; user_id?: string; amount?: number; payment_date?: string; month?: string; sender_name?: string; company_name?: string; income_source?: string; payment_method?: string; bkash_number?: string; transaction_id?: string; notes?: string; screenshot?: string; status?: string; tags?: string[]; created_at?: string };
      };
      expenses: {
        Row: { id: string; user_id: string; title: string; amount: number; category: string; date: string; payment_method: string; notes: string; receipt: string; tags: string[]; created_at: string };
        Insert: { id?: string; user_id: string; title: string; amount: number; category: string; date: string; payment_method?: string; notes?: string; receipt?: string; tags?: string[]; created_at?: string };
        Update: { id?: string; user_id?: string; title?: string; amount?: number; category?: string; date?: string; payment_method?: string; notes?: string; receipt?: string; tags?: string[]; created_at?: string };
      };
      goals: {
        Row: { id: string; user_id: string; title: string; target_amount: number; current_amount: number; deadline: string | null; created_at: string };
        Insert: { id?: string; user_id: string; title: string; target_amount: number; current_amount?: number; deadline?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; title?: string; target_amount?: number; current_amount?: number; deadline?: string | null; created_at?: string };
      };
      notes: {
        Row: { id: string; user_id: string; title: string; content: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; content?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; title?: string; content?: string; created_at?: string; updated_at?: string };
      };
      ai_messages: {
        Row: { id: string; user_id: string; role: string; content: string; created_at: string };
        Insert: { id?: string; user_id: string; role: string; content: string; created_at?: string };
        Update: { id?: string; user_id?: string; role?: string; content?: string; created_at?: string };
      };
      security_settings: {
        Row: { id?: string; user_id: string; password_rotation_enabled: boolean; rotation_interval_minutes: number; session_timeout_minutes: number; max_login_attempts: number; lockout_duration_minutes: number; last_password_change: string; next_password_rotation: string; current_password_hash: string; email: string; hashed_password: string };
        Insert: { id?: string; user_id: string; password_rotation_enabled?: boolean; rotation_interval_minutes?: number; session_timeout_minutes?: number; max_login_attempts?: number; lockout_duration_minutes?: number; last_password_change?: string; next_password_rotation?: string; current_password_hash?: string; email?: string; hashed_password?: string };
        Update: { id?: string; user_id?: string; password_rotation_enabled?: boolean; rotation_interval_minutes?: number; session_timeout_minutes?: number; max_login_attempts?: number; lockout_duration_minutes?: number; last_password_change?: string; next_password_rotation?: string; current_password_hash?: string; email?: string; hashed_password?: string };
      };
      telegram_config: {
        Row: { id?: string; user_id: string; bot_token: string; chat_id: string; enabled: boolean; notify_login: boolean; notify_failed_login: boolean; notify_password_change: boolean; notify_large_expense: boolean; notify_settings_change: boolean; large_expense_threshold: number };
        Insert: { id?: string; user_id: string; bot_token?: string; chat_id?: string; enabled?: boolean; notify_login?: boolean; notify_failed_login?: boolean; notify_password_change?: boolean; notify_large_expense?: boolean; notify_settings_change?: boolean; large_expense_threshold?: number };
        Update: { id?: string; user_id?: string; bot_token?: string; chat_id?: string; enabled?: boolean; notify_login?: boolean; notify_failed_login?: boolean; notify_password_change?: boolean; notify_large_expense?: boolean; notify_settings_change?: boolean; large_expense_threshold?: number };
      };
      analytics_cache: {
        Row: { id: string; user_id: string; cache_key: string; cache_value: Json; expires_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; cache_key: string; cache_value: Json; expires_at?: string | null; created_at?: string };
        Update: { id?: string; user_id?: string; cache_key?: string; cache_value?: Json; expires_at?: string | null; created_at?: string };
      };
      activity_logs: {
        Row: { id: string; user_id: string; action: string; details: string; type: string; device: string; browser: string; ip: string; created_at: string };
        Insert: { id?: string; user_id: string; action: string; details?: string; type?: string; device?: string; browser?: string; ip?: string; created_at?: string };
        Update: { id?: string; user_id?: string; action?: string; details?: string; type?: string; device?: string; browser?: string; ip?: string; created_at?: string };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

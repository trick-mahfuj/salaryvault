-- MNIT Work Ledger — Supabase Schema
-- Run this in your Supabase SQL Editor to create all tables and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_cache;

-- ==============================
-- USERS
-- ==============================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Admin',
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT 'MNIT Network',
  avatar TEXT DEFAULT '',
  pin_lock BOOLEAN DEFAULT FALSE,
  pin_code TEXT DEFAULT '',
  dark_mode BOOLEAN DEFAULT FALSE,
  monthly_salary_goal NUMERIC DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================
-- SESSIONS
-- ==============================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  location TEXT DEFAULT '',
  current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- ==============================
-- SECURITY SETTINGS
-- ==============================
CREATE TABLE IF NOT EXISTS public.security_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_rotation_enabled BOOLEAN DEFAULT TRUE,
  rotation_interval_minutes INTEGER DEFAULT 60,
  session_timeout_minutes INTEGER DEFAULT 30,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 15,
  last_password_change TIMESTAMPTZ DEFAULT NOW(),
  next_password_rotation TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  current_password_hash TEXT DEFAULT '',
  email TEXT DEFAULT '',
  hashed_password TEXT DEFAULT ''
);

-- ==============================
-- TELEGRAM CONFIG
-- ==============================
CREATE TABLE IF NOT EXISTS public.telegram_config (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bot_token TEXT DEFAULT '',
  chat_id TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT FALSE,
  notify_login BOOLEAN DEFAULT TRUE,
  notify_failed_login BOOLEAN DEFAULT TRUE,
  notify_password_change BOOLEAN DEFAULT TRUE,
  notify_large_expense BOOLEAN DEFAULT TRUE,
  notify_settings_change BOOLEAN DEFAULT TRUE,
  large_expense_threshold NUMERIC DEFAULT 10000
);

-- ==============================
-- SALARIES
-- ==============================
CREATE TABLE IF NOT EXISTS public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  month TEXT NOT NULL,
  sender_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  income_source TEXT DEFAULT 'Other',
  payment_method TEXT DEFAULT '',
  bkash_number TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  screenshot TEXT DEFAULT '',
  status TEXT DEFAULT 'completed',
  tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_salaries_user_id ON public.salaries(user_id);
CREATE INDEX IF NOT EXISTS idx_salaries_payment_date ON public.salaries(payment_date);

-- ==============================
-- EXPENSES
-- ==============================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  receipt TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- ==============================
-- GOALS
-- ==============================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);

-- ==============================
-- NOTES
-- ==============================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- ==============================
-- AI MESSAGES
-- ==============================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id ON public.ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at);

-- ==============================
-- ANALYTICS CACHE
-- ==============================
CREATE TABLE IF NOT EXISTS public.analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  cache_key TEXT NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cache_key)
);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_user_key ON public.analytics_cache(user_id, cache_key);

-- ==============================
-- ANALYTICS EVENTS (for tracking app usage)
-- ==============================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  type TEXT DEFAULT 'general',
  device TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies — allow access via service_role only (API-level auth)
-- These policies are restrictive: only service_role can access tables
CREATE POLICY "service_role_access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.salaries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.goals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.ai_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.security_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.telegram_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.analytics_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_access" ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

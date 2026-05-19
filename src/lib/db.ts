import { getServiceRoleClient } from "./supabase/service-role";

function db() {
  return getServiceRoleClient() as any;
}

// ==============================
// User
// ==============================
export async function ensureUser(): Promise<string> {
  const supabase = db();
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("users")
    .insert({ name: "Admin", email: "", company: "MNIT Network" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message}`);
  }

  await supabase.from("security_settings").insert({ user_id: data.id });
  await supabase.from("telegram_config").insert({ user_id: data.id });

  return data.id as string;
}

// ==============================
// Sessions
// ==============================
export async function findSessionByToken(token: string) {
  const supabase = db();
  const { data } = await supabase
    .from("sessions")
    .select("*, users(*)")
    .eq("token", token)
    .maybeSingle();
  return (data as Record<string, unknown>) || null;
}

export async function saveSession(session: {
  token: string;
  user_id: string;
  device: string;
  browser: string;
  ip: string;
  location?: string;
}) {
  const supabase = db();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      token: session.token,
      user_id: session.user_id,
      device: session.device,
      browser: session.browser,
      ip: session.ip,
      location: session.location || "Unknown",
      current: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save session: ${error.message}`);
  return data.id as string;
}

export async function invalidateOtherSessions(userId: string, currentToken: string) {
  const supabase = db();
  await supabase
    .from("sessions")
    .update({ current: false })
    .eq("user_id", userId)
    .neq("token", currentToken);
}

export async function clearAllSessions(userId: string) {
  const supabase = db();
  await supabase
    .from("sessions")
    .delete()
    .eq("user_id", userId);
}

export async function removeSession(userId: string, sessionId: string) {
  const supabase = db();
  await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
}

export async function listSessions(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

// ==============================
// Security Settings
// ==============================
export async function getSecuritySettings(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("security_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Record<string, unknown>) || null;
}

export async function upsertSecuritySettings(userId: string, settings: Record<string, unknown>) {
  const supabase = db();
  const { error } = await supabase
    .from("security_settings")
    .upsert({ user_id: userId, ...settings });
  if (error) throw new Error(`Failed to save security settings: ${error.message}`);
}

// ==============================
// Telegram Config
// ==============================
export async function getTelegramConfig(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("telegram_config")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Record<string, unknown>) || null;
}

export async function upsertTelegramConfig(userId: string, config: Record<string, unknown>) {
  const supabase = db();
  const { error } = await supabase
    .from("telegram_config")
    .upsert({ user_id: userId, ...config });
  if (error) throw new Error(`Failed to save telegram config: ${error.message}`);
}

// ==============================
// Salaries
// ==============================
export async function getSalaries(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("salaries")
    .select("*")
    .eq("user_id", userId)
    .order("payment_date", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

export async function createSalary(userId: string, salary: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("salaries")
    .insert({ ...salary, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`Failed to create salary: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function updateSalary(userId: string, id: string, updates: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("salaries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update salary: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function deleteSalary(userId: string, id: string) {
  const supabase = db();
  const { error } = await supabase
    .from("salaries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to delete salary: ${error.message}`);
}

// ==============================
// Expenses
// ==============================
export async function getExpenses(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

export async function createExpense(userId: string, expense: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...expense, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`Failed to create expense: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function updateExpense(userId: string, id: string, updates: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function deleteExpense(userId: string, id: string) {
  const supabase = db();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to delete expense: ${error.message}`);
}

// ==============================
// Goals
// ==============================
export async function getGoals(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

export async function createGoal(userId: string, goal: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...goal, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`Failed to create goal: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function updateGoal(userId: string, id: string, updates: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update goal: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function deleteGoal(userId: string, id: string) {
  const supabase = db();
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to delete goal: ${error.message}`);
}

// ==============================
// Notes
// ==============================
export async function getNotes(userId: string) {
  const supabase = db();
  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data || []) as Record<string, unknown>[];
}

export async function createNote(userId: string, note: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...note, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`Failed to create note: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function updateNote(userId: string, id: string, updates: Record<string, unknown>) {
  const supabase = db();
  const { data, error } = await supabase
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update note: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function deleteNote(userId: string, id: string) {
  const supabase = db();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to delete note: ${error.message}`);
}

// ==============================
// AI Messages
// ==============================
export async function getAIMessages(userId: string, limit = 100) {
  const supabase = db();
  const { data } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data || []) as Record<string, unknown>[]).reverse();
}

export async function saveAIMessage(msg: {
  user_id: string;
  role: string;
  content: string;
}) {
  const supabase = db();
  const { data, error } = await supabase
    .from("ai_messages")
    .insert(msg)
    .select()
    .single();
  if (error) throw new Error(`Failed to save AI message: ${error.message}`);
  return data as Record<string, unknown>;
}

export async function clearAIMessages(userId: string) {
  const supabase = db();
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to clear AI messages: ${error.message}`);
}

// ==============================
// Activity Logs
// ==============================
export async function getActivityLogs(userId: string, limit = 200) {
  const supabase = db();
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as Record<string, unknown>[];
}

export async function createActivityLog(log: {
  user_id: string;
  action: string;
  details?: string;
  type?: string;
  device?: string;
  browser?: string;
  ip?: string;
}) {
  const supabase = db();
  const { error } = await supabase.from("activity_logs").insert(log);
  if (error) throw new Error(`Failed to create activity log: ${error.message}`);
}

// ==============================
// Analytics Cache
// ==============================
export async function getAnalyticsCache(userId: string, key: string) {
  const supabase = db();
  const { data } = await supabase
    .from("analytics_cache")
    .select("cache_value, expires_at")
    .eq("user_id", userId)
    .eq("cache_key", key)
    .maybeSingle();

  const row = data as Record<string, unknown> | null;
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at as string) < new Date()) return null;
  return row.cache_value;
}

export async function setAnalyticsCache(
  userId: string,
  key: string,
  value: unknown,
  ttlMinutes = 60
) {
  const supabase = db();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();
  const { error } = await supabase.from("analytics_cache").upsert(
    { user_id: userId, cache_key: key, cache_value: value, expires_at: expiresAt },
    { onConflict: "user_id, cache_key" }
  );
  if (error) throw new Error(`Failed to set analytics cache: ${error.message}`);
}

// ==============================
// Full data load
// ==============================
export async function loadAllUserData(userId: string) {
  const [salaries, expenses, goals, notes, aiMessages, security, telegram, sessions, activityLogs] =
    await Promise.all([
      getSalaries(userId),
      getExpenses(userId),
      getGoals(userId),
      getNotes(userId),
      getAIMessages(userId),
      getSecuritySettings(userId),
      getTelegramConfig(userId),
      listSessions(userId),
      getActivityLogs(userId),
    ]);

  return {
    salaries,
    expenses,
    goals,
    notes,
    aiMessages,
    security,
    telegram,
    sessions,
    activityLogs,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { loadSettingsFromServer, storeSettingsOnServer, clearServerSettings, ensureUser } from "@/lib/serverSync";
import { findSessionByToken } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionData = await findSessionByToken(session);
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stored = await loadSettingsFromServer();
  if (!stored) {
    return NextResponse.json({ settings: null, data: null, timestamp: null });
  }

  return NextResponse.json({
    settings: stored.settings || null,
    data: stored.data || null,
    sessions: stored.sessions || [],
    activityLogs: stored.activityLogs || [],
    __syncedAt: stored.__syncedAt || null,
  });
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionData = await findSessionByToken(session);
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.settings && !body.data) {
      return NextResponse.json({ error: "Invalid payload — need settings or data" }, { status: 400 });
    }

    await storeSettingsOnServer(body);
    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionData = await findSessionByToken(session);
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearServerSettings();
  return NextResponse.json({ success: true });
}

// Ensure user exists on first call (warmup)
export async function OPTIONS() {
  try {
    const userId = await ensureUser();
    return NextResponse.json({ ready: true, userId });
  } catch (e) {
    return NextResponse.json({ ready: false, error: String(e) }, { status: 500 });
  }
}

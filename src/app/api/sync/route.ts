import { NextRequest, NextResponse } from "next/server";
import { storeSettingsOnServer, loadSettingsFromServer, clearServerSettings } from "@/lib/serverSync";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stored = await loadSettingsFromServer();
  if (!stored) {
    return NextResponse.json({ settings: null, data: null, timestamp: null });
  }

  return NextResponse.json({
    settings: stored.settings || null,
    data: stored.data || null,
    timestamp: stored.__syncedAt || null,
  });
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.settings && !body.data) {
      return NextResponse.json({ error: "Invalid payload — need settings or data" }, { status: 400 });
    }

    // Merge incoming payload with existing stored data
    const existing = (await loadSettingsFromServer()) || {};

    const merged: Record<string, unknown> = {
      ...existing,
      __syncedAt: new Date().toISOString(),
    };

    if (body.settings) {
      merged.settings = { ...((existing as Record<string, unknown>).settings as Record<string, unknown> || {}), ...(body.settings as Record<string, unknown>) };
      if (body.timestamp) (merged.settings as Record<string, unknown>).__clientTimestamp = body.timestamp;
    }

    if (body.data) {
      merged.data = { ...((existing as Record<string, unknown>).data as Record<string, unknown> || {}), ...(body.data as Record<string, unknown>) };
    }

    await storeSettingsOnServer(merged);
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

  await clearServerSettings();
  return NextResponse.json({ success: true });
}

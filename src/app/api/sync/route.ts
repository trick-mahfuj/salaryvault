import { NextRequest, NextResponse } from "next/server";
import { storeSettingsOnServer, loadSettingsFromServer, clearServerSettings } from "@/lib/serverSync";

export async function GET(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await loadSettingsFromServer();
  if (!settings) {
    return NextResponse.json({ settings: null, timestamp: null });
  }

  return NextResponse.json({ settings, timestamp: settings.__syncedAt || null });
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const settingsData = body.settings as Record<string, unknown>;
    if (body.timestamp) {
      settingsData.__clientTimestamp = body.timestamp;
    }

    await storeSettingsOnServer(settingsData);
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

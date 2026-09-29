import { NextRequest, NextResponse } from "next/server";

import { createAdminSession, validateAdminCredentials } from "@/lib/admin-auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// Per-process throttle for failed logins. It resets on restart and isn't
// shared between instances, so it slows down guessing rather than being a
// hard guarantee. Use a strong ADMIN_PANEL_PASSWORD regardless.
const failedAttempts = new Map<string, { count: number; firstFailureAt: number }>();

function getClientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function isLockedOut(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstFailureAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstFailureAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(key, { count: 1, firstFailureAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);

  if (isLockedOut(clientKey)) {
    return NextResponse.json(
      { message: "Too many failed attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json({ message: "Username and password are required" }, { status: 400 });
    }

    if (!validateAdminCredentials(username, password)) {
      recordFailure(clientKey);
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    failedAttempts.delete(clientKey);
    await createAdminSession(username);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    // Don't reveal configuration details (e.g. which env var is missing) to the client.
    console.error("Admin login error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

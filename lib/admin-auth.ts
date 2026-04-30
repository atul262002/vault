import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_COOKIE = "vault_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

type AdminSessionPayload = {
  username: string;
  exp: number;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getSessionSecret() {
  return getRequiredEnv("ADMIN_SESSION_SECRET");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function encodeSession(payload: AdminSessionPayload) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString("base64url");
  const signature = signPayload(body);
  return `${body}.${signature}`;
}

function decodeSession(token: string): AdminSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = signPayload(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;
    if (!payload?.username || typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function validateAdminCredentials(username: string, password: string) {
  const envUsername = getRequiredEnv("ADMIN_PANEL_USERNAME");
  const envPassword = getRequiredEnv("ADMIN_PANEL_PASSWORD");
  return username === envUsername && password === envPassword;
}

export async function createAdminSession(username: string) {
  const store = await cookies();
  const token = encodeSession({
    username,
    exp: Date.now() + SESSION_TTL_MS,
  });
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function requireAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return decodeSession(token);
}

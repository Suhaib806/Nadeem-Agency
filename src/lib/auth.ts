import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "nadeem_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "nadeem_agency_default_dev_secret_key_32_chars";

export type SessionUser = {
  id: number;
  name: string;
  role: "admin" | "order_booker";
  email: string;
  active: boolean;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export function signSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser;
    return user.active ? user : null;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE)?.value;
    } catch {
      return null;
    }
  }
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(req?: NextRequest, role?: "admin" | "order_booker"): Promise<{ user: SessionUser | null; error?: string; status?: number }> {
  const user = await getSessionUser(req);
  if (!user) {
    return { user: null, error: "Authentication required", status: 401 };
  }
  if (role && user.role !== role) {
    return { user: null, error: "You do not have access to this resource", status: 403 };
  }
  return { user };
}

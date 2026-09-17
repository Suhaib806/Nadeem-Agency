import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { ensureSeedData } from "@/db/seed";
import { SESSION_COOKIE, signSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureSeedData();

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
    }

    const result = await pool.query<{
      id: number;
      name: string;
      role: "admin" | "order_booker";
      email: string;
      password_hash: string;
      active: boolean;
    }>(
      "SELECT id, name, role, email, password_hash, active FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [String(email).trim()],
    );

    const user = result.rows[0];
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      active: user.active,
    };

    const token = signSession(sessionUser);

    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is missing. Please create a .env.local file with your PostgreSQL connection string." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error?.message || "Failed to sign in" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { hashPassword, requireAuth } from "@/lib/auth";
import { moneyRaw } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const search = String(searchParams.get("search") || "").trim();
  const status = searchParams.get("status");

  const params: unknown[] = [];
  const filters = ["u.role = 'order_booker'"];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status === "active");
    filters.push(`u.active = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.role, u.email, u.active,
              COUNT(o.id) FILTER (WHERE o.order_date = CURRENT_DATE AND o.status <> 'cancelled')::int AS orders_today,
              COALESCE(SUM(o.grand_total) FILTER (WHERE o.order_date = CURRENT_DATE AND o.status <> 'cancelled'), 0) AS sales_today
       FROM users u LEFT JOIN orders o ON o.order_booker_id = u.id
       WHERE ${filters.join(" AND ")} GROUP BY u.id ORDER BY u.name`,
      params,
    );

    return NextResponse.json(
      result.rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        role: String(row.role),
        email: String(row.email),
        active: Boolean(row.active),
        ordersToday: Number(row.orders_today ?? 0),
        salesToday: moneyRaw(row.sales_today),
      })),
    );
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, active } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO users (name, role, email, password_hash, active) VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, role, email, active`,
      [String(name).trim(), role ?? "order_booker", String(email).trim().toLowerCase(), hashPassword(password), active ?? true],
    );

    const user = result.rows[0];
    return NextResponse.json(
      {
        id: Number(user.id),
        name: user.name,
        role: user.role,
        email: user.email,
        active: user.active,
        ordersToday: 0,
        salesToday: 0,
      },
      { status: 201 },
    );
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

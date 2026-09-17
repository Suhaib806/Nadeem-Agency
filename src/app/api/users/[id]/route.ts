import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { hashPassword, requireAuth } from "@/lib/auth";
import { parseId } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  try {
    const body = await req.json();
    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2, password_hash = COALESCE($3, password_hash), active = $4, updated_at = NOW()
       WHERE id = $5 AND role = 'order_booker' RETURNING id, name, role, email, active`,
      [body.name, body.email, body.password ? hashPassword(body.password) : null, body.active, id],
    );

    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: "Order booker not found" }, { status: 404 });

    return NextResponse.json({
      id: Number(user.id),
      name: user.name,
      role: user.role,
      email: user.email,
      active: user.active,
      ordersToday: 0,
      salesToday: 0,
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

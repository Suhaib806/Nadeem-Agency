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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  if (auth.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // 1. Delete order_items and audit_events for orders created by this order booker
    await client.query(
      "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE order_booker_id = $1)",
      [id],
    );
    await client.query(
      "DELETE FROM audit_events WHERE order_id IN (SELECT id FROM orders WHERE order_booker_id = $1) OR actor_id = $1",
      [id],
    );
    // 2. Delete orders created by this order booker
    await client.query("DELETE FROM orders WHERE order_booker_id = $1", [id]);
    // 3. Unassign any shops assigned to this booker
    await client.query(
      "UPDATE shops SET assigned_order_booker_id = NULL WHERE assigned_order_booker_id = $1",
      [id],
    );
    // 4. Delete the user
    const result = await client.query(
      "DELETE FROM users WHERE id = $1 AND role = 'order_booker' RETURNING id",
      [id],
    );
    await client.query("COMMIT");

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Order booker not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete order booker" }, { status: 500 });
  } finally {
    client.release();
  }
}


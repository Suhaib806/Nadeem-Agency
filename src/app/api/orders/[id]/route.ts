import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, parseId } from "@/lib/utils";
import { buildOrder, calculateItems } from "@/lib/orders";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });

  try {
    const order = await buildOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (auth.user.role === "order_booker" && order.orderBookerId !== auth.user.id) {
      return NextResponse.json({ error: "You do not have access to this order" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "Failed to get order" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });

  try {
    const existingRes = await pool.query<{ id: number; order_booker_id: number; status: string }>(
      "SELECT id, order_booker_id, status FROM orders WHERE id = $1",
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (auth.user.role === "order_booker" && existing.order_booker_id !== auth.user.id) {
      return NextResponse.json({ error: "You do not have access to this order" }, { status: 403 });
    }

    const body = await req.json();

    const validStatuses = ["pending", "submitted", "cancelled"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status '${body.status}'. Valid statuses: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    // Only admins can modify order items, discount, or tax
    if (auth.user.role === "order_booker" && (body.items || body.discount !== undefined || body.tax !== undefined)) {
      return NextResponse.json({ error: "Order bookers can only manage status" }, { status: 403 });
    }

    if (body.items && Array.isArray(body.items)) {
      const items = await calculateItems(body.items);
      const subtotal = moneyRaw(items.reduce((sum, item) => sum + item.lineTotal, 0));
      const discount = moneyRaw(body.discount ?? 0);
      const tax = moneyRaw(body.tax ?? 0);
      const grandTotal = moneyRaw(Math.max(0, subtotal - discount + tax));

      await pool.query(
        "UPDATE orders SET subtotal = $1, discount = $2, tax = $3, grand_total = $4, status = COALESCE($5, status), updated_at = NOW() WHERE id = $6",
        [subtotal, discount, tax, grandTotal, body.status ?? null, id],
      );
      await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);

      const itemParams: any[] = [];
      const itemValues: string[] = [];
      for (const item of items) {
        const offset = itemParams.length;
        itemValues.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        itemParams.push(
          id,
          item.productId,
          item.product.product_code,
          item.product.product_name,
          item.product.unit,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
        );
      }

      if (itemValues.length > 0) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, product_code, product_name, unit, quantity, unit_price, line_total)
           VALUES ${itemValues.join(", ")}`,
          itemParams,
        );
      }
    } else if (body.discount !== undefined || body.tax !== undefined) {
      await pool.query(
        "UPDATE orders SET discount = COALESCE($1, discount), tax = COALESCE($2, tax), status = COALESCE($3, status), grand_total = subtotal - COALESCE($1, discount) + COALESCE($2, tax), updated_at = NOW() WHERE id = $4",
        [body.discount ?? null, body.tax ?? null, body.status ?? null, id],
      );
    } else if (body.status !== undefined) {
      await pool.query(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [body.status, id],
      );
    }

    // Determine audit event description
    let action = "Order updated";
    if (body.status && body.status !== existing.status) {
      if (body.status === "submitted") {
        action = body.note ? `Payment received (${body.note})` : "Payment received - status marked as submitted";
      } else if (body.status === "pending") {
        action = body.note ? `Status set to pending (${body.note})` : "Status marked as pending";
      } else if (body.status === "cancelled") {
        action = body.note ? `Order cancelled (${body.note})` : "Order cancelled";
      }
    } else if (body.note) {
      action = body.note;
    }

    await pool.query(
      "INSERT INTO audit_events (order_id, action, actor_id) VALUES ($1, $2, $3)",
      [id, action, auth.user.id],
    );

    const order = await buildOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });

  try {
    const existingRes = await pool.query<{ id: number; order_booker_id: number; order_number: string }>(
      "SELECT id, order_booker_id, order_number FROM orders WHERE id = $1",
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (auth.user.role === "order_booker" && existing.order_booker_id !== auth.user.id) {
      return NextResponse.json({ error: "You do not have access to this order" }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
      await client.query("DELETE FROM audit_events WHERE order_id = $1", [id]);
      await client.query("DELETE FROM orders WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete order error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}


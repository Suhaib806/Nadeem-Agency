import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, parseId } from "@/lib/utils";

function rowShop(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    shopCode: String(row.shop_code),
    shopName: String(row.shop_name),
    ownerName: String(row.owner_name),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    area: String(row.area ?? "General"),
    assignedOrderBookerId: row.assigned_order_booker_id == null ? null : Number(row.assigned_order_booker_id),
    assignedOrderBookerName: row.assigned_order_booker_name == null ? null : String(row.assigned_order_booker_name),
    creditLimit: moneyRaw(row.credit_limit),
    status: String(row.status),
    notes: row.notes == null ? null : String(row.notes),
    ordersToday: Number(row.orders_today ?? 0),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid shop id" }, { status: 400 });

  try {
    const result = await pool.query(
      `SELECT s.*, u.name AS assigned_order_booker_name,
              (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id AND o.order_date = CURRENT_DATE AND o.status <> 'cancelled') AS orders_today
       FROM shops s LEFT JOIN users u ON u.id = s.assigned_order_booker_id WHERE s.id = $1`,
      [id],
    );

    if (!result.rows[0]) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    return NextResponse.json(rowShop(result.rows[0]));
  } catch (error) {
    console.error("Get shop error:", error);
    return NextResponse.json({ error: "Failed to get shop" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid shop id" }, { status: 400 });

  try {
    const body = await req.json();
    const result = await pool.query(
      `UPDATE shops SET shop_code = $1, shop_name = $2, owner_name = $3, phone = $4, address = $5, city = $6, area = $7,
       assigned_order_booker_id = $8, credit_limit = $9, status = $10, notes = $11, updated_at = NOW() WHERE id = $12 RETURNING *`,
      [
        body.shopCode,
        body.shopName,
        body.ownerName,
        body.phone ?? "",
        body.address ?? "",
        body.city ?? "",
        body.area ? String(body.area).trim() : "General",
        body.assignedOrderBookerId ? Number(body.assignedOrderBookerId) : null,
        Number(body.creditLimit ?? 0),
        body.status ?? "active",
        body.notes ?? null,
        id,
      ],
    );

    if (!result.rows[0]) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    return NextResponse.json(rowShop(result.rows[0]));
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That shop code is already in use" }, { status: 409 });
    }
    console.error("Update shop error:", error);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid shop id" }, { status: 400 });

  try {
    await pool.query("UPDATE shops SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete shop error:", error);
    return NextResponse.json({ error: "Failed to archive shop" }, { status: 500 });
  }
}

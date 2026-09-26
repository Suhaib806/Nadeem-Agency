import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { countWhere, moneyRaw } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 50);
  const search = String(searchParams.get("search") || "").trim();
  const status = searchParams.get("status");
  const area = searchParams.get("area");

  const params: unknown[] = [pageSize, (page - 1) * pageSize];
  const filters = ["1=1"];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(s.shop_code ILIKE $${params.length} OR s.shop_name ILIKE $${params.length} OR s.city ILIKE $${params.length} OR s.area ILIKE $${params.length} OR s.owner_name ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    filters.push(`s.status = $${params.length}`);
  }
  if (area) {
    params.push(area);
    filters.push(`s.area = $${params.length}`);
  }

  const where = filters.join(" AND ");

  try {
    const items = await pool.query(
      `SELECT s.id, s.shop_code, s.shop_name, s.owner_name, s.phone, s.address, s.city, s.area,
              s.assigned_order_booker_id, s.credit_limit, s.status, s.notes,
              u.name AS assigned_order_booker_name,
              COALESCE(tod.cnt, 0)::int AS orders_today,
              COUNT(*) OVER() AS total_count
       FROM shops s
       LEFT JOIN users u ON u.id = s.assigned_order_booker_id
       LEFT JOIN (
         SELECT shop_id, COUNT(*) AS cnt
         FROM orders
         WHERE order_date = CURRENT_DATE AND status <> 'cancelled'
         GROUP BY shop_id
       ) tod ON tod.shop_id = s.id
       WHERE ${where}
       ORDER BY s.area, s.shop_name
       LIMIT $1 OFFSET $2`,
      params,
    );

    const total = items.rows.length > 0 ? Number(items.rows[0].total_count) : 0;

    return NextResponse.json({
      items: items.rows.map(rowShop),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("List shops error:", error);
    return NextResponse.json({ error: "Failed to list shops" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { shopCode, shopName, ownerName, phone, address, city, area, assignedOrderBookerId, creditLimit, status, notes } = body;

    if (!shopCode || !shopName || !ownerName) {
      return NextResponse.json({ error: "Shop code, name, and owner are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO shops (shop_code, shop_name, owner_name, phone, address, city, area, assigned_order_booker_id, credit_limit, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        String(shopCode).trim(),
        String(shopName).trim(),
        String(ownerName).trim(),
        String(phone ?? "").trim(),
        String(address ?? "").trim(),
        String(city ?? "").trim(),
        String(area ?? "General").trim() || "General",
        assignedOrderBookerId ? Number(assignedOrderBookerId) : null,
        Number(creditLimit ?? 0),
        status ?? "active",
        notes ? String(notes).trim() : null,
      ],
    );

    return NextResponse.json(rowShop(result.rows[0]), { status: 201 });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That shop code is already in use" }, { status: 409 });
    }
    console.error("Create shop error:", error);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}

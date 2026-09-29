import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, today } from "@/lib/utils";
import { buildOrder, calculateItems } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") || 50)));
  const search = String(searchParams.get("search") || "").trim();
  const status = searchParams.get("status");
  const orderBookerId = searchParams.get("orderBookerId");

  const baseParams: unknown[] = [];
  const baseFilters = ["1=1"];

  if (user.role === "order_booker") {
    baseParams.push(user.id);
    baseFilters.push(`o.order_booker_id = $${baseParams.length}`);
  } else if (orderBookerId) {
    baseParams.push(Number(orderBookerId));
    baseFilters.push(`o.order_booker_id = $${baseParams.length}`);
  }

  if (search) {
    baseParams.push(`%${search}%`);
    baseFilters.push(`(o.order_number ILIKE $${baseParams.length} OR s.shop_name ILIKE $${baseParams.length} OR s.shop_code ILIKE $${baseParams.length})`);
  }

  const baseWhere = baseFilters.join(" AND ");

  const itemParams = [...baseParams];
  const itemFilters = [...baseFilters];

  if (status) {
    itemParams.push(status);
    itemFilters.push(`o.status = $${itemParams.length}`);
  }

  const itemWhere = itemFilters.join(" AND ");
  itemParams.push(pageSize);
  const limitIdx = itemParams.length;
  itemParams.push((page - 1) * pageSize);
  const offsetIdx = itemParams.length;

  try {
    const [itemsRes, countsRes] = await Promise.all([
      pool.query(
        `SELECT o.id, o.order_number, s.shop_name, s.shop_code, u.name AS order_booker_name,
                o.order_date, o.order_time, o.grand_total, o.status
         FROM orders o
         JOIN shops s ON s.id = o.shop_id
         JOIN users u ON u.id = o.order_booker_id
         WHERE ${itemWhere}
         ORDER BY o.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        itemParams,
      ),
      pool.query<{ all_count: string; pending_count: string; submitted_count: string; cancelled_count: string }>(
        `SELECT
           COUNT(*)::text AS all_count,
           COUNT(*) FILTER (WHERE o.status = 'pending')::text AS pending_count,
           COUNT(*) FILTER (WHERE o.status = 'submitted')::text AS submitted_count,
           COUNT(*) FILTER (WHERE o.status = 'cancelled')::text AS cancelled_count
         FROM orders o
         ${search ? "JOIN shops s ON s.id = o.shop_id" : ""}
         WHERE ${baseWhere}`,
        baseParams,
      ),
    ]);

    const countsRow = countsRes.rows[0];
    const counts = {
      all: Number(countsRow?.all_count || 0),
      pending: Number(countsRow?.pending_count || 0),
      submitted: Number(countsRow?.submitted_count || 0),
      cancelled: Number(countsRow?.cancelled_count || 0),
    };

    const total = status ? (counts as Record<string, number>)[status] ?? itemsRes.rows.length : counts.all;

    return NextResponse.json({
      items: itemsRes.rows.map((row) => ({
        id: Number(row.id),
        orderNumber: String(row.order_number),
        shopName: String(row.shop_name),
        shopCode: String(row.shop_code),
        orderBookerName: String(row.order_booker_name),
        orderDate: String(row.order_date),
        orderTime: String(row.order_time),
        grandTotal: moneyRaw(row.grand_total),
        status: String(row.status),
      })),
      total,
      counts,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("List orders error:", error);
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user;

  try {
    const body = await req.json();
    const { shopId, items: rawItems, discount: rawDiscount, tax: rawTax } = body;

    if (!shopId || !rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "Select a shop and at least one product" }, { status: 400 });
    }

    const orderBookerId = user.role === "admin" ? (body.orderBookerId ?? user.id) : user.id;
    const items = await calculateItems(rawItems);
    const subtotal = moneyRaw(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const discount = moneyRaw(rawDiscount ?? 0);
    const tax = moneyRaw(rawTax ?? 0);
    const grandTotal = moneyRaw(Math.max(0, subtotal - discount + tax));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const seq = await client.query<{ next: number }>("SELECT COALESCE(MAX(id), 0) + 1 AS next FROM orders");
      const orderNumber = `ORD-${String(Number(seq.rows[0].next)).padStart(6, "0")}`;
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      const initialStatus = body.status === "submitted" ? "submitted" : "pending";
      const order = await client.query<{ id: number }>(
        `INSERT INTO orders (order_number, shop_id, order_booker_id, order_date, order_time, subtotal, discount, tax, grand_total, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [orderNumber, Number(shopId), orderBookerId, today(), timeStr, subtotal, discount, tax, grandTotal, initialStatus],
      );
      const orderId = order.rows[0].id;

      const itemParams: any[] = [];
      const itemValues: string[] = [];
      for (const item of items) {
        const offset = itemParams.length;
        itemValues.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        itemParams.push(
          orderId,
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
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_code, product_name, unit, quantity, unit_price, line_total)
           VALUES ${itemValues.join(", ")}`,
          itemParams,
        );
      }

      const auditAction = initialStatus === "pending" ? "Order booked (pending payment)" : "Order booked and submitted";
      await client.query("INSERT INTO audit_events (order_id, action, actor_id) VALUES ($1, $2, $3)", [orderId, auditAction, user.id]);
      await client.query("COMMIT");

      const created = await buildOrder(orderId);
      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 400 });
  }
}

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
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 50);
  const search = String(searchParams.get("search") || "").trim();
  const status = searchParams.get("status");
  const orderBookerId = searchParams.get("orderBookerId");

  const params: unknown[] = [pageSize, (page - 1) * pageSize];
  const filters = ["1=1"];

  if (user.role === "order_booker") {
    params.push(user.id);
    filters.push(`o.order_booker_id = $${params.length}`);
  } else if (orderBookerId) {
    params.push(Number(orderBookerId));
    filters.push(`o.order_booker_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(o.order_number ILIKE $${params.length} OR s.shop_name ILIKE $${params.length} OR s.shop_code ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    filters.push(`o.status = $${params.length}`);
  }

  const where = filters.join(" AND ");

  try {
    const items = await pool.query(
      `SELECT o.id, o.order_number, s.shop_name, s.shop_code, u.name AS order_booker_name,
              o.order_date, o.order_time, o.grand_total, o.status,
              COUNT(*) OVER() AS total_count
       FROM orders o
       JOIN shops s ON s.id = o.shop_id
       JOIN users u ON u.id = o.order_booker_id
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    const total = items.rows.length > 0 ? Number(items.rows[0].total_count) : 0;

    return NextResponse.json({
      items: items.rows.map((row) => ({
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

      const order = await client.query<{ id: number }>(
        `INSERT INTO orders (order_number, shop_id, order_booker_id, order_date, order_time, subtotal, discount, tax, grand_total, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted') RETURNING id`,
        [orderNumber, Number(shopId), orderBookerId, today(), timeStr, subtotal, discount, tax, grandTotal],
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

      await client.query("INSERT INTO audit_events (order_id, action, actor_id) VALUES ($1, 'Order submitted', $2)", [orderId, user.id]);
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

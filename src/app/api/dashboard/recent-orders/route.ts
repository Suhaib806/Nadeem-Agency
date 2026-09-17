import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 8), 1), 100);

  try {
    const result = await pool.query(
      `SELECT o.id, o.order_number, s.shop_name, s.shop_code, u.name AS order_booker_name,
              o.order_date, o.order_time, o.grand_total, o.status
       FROM orders o JOIN shops s ON s.id = o.shop_id JOIN users u ON u.id = o.order_booker_id
       ORDER BY o.created_at DESC LIMIT $1`,
      [limit],
    );

    return NextResponse.json(
      result.rows.map((row) => ({
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
    );
  } catch (error) {
    console.error("Recent orders error:", error);
    return NextResponse.json({ error: "Failed to fetch recent orders" }, { status: 500 });
  }
}

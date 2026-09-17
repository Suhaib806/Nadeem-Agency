import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, today } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user;
  const date = today();
  const scope = user.role === "order_booker" ? " AND order_booker_id = $2" : "";
  const scopeParams = user.role === "order_booker" ? [date, user.id] : [date];

  try {
    const [summary, bookers, performance] = await Promise.all([
      pool.query<{
        total_orders: string;
        shops_visited: string;
        total_sales: string;
        pending_orders: string;
        cancelled_orders: string;
      }>(
        `SELECT COUNT(*) FILTER (WHERE status <> 'cancelled')::text AS total_orders,
                COUNT(DISTINCT shop_id) FILTER (WHERE status <> 'cancelled')::text AS shops_visited,
                COALESCE(SUM(grand_total) FILTER (WHERE status <> 'cancelled'), 0)::text AS total_sales,
                COUNT(*) FILTER (WHERE status = 'pending')::text AS pending_orders,
                COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled_orders
         FROM orders WHERE order_date = $1${scope}`,
        scopeParams,
      ),
      pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM users WHERE role = 'order_booker' AND active = true",
      ),
      pool.query<{ user_id: number; name: string; orders: string; sales: string; shops_visited: string }>(
        `SELECT u.id AS user_id, u.name, COUNT(o.id)::text AS orders,
                COALESCE(SUM(o.grand_total), 0)::text AS sales,
                COUNT(DISTINCT o.shop_id)::text AS shops_visited
         FROM users u LEFT JOIN orders o ON o.order_booker_id = u.id AND o.order_date = $1 AND o.status <> 'cancelled'
         WHERE u.role = 'order_booker' AND u.active = true${user.role === "order_booker" ? " AND u.id = $2" : ""}
         GROUP BY u.id, u.name ORDER BY SUM(o.grand_total) DESC NULLS LAST`,
        user.role === "order_booker" ? [date, user.id] : [date],
      ),
    ]);

    const row = summary.rows[0];
    return NextResponse.json({
      date,
      totalOrders: Number(row?.total_orders ?? 0),
      shopsVisited: Number(row?.shops_visited ?? 0),
      totalSales: moneyRaw(row?.total_sales),
      activeOrderBookers: Number(bookers.rows[0]?.count ?? 0),
      pendingOrders: Number(row?.pending_orders ?? 0),
      cancelledOrders: Number(row?.cancelled_orders ?? 0),
      salesByBooker: performance.rows.map((item) => ({
        userId: Number(item.user_id),
        name: item.name,
        orders: Number(item.orders),
        sales: moneyRaw(item.sales),
        shopsVisited: Number(item.shops_visited),
      })),
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard summary" }, { status: 500 });
  }
}

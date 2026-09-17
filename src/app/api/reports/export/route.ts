import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { today } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const shopId = searchParams.get("shopId");
  const orderBookerId = searchParams.get("orderBookerId");
  const status = searchParams.get("status");

  const params: unknown[] = [];
  const filters = ["1=1"];

  if (from) {
    params.push(from);
    filters.push(`o.order_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    filters.push(`o.order_date <= $${params.length}`);
  }
  if (shopId) {
    params.push(Number(shopId));
    filters.push(`o.shop_id = $${params.length}`);
  }
  if (orderBookerId) {
    params.push(Number(orderBookerId));
    filters.push(`o.order_booker_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    filters.push(`o.status = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT o.order_number, o.order_date, o.order_time, s.shop_code, s.shop_name, u.name AS order_booker,
              oi.product_code, oi.product_name, oi.unit, oi.quantity, oi.unit_price, oi.line_total,
              o.subtotal, o.discount, o.tax, o.grand_total, o.status
       FROM orders o JOIN shops s ON s.id = o.shop_id JOIN users u ON u.id = o.order_booker_id
       JOIN order_items oi ON oi.order_id = o.id WHERE ${filters.join(" AND ")} ORDER BY o.order_date DESC, o.created_at DESC, oi.id`,
      params,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Nadeem Agency";
    const sheet = workbook.addWorksheet("Orders");

    sheet.columns = [
      { header: "Order Number", key: "order_number", width: 16 },
      { header: "Date", key: "order_date", width: 14 },
      { header: "Time", key: "order_time", width: 12 },
      { header: "Shop Code", key: "shop_code", width: 14 },
      { header: "Shop Name", key: "shop_name", width: 28 },
      { header: "Order Booker", key: "order_booker", width: 22 },
      { header: "Product Code", key: "product_code", width: 16 },
      { header: "Product", key: "product_name", width: 28 },
      { header: "Unit", key: "unit", width: 12 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Unit Price", key: "unit_price", width: 14 },
      { header: "Line Total", key: "line_total", width: 14 },
      { header: "Subtotal", key: "subtotal", width: 14 },
      { header: "Discount", key: "discount", width: 14 },
      { header: "Tax", key: "tax", width: 14 },
      { header: "Grand Total", key: "grand_total", width: 14 },
      { header: "Status", key: "status", width: 14 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14532D" } };

    for (const row of result.rows) {
      sheet.addRow(row);
    }

    for (const key of ["unit_price", "line_total", "subtotal", "discount", "tax", "grand_total"]) {
      sheet.getColumn(key).numFmt = "#,##0.00";
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="nadeem-orders-${today()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export orders error:", error);
    return NextResponse.json({ error: "Failed to export orders" }, { status: 500 });
  }
}

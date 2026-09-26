import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { today } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const shopId = searchParams.get("shopId");
  const orderBookerId = searchParams.get("orderBookerId");
  const status = searchParams.get("status");
  const format = searchParams.get("format") || "summary"; // 'summary' (default 1 row per order) | 'both' | 'items'

  const params: unknown[] = [];
  const filters = ["1=1"];

  // Security enforcement: If user is an order_booker, strictly filter to their own orders only
  if (user.role === "order_booker") {
    params.push(user.id);
    filters.push(`o.order_booker_id = $${params.length}`);
  } else if (orderBookerId) {
    params.push(Number(orderBookerId));
    filters.push(`o.order_booker_id = $${params.length}`);
  }

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
  if (status) {
    params.push(status);
    filters.push(`o.status = $${params.length}`);
  }

  try {
    // 1 row per order with line items aggregated
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.order_date, o.order_time, s.shop_code, s.shop_name, s.area, s.city, u.name AS order_booker,
              o.subtotal, o.discount, o.tax, o.grand_total, o.status,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'productId', oi.product_id,
                  'productCode', oi.product_code,
                  'productName', oi.product_name,
                  'company', COALESCE(pr.company, 'Other'),
                  'unit', oi.unit,
                  'quantity', oi.quantity,
                  'unitPrice', oi.unit_price,
                  'lineTotal', oi.line_total
                ) ORDER BY oi.id)
                FROM order_items oi
                LEFT JOIN products pr ON pr.id = oi.product_id
                WHERE oi.order_id = o.id
              ), '[]'::json) AS items
       FROM orders o
       JOIN shops s ON s.id = o.shop_id
       JOIN users u ON u.id = o.order_booker_id
       WHERE ${filters.join(" AND ")}
       ORDER BY o.order_date DESC, o.created_at DESC`,
      params,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Nadeem Agency";
    workbook.created = new Date();

    const orders = result.rows;

    // --- SHEET 1: Orders (1 row per order) ---
    if (format !== "items") {
      const ordersSheet = workbook.addWorksheet("Orders");

      ordersSheet.columns = [
        { header: "Order Number", key: "order_number", width: 16 },
        { header: "Date", key: "order_date", width: 14 },
        { header: "Time", key: "order_time", width: 12 },
        { header: "Shop Code", key: "shop_code", width: 14 },
        { header: "Shop Name", key: "shop_name", width: 28 },
        { header: "Area / Bazaar", key: "area", width: 20 },
        { header: "City", key: "city", width: 16 },
        { header: "Order Booker", key: "order_booker", width: 22 },
        { header: "Products / Items Booked", key: "items_summary", width: 45 },
        { header: "Total Items", key: "item_count", width: 12 },
        { header: "Total Quantity", key: "total_quantity", width: 14 },
        { header: "Subtotal (Rs)", key: "subtotal", width: 15 },
        { header: "Discount (Rs)", key: "discount", width: 14 },
        { header: "Tax (Rs)", key: "tax", width: 12 },
        { header: "Grand Total (Rs)", key: "grand_total", width: 16 },
        { header: "Status", key: "status", width: 14 },
      ];

      const hRow = ordersSheet.getRow(1);
      hRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2E38" } };
      hRow.alignment = { vertical: "middle", horizontal: "center" };
      hRow.height = 28;

      let totalQuantityAll = 0;
      let totalSubtotalAll = 0;
      let totalDiscountAll = 0;
      let totalTaxAll = 0;
      let totalGrandTotalAll = 0;

      for (const order of orders) {
        const rawItems = Array.isArray(order.items) ? order.items : [];
        const itemsSummary = rawItems
          .map((i: any) => `${i.productName} (${Number(i.quantity)} ${i.unit})`)
          .join(", ");
        const totalQty = rawItems.reduce((acc: number, i: any) => acc + Number(i.quantity || 0), 0);
        const subtotal = Number(order.subtotal || 0);
        const discount = Number(order.discount || 0);
        const tax = Number(order.tax || 0);
        const grandTotal = Number(order.grand_total || 0);

        totalQuantityAll += totalQty;
        totalSubtotalAll += subtotal;
        totalDiscountAll += discount;
        totalTaxAll += tax;
        totalGrandTotalAll += grandTotal;

        const row = ordersSheet.addRow({
          order_number: order.order_number,
          order_date: order.order_date,
          order_time: order.order_time,
          shop_code: order.shop_code,
          shop_name: order.shop_name,
          area: order.area || "General",
          city: order.city,
          order_booker: order.order_booker,
          items_summary: itemsSummary || "No items",
          item_count: rawItems.length,
          total_quantity: totalQty,
          subtotal: subtotal,
          discount: discount,
          tax: tax,
          grand_total: grandTotal,
          status: order.status,
        });
        row.alignment = { vertical: "middle" };
      }

      if (orders.length > 0) {
        const summaryRow = ordersSheet.addRow({
          order_number: "TOTAL",
          shop_name: `${orders.length} orders`,
          total_quantity: totalQuantityAll,
          subtotal: totalSubtotalAll,
          discount: totalDiscountAll,
          tax: totalTaxAll,
          grand_total: totalGrandTotalAll,
        });
        summaryRow.font = { bold: true };
        summaryRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EDE4" } };
        summaryRow.height = 24;
        summaryRow.alignment = { vertical: "middle" };
      }

      for (const key of ["subtotal", "discount", "tax", "grand_total"]) {
        ordersSheet.getColumn(key).numFmt = "#,##0.00";
      }
      ordersSheet.getColumn("total_quantity").numFmt = "#,##0.00";
    }

    // --- SHEET 2: Line Items Detail (Itemized product rows) ---
    if (format === "both" || format === "items") {
      const itemsSheet = workbook.addWorksheet(format === "both" ? "Line Items Detail" : "Orders");

      itemsSheet.columns = [
        { header: "Order Number", key: "order_number", width: 16 },
        { header: "Date", key: "order_date", width: 14 },
        { header: "Time", key: "order_time", width: 12 },
        { header: "Shop Code", key: "shop_code", width: 14 },
        { header: "Shop Name", key: "shop_name", width: 28 },
        { header: "Area / Bazaar", key: "area", width: 20 },
        { header: "City", key: "city", width: 16 },
        { header: "Order Booker", key: "order_booker", width: 22 },
        { header: "Company / Brand", key: "company", width: 18 },
        { header: "Product Code", key: "product_code", width: 16 },
        { header: "Product Name", key: "product_name", width: 28 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Quantity", key: "quantity", width: 12 },
        { header: "Unit Price (Rs)", key: "unit_price", width: 15 },
        { header: "Line Total (Rs)", key: "line_total", width: 15 },
        { header: "Status", key: "status", width: 14 },
      ];

      const hRow = itemsSheet.getRow(1);
      hRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF25897C" } };
      hRow.alignment = { vertical: "middle", horizontal: "center" };
      hRow.height = 28;

      let itemsTotalQty = 0;
      let itemsTotalLineVal = 0;
      let totalItemCount = 0;

      for (const order of orders) {
        const rawItems = Array.isArray(order.items) ? order.items : [];
        for (const item of rawItems) {
          totalItemCount++;
          const qty = Number(item.quantity || 0);
          const price = Number(item.unitPrice || 0);
          const lineVal = Number(item.lineTotal ?? (qty * price));
          itemsTotalQty += qty;
          itemsTotalLineVal += lineVal;

          const r = itemsSheet.addRow({
            order_number: order.order_number,
            order_date: order.order_date,
            order_time: order.order_time,
            shop_code: order.shop_code,
            shop_name: order.shop_name,
            area: order.area || "General",
            city: order.city,
            order_booker: order.order_booker,
            company: item.company || "Other",
            product_code: item.productCode,
            product_name: item.productName,
            unit: item.unit,
            quantity: qty,
            unit_price: price,
            line_total: lineVal,
            status: order.status,
          });
          r.alignment = { vertical: "middle" };
        }
      }

      if (totalItemCount > 0) {
        const itemSummary = itemsSheet.addRow({
          order_number: "TOTAL",
          product_name: `${totalItemCount} line items across ${orders.length} orders`,
          quantity: itemsTotalQty,
          line_total: itemsTotalLineVal,
        });
        itemSummary.font = { bold: true };
        itemSummary.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EDE4" } };
        itemSummary.height = 24;
        itemSummary.alignment = { vertical: "middle" };
      }

      for (const key of ["unit_price", "line_total"]) {
        itemsSheet.getColumn(key).numFmt = "#,##0.00";
      }
      itemsSheet.getColumn("quantity").numFmt = "#,##0.00";
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const sanitize = (val: string) => val.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    const dateRange = from && to ? (from === to ? from : `${from}_to_${to}`) : from ? `from_${from}` : to ? `until_${to}` : today();
    const prefix = user.role === "order_booker" ? `${sanitize(user.name)}_orders` : "nadeem_orders";
    const modeSuffix = format === "items" ? "_line_items" : "";
    const filename = `${prefix}_${dateRange}${modeSuffix}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export orders error:", error);
    return NextResponse.json({ error: "Failed to export orders" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { today } from "@/lib/utils";
import { generateReceiptPdf, ReceiptOrderData } from "@/lib/pdf-receipt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user;
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const shopId = searchParams.get("shopId");
  const orderBookerId = searchParams.get("orderBookerId");
  const status = searchParams.get("status");
  // Default export format is now PDF matching the final receipt layout!
  const format = searchParams.get("format") || "pdf";

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

  if (orderId) {
    params.push(Number(orderId));
    filters.push(`o.id = $${params.length}`);
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
    // 1 row per order with full shop details and line items aggregated
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.order_date, o.order_time,
              s.shop_code, s.shop_name, s.owner_name, s.phone, s.address, s.area, s.city, s.credit_limit,
              u.name AS order_booker,
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

    const orders = result.rows;
    if (orders.length === 0) {
      return NextResponse.json({ error: "No orders found matching the filter criteria" }, { status: 404 });
    }

    function toDateStr(val: any): string {
      if (!val) return "";
      if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, "0");
        const d = String(val.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const str = String(val).trim();
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      return str.slice(0, 10);
    }

    // ========================================================
    // FORMAT: PDF (Default - Final Receipt Design)
    // ========================================================
    if (format !== "excel" && format !== "xlsx" && format !== "csv") {
      const receiptOrders: ReceiptOrderData[] = orders.map((row) => ({
        id: Number(row.id),
        orderNumber: String(row.order_number || ""),
        orderDate: toDateStr(row.order_date),
        orderTime: String(row.order_time || ""),
        shopCode: String(row.shop_code || ""),
        shopName: String(row.shop_name || ""),
        ownerName: String(row.owner_name || ""),
        phone: String(row.phone || ""),
        address: String(row.address || ""),
        area: String(row.area || "General"),
        city: String(row.city || "Bahawalpur"),
        creditLimit: Number(row.credit_limit || 0),
        orderBooker: String(row.order_booker || ""),
        subtotal: Number(row.subtotal || 0),
        discount: Number(row.discount || 0),
        tax: Number(row.tax || 0),
        grandTotal: Number(row.grand_total || 0),
        status: String(row.status || ""),
        items: Array.isArray(row.items)
          ? row.items.map((it: any) => ({
              productCode: String(it.productCode || ""),
              productName: String(it.productName || ""),
              unit: String(it.unit || "pcs"),
              quantity: Number(it.quantity || 0),
              unitPrice: Number(it.unitPrice || 0),
              lineTotal: Number(it.lineTotal || 0),
            }))
          : [],
      }));

      const pdfBuffer = await generateReceiptPdf(receiptOrders);

      const filename = receiptOrders.length === 1
        ? `invoice-${receiptOrders[0].orderNumber || receiptOrders[0].id}.pdf`
        : `nadeem-invoices-${today()}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    // ========================================================
    // FORMAT: EXCEL (Optional fallback)
    // ========================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Nadeem Agency";
    workbook.created = new Date();

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
      { header: "Subtotal (Rs)", key: "subtotal", width: 15 },
      { header: "Discount (Rs)", key: "discount", width: 14 },
      { header: "Tax (Rs)", key: "tax", width: 12 },
      { header: "Grand Total (Rs)", key: "grand_total", width: 16 },
      { header: "Payment Status", key: "status", width: 15 },
    ];

    const headerRow = ordersSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF25897C" },
    };

    orders.forEach((o) => {
      const itemsList = Array.isArray(o.items) ? o.items : [];
      const summaryText = itemsList
        .map((it: any) => `${it.productName} (x${it.quantity} ${it.unit})`)
        .join("; ");

      ordersSheet.addRow({
        order_number: o.order_number,
        order_date: o.order_date,
        order_time: o.order_time,
        shop_code: o.shop_code,
        shop_name: o.shop_name,
        area: o.area || "General",
        city: o.city || "",
        order_booker: o.order_booker,
        items_summary: summaryText,
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount || 0),
        tax: Number(o.tax || 0),
        grand_total: Number(o.grand_total || 0),
        status: o.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `nadeem-orders-${today()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to generate export file" }, { status: 500 });
  }
}

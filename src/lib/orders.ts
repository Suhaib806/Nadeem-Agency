import { pool } from "@/db";
import { moneyRaw } from "./utils";

export async function buildOrder(id: number) {
  const result = await pool.query(
    `SELECT o.*, s.shop_name, s.shop_code, s.owner_name, s.phone, s.address, s.area, u.name AS order_booker_name,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'productCode', oi.product_code,
           'productName', oi.product_name,
           'unit', oi.unit,
           'quantity', oi.quantity,
           'unitPrice', oi.unit_price,
           'lineTotal', oi.line_total
         ) ORDER BY oi.id)
         FROM order_items oi WHERE oi.order_id = o.id
       ), '[]'::json) AS items,
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', a.id,
           'action', a.action,
           'actorName', au.name,
           'createdAt', a.created_at
         ) ORDER BY a.created_at DESC)
         FROM audit_events a JOIN users au ON au.id = a.actor_id WHERE a.order_id = o.id
       ), '[]'::json) AS audit
     FROM orders o
     JOIN shops s ON s.id = o.shop_id
     JOIN users u ON u.id = o.order_booker_id
     WHERE o.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;

  const rawItems: any[] = Array.isArray(row.items) ? row.items : [];
  const rawAudit: any[] = Array.isArray(row.audit) ? row.audit : [];

  return {
    id: Number(row.id),
    orderNumber: String(row.order_number),
    shopId: Number(row.shop_id),
    shopName: String(row.shop_name),
    shopCode: String(row.shop_code),
    shopOwnerName: String(row.owner_name || ""),
    shopPhone: String(row.phone || ""),
    shopAddress: String(row.address || ""),
    shopArea: String(row.area || ""),
    orderBookerId: Number(row.order_booker_id),
    orderBookerName: String(row.order_booker_name),
    orderDate: String(row.order_date),
    orderTime: String(row.order_time),
    subtotal: moneyRaw(row.subtotal),
    discount: moneyRaw(row.discount),
    tax: moneyRaw(row.tax),
    grandTotal: moneyRaw(row.grand_total),
    status: String(row.status),
    createdAt: new Date(row.created_at).toISOString(),
    items: rawItems.map((item) => ({
      id: Number(item.id),
      productId: Number(item.productId),
      productCode: String(item.productCode),
      productName: String(item.productName),
      unit: String(item.unit),
      quantity: Number(item.quantity),
      unitPrice: moneyRaw(item.unitPrice),
      lineTotal: moneyRaw(item.lineTotal),
    })),
    audit: rawAudit.map((event) => ({
      id: Number(event.id),
      action: String(event.action),
      actorName: String(event.actorName),
      createdAt: new Date(event.createdAt).toISOString(),
    })),
  };
}

export async function calculateItems(items: Array<{ productId: number; quantity: number }>) {
  const ids = items.map((item) => item.productId);
  const result = await pool.query(
    "SELECT id, product_code, product_name, unit, price FROM products WHERE id = ANY($1::int[]) AND status = 'active'",
    [ids],
  );
  const products = new Map(result.rows.map((row) => [Number(row.id), row]));
  if (products.size !== new Set(ids).size) throw new Error("One or more products are unavailable");

  return items.map((item) => {
    const product = products.get(item.productId);
    const quantity = Number(item.quantity);
    const unitPrice = moneyRaw(product.price);
    return { ...item, product, quantity, unitPrice, lineTotal: moneyRaw(quantity * unitPrice) };
  });
}

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { countWhere, moneyRaw } from "@/lib/utils";

export const dynamic = "force-dynamic";

function rowProduct(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    productCode: String(row.product_code),
    productName: String(row.product_name),
    company: String(row.company ?? "Other"),
    category: String(row.category),
    unit: String(row.unit),
    price: moneyRaw(row.price),
    taxOrDiscount: moneyRaw(row.tax_or_discount),
    status: String(row.status),
    imageUrl: row.image_url ? String(row.image_url) : null,
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
  const company = searchParams.get("company");

  const params: unknown[] = [pageSize, (page - 1) * pageSize];
  const filters = ["1=1"];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(p.product_code ILIKE $${params.length} OR p.product_name ILIKE $${params.length} OR p.category ILIKE $${params.length} OR p.company ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    filters.push(`p.status = $${params.length}`);
  }
  if (company) {
    params.push(company);
    filters.push(`p.company = $${params.length}`);
  }

  const where = filters.join(" AND ");

  try {
    const items = await pool.query(
      `SELECT p.id, p.product_code, p.product_name, p.company, p.category, p.unit, p.price, p.tax_or_discount, p.status, p.image_url,
              COALESCE(tod.cnt, 0)::int AS orders_today,
              COUNT(*) OVER() AS total_count
       FROM products p
       LEFT JOIN (
         SELECT oi.product_id, COUNT(*) AS cnt
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.order_date = CURRENT_DATE AND o.status <> 'cancelled'
         GROUP BY oi.product_id
       ) tod ON tod.product_id = p.id
       WHERE ${where}
       ORDER BY p.company, p.product_name
       LIMIT $1 OFFSET $2`,
      params,
    );

    const total = items.rows.length > 0 ? Number(items.rows[0].total_count) : 0;

    return NextResponse.json({
      items: items.rows.map(rowProduct),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("List products error:", error);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { productCode, productName, company, category, unit, price, taxOrDiscount, status, imageUrl } = body;

    if (!productCode || !productName) {
      return NextResponse.json({ error: "Product code and name are required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO products (product_code, product_name, company, category, unit, price, tax_or_discount, status, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        String(productCode).trim(),
        String(productName).trim(),
        String(company ?? "Other").trim() || "Other",
        String(category ?? "General").trim(),
        String(unit ?? "pcs").trim(),
        Number(price ?? 0),
        Number(taxOrDiscount ?? 0),
        status ?? "active",
        imageUrl ? String(imageUrl).trim() : null,
      ],
    );

    return NextResponse.json(rowProduct(result.rows[0]), { status: 201 });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That product code is already in use" }, { status: 409 });
    }
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

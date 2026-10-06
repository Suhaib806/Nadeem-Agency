import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, parseId } from "@/lib/utils";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(rowProduct(result.rows[0]));
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: "Failed to get product" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const body = await req.json();
    const result = await pool.query(
      `UPDATE products SET 
        product_code = COALESCE($1, product_code),
        product_name = COALESCE($2, product_name),
        company = COALESCE($3, company),
        category = COALESCE($4, category),
        unit = COALESCE($5, unit),
        price = COALESCE($6, price),
        tax_or_discount = COALESCE($7, tax_or_discount),
        status = COALESCE($8, status),
        image_url = CASE WHEN $9::boolean THEN $10 ELSE image_url END,
        updated_at = NOW() 
       WHERE id = $11 RETURNING *`,
      [
        body.productCode ?? null,
        body.productName ?? null,
        body.company !== undefined ? (String(body.company).trim() || "Other") : null,
        body.category ?? null,
        body.unit ?? null,
        body.price !== undefined ? Number(body.price) : null,
        body.taxOrDiscount !== undefined ? Number(body.taxOrDiscount) : null,
        body.status ?? null,
        body.imageUrl !== undefined,
        body.imageUrl ? String(body.imageUrl).trim() : null,
        id,
      ],
    );

    if (!result.rows[0]) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(rowProduct(result.rows[0]));
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That product code is already in use" }, { status: 409 });
    }
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Remove any order items referencing this product
    await client.query("DELETE FROM order_items WHERE product_id = $1", [id]);
    const result = await client.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
    await client.query("COMMIT");

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  } finally {
    client.release();
  }
}


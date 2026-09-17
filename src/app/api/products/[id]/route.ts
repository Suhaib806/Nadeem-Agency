import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { moneyRaw, parseId } from "@/lib/utils";

function rowProduct(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    productCode: String(row.product_code),
    productName: String(row.product_name),
    category: String(row.category),
    unit: String(row.unit),
    price: moneyRaw(row.price),
    taxOrDiscount: moneyRaw(row.tax_or_discount),
    status: String(row.status),
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
      `UPDATE products SET product_code = $1, product_name = $2, category = $3, unit = $4, price = $5,
       tax_or_discount = $6, status = $7, updated_at = NOW() WHERE id = $8 RETURNING *`,
      [
        body.productCode,
        body.productName,
        body.category ?? "General",
        body.unit ?? "pcs",
        Number(body.price ?? 0),
        Number(body.taxOrDiscount ?? 0),
        body.status ?? "active",
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

  try {
    await pool.query("UPDATE products SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}

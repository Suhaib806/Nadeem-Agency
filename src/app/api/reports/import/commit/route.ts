import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { entity, rows } = body;

    if (!entity || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Upload rows and select an import type" }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;

    if (entity === "shops") {
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const params: any[] = [];
        const values: string[] = [];
        for (const row of chunk) {
          const code = String(row.shopCode ?? row.shop_code ?? "").trim();
          const name = String(row.shopName ?? row.shop_name ?? "").trim();
          if (!code || !name) {
            skipped++;
            continue;
          }
          const offset = params.length;
          values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
          params.push(
            code,
            name,
            row.ownerName ?? row.owner_name ?? "",
            row.phone ?? "",
            row.address ?? "",
            row.city ?? "",
            row.creditLimit ?? row.credit_limit ?? 0,
            row.status ?? "active",
            row.notes ?? null,
          );
        }
        if (values.length > 0) {
          const res = await pool.query(
            `INSERT INTO shops (shop_code, shop_name, owner_name, phone, address, city, credit_limit, status, notes)
             VALUES ${values.join(", ")}
             ON CONFLICT (shop_code) DO NOTHING
             RETURNING id`,
            params,
          );
          created += res.rows.length;
          skipped += values.length - res.rows.length;
        }
      }
    } else {
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const params: any[] = [];
        const values: string[] = [];
        for (const row of chunk) {
          const code = String(row.productCode ?? row.product_code ?? "").trim();
          const name = String(row.productName ?? row.product_name ?? "").trim();
          if (!code || !name) {
            skipped++;
            continue;
          }
          const offset = params.length;
          values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
          params.push(
            code,
            name,
            row.category ?? "General",
            row.unit ?? "pcs",
            row.price ?? 0,
            row.taxOrDiscount ?? row.tax_or_discount ?? 0,
            row.status ?? "active",
          );
        }
        if (values.length > 0) {
          const res = await pool.query(
            `INSERT INTO products (product_code, product_name, category, unit, price, tax_or_discount, status)
             VALUES ${values.join(", ")}
             ON CONFLICT (product_code) DO NOTHING
             RETURNING id`,
            params,
          );
          created += res.rows.length;
          skipped += values.length - res.rows.length;
        }
      }
    }

    return NextResponse.json({ created, skipped });
  } catch (error) {
    console.error("Import commit error:", error);
    return NextResponse.json({ error: "Failed to commit import" }, { status: 500 });
  }
}

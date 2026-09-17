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

    const errors: Array<{ row: number; field: string | null; message: string }> = [];
    const seen = new Set<string>();

    rows.forEach((row: any, index: number) => {
      const key =
        entity === "shops"
          ? String(row.shopCode ?? row.shop_code ?? "").trim()
          : String(row.productCode ?? row.product_code ?? "").trim();

      if (!key) {
        errors.push({
          row: index + 2,
          field: entity === "shops" ? "shopCode" : "productCode",
          message: "Required code is missing",
        });
      }

      if (seen.has(key)) {
        errors.push({
          row: index + 2,
          field: null,
          message: `Duplicate code ${key} in this file`,
        });
      }

      if (key) seen.add(key);
    });

    const table = entity === "shops" ? "shops" : "products";
    const codeColumn = entity === "shops" ? "shop_code" : "product_code";
    const codes = [...seen];

    if (codes.length > 0) {
      const existing = await pool.query(`SELECT ${codeColumn} FROM ${table} WHERE ${codeColumn} = ANY($1::text[])`, [codes]);
      for (const row of existing.rows) {
        errors.push({
          row: 0,
          field: codeColumn,
          message: `Code ${row[codeColumn]} already exists in database`,
        });
      }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      rows: rows.length,
      errors,
    });
  } catch (error) {
    console.error("Import preview error:", error);
    return NextResponse.json({ error: "Failed to preview import" }, { status: 500 });
  }
}

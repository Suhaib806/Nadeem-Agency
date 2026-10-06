import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch all companies along with their active product counts
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.logo,
        c.description,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        COALESCE(p_count.count, 0)::int AS "productCount"
      FROM companies c
      LEFT JOIN (
        SELECT LOWER(TRIM(company)) AS comp_name, COUNT(*)::int AS count
        FROM products
        GROUP BY LOWER(TRIM(company))
      ) p_count ON LOWER(TRIM(c.name)) = p_count.comp_name
      ORDER BY 
        CASE WHEN c.name = 'Other' THEN 1 ELSE 0 END ASC,
        c.name ASC;
    `);

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can add companies" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const logo = body.logo ? String(body.logo).trim() : null;
    const description = body.description ? String(body.description).trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // Check if company already exists (case-insensitive)
    const existing = await pool.query(
      `SELECT id, name FROM companies WHERE LOWER(TRIM(name)) = LOWER($1);`,
      [name],
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Company "${existing.rows[0].name}" already exists` },
        { status: 400 },
      );
    }

    const insertRes = await pool.query(
      `INSERT INTO companies (name, logo, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, logo, description, created_at AS "createdAt", updated_at AS "updatedAt";`,
      [name, logo || "/companies/other.svg", description || "Distributor FMCG Partner"],
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/companies error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create company" },
      { status: 500 },
    );
  }
}

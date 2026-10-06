import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import { requireAuth } from "@/lib/auth";
import { parseId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can edit companies" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  try {
    const existingRes = await pool.query<{ id: number; name: string }>(
      "SELECT id, name FROM companies WHERE id = $1;",
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json();
    const newName = body.name !== undefined ? String(body.name).trim() : existing.name;
    const newLogo = body.logo !== undefined ? (body.logo ? String(body.logo).trim() : null) : undefined;
    const newDescription = body.description !== undefined ? String(body.description).trim() : undefined;

    if (!newName) {
      return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
    }

    // Check uniqueness if name changed
    if (newName.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await pool.query(
        "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER($1) AND id != $2;",
        [newName, id],
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: `Company "${newName}" already exists` }, { status: 400 });
      }
    }

    const updates: string[] = ["name = $1", "updated_at = NOW()"];
    const values: any[] = [newName];

    if (newLogo !== undefined) {
      values.push(newLogo);
      updates.push(`logo = $${values.length}`);
    }

    if (newDescription !== undefined) {
      values.push(newDescription);
      updates.push(`description = $${values.length}`);
    }

    values.push(id);
    const updateQuery = `
      UPDATE companies 
      SET ${updates.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, name, logo, description, created_at AS "createdAt", updated_at AS "updatedAt";
    `;

    const updatedRes = await pool.query(updateQuery, values);

    // If company name was changed, sync products that had the old name
    if (newName !== existing.name) {
      await pool.query(
        "UPDATE products SET company = $1 WHERE LOWER(TRIM(company)) = LOWER(TRIM($2));",
        [newName, existing.name],
      );
    }

    return NextResponse.json(updatedRes.rows[0]);
  } catch (error: any) {
    console.error("PATCH /api/companies/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json({ error: "Only administrators can delete companies" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });

  try {
    const existingRes = await pool.query<{ id: number; name: string }>(
      "SELECT id, name FROM companies WHERE id = $1;",
      [id],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (existing.name === "Other") {
      return NextResponse.json({ error: "The default 'Other' company category cannot be deleted" }, { status: 400 });
    }

    // Check how many products belong to this company
    const countRes = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::int AS count FROM products WHERE LOWER(TRIM(company)) = LOWER(TRIM($1));",
      [existing.name],
    );
    const count = Number(countRes.rows[0]?.count || 0);

    // If products exist, reassign them to "Other" so products are not orphaned
    if (count > 0) {
      await pool.query(
        "UPDATE products SET company = 'Other' WHERE LOWER(TRIM(company)) = LOWER(TRIM($1));",
        [existing.name],
      );
    }

    await pool.query("DELETE FROM companies WHERE id = $1;", [id]);

    return NextResponse.json({
      success: true,
      message: count > 0 
        ? `Company deleted and ${count} product(s) reassigned to 'Other'`
        : "Company deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/companies/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete company" }, { status: 500 });
  }
}

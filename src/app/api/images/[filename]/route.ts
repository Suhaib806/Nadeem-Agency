import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    // 1. Fetch from PostgreSQL uploaded_images table
    const result = await pool.query<{ mime_type: string; data: Buffer }>(
      "SELECT mime_type, data FROM uploaded_images WHERE file_name = $1 LIMIT 1",
      [filename]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return new NextResponse(new Uint8Array(row.data), {
        status: 200,
        headers: {
          "Content-Type": row.mime_type || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Fallback: check on disk in public/products or public/companies
    for (const sub of ["products", "companies", ""]) {
      const diskPath = path.join(process.cwd(), "public", sub, filename);
      try {
        const fileBuffer = await fs.readFile(diskPath);
        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
          ".gif": "image/gif",
        };
        return new NextResponse(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            "Content-Type": mimeMap[ext] || "image/jpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // Continue searching
      }
    }

    return new NextResponse("Image Not Found", { status: 404 });
  } catch (error) {
    console.error("Serve image error:", error);
    return new NextResponse("Failed to load image", { status: 500 });
  }
}

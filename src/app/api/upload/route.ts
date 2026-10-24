import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { pool } from "@/db";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "admin");
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Determine target subfolder:
    // "products" -> directly into public/products
    // "companies" -> directly into public/companies
    const rawFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const isProducts = rawFolder === "products" || !rawFolder;
    const isCompanies = rawFolder === "companies";
    const targetFolder = isProducts ? "products" : isCompanies ? "companies" : rawFolder;

    // Validate image extension & MIME types (including Windows/Edge JPEG variants)
    const ext = (path.extname(file.name) || (file.type?.includes("png") ? ".png" : ".jpg")).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".jfif", ".avif"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/pjpeg",
      "image/png",
      "image/x-png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
      "image/jfif",
      "image/avif",
      "application/octet-stream",
    ];

    const hasAllowedExt = allowedExtensions.includes(ext);
    const hasAllowedMime = file.type ? allowedMimeTypes.includes(file.type.toLowerCase()) : false;

    if (!hasAllowedExt && !hasAllowedMime) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPG, PNG, WebP, SVG, or GIF image." },
        { status: 400 },
      );
    }

    // Limit size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size exceeds 15MB limit." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean base name from the uploaded file's original name
    const rawBase = path.basename(file.name, path.extname(file.name));
    let cleanBase = rawBase
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanBase) {
      cleanBase = `product-${Date.now()}`;
    }

    // For generic camera/file names like "image", "photo", "img", append a timestamp to avoid collisions
    let fileName = `${cleanBase}${ext}`;
    if (["image", "img", "photo", "product", "file", "download", "untitled", "screenshot"].includes(cleanBase)) {
      fileName = `${cleanBase}-${Date.now()}${ext}`;
    }

    const mimeType = file.type || (ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg");

    // 1. Always persist in PostgreSQL (persistent across all serverless lambdas on Vercel)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS uploaded_images (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(
      `INSERT INTO uploaded_images (file_name, mime_type, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (file_name) DO UPDATE SET mime_type = $2, data = $3, created_at = NOW();`,
      [fileName, mimeType, buffer]
    );

    // 2. Also try writing to local disk when running in development environment
    try {
      const uploadDir = path.join(process.cwd(), "public", targetFolder);
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
    } catch (fsErr: any) {
      // In serverless environments like Vercel, the filesystem (/var/task) is read-only (EROFS).
      // Since the image is safely persisted in PostgreSQL, disk write failure is non-fatal.
      console.log("Local filesystem write skipped (serverless environment):", fsErr?.message);
    }

    const publicUrl = `/${targetFolder}/${fileName}`;
    return NextResponse.json({ url: publicUrl, success: true, fileName }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error?.message || "Failed to upload image" }, { status: 500 });
  }
}

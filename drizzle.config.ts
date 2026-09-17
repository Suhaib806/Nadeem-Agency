import { defineConfig } from "drizzle-kit";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  if (fs.existsSync(".env.local")) {
    process.loadEnvFile?.(".env.local");
  } else if (fs.existsSync(".env")) {
    process.loadEnvFile?.(".env");
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});


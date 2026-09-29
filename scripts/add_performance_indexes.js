const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

// For DDL and migrations, direct endpoint without pooler is much more reliable
const directUrl = match[1].replace('-pooler', '');

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function runWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`Retry ${i + 1}/${maxRetries} after error: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function main() {
  console.log("Connecting directly to database...");

  const indexes = [
    // Orders table optimizations
    "CREATE INDEX IF NOT EXISTS idx_orders_booker_created ON orders (order_booker_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_orders_booker_status_created ON orders (order_booker_id, status, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_orders_date_status_shop ON orders (order_date, status, shop_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_date_booker_status ON orders (order_date, order_booker_id, status)",

    // Shops table optimizations
    "CREATE INDEX IF NOT EXISTS idx_shops_status_area_name ON shops (status, area, shop_name)",
    "CREATE INDEX IF NOT EXISTS idx_shops_booker_status ON shops (assigned_order_booker_id, status)",

    // Products table optimizations
    "CREATE INDEX IF NOT EXISTS idx_products_status_company_name ON products (status, company, product_name)",

    // Audit events table optimizations
    "CREATE INDEX IF NOT EXISTS idx_audit_order_created ON audit_events (order_id, created_at DESC)",
  ];

  for (const sql of indexes) {
    const start = Date.now();
    await runWithRetry(() => pool.query(sql));
    console.log(`✓ Executed: ${sql} (${Date.now() - start}ms)`);
  }

  console.log("All performance indexes created successfully!");
  await pool.end();
}

main().catch(err => {
  console.error("Index creation error:", err);
  process.exit(1);
});

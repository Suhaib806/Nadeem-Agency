const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);

const pool = new Pool({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(
    "SELECT id, product_code, product_name, company, category, price, image_url FROM products WHERE product_code = '2306' OR product_name ILIKE '%SOURDIP%'"
  );
  console.log("Matching products for 2306:", JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);

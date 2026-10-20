const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const pool = new Pool({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const codes = ['2348', '1890', '2430', '2429', '2385', '1998', '2280'];
    const res = await pool.query(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_code = ANY($1) 
       ORDER BY product_code`,
      [codes]
    );
    console.log("Found products:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();

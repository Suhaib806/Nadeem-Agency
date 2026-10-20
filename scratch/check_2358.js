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
    const res = await pool.query(
      `SELECT * FROM products WHERE product_code = '2358' OR id = 2358`
    );
    console.log("Product 2358:", JSON.stringify(res.rows, null, 2));

    const kikis = await pool.query(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_name ILIKE '%SPEEDO%' OR product_name ILIKE '%KIKIS%' OR product_code = '2358'`
    );
    console.log("Matching products:", JSON.stringify(kikis.rows, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await pool.end();
  }
}

main();

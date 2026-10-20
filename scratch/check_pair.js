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

async function queryWithRetry(sql, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const pool = new Pool({
      connectionString: match[1],
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
    try {
      const res = await pool.query(sql, params);
      await pool.end();
      return res;
    } catch (err) {
      await pool.end().catch(() => {});
      if (i === retries - 1) throw err;
      console.log(`Retry ${i + 1} after error:`, err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function main() {
  try {
    const codes = ['2152', '1734'];
    const res = await queryWithRetry(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_code = ANY($1) 
       ORDER BY product_code`,
      [codes]
    );
    console.log("Found products:", JSON.stringify(res.rows, null, 2));

    const extra = await queryWithRetry(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_name ILIKE '%SHOOTER%' OR product_name ILIKE '%PIN POP%' OR product_code IN ('2152', '1734')
       ORDER BY product_code`
    );
    console.log("Search matches:", JSON.stringify(extra.rows, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  }
}

main();

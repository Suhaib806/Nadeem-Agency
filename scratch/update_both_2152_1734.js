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

const updates = [
  {
    code: '2152',
    url: '/products/bilal-shooter-jar.jpg'
  },
  {
    code: '1734',
    url: '/products/kikis-pin-pop-jar.jpg'
  }
];

async function updateWithRetry(code, url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const pool = new Pool({
      connectionString: match[1],
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    });
    try {
      const res = await pool.query(
        `UPDATE products 
         SET image_url = $1, updated_at = NOW() 
         WHERE product_code = $2 
         RETURNING id, product_code, product_name, company, category, price, image_url`,
        [url, code]
      );
      await pool.end();
      return res.rows[0];
    } catch (err) {
      await pool.end().catch(() => {});
      console.log(`Retry ${i + 1}/${retries} for product ${code}: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

async function verifyAll(codes, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const pool = new Pool({
      connectionString: match[1],
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    });
    try {
      const res = await pool.query(
        `SELECT id, product_code, product_name, company, category, price, image_url 
         FROM products 
         WHERE product_code = ANY($1) 
         ORDER BY product_code`,
        [codes]
      );
      await pool.end();
      return res.rows;
    } catch (err) {
      await pool.end().catch(() => {});
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

async function main() {
  try {
    for (const item of updates) {
      const row = await updateWithRetry(item.code, item.url);
      console.log(`[UPDATED] Product #${item.code}: ${row ? row.product_name : 'not found'} -> ${row ? row.image_url : ''}`);
    }

    console.log('\n--- Final Verification ---');
    const rows = await verifyAll(updates.map(u => u.code));
    console.table(rows);
  } catch (err) {
    console.error("Failed to complete updates:", err);
  }
}

main();

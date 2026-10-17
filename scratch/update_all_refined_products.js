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

const updates = [
  {
    code: '2295',
    namePattern: '%BIG PAINTER%',
    imageUrl: '/products/big-painter-lollipop.jpg',
    label: 'Big Painter Gum Filled Lollipop'
  },
  {
    code: '2318',
    namePattern: '%MANGO%LOLLY%',
    imageUrl: '/products/big-mango-lollipop.jpg',
    label: 'Big Mango Gum Filled Lollipop'
  },
  {
    code: '2329',
    namePattern: '%TIK TOK%',
    imageUrl: '/products/tiktok-lollipop.jpg',
    label: 'Tik Tok Tongue Painter Lollipop'
  },
  {
    code: '2152',
    namePattern: '%SHOOTER%',
    imageUrl: '/products/pistol-bubble-gum.jpg',
    label: 'Pistol Bubble Gum'
  },
  {
    code: '2428',
    namePattern: '%NECKLACE%',
    imageUrl: '/products/candy-necklace.jpg',
    label: 'Candy Necklace Dextrose Candy'
  }
];

async function run() {
  try {
    console.log('--- Updating Product Image URLs in DB ---');
    for (const item of updates) {
      const res = await pool.query(
        `UPDATE products 
         SET image_url = $1, updated_at = NOW() 
         WHERE product_code = $2 OR product_name ILIKE $3
         RETURNING id, product_code, product_name, company, price, image_url`,
        [item.imageUrl, item.code, item.namePattern]
      );
      if (res.rows.length > 0) {
        for (const row of res.rows) {
          console.log(`[UPDATED] ID: ${row.id} | Code: ${row.product_code} | Name: ${row.product_name} | Image: ${row.image_url}`);
        }
      } else {
        console.warn(`[NOT FOUND] No product matching code ${item.code} or pattern ${item.namePattern}`);
      }
    }

    console.log('\n--- Final Verification ---');
    const codes = updates.map(u => u.code);
    const verifyRes = await pool.query(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_code = ANY($1) OR product_code = '2296'
       ORDER BY id`,
      [codes]
    );
    console.table(verifyRes.rows);

  } catch (err) {
    console.error('Error during update:', err);
  } finally {
    await pool.end();
  }
}

run();

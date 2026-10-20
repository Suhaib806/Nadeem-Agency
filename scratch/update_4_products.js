const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const artifactsDir = 'C:\\Users\\LAPTOP INSIDE\\.gemini\\antigravity-ide\\brain\\243004a6-a286-4c0b-8c29-403d1188b1a1';

const productsConfig = [
  {
    code: '1885',
    src: path.join(artifactsDir, 'choco_pop_jar_1792491264054.jpg'),
    dest: 'choco-pop-jar.jpg',
    url: '/products/choco-pop-jar.jpg'
  },
  {
    code: '2029',
    src: path.join(artifactsDir, 'bilal_cola_jar_1792491322013.jpg'),
    dest: 'bilal-cola-jar.jpg',
    url: '/products/bilal-cola-jar.jpg'
  },
  {
    code: '2420',
    src: path.join(artifactsDir, 'fruitus_toffee_jar_1792491372126.jpg'),
    dest: 'fruitus-jar.jpg',
    url: '/products/fruitus-jar.jpg'
  },
  {
    code: '2239',
    src: path.join(artifactsDir, 'bilal_santra_jar_1792491412235.jpg'),
    dest: 'bilal-santra-jar.jpg',
    url: '/products/bilal-santra-jar.jpg'
  }
];

// 1. Copy images
for (const p of productsConfig) {
  if (!fs.existsSync(p.src)) {
    console.error(`Source not found: ${p.src}`);
    process.exit(1);
  }
  const target1 = path.join(__dirname, '../public/products', p.dest);
  const target2 = path.join(__dirname, '../public/uploads/products', p.dest);

  fs.copyFileSync(p.src, target1);
  fs.copyFileSync(p.src, target2);
  console.log(`Copied ${path.basename(p.src)} -> ${p.dest}`);
}

// 2. Connect to Database
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
    for (const p of productsConfig) {
      const res = await pool.query(
        `UPDATE products 
         SET image_url = $1, updated_at = NOW() 
         WHERE product_code = $2 
         RETURNING id, product_code, product_name, company, category, price, image_url`,
        [p.url, p.code]
      );
      console.log(`[UPDATED] Product #${p.code}:`, res.rows);
    }

    // Final verification query
    console.log('\n--- Final Verification ---');
    const codes = productsConfig.map(p => p.code);
    const verify = await pool.query(
      `SELECT id, product_code, product_name, company, category, price, image_url 
       FROM products 
       WHERE product_code = ANY($1) 
       ORDER BY product_code`,
      [codes]
    );
    console.table(verify.rows);
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await pool.end();
  }
}

main();

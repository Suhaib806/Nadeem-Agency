const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const artifactsDir = 'C:\\Users\\LAPTOP INSIDE\\.gemini\\antigravity-ide\\brain\\243004a6-a286-4c0b-8c29-403d1188b1a1';

const productsConfig = [
  {
    code: '2348',
    src: path.join(artifactsDir, 'bilal_pencil_bubble_1792492386198.jpg'),
    dest: 'bilal-pencil-bubble.jpg',
    url: '/products/bilal-pencil-bubble.jpg'
  },
  {
    code: '1890',
    src: path.join(artifactsDir, 'bilal_football_surprise_1792492441831.jpg'),
    dest: 'bilal-football-surprise.jpg',
    url: '/products/bilal-football-surprise.jpg'
  },
  {
    code: '2430',
    src: path.join(artifactsDir, 'gol_mol_chocolate_1792492509243.jpg'),
    dest: 'gol-mol-chocolate.jpg',
    url: '/products/gol-mol-chocolate.jpg'
  },
  {
    code: '2429',
    src: path.join(artifactsDir, 'gol_mol_strawberry_1792492602408.jpg'),
    dest: 'gol-mol-strawberry.jpg',
    url: '/products/gol-mol-strawberry.jpg'
  },
  {
    code: '2385',
    src: path.join(artifactsDir, 'kikis_pop_pik_1792492695106.jpg'),
    dest: 'kikis-pop-pik.jpg',
    url: '/products/kikis-pop-pik.jpg'
  },
  {
    code: '1998',
    src: path.join(artifactsDir, 'bilal_rush_chocolate_1792492760955.jpg'),
    dest: 'bilal-rush-chocolate.jpg',
    url: '/products/bilal-rush-chocolate.jpg'
  },
  {
    code: '2280',
    src: path.join(artifactsDir, 'bilal_rush_milko_1792492825882.jpg'),
    dest: 'bilal-rush-milko.jpg',
    url: '/products/bilal-rush-milko.jpg'
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
      if (res.rows.length > 0) {
        console.log(`[UPDATED] Product #${p.code}:`, res.rows[0].product_name, '->', res.rows[0].image_url);
      } else {
        console.warn(`[NOT FOUND] Product code ${p.code}`);
      }
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

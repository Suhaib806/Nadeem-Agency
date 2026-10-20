const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const artifactsDir = 'C:\\Users\\LAPTOP INSIDE\\.gemini\\antigravity-ide\\brain\\243004a6-a286-4c0b-8c29-403d1188b1a1';
const shooterSrc = path.join(artifactsDir, 'bilal_shooter_jar_1792493948547.jpg');
const shooterDest1 = path.join(__dirname, '../public/products/bilal-shooter-jar.jpg');
const shooterDest2 = path.join(__dirname, '../public/uploads/products/bilal-shooter-jar.jpg');

if (fs.existsSync(shooterSrc)) {
  fs.copyFileSync(shooterSrc, shooterDest1);
  fs.copyFileSync(shooterSrc, shooterDest2);
  console.log("Copied Shooter packshot to public/products and uploads");
}

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
      `UPDATE products 
       SET image_url = '/products/bilal-shooter-jar.jpg', updated_at = NOW() 
       WHERE product_code = '2152'
       RETURNING id, product_code, product_name, company, category, price, image_url`
    );
    console.log("[UPDATED] Product #2152:", res.rows);
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await pool.end();
  }
}

main();

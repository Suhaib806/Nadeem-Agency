const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Copy image to public/products
const artifactsDir = 'C:\\Users\\LAPTOP INSIDE\\.gemini\\antigravity-ide\\brain\\f499e1c7-4dc9-4f0d-a6f9-c1793023f901';
const generatedFile = path.join(artifactsDir, 'bilal_crispo_chocolate_bar_1792247553297.jpg');
const destFile = path.join(__dirname, '../public/products/crispo-chocolate-bar.jpg');

if (fs.existsSync(generatedFile)) {
  fs.copyFileSync(generatedFile, destFile);
  console.log(`Copied ${path.basename(generatedFile)} -> crispo-chocolate-bar.jpg`);
} else {
  console.error(`Generated image not found: ${generatedFile}`);
  process.exit(1);
}

// 2. Load DB URL
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
       SET image_url = '/products/crispo-chocolate-bar.jpg', updated_at = NOW() 
       WHERE product_code = '2261'
       RETURNING id, product_code, product_name, company, category, price, image_url`
    );

    console.log("Updated Product:", res.rows);
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await pool.end();
  }
}

main();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Copy image to public/products
const generatedFile = 'C:\\Users\\LAPTOP INSIDE\\.gemini\\antigravity-ide\\brain\\243004a6-a286-4c0b-8c29-403d1188b1a1\\speedo_car_1792490567526.jpg';
const destFile = path.join(__dirname, '../public/products/bilal-speedo-car.jpg');
const destFileAlt = path.join(__dirname, '../public/products/speedo-car.jpg');

if (fs.existsSync(generatedFile)) {
  fs.copyFileSync(generatedFile, destFile);
  fs.copyFileSync(generatedFile, destFileAlt);
  console.log(`Copied ${path.basename(generatedFile)} -> public/products/bilal-speedo-car.jpg & speedo-car.jpg`);
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
       SET image_url = '/products/bilal-speedo-car.jpg', updated_at = NOW() 
       WHERE product_code = '2358'
       RETURNING id, product_code, product_name, company, category, price, image_url`
    );

    console.log("Updated Product:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await pool.end();
  }
}

main();

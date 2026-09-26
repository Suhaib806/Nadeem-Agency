import { getPool } from "./index";
import { hashPassword } from "../lib/auth";

export function today() {
  return new Date().toISOString().slice(0, 10);
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const pool = getPool();
      const client = await pool.connect();
      try {
        const tableCheck = await client.query<{ exists: boolean }>(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS exists"
        );
        if (!tableCheck.rows[0]?.exists) {
          console.warn("Database tables not found. Run `npm run db:push` to create tables.");
          seedPromise = null;
          return;
        }

        const existing = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users");
        if (Number(existing.rows[0]?.count) > 0) return;

        await client.query("BEGIN");
        const admin = await client.query(
          `INSERT INTO users (name, role, email, password_hash, active)
           VALUES ('Nadeem Admin', 'admin', 'admin@nadeem.agency', $1, true)
           RETURNING id, name, role, email, active`,
          [hashPassword("admin123")],
        );
        const booker = await client.query(
          `INSERT INTO users (name, role, email, password_hash, active)
           VALUES ('Adeel Khan', 'order_booker', 'adeel@nadeem.agency', $1, true)
           RETURNING id, name, role, email, active`,
          [hashPassword("booker123")],
        );
        const secondBooker = await client.query(
          `INSERT INTO users (name, role, email, password_hash, active)
           VALUES ('Sara Ahmed', 'order_booker', 'sara@nadeem.agency', $1, true)
           RETURNING id, name, role, email, active`,
          [hashPassword("booker123")],
        );

        const bookerId = booker.rows[0].id;
        const secondBookerId = secondBooker.rows[0].id;

        await client.query(
          `INSERT INTO shops (shop_code, shop_name, owner_name, phone, address, city, area, assigned_order_booker_id, credit_limit, status)
           VALUES
           ('SH-1024', 'New Town General Store', 'Imran Shah', '0300 1234567', '18 Main Bazaar', 'Lahore', 'Main Bazaar', $1, 250000, 'active'),
           ('SH-1048', 'Al-Madina Cash & Carry', 'Farooq Ahmed', '0321 7654321', '4 Canal Road', 'Lahore', 'Canal Road', $1, 400000, 'active'),
           ('SH-1102', 'City Mart', 'Hina Tariq', '0333 4567890', '22 Model Town', 'Lahore', 'Model Town', $2, 175000, 'active'),
           ('SH-1136', 'Bismillah Traders', 'Rashid Ali', '0345 9876543', '7 Railway Road', 'Lahore', 'Railway Road', $2, 300000, 'active')`,
          [bookerId, secondBookerId],
        );

        const productRows = await client.query<{ id: number }>(
          `INSERT INTO products (product_code, product_name, company, category, unit, price, tax_or_discount, status, image_url)
           VALUES
           ('PR-001', 'Surf Excel 1kg', 'Master Food', 'Home Care', 'case', 3850, 0, 'active', '/products/surf-excel.jpg'),
           ('PR-014', 'Tapal Danedar 190g', 'JP Amir Food', 'Grocery', 'box', 1240, 0, 'active', '/products/tapal-danedar.jpg'),
           ('PR-027', 'Lux Soap 100g', 'Mux Food', 'Personal Care', 'dozen', 960, 0, 'active', '/products/lux-soap.jpg'),
           ('PR-041', 'Nestle Milkpak 1L', 'Jahanzaib Food', 'Dairy', 'case', 3700, 0, 'active', '/products/nestle-milkpak.jpg'),
           ('PR-052', 'Coca Cola 1.5L', 'Other', 'Beverages', 'case', 2100, 0, 'active', '/products/coca-cola.jpg') RETURNING id`,
        );

        const shopRows = await client.query<{ id: number }>("SELECT id FROM shops ORDER BY id LIMIT 1");
        const order = await client.query<{ id: number }>(
          `INSERT INTO orders (order_number, shop_id, order_booker_id, order_date, order_time, subtotal, discount, tax, grand_total, status)
           VALUES ('ORD-000001', $1, $2, $3, '10:42 AM', 50900, 900, 0, 50000, 'submitted') RETURNING id`,
          [shopRows.rows[0].id, bookerId, today()],
        );

        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_code, product_name, unit, quantity, unit_price, line_total)
           VALUES ($1, $2, 'PR-001', 'Surf Excel 1kg', 'case', 10, 3850, 38500),
                  ($1, $3, 'PR-014', 'Tapal Danedar 190g', 'box', 10, 1240, 12400)`,
          [order.rows[0].id, productRows.rows[0].id, productRows.rows[1].id],
        );

        await client.query(
          "INSERT INTO audit_events (order_id, action, actor_id) VALUES ($1, 'Order submitted', $2)",
          [order.rows[0].id, bookerId],
        );

        await client.query("COMMIT");
        void admin;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Seed transaction error:", err);
        seedPromise = null;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn("Could not connect to database to ensure seed data. Check DATABASE_URL:", err);
      seedPromise = null;
    }
  })();

  return seedPromise;
}

# Nadeem Agency Order Automation

Mobile-first order booking and invoice automation for Nadeem Agency's field sales team and administrators, consolidated into a single standard Next.js application.

## Run & Operate

- `npm run dev` — run the Next.js development server (at `http://localhost:3000`)
- `npm run build` — compile the Next.js application for production
- `npm run start` — start the compiled production server
- `npm run db:push` — push Drizzle schema changes to PostgreSQL
- Required env: `DATABASE_URL` — Postgres connection string (e.g. Neon)
- Required env: `SESSION_SECRET` — session signing secret (random string)

## Stack

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Styling: Tailwind CSS v4 + DM Sans & Space Grotesk Google Fonts
- Database: PostgreSQL + Drizzle ORM
- Auth: Signed httpOnly session cookie with Node.js crypto password hashing (scrypt)
- Export & Import: ExcelJS workbook generation and CSV parser
- Icons: Lucide React
- State: TanStack React Query

## Key Directory Structure

- `src/app/page.tsx` — Login gateway & role redirection
- `src/app/admin/` — Admin control room views (Dashboard, Orders, Shops, Products, Order Bookers, Reports, Excel Desk, Settings)
- `src/app/booker/` — Mobile-first field cockpit (Today's Route, New Order builder, Booker Orders)
- `src/app/api/` — Next.js Route Handlers (Auth, Dashboard, Shops, Products, Users, Orders, Reports)
- `src/db/` — Drizzle ORM schema, PostgreSQL pool, and seed data
- `src/components/` — Shared UI primitives, metrics, modals, and responsive shell navigation

## Default Preview Accounts

- Admin: `admin@nadeem.agency` / `admin123`
- Booker: `adeel@nadeem.agency` / `booker123`

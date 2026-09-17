import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

declare global {
  var _pgPool: pg.Pool | undefined;
  var _drizzleDb: ReturnType<typeof drizzle> | undefined;
  var _poolKeepAliveTimer: NodeJS.Timeout | undefined;
}

export function getPool(): pg.Pool {
  if (!globalThis._pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // Provide an idle placeholder pool during build-time module evaluation
      return new Pool();
    }
    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    globalThis._pgPool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 20,
      min: 2,
      idleTimeoutMillis: 120000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    globalThis._pgPool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });

    // Periodic heartbeat to prevent remote serverless/PgBouncer pooler connection drops
    if (!globalThis._poolKeepAliveTimer) {
      globalThis._poolKeepAliveTimer = setInterval(() => {
        if (globalThis._pgPool && process.env.DATABASE_URL) {
          globalThis._pgPool.query("SELECT 1").catch(() => {});
        }
      }, 40000);
      if (globalThis._poolKeepAliveTimer.unref) {
        globalThis._poolKeepAliveTimer.unref();
      }
    }
  }
  return globalThis._pgPool;
}

export const pool = {
  query: <T extends pg.QueryResultRow = any>(text: string, params?: any[]) => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required.");
    }
    return getPool().query<T>(text, params);
  },
  connect: () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required.");
    }
    return getPool().connect();
  },
};

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function poolLimits(): { min: number; max: number; idleTimeoutMillis: number } {
  if (process.env.VERCEL) {
    return { min: 0, max: 1, idleTimeoutMillis: 10000 };
  }
  if (process.env.COMIC_WORKER === "1") {
    return { min: 0, max: 5, idleTimeoutMillis: 30000 };
  }
  const min = process.env.NODE_ENV === "production" ? 2 : 1;
  return { min, max: 10, idleTimeoutMillis: 30000 };
}

function buildPoolConfig(): pg.PoolConfig {
  const connectionString = process.env.DATABASE_URL!;
  const limits = poolLimits();
  const config: pg.PoolConfig = {
    connectionString,
    min: limits.min,
    max: limits.max,
    idleTimeoutMillis: limits.idleTimeoutMillis,
    // Hosted Postgres cold starts can exceed 5s; allow more time before giving up.
    connectionTimeoutMillis: 15000,
  };

  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    const host = url.hostname;
    const needsSsl =
      sslmode === "require" ||
      host.includes("neon.tech") ||
      host.includes("supabase.co") ||
      host.includes("pooler.supabase.com");

    if (needsSsl) {
      config.ssl = { rejectUnauthorized: true };
    }
  } catch {
    // Non-URL connection strings rely on pg defaults.
  }

  return config;
}

export const pool = new Pool(buildPoolConfig());
export const db = drizzle(pool, { schema });

export async function waitForDatabase(options?: {
  attempts?: number;
  delayMs?: number;
}): Promise<boolean> {
  const attempts = options?.attempts ?? 4;
  const delayMs = options?.delayMs ?? 1500;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await pool.query("SELECT 1");
      if (attempt > 1) {
        console.log(`[db] Connected on attempt ${attempt}`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === attempts) {
        console.error(
          `[db] Could not connect after ${attempts} attempts: ${message}`,
        );
        console.error(
          "[db] Check DATABASE_URL, VPN/firewall, and that the database accepts connections.",
        );
        return false;
      }
      console.warn(
        `[db] Connection attempt ${attempt}/${attempts} failed (${message}); retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  return false;
}

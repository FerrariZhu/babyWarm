import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = join(__dirname, "..");

export function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

export function getDbUrl() {
  loadEnvFile(join(WEB_ROOT, ".env.local"));
  // Maintenance commands need the migration-capable account when both URLs exist.
  const dbUrl = process.env.DATABASE_URL?.trim() || process.env.WEB_DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error("请在 web/.env.local 设置 WEB_DATABASE_URL 或 DATABASE_URL（自建 PostgreSQL 连接串）");
  }
  return dbUrl;
}

export async function withPgClient(fn) {
  const pg = (await import("pg")).default;
  const client = new pg.Client({
    connectionString: getDbUrl(),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

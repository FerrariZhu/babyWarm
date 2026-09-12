import { Pool, type PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var warmrobotPool: Pool | undefined;
}

function getDatabaseUrl() {
  const databaseUrl =
    process.env.WEB_DATABASE_URL?.trim() ?? process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("缺少 WEB_DATABASE_URL / DATABASE_URL：应用尚未连接自托管 PostgreSQL。");
  }
  return databaseUrl;
}

function getPool() {
  if (!global.warmrobotPool) {
    global.warmrobotPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return global.warmrobotPool;
}

export async function query<T extends object>(
  statement: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(statement, values);
  return result.rows;
}

export async function queryOne<T extends object>(
  statement: string,
  values: unknown[] = []
): Promise<T | null> {
  return (await query<T>(statement, values))[0] ?? null;
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

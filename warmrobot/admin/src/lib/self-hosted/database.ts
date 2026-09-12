import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var warmrobotAdminPool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("缺少 DATABASE_URL：后台尚未连接自托管 PostgreSQL。");
  }
  return databaseUrl;
}

function getPool(): Pool {
  if (!global.warmrobotAdminPool) {
    global.warmrobotAdminPool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 5,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return global.warmrobotAdminPool;
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

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function clientQuery<T extends QueryResultRow>(
  client: PoolClient,
  statement: string,
  values: unknown[] = []
): Promise<T[]> {
  return (await client.query<T>(statement, values)).rows;
}

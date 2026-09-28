/**
 * Test the application PostgreSQL connection via WEB_DATABASE_URL or DATABASE_URL.
 *   npm run db:ping
 */

import { withPgClient } from "./db-env.mjs";

async function main() {
  const result = await withPgClient((client) =>
    client.query("select current_database() as db, now() as server_time")
  );

  const row = result.rows[0];
  console.log("数据库连接成功");
  console.log(`  database: ${row.db}`);
  console.log(`  server_time: ${row.server_time}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

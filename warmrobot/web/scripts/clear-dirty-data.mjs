/**
 * 清空 Supabase 中明确标记的 mock / demo 数据。
 * 需要 web/.env.local 中的 SUPABASE_DB_URL（Database → Connection string → URI）
 *
 *   node scripts/clear-dirty-data.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, "..");

function loadEnvFile(path) {
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

loadEnvFile(join(WEB_ROOT, ".env.local"));

async function clearViaApi() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.warn("跳过 API 清理：缺少 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
    return;
  }

  const sb = createClient(url, key);
  let cleared = 0;

  for (const domain of ["warmrobot.dev", "baby-outfit.dev"]) {
    for (let i = 1; i <= 50; i++) {
      const email = `demo_user_${i}@${domain}`;
    const { error: signErr } = await sb.auth.signInWithPassword({
      email,
      password: "password123",
    });
    if (signErr) continue;

    const tables = [
      { name: "outfit_recommendations", pk: "id" },
      { name: "clothing_items", pk: "id" },
      { name: "baby_warmth_preferences", pk: "baby_id" },
      { name: "babies", pk: "id" },
      { name: "url_parse_jobs", pk: "id" },
    ];
    for (const { name: table, pk } of tables) {
      const { error } = await sb
        .from(table)
        .delete()
        .neq(pk, "00000000-0000-0000-0000-000000000000");
      if (error && error.code !== "PGRST116") {
        console.warn(`${email} ${table}:`, error.message);
      }
    }
    await sb.auth.signOut();
      cleared++;
    }
  }

  console.log(`API 已清理 ${cleared} 个 demo 账号下的业务数据（不含 weather / catalog / auth）`);
}

async function clearViaPostgres() {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    throw new Error(
      "缺少 SUPABASE_DB_URL。请在 web/.env.local 添加 Database 连接串后重试，或在 Supabase SQL Editor 执行 supabase/scripts/clear_dirty_data.sql"
    );
  }

  let sql = readFileSync(
    join(WEB_ROOT, "..", "supabase", "scripts", "clear_dirty_data.sql"),
    "utf8"
  );

  const pg = (await import("pg")).default;
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows: mockUsers } = await client.query(
      `select id::text as id from auth.users
       where email like 'demo_user_%@warmrobot.dev'
          or email like 'demo_user_%@baby-outfit.dev'
          or email like 'wechat+mock_openid_%@auth.warmrobot.dev'`
    );

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    if (mockUsers.length > 0 && (!serviceKey || !url)) {
      throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY，无法安全清理 demo 衣柜图片");
    }
    if (mockUsers.length > 0) {
      const { createClient } = await import("@supabase/supabase-js");
      const storage = createClient(url, serviceKey, { auth: { persistSession: false } }).storage.from("clothing-images");
      for (const { id } of mockUsers) {
        const { data: files, error: listError } = await storage.list(id, { limit: 1000 });
        if (listError) throw listError;
        const paths = (files ?? []).filter((file) => file.name !== ".emptyFolderPlaceholder").map((file) => `${id}/${file.name}`);
        if (paths.length > 0) {
          const { error: removeError } = await storage.remove(paths);
          if (removeError) throw removeError;
        }
      }
    }
    await client.query(sql);
    console.log("Postgres 清理完成（仅明确标记的 mock 种子与 demo 用户）");
  } finally {
    await client.end();
  }
}

async function main() {
  if (process.env.SUPABASE_DB_URL?.trim()) {
    await clearViaPostgres();
    return;
  }

  console.log("未配置 SUPABASE_DB_URL，先通过 demo 账号 API 清理用户数据…");
  await clearViaApi();
  console.log(
    "\n要完成 demo 用户清理，请任选其一：\n" +
      "  1. 在 web/.env.local 设置 SUPABASE_DB_URL 后重新运行本脚本\n" +
      "  2. 在 Supabase Dashboard → SQL Editor 粘贴执行 supabase/scripts/clear_dirty_data.sql"
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

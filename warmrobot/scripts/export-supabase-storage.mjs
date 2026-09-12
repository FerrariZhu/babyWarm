import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import pg from "pg";
import { getDbUrl, loadEnvFile, WEB_ROOT } from "../web/scripts/db-env.mjs";

const DEFAULT_OUTPUT = "/private/tmp/warmrobot-storage";
const BUCKETS = ["category-icons", "clothing-images", "wardrobe-scans"];

function getStorageConfig() {
  loadEnvFile(join(WEB_ROOT, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("缺少 Supabase Storage 服务端配置");
  return { url: url.replace(/\/$/, ""), key };
}

async function copyBucket(url, key, bucket, outputRoot, objectPaths) {
  let count = 0;
  for (const objectPath of objectPaths) {
      const response = await fetch(`${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
      });
      if (!response.ok) throw new Error(`无法下载 ${bucket} 中的对象（HTTP ${response.status}）`);
      const target = resolve(outputRoot, bucket, objectPath);
      const bucketRoot = resolve(outputRoot, bucket) + "/";
      if (!target.startsWith(bucketRoot)) throw new Error("非法对象路径");
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    count += 1;
  }
  return count;
}

async function main() {
  const { url, key } = getStorageConfig();
  const outputRoot = process.argv[2] ?? DEFAULT_OUTPUT;
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const client = new pg.Client({ connectionString: getDbUrl(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const bucket of BUCKETS) {
      const result = await client.query("SELECT name FROM storage.objects WHERE bucket_id = $1 ORDER BY name", [bucket]);
      console.log(`${bucket}: ${await copyBucket(url, key, bucket, outputRoot, result.rows.map((row) => row.name))} objects`);
    }
  } finally { await client.end(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "缺少 Supabase 环境变量。请在 admin/.env.local 配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。"
    );
  }

  return { url, key };
}

export function getWebAppUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() || "http://localhost:3000";
}

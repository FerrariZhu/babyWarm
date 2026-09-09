import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { getBearerToken } from "@/lib/auth/bearer-token";
import { getSupabaseEnv } from "@/lib/env";

export async function createClient() {
  const { url, key } = getSupabaseEnv();
  const requestHeaders = await headers();
  const bearerToken = getBearerToken(requestHeaders.get("authorization"));

  // Native clients (such as WeChat Mini Programs) send an access token rather
  // than browser cookies. This still applies the existing RLS policies.
  if (bearerToken) {
    return createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      accessToken: async () => bearerToken,
    });
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

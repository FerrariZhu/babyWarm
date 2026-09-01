import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { formatAuthLoginError } from "@/lib/auth/login-error";
import { getSupabaseEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const email =
      body && typeof body === "object" && "email" in body && typeof body.email === "string"
        ? body.email.trim()
        : "";
    const password =
      body && typeof body === "object" && "password" in body && typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const { url, key } = getSupabaseEnv();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    });

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: formatAuthLoginError(error) }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatAuthLoginError(error) }, { status: 503 });
  }
}

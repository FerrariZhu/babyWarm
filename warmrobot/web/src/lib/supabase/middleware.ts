import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  // 配置后台已迁至独立 admin 应用（默认 :3001）
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    const rest = request.nextUrl.pathname.slice("/admin".length) || "/categories";
    const target = new URL(`${rest}${request.nextUrl.search}`, adminOrigin);
    return NextResponse.redirect(target);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const { url, key } = getSupabaseEnv();

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthPage =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/auth");

    if (!user && !isAuthPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (user && request.nextUrl.pathname === "/login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("[middleware]", error);

    if (request.nextUrl.pathname.startsWith("/login")) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "config"
    );
    return NextResponse.redirect(redirectUrl);
  }
}

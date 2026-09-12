import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // 配置后台已迁至独立 admin 应用（默认 :3001）
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    const rest = request.nextUrl.pathname.slice("/admin".length) || "/categories";
    const target = new URL(`${rest}${request.nextUrl.search}`, adminOrigin);
    return NextResponse.redirect(target);
  }

  // Edge middleware cannot open PostgreSQL connections. Server pages and API
  // handlers perform the authoritative session lookup using the local session
  // token; middleware only handles the cross-app admin redirect above.
  return NextResponse.next({ request });
}

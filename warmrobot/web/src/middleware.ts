import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
    const rest = request.nextUrl.pathname.slice("/admin".length) || "/categories";
    return NextResponse.redirect(new URL(`${rest}${request.nextUrl.search}`, adminOrigin));
  }

  // Edge middleware cannot open PostgreSQL connections. Server pages and API
  // handlers perform the authoritative application-session lookup.
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

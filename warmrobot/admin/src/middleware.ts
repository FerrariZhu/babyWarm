import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE_NAME = "warmrobot_admin_session";

export async function middleware(request: NextRequest) {
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/api/auth");

  if (!isAuthRoute && !request.cookies.get(ADMIN_SESSION_COOKIE_NAME)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return Response.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

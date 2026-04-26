import { NextResponse, type NextRequest } from "next/server";

import { verifyJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyJwt(token) : null;
  const isLoginRoute = pathname === "/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminRoute = pathname.startsWith("/superadmin");

  if ((isAdminRoute || isSuperadminRoute) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isSuperadminRoute && session?.role !== "superadmin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoginRoute && session) {
    const redirectUrl =
      session.role === "superadmin"
        ? "/superadmin/dashboard"
        : session.role === "admin"
          ? "/admin/dashboard"
          : "/";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/superadmin/:path*"],
};

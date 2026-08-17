import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  API_PERMISSIONS,
  PAGE_PERMISSIONS,
  isPublicPath,
  rolesFor,
} from "@/lib/permissions";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;

  // Public pages (login): redirect authenticated users to the dashboard.
  if (isPublicPath(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Everything else requires a session.
  if (!session) {
    // API routes get a 401 JSON instead of a redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based authorization.
  const isApi = pathname.startsWith("/api/");
  const allowedRoles = rolesFor(pathname, isApi ? API_PERMISSIONS : PAGE_PERMISSIONS);

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on everything except Next.js internals, auth endpoints and static files.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

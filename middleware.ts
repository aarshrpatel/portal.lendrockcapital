// Perimeter: security headers on every response + coarse auth gate for the
// internal surface. The middleware only checks session-cookie *presence*
// (Edge runtime); real HMAC verification happens server-side in lib/auth.ts
// on every read — this is defense-in-depth, not the trust boundary.

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/apply",
  "/b/", // borrower magic links
  "/i/", // investor magic links
  "/api/v1/public",
  "/api/health",
  "/_next",
  "/favicon.ico",
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let res: NextResponse;
  if (!isPublic(pathname) && !req.cookies.get("lr_session")?.value) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    res = NextResponse.redirect(login);
  } else {
    res = NextResponse.next();
  }

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return res;
}

export const config = {
  // Everything except static assets; headers still applied to public routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

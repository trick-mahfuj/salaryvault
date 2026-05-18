import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/salary",
  "/expenses",
  "/payments",
  "/analytics",
  "/goals",
  "/notes",
  "/settings",
  "/security",
];

const PUBLIC_ROUTES = ["/", "/secure-access-93xk", "/404-page"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets, Next.js internals, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Real IP detection from multiple sources (Vercel, Cloudflare, proxy chain)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    "Unknown IP";

  const response = NextResponse.next();
  // Store real IP in a short-lived cookie for client-side access
  response.cookies.set("x-real-ip", realIp, {
    path: "/",
    maxAge: 60,
    sameSite: "strict",
  });

  const session = request.cookies.get("admin_session")?.value;
  const setupDone = request.cookies.get("setup_done")?.value;

  // /setup is ALWAYS blocked from public access — rewrite to 404
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    // If setup already done, never allow re-entry
    if (setupDone === "1") {
      return NextResponse.rewrite(new URL("/404-page", request.url));
    }
    // If setup not done, require owner_token to access
    const ownerToken = request.cookies.get("owner_token")?.value;
    if (!ownerToken) {
      return NextResponse.rewrite(new URL("/404-page", request.url));
    }
    return response;
  }

  // Public routes — always accessible; if logged in, redirect away
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) {
    if (session && (pathname === "/" || pathname.startsWith("/secure-access-93xk"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Protected route — require session cookie; rewrite to 404 without session
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected) {
    if (!session) {
      return NextResponse.rewrite(new URL("/404-page", request.url));
    }
    return response;
  }

  // Unknown / invalid route — rewrite to 404 for unauthenticated users
  if (!session) {
    return NextResponse.rewrite(new URL("/404-page", request.url));
  }

  // Authenticated users on unknown routes — let Next.js handle (will show not-found.tsx)
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};


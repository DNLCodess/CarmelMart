import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Routes that require any authenticated user
const AUTH_REQUIRED = ["/account", "/checkout", "/cart", "/wishlist", "/dashboard", "/orders", "/settings"];
// Routes that require vendor role (role check done in layout, not here)
const VENDOR_PATHS = ["/vendor"];
// Routes that require admin role (role check done in layout, not here)
const ADMIN_PATHS = ["/admin"];
// Routes that require rider role (role check done in layout, not here)
const RIDER_PATHS = ["/rider"];

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Must set on both request and response to keep cookies in sync.
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() — validates JWT with Supabase. Never use getSession() here.
  // This also refreshes expired tokens automatically (sets new cookies via setAll above).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirect = (to, from) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    if (from) url.searchParams.set("from", from);
    // Must copy the supabaseResponse cookies to the redirect response
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // Unauthenticated → /login for protected routes
  if (
    (ADMIN_PATHS.some((p) => pathname.startsWith(p)) ||
      VENDOR_PATHS.some((p) => pathname.startsWith(p)) ||
      RIDER_PATHS.some((p) => pathname.startsWith(p)) ||
      AUTH_REQUIRED.some((p) => pathname.startsWith(p))) &&
    !user
  ) {
    return redirect("/login", pathname);
  }

  // Authenticated user hitting /login or /register → redirect away
  if (user && (pathname === "/login" || pathname === "/register")) {
    const from = request.nextUrl.searchParams.get("from");
    // Reject protocol-relative URLs like //evil.com that start with / but aren't safe paths
    const safePath = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";
    return redirect(safePath);
  }

  // Role checks (vendor/admin) are intentionally left to server layouts
  // to avoid a DB call on every request in the middleware.

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

import { createServerClient, CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS = ["https://devinterviewlab.vercel.app"];

function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (process.env.NODE_ENV === "development") {
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return true;
    }
  }
  if (origin.endsWith(".vercel.app") && origin.includes("devinterviewlab"))
    return true;
  if (host && origin.includes(host)) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Sentry tunnel: pass through immediately, no auth, no CSRF ──────────────
  // The /monitoring route is our Sentry event proxy. It has no user data,
  // no auth requirement, and must never be blocked by our middleware.
  if (pathname === "/monitoring") {
    return NextResponse.next();
  }

  // ── CSRF: validate Origin on state-mutating API requests ────────────────────
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const isAuthRoute = pathname.startsWith("/api/auth/");

    if (!isAuthRoute && !isAllowedOrigin(origin, host)) {
      return NextResponse.json(
        { error: "Origin não permitida." },
        { status: 403 },
      );
    }
  }

  // ── Supabase session refresh ────────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  // ── Route protection ────────────────────────────────────────────────────────
  const protectedPaths = [
    "/dashboard",
    "/questions",
    "/practice",
    "/interview",
    "/generate",
    "/concept-graph",
    "/stats",
    "/voice-test",
  ];

  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

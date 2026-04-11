import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  checkBruteForce,
  recordFailedAttempt,
  resetAttempts,
  getClientIP,
} from "@/lib/api/brute-force";

// Generic error messages — never reveal if email exists (anti-enumeration)
const GENERIC_AUTH_ERROR = "E-mail ou senha inválidos.";
const GENERIC_SIGNUP_ERROR =
  "Não foi possível criar a conta. Tente com outro e-mail ou senha mais forte.";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const supabase = await createClient();

  // Validate origin for auth routes
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Allow form submissions (referer matches host) and same-origin fetch
  const originOk =
    !origin || // form POST without JS
    (host &&
      (origin.includes(host) ||
        origin.includes("vercel.app") ||
        origin.includes("localhost")));

  if (!originOk) {
    return NextResponse.redirect(
      new URL("/login?error=Acesso+negado", request.url),
    );
  }

  if (action === "signin") {
    const ip = getClientIP(request);

    // Brute force check
    const bf = checkBruteForce(ip);
    if (!bf.allowed) {
      const mins = Math.ceil((bf.retryAfterSec ?? 900) / 60);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(`Muitas tentativas. Tente novamente em ${mins} minutos.`)}`,
          request.url,
        ),
      );
    }

    const formData = await request.formData();
    const email = String(formData.get("email") ?? "")
      .toLowerCase()
      .trim();
    const password = String(formData.get("password") ?? "");
    const redirect = formData.get("redirect") as string | null;

    if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      recordFailedAttempt(ip);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(GENERIC_AUTH_ERROR)}`,
          request.url,
        ),
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      recordFailedAttempt(ip);
      logger.info("Sign-in failed", {
        domain: email.split("@")[1],
        reason: error?.message,
      });
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(GENERIC_AUTH_ERROR)}`,
          request.url,
        ),
      );
    }

    resetAttempts(ip);
    logger.info("Sign-in success", { userId: data.user.id });
    const dest = redirect && redirect.startsWith("/") ? redirect : "/dashboard";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (action === "signup") {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "")
      .toLowerCase()
      .trim();
    const password = String(formData.get("password") ?? "");

    // Password strength: min 8 chars
    if (password.length < 8) {
      return NextResponse.redirect(
        new URL(
          `/register?error=${encodeURIComponent("A senha deve ter pelo menos 8 caracteres.")}`,
          request.url,
        ),
      );
    }

    // Basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.redirect(
        new URL(
          `/register?error=${encodeURIComponent(GENERIC_AUTH_ERROR)}`,
          request.url,
        ),
      );
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      // ANTI-ENUMERATION: never reveal "email already registered"
      // Always return the same generic message
      logger.info("Sign-up failed", {
        domain: email.split("@")[1],
        reason: error.message,
      });
      return NextResponse.redirect(
        new URL(
          `/register?error=${encodeURIComponent(GENERIC_AUTH_ERROR)}`,
          request.url,
        ),
      );
    }

    // If email confirmation is enabled, user will be null until confirmed
    if (!data.user || !data.session) {
      return NextResponse.redirect(
        new URL(
          "/login?message=" +
            encodeURIComponent(
              "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
            ),
          request.url,
        ),
      );
    }

    logger.info("Sign-up success", { userId: data.user.id });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (action === "signout") {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (action === "callback") {
    const code = request.nextUrl.searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

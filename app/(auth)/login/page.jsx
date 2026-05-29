"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, Store, Star } from "lucide-react";
import Image from "next/image";
import Script from "next/script";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { loginAction, guestSignInAction, resendVerificationAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

// ─── Reusable input ───────────────────────────────────────────────────────────

const Input = ({ label, type = "text", placeholder, icon: Icon, error, value, onChange, name, autoComplete }) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          suppressHydrationWarning
          type={inputType}
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} ${
            type === "password" ? "pr-11" : "pr-4"
          } py-3 rounded-xl border ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-500"
              : "border-gray-200 bg-white focus:border-primary"
          } focus:outline-none focus:ring-2 ${
            error ? "focus:ring-red-500/15" : "focus:ring-primary/15"
          } transition-all text-sm text-gray-900 placeholder:text-gray-400`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

// ─── Trust bullets shown on the left panel ────────────────────────────────────

const TRUST_POINTS = [
  { icon: Store,       text: "10,000+ verified vendors across Nigeria" },
  { icon: ShieldCheck, text: "Secure checkout — Flutterwave & Paystack" },
  { icon: Star,        text: "Rated #1 Nigerian multi-vendor marketplace" },
];

// ─── Main login form ──────────────────────────────────────────────────────────

function LoginContent() {
  const [isLoading, setIsLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading]   = useState(false);
  const [formData, setFormData]           = useState({ email: "", password: "" });
  const [errors, setErrors]               = useState({});
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendLoading, setResendLoading]     = useState(false);
  const [resendSent, setResendSent]           = useState(false);
  const tokenRef             = useRef(null); // pre-warmed Turnstile token
  const widgetRef            = useRef(null); // login Turnstile widget ID
  const turnstileWidgetIdRef = useRef(null); // guest widget ID
  const TURNSTILE_SITE_KEY   = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryClient  = useQueryClient();

  const oauthError        = searchParams.get("oauth_error");
  const needsVerification = searchParams.get("verify") === "1";

  // Prefetch the destination while the user is still typing — free speed gain
  // on the navigation that happens right after login.
  useEffect(() => {
    const from = searchParams.get("from");
    if (from && from.startsWith("/") && !from.startsWith("//")) {
      router.prefetch(from);
    }
  }, [router, searchParams]);

  // Pre-warm the Turnstile widget as soon as the SDK loads so the token is ready
  // by the time the user clicks "Sign In" — eliminates the challenge wait on submit.
  const mountLoginTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || typeof window?.turnstile === "undefined") return;
    if (widgetRef.current !== null) return;
    widgetRef.current = window.turnstile.render("#turnstile-login-widget", {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
      callback: (token) => { tokenRef.current = token; },
      "expired-callback": () => {
        tokenRef.current = null;
        try { window.turnstile.reset(widgetRef.current); } catch {}
        try { window.turnstile.execute(widgetRef.current); } catch {}
      },
      "error-callback": () => { tokenRef.current = null; },
    });
    window.turnstile.execute(widgetRef.current);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const next = searchParams.get("from") ?? "/";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const proceedAsGuest = async (captchaToken = null) => {
    try {
      const result = await guestSignInAction(captchaToken);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result.user) {
        queryClient.setQueryData(["auth-user"], {
          user: result.user,
          role: result.user.role ?? "customer",
          isGuest: result.isGuest ?? true,
        });
      }
      const from = searchParams.get("from");
      const dest = from && from.startsWith("/") && !from.startsWith("//") ? from : "/checkout";
      router.push(dest);
    } catch {
      toast.error("Could not start guest session. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleGuestCheckout = () => {
    setGuestLoading(true);

    // No Turnstile configured (local dev or key not set) — skip captcha
    if (!TURNSTILE_SITE_KEY || typeof window.turnstile === "undefined") {
      proceedAsGuest(null);
      return;
    }

    // Reset any previous widget before re-executing
    if (turnstileWidgetIdRef.current !== null) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
      window.turnstile.execute(turnstileWidgetIdRef.current);
      return;
    }

    // First click: render the invisible widget and immediately execute
    turnstileWidgetIdRef.current = window.turnstile.render("#turnstile-guest-widget", {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
      callback: (token) => proceedAsGuest(token),
      "error-callback": (code) => {
        // code 110200 = domain not in widget's hostname list
        const msg = code === 110200
          ? "Security check failed: this domain isn't authorised in Cloudflare Turnstile."
          : `Security check failed (${code}). Please try again.`;
        toast.error(msg, { duration: 6000 });
        setGuestLoading(false);
      },
      "expired-callback": () => {
        toast("Security token expired — please try again.");
        setGuestLoading(false);
        turnstileWidgetIdRef.current = null;
      },
    });
    window.turnstile.execute(turnstileWidgetIdRef.current);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const result = await resendVerificationAction(unverifiedEmail);
      if (result?.ok) {
        setResendSent(true);
        toast.success("Verification email sent! Check your inbox.");
      } else {
        toast.error(result?.error || "Could not resend. Please try again.");
      }
    } catch {
      toast.error("Could not resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email)    newErrors.email    = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setIsLoading(true);
    try {
      // Use pre-warmed token if available — avoids blocking challenge at click time.
      // Fall back to executing a fresh challenge if the token expired or wasn't ready.
      let captchaToken = tokenRef.current;
      tokenRef.current = null;

      if (!captchaToken && TURNSTILE_SITE_KEY && typeof window?.turnstile !== "undefined") {
        if (widgetRef.current !== null) {
          try { window.turnstile.remove(widgetRef.current); } catch {}
          widgetRef.current = null;
        }
        captchaToken = await new Promise((resolve, reject) => {
          widgetRef.current = window.turnstile.render("#turnstile-login-widget", {
            sitekey: TURNSTILE_SITE_KEY,
            size: "invisible",
            callback: resolve,
            "error-callback": (code) => reject(new Error(`Security check failed (${code}). Please try again.`)),
            "expired-callback": () => reject(new Error("Security token expired. Please try again.")),
          });
          window.turnstile.execute(widgetRef.current);
        });
      }

      const result = await loginAction({ email: formData.email, password: formData.password, captchaToken });

      if (result?.error) {
        if (result.emailNotConfirmed) {
          setUnverifiedEmail(result.email);
          setResendSent(false);
          return;
        }
        toast.error(result.error);
        // Re-warm for the next attempt
        if (widgetRef.current !== null) {
          try { window.turnstile.reset(widgetRef.current); window.turnstile.execute(widgetRef.current); } catch {}
        }
        return;
      }

      // loginAction now returns the user profile — seed the cache directly so
      // the auth context has data instantly without a second network round-trip.
      queryClient.setQueryData(["auth-user"], {
        user: result.user,
        role: result.user?.role ?? null,
        isGuest: false,
      });

      toast.success("Welcome back!");

      const from = searchParams.get("from");
      if (from && from.startsWith("/") && !from.startsWith("//")) {
        router.push(from);
      } else {
        const role = result.user?.role;
        if      (role === "admin")  router.push("/admin/dashboard");
        else if (role === "vendor") router.push("/vendor/dashboard");
        else if (role === "rider")  router.push("/rider/orders");
        else                        router.push("/");
      }
    } catch (err) {
      toast.error(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {TURNSTILE_SITE_KEY && (
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={mountLoginTurnstile}
      />
    )}
    <div className="min-h-screen flex">

      {/* ── Left: Hero panel ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col">
        <Image
          src="/auth-banner.jpg"
          alt="Shop at CarmelMart"
          fill
          className="object-cover"
          priority
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-br from-black/75 via-black/50 to-primary/60" />

        {/* content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <Link href="/" className="inline-block">
            <Image src="/logo-white.png" alt="CarmelMart" width={150} height={46} className="object-contain" />
          </Link>

          {/* Centre copy */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Welcome back<br />to CarmelMart
              </h1>
              <p className="text-lg text-white/80 mb-10 max-w-sm">
                Nigeria&apos;s trusted multi-vendor marketplace — shop smarter, live better.
              </p>

              {/* Trust bullets */}
              <div className="space-y-4">
                {TRUST_POINTS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-white/85">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom legal note */}
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} CarmelMart. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10 sm:px-10">
          <div className="w-full max-w-[420px]">

            {/* Back link */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Home
              </Link>
            </motion.div>

            {/* Logo — mobile only (hidden on lg where left panel shows it) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="lg:hidden mb-6"
            >
              <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
            </motion.div>

            {/* Heading */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Sign in</h1>
              <p className="text-sm text-gray-500">Enter your details to continue shopping</p>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
            >
              {/* Error banners */}
              {oauthError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  Google sign-in failed — please try again or use email &amp; password.
                </div>
              )}
              {needsVerification && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <span className="font-medium">Check your inbox.</span> Verify your email address before signing in.
                </div>
              )}

              {unverifiedEmail && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-2">
                  <p>
                    <span className="font-semibold">Email not verified.</span>{" "}
                    Check your inbox for the confirmation link we sent when you signed up.
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading || resendSent}
                    className="font-semibold text-amber-700 hover:underline disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {resendLoading ? (
                      <>
                        <div className="w-3 h-3 border border-amber-700 border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : resendSent ? (
                      "✓ Verification email sent — check your inbox"
                    ) : (
                      "Resend verification email →"
                    )}
                  </button>
                </div>
              )}

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Email + Password */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                />

                <div className="space-y-1">
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                  />
                  <div className="flex justify-end pt-1">
                    <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-primary hover:bg-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </motion.div>

            {/* Hidden Turnstile widgets — rendered programmatically */}
            <div id="turnstile-login-widget" className="hidden" />
            <div id="turnstile-guest-widget" className="hidden" />

            {/* Guest checkout — only shown when redirected from /checkout */}
            {searchParams.get("from")?.startsWith("/checkout") && (
              <div className="mt-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  type="button"
                  onClick={handleGuestCheckout}
                  disabled={guestLoading || isLoading || googleLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all text-sm font-semibold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guestLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  {guestLoading ? "Starting guest session…" : "Continue as Guest"}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">
                  No account needed — you can save your details after checkout.
                </p>
              </div>
            )}

            {/* Create account */}
            <p className="mt-6 text-center text-sm text-gray-500">
              New to CarmelMart?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

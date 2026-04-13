"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, Store, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { loginAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

// ─── Reusable input ───────────────────────────────────────────────────────────

const Input = ({ label, type = "text", placeholder, icon: Icon, error, value, onChange, name }) => {
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
          type={inputType}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} ${
            type === "password" ? "pr-11" : "pr-4"
          } py-3 rounded-xl border ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-500"
              : "border-gray-200 bg-white focus:border-primary"
          } focus:outline-none focus:ring-4 ${
            error ? "focus:ring-red-500/10" : "focus:ring-primary/10"
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
  const [isLoading, setIsLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData]       = useState({ email: "", password: "" });
  const [errors, setErrors]           = useState({});
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryClient  = useQueryClient();

  const oauthError      = searchParams.get("oauth_error");
  // Show email-verification notice only when redirected here from registration
  const needsVerification = searchParams.get("verify") === "1";

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email)    newErrors.email    = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setIsLoading(true);
    try {
      const result = await loginAction({ email: formData.email, password: formData.password });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("Welcome back!");
      const from = searchParams.get("from");
      router.push(from?.startsWith("/") ? from : "/");
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10">
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
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-linear-to-br from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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

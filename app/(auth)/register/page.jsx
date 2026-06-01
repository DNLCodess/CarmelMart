"use client";

import { useState, useEffect, useRef, Suspense } from "react";
// import Script from "next/script"; // Turnstile disabled
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Mail,
  Lock,
  Phone,
  ShoppingBag,
  Store,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  Gift,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { signupAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

import MobileAuthHeader from "@/components/shared/auth/MobileAuthHeader";
import { formatNigerianPhone } from "@/lib/utils";

// ─── Shared Input ──────────────────────────────────────────────────────────────
const Input = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  error,
  register,
  required,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          suppressHydrationWarning
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          {...register}
          className={`w-full ${Icon ? "pl-12" : "pl-4"} ${type === "password" ? "pr-12" : "pr-4"} py-3.5 rounded-xl border-2 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
              : "border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/15"
          } focus:outline-none transition-all duration-300 text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500 flex items-center gap-1"
        >
          <span className="w-1 h-1 bg-red-500 rounded-full" />
          {error}
        </motion.p>
      )}
    </div>
  );
};

// ─── Role Card ─────────────────────────────────────────────────────────────────
const RoleCard = ({
  icon: Icon,
  title,
  description,
  benefits,
  selected,
  onClick,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`relative rounded-2xl border-2 transition-all duration-300 text-left w-full ${
      selected
        ? "border-primary bg-primary/5 shadow-lg"
        : "border-gray-200 hover:border-primary/50 hover:shadow-md bg-white"
    }`}
  >
    {selected && (
      <div className="absolute top-3 right-3 md:top-4 md:right-4 w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary flex items-center justify-center">
        <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
      </div>
    )}

    {/* Mobile: horizontal layout — icon left, text right */}
    <div className="md:hidden flex items-center gap-4 p-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-primary" : "bg-gray-100"}`}>
        <Icon className={`w-5 h-5 ${selected ? "text-white" : "text-gray-600"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 leading-snug">{description}</p>
      </div>
    </div>

    {/* Desktop: vertical layout — full card */}
    <div className="hidden md:block p-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${selected ? "bg-primary" : "bg-gray-100"}`}>
        <Icon className={`w-7 h-7 ${selected ? "text-white" : "text-gray-600"}`} />
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="space-y-2">
        {benefits.map((b, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.button>
);

// ─── Main Content ──────────────────────────────────────────────────────────────
function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  // const tokenRef  = useRef(null);  // Turnstile disabled
  // const widgetRef = useRef(null);  // Turnstile disabled
  // const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  /* Turnstile disabled
  const mountRegisterTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || typeof window?.turnstile === "undefined") return;
    if (widgetRef.current !== null) return;
    widgetRef.current = window.turnstile.render("#turnstile-register", {
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

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (typeof window?.turnstile !== "undefined") { mountRegisterTurnstile(); return; }
    const interval = setInterval(() => {
      if (typeof window?.turnstile !== "undefined") {
        clearInterval(interval);
        mountRegisterTurnstile();
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);
  */

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm();

  const password = watch("password");
  const referralCode = watch("referralCode");

  // Pre-select role from URL param (?role=vendor or ?role=customer)
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "vendor" || roleParam === "customer") {
      setSelectedRole(roleParam);
      setStep(2);
    }
  }, [searchParams]);

  // Pre-fill referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      const upper = refCode.toUpperCase();
      setReferralCodeFromUrl(upper);
      setValue("referralCode", upper);
      validateReferralCode(upper);
    }
  }, [searchParams, setValue]);

  // Debounced referral code validation
  useEffect(() => {
    if (!referralCode || referralCode === referralCodeFromUrl) return;
    const id = setTimeout(
      () => validateReferralCode(referralCode.toUpperCase()),
      500,
    );
    return () => clearTimeout(id);
  }, [referralCode, referralCodeFromUrl]);

  const validateReferralCode = async (code) => {
    if (!code || code.length < 4) {
      setReferralValid(null);
      return;
    }
    setIsValidatingReferral(true);
    try {
      const r = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
      const d = await r.json();
      if (d.valid) {
        setReferralValid(true);
        toast.success("Valid referral code! You'll earn a ₦500 bonus.", {
          icon: "🎉",
        });
      } else {
        setReferralValid(false);
      }
    } catch {
      setReferralValid(false);
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const roles = [
    {
      id: "customer",
      icon: ShoppingBag,
      title: "Customer",
      description: "Shop from verified vendors nationwide",
      benefits: [
        "Authentic products",
        "Secure payments",
        "Nationwide delivery",
        "24/7 support",
      ],
    },
    {
      id: "vendor",
      icon: Store,
      title: "Vendor",
      description: "Sell your products to thousands of buyers",
      benefits: [
        "Reach active shoppers",
        "Easy inventory",
        "Order processing",
        "Marketing tools",
      ],
    },
  ];

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
      // Browser will redirect to Google
    } catch (err) {
      toast.error(err.message || "Google sign-up failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    // If a referral code was entered, it must be verified before proceeding
    if (formData.referralCode?.trim()) {
      if (isValidatingReferral) {
        toast.error("Please wait while we verify the referral code.");
        return;
      }
      if (referralValid === false) {
        toast.error("Invalid referral code. Please enter a valid code or leave it empty.");
        return;
      }
      if (referralValid === null) {
        // Code was typed but validation hasn't resolved yet — run it now
        toast.error("Please wait for the referral code to be verified.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const captchaToken = null; // Turnstile disabled

      const result = await signupAction({
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: selectedRole,
        referralCode: formData.referralCode?.trim() || null,
        captchaToken,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (selectedRole === "vendor") {
        await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        if (result.sessionEstablished) {
          toast.success("Account created! Complete KYC to activate your store.");
          router.push("/vendor-kyc");
        } else {
          // Auto sign-in failed (rare) — send them to login; requireVendor() will
          // route them to /vendor-kyc automatically after they sign in.
          toast.success("Account created! Sign in to continue KYC verification.");
          router.push(`/login?from=${encodeURIComponent("/vendor-kyc")}`);
        }
      } else {
        // Invalidate auth query (session may not exist yet if email confirmation required)
        await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        toast.success("Account created! Check your email to verify.");
        router.push(`/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`);
      }
    } catch (err) {
      if (err.message?.startsWith("Security check")) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {/* Turnstile disabled
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
    />
    <div id="turnstile-register" className="hidden" />
    */}
    <div className="min-h-screen flex bg-linear-to-br from-gray-50 via-white to-gray-100">
      {/* Left: Banner */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col overflow-hidden">
        <Image
          src="/auth-banner.jpg"
          alt="CarmelMart"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/75 via-black/50 to-primary/60" />
        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          <Link href="/" className="inline-block">
            <Image src="/logo-white.png" alt="CarmelMart" width={140} height={44} className="object-contain" />
          </Link>
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight mb-3">
                Join CarmelMart
              </h1>
              <p className="text-base text-white/80 max-w-xs">
                Nigeria&apos;s most trusted marketplace for authentic, quality goods.
              </p>
            </motion.div>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} CarmelMart. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col bg-white lg:bg-gray-50 relative">

        {/* Mobile brand header */}
        <MobileAuthHeader backHref="/" tagline="Join Nigeria's trusted marketplace" />

        <div className="flex-1 flex items-start sm:items-center justify-center px-4 lg:px-12 py-6 sm:py-10">
        <div className="relative w-full max-w-5xl z-10">

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-10">
            <AnimatePresence mode="wait">
              {/* Step 1 — Role Selection */}
              {step === 1 && (
                <motion.div
                  key="role"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.4 }}
                >
                  <h2 className="text-2xl text-center font-semibold mb-2 text-gray-900">
                    Choose Account Type
                  </h2>
                  <p className="text-gray-600 mb-8 text-center">
                    Select how you want to use CarmelMart.
                  </p>

                  {referralCodeFromUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 rounded-xl bg-linear-to-br from-primary/10 to-accent/10 border-2 border-primary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary-dark flex items-center justify-center">
                          <Gift className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            You've been referred!
                          </p>
                          <p className="text-sm text-gray-600">
                            Complete registration to earn your ₦500 bonus
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                    {roles.map((role) => (
                      <RoleCard
                        key={role.id}
                        {...role}
                        selected={selectedRole === role.id}
                        onClick={() => {
                          setSelectedRole(role.id);
                          setStep(2);
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2 — Registration Form */}
              {step === 2 && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.4 }}
                >
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-4 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change account type
                  </button>

                  <div className="mb-5">
                    {selectedRole === "vendor" && (
                      <div className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs font-semibold mb-3">
                        <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
                        Step 2 of 3 — Account Details
                      </div>
                    )}
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                      {selectedRole === "vendor" ? "Register as a Vendor" : "Create your Account"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedRole === "vendor"
                        ? "Fill in your details — KYC verification comes next"
                        : "Join CarmelMart and start shopping today"}
                    </p>
                  </div>

                  {/* Google sign-up — customers only (vendors need phone/KYC) */}
                  {selectedRole === "customer" && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleSignUp}
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

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-xs font-medium text-gray-400">or sign up with email</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                    </>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      icon={Mail}
                      register={register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      })}
                      error={errors.email?.message}
                      required
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="08012345678 or +2348012345678"
                      icon={Phone}
                      register={{
                        ...register("phone", {
                          required: "Phone number is required",
                          pattern: {
                            value: /^(\+234|0)[789][01]\d{8}$/,
                            message: "Enter a valid Nigerian phone number",
                          },
                        }),
                        onBlur: (e) => {
                          const v = e.target.value.trim();
                          if (v) setValue("phone", formatNigerianPhone(v));
                        },
                      }}
                      error={errors.phone?.message}
                      required
                    />

                    <Input
                      label="Password"
                      type="password"
                      placeholder="At least 8 characters"
                      icon={Lock}
                      register={register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters",
                        },
                      })}
                      error={errors.password?.message}
                      required
                    />

                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Re-enter password"
                      icon={Lock}
                      register={register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (v) =>
                          v === password || "Passwords do not match",
                      })}
                      error={errors.confirmPassword?.message}
                      required
                    />

                    <div className="space-y-2">
                      <Input
                        label="Referral Code (optional)"
                        type="text"
                        placeholder="Enter code if you have one"
                        icon={Gift}
                        register={register("referralCode")}
                        disabled={!!referralCodeFromUrl}
                      />
                      {isValidatingReferral && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          Validating code...
                        </div>
                      )}
                      {referralValid === true && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-green-600 font-medium"
                        >
                          ✓ Valid code — ₦500 bonus will be credited after your
                          first{" "}
                          {selectedRole === "vendor"
                            ? "verification"
                            : "purchase"}
                        </motion.p>
                      )}
                      {referralValid === false && referralCode && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-red-500"
                        >
                          Invalid referral code
                        </motion.p>
                      )}
                    </div>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        {...register("terms", {
                          required: "You must accept the terms",
                        })}
                        className="w-5 h-5 mt-0.5 accent-primary"
                      />
                      <span className="text-sm text-gray-600 leading-relaxed">
                        I agree to the{" "}
                        <Link
                          href="#"
                          className="text-primary font-medium hover:underline"
                        >
                          Terms & Conditions
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="#"
                          className="text-primary font-medium hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="text-sm text-red-500">
                        {errors.terms.message}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-primary hover:bg-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {selectedRole === "vendor"
                            ? "Continue to Verification"
                            : "Create Account"}
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="text-primary font-semibold hover:underline"
                      >
                        Sign in
                      </Link>
                    </p>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
        </div>
      </div>
    </div>
    </>
  );
}

function RegisterSkeleton() {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Desktop: left banner */}
      <div className="hidden lg:block lg:w-[45%] bg-primary/10 animate-pulse" />

      {/* Right: form area */}
      <div className="flex-1 flex flex-col bg-white lg:bg-gray-50">
        {/* Mobile header */}
        <div className="lg:hidden bg-primary px-6 pt-10 pb-8 text-center overflow-hidden">
          <div className="w-28 h-8 bg-white/30 rounded-lg mx-auto animate-pulse" />
          <div className="w-44 h-3 bg-white/20 rounded-full mx-auto mt-3 animate-pulse" />
        </div>

        <div className="flex-1 flex items-start sm:items-center justify-center px-4 lg:px-12 py-6 sm:py-10">
          <div className="w-full max-w-5xl">
            <div className="bg-white/90 rounded-3xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-10 space-y-6">
              {/* Step heading */}
              <div className="space-y-2 text-center">
                <div className="h-7 bg-gray-200 rounded-xl w-48 mx-auto animate-pulse" />
                <div className="h-4 bg-gray-100 rounded-full w-64 mx-auto animate-pulse" />
              </div>
              {/* Role cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <div className="h-24 md:h-40 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-24 md:h-40 bg-gray-100 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterPageContent />
    </Suspense>
  );
}

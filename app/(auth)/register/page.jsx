"use client";

import { useState, useEffect, Suspense } from "react";
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

import VendorVerification from "@/components/shared/auth/VendorVerification";
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
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          {...register}
          className={`w-full ${Icon ? "pl-12" : "pl-4"} ${type === "password" ? "pr-12" : "pr-4"} py-3.5 rounded-xl border-2 ${
            error
              ? "border-red-300 focus:border-red-500"
              : "border-gray-200 focus:border-primary"
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
    className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left w-full ${
      selected
        ? "border-primary bg-linear-to-br from-primary/5 to-accent/5 shadow-lg"
        : "border-gray-200 hover:border-primary/50 hover:shadow-md bg-white"
    }`}
  >
    {selected && (
      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    )}
    <div
      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${selected ? "bg-linear-to-br from-primary to-accent" : "bg-gray-100"}`}
    >
      <Icon
        className={`w-7 h-7 ${selected ? "text-white" : "text-gray-600"}`}
      />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm mb-4">{description}</p>
    <div className="space-y-2">
      {benefits.map((b, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>{b}</span>
        </div>
      ))}
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
  const [vendorData, setVendorData] = useState(null);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(null);

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
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", code)
        .single();
      if (data) {
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
      const result = await signupAction({
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: selectedRole,
        referralCode: formData.referralCode?.trim() || null,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (selectedRole === "vendor") {
        setVendorData({
          userId: result.userId,
          email: formData.email,
          // referralCode entered is the code of whoever referred them,
          // passed as referredBy so VendorVerification shows the bonus banner
          referredBy: formData.referralCode?.trim().toUpperCase() || null,
        });
        setStep(3);
        toast.success(
          "Account created! Complete KYC verification to activate.",
        );
      } else {
        // Invalidate auth query (session may not exist yet if email confirmation required)
        await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        toast.success("Account created! Check your email to verify.");
        router.push("/verify-email");
      }
    } catch (err) {
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      <div className="flex-1 flex items-center justify-center px-4 lg:px-12 py-10 bg-gray-50 relative">
        <div className="relative w-full max-w-5xl z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-100 p-8 lg:p-10">
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
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
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

                  <div className="grid md:grid-cols-2 gap-6">
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
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change account type
                  </button>

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

                      <div className="flex items-center gap-3 my-1">
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
                      className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-linear-to-br from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-md shadow-primary/30"
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

              {/* Step 3 — Vendor KYC Verification */}
              {step === 3 && vendorData && (
                <motion.div
                  key="verification"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <VendorVerification
                    userId={vendorData.userId}
                    email={vendorData.email}
                    referredBy={vendorData.referredBy}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

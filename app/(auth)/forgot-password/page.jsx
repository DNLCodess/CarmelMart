"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendPasswordResetAction, resetPasswordAction } from "@/app/actions/auth";

// ─── Shared input ─────────────────────────────────────────────────────────────

const Input = ({ label, type = "text", placeholder, icon: Icon, value, onChange, error, autoComplete }) => {
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
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} ${
            type === "password" ? "pr-11" : "pr-4"
          } py-3 rounded-xl border text-sm ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/15"
              : "border-gray-200 bg-white focus:border-primary focus:ring-primary/15"
          } focus:outline-none focus:ring-2 transition-all text-gray-900 placeholder:text-gray-400`}
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
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium">
          {error}
        </motion.p>
      )}
    </div>
  );
};

// ─── OTP boxes ────────────────────────────────────────────────────────────────

const OTPInput = ({ value, onChange }) => {
  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d?$/.test(val)) return;
    const next = value.split("");
    next[index] = val;
    onChange(next.join(""));
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    onChange(digits.padEnd(6, "").slice(0, 6));
    const focusIndex = Math.min(digits.length, 5);
    document.getElementById(`otp-${focusIndex}`)?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-11 h-12 text-xl font-bold text-center rounded-xl border border-gray-200 bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all text-gray-900"
        />
      ))}
    </div>
  );
};

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Enter email",    desc: "We'll send a reset code"         },
  { label: "Verify code",    desc: "Check your inbox for the OTP"    },
  { label: "New password",   desc: "Choose a strong password"        },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep]                   = useState(1);
  const [email, setEmail]                 = useState("");
  const [otp, setOtp]                     = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState("");

  const sendOTP = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError("Please enter a valid email address");
    setError("");
    setIsLoading(true);
    try {
      const result = await sendPasswordResetAction(email.trim().toLowerCase());
      if (!result.ok) {
        toast.error(result.error || "Something went wrong. Please try again.");
        return;
      }
      // Always advance to step 2 — never reveal whether the email is registered
      toast.success("If that email is registered, a reset code has been sent.");
      setStep(2);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) return setError("Enter the full 6-digit code");
    setError("");
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp, type: "recovery" });
      if (error) throw error;
      toast.success("Code verified");
      setStep(3);
    } catch {
      toast.error("Invalid or expired code — please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) return setError("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");
    setError("");
    setIsLoading(true);
    try {
      const result = await resetPasswordAction({ newPassword });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Password reset successfully! Please sign in with your new password.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex">

      {/* ── Left: Hero panel ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col">
        <Image src="/auth-banner.jpg" alt="Reset Password" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-br from-black/75 via-black/50 to-primary/60" />

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Link href="/" className="inline-block">
            <Image src="/logo-white.png" alt="CarmelMart" width={150} height={46} className="object-contain" />
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                Recover your<br />account
              </h1>
              <p className="text-base text-white/80 max-w-sm">
                Follow the steps to securely reset your password and regain access to your CarmelMart account.
              </p>

              {/* Step indicators */}
              <div className="mt-10 space-y-4">
                {STEPS.map((s, i) => {
                  const done    = step > i + 1;
                  const active  = step === i + 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                        done   ? "bg-white text-primary" :
                        active ? "bg-white/20 border-2 border-white text-white" :
                                 "bg-white/10 text-white/50"
                      }`}>
                        {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${active ? "text-white" : done ? "text-white/80" : "text-white/40"}`}>
                          {s.label}
                        </p>
                        <p className={`text-xs ${active ? "text-white/70" : "text-white/30"}`}>{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          <p className="text-xs text-white/40">© {new Date().getFullYear()} CarmelMart. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[420px]">

            {/* Back link */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-300 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                Back to Login
              </Link>
            </motion.div>

            {/* Mobile logo */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:hidden mb-6">
              <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
            </motion.div>

            {/* Card */}
            <AnimatePresence mode="wait">

              {/* Step 1 — Email */}
              {step === 1 && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h1>
                    <p className="text-sm text-gray-500">Enter your email and we&apos;ll send a reset code</p>
                  </div>

                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    error={error}
                  />

                  <button
                    onClick={sendOTP}
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-linear-to-br from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                    ) : "Send Reset Code"}
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Remember it?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* Step 2 — OTP */}
              {step === 2 && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
                    <p className="text-sm text-gray-500">
                      We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
                    </p>
                  </div>

                  <OTPInput value={otp} onChange={setOtp} />

                  {error && (
                    <p className="text-center text-xs text-red-500 font-medium">{error}</p>
                  )}

                  <button
                    onClick={verifyOTP}
                    disabled={isLoading || otp.length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-linear-to-br from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</>
                    ) : "Verify Code"}
                  </button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => setStep(1)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Wrong email? Go back
                    </button>
                    <button
                      onClick={sendOTP}
                      disabled={isLoading}
                      className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Resend code
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3 — New password */}
              {step === 3 && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
                >
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
                    <p className="text-sm text-gray-500">Choose something strong and unique</p>
                  </div>

                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    icon={Lock}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  />

                  <Input
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  />

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium">
                      {error}
                    </motion.p>
                  )}

                  <button
                    onClick={resetPassword}
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-linear-to-br from-primary to-primary-dark text-white hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting…</>
                    ) : "Reset Password"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

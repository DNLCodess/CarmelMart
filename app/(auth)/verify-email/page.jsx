"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Check, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_S = 60;

function VerifyEmailContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get("email") ?? "";

  const [countdown, setCountdown]       = useState(3);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect to login after 3 s
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownInterval); return 0; }
        return prev - 1;
      });
    }, 1000);

    const redirectTimer = setTimeout(() => {
      router.push(email ? `/login?verify=1` : "/login?verify=1");
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [router, email]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email address not found. Please register again.");
      return;
    }
    setResendLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification email resent — check your inbox.");
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch {
      toast.error("Failed to resend. Please try again in a moment.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Successful</h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            We&apos;ve sent a verification email{email ? <> to <span className="font-medium text-gray-800">{email}</span></> : " to your inbox"}.
            Please verify your email address before signing in.
          </p>

          {/* Email Icon */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Check your email</p>
            <p className="text-xs text-gray-500 mt-1">Click the verification link to activate your account</p>
          </div>

          {/* Redirect Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>Redirecting to login in</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold">
              {countdown}
            </span>
            <span>seconds</span>
          </div>

          {/* Manual Link */}
          <button
            onClick={() => router.push("/login?verify=1")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to login now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Resend */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Didn&apos;t receive the email?{" "}
          {resendCooldown > 0 ? (
            <span className="text-gray-400">Resend in {resendCooldown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-primary font-medium hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {resendLoading ? "Sending…" : "Resend verification email"}
            </button>
          )}
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

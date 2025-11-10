"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Check, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect after 3 seconds
    const redirectTimer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <Check className="w-8 h-8 text-green-600" strokeWidth={2.5} />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Registration Successful
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            We've sent a verification email to your inbox. Please verify your
            email address before signing in.
          </p>

          {/* Email Icon */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Check your email
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Click the verification link to activate your account
            </p>
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
            onClick={() => router.push("/auth/login")}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Go to login now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Didn't receive the email?{" "}
          <button className="text-primary font-medium hover:underline">
            Resend verification email
          </button>
        </p>
      </motion.div>
    </div>
  );
}

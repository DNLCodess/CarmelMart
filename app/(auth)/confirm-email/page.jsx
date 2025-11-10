"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying, success, error

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || !type) {
        setStatus("error");
        toast.error("Invalid verification link");
        setTimeout(() => router.push("/auth/login"), 2000);
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: "email",
        });

        if (error) throw error;

        setStatus("success");
        toast.success("Email verified successfully!");

        // Redirect after 2 seconds
        setTimeout(() => router.push("/auth/login"), 2000);
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        toast.error("Email verification failed");

        // Redirect after 2 seconds
        setTimeout(() => router.push("/auth/login"), 2000);
      }
    };

    confirmEmail();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Verifying Your Email
              </h1>
              <p className="text-gray-600">Please wait a moment...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2
                  className="w-8 h-8 text-green-600"
                  strokeWidth={2.5}
                />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-600">
                Your account is now active. Redirecting to login...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600">
                This link may be invalid or expired. Redirecting to login...
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Mail, CheckCircle2, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export default function VendorPendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await logoutAction();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-5">
            <Clock className="w-8 h-8 text-amber-600" strokeWidth={2} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Under Review</h1>
          <p className="text-gray-500 leading-relaxed mb-6">
            Your vendor application has been received. Our team is reviewing your KYC
            documents and will notify you by email once your account is approved.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6 space-y-3">
            <p className="text-sm font-semibold text-amber-900">What happens next?</p>
            {[
              "Our team reviews your NIN and CAC verification",
              "You receive an approval or feedback email within 1–2 business days",
              "Once approved, you can log in and access your vendor dashboard",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 mb-6">
            <Mail className="w-4 h-4" />
            Questions? Email{" "}
            <a href="mailto:support@carmelmart.com" className="text-primary font-semibold hover:underline">
              support@carmelmart.com
            </a>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </motion.div>
      </div>
    </div>
  );
}

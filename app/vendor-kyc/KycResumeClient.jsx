"use client";

import Image from "next/image";
import Link from "next/link";
import VendorVerification from "@/components/shared/auth/VendorVerification";

export default function KycResumeClient({ email, phone, vendor }) {
  const isResuming = !!(vendor?.business_name);

  return (
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-5xl">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
          </Link>
        </div>
        <div className="mb-4 text-center">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 inline-block">
            {isResuming
              ? "Welcome back — pick up where you left off to activate your vendor profile."
              : "Your account was created — complete the steps below to activate your vendor profile."}
          </p>
        </div>
        <VendorVerification
          email={email}
          phone={phone}
          referredBy={null}
          resumeState={vendor}
        />
      </div>
    </div>
  );
}

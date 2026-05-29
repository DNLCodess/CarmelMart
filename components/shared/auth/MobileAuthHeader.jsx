// @portal: buyer
// @surface: mobile auth brand header — shown only on screens below lg breakpoint

"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MobileAuthHeader({ backHref = "/", tagline }) {
  return (
    <div className="lg:hidden relative bg-primary px-6 pt-10 pb-8 text-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />
      <Link
        href={backHref}
        className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <div className="relative z-10">
        <Image
          src="/logo-white.png"
          alt="CarmelMart"
          width={120}
          height={38}
          className="object-contain mx-auto"
          priority
        />
        {tagline && (
          <p className="text-white/65 text-xs mt-2 tracking-wide">{tagline}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Suspended</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your account has been suspended. Please contact the CarmelMart admin team for assistance.
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gray-800 text-white rounded-full text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}

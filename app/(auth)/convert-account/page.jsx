"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { convertGuestAction } from "@/app/actions/auth";

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ConvertAccountPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { isGuest, isLoading: authLoading } = useAuth();

  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "", phone: "",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const result = await convertGuestAction({
        email:     form.email.trim(),
        password:  form.password,
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      setDone(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Redirect registered users away — this page is for guests only
  if (!authLoading && !isGuest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">You already have an account</h2>
          <p className="text-sm text-gray-500 mb-6">Your account is fully set up. Head to your dashboard to manage orders and settings.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">

        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Home
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Image src="/logo-black.png" alt="CarmelMart" width={130} height={40} className="object-contain" />
        </motion.div>

        <AnimatePresence mode="wait">
          {done ? (
            /* ── Success state ── */
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Account created!</h2>
              <p className="text-sm text-gray-600">
                We sent a confirmation link to <strong>{form.email}</strong>. Click it to verify your email address.
                You can still use your account before verifying.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href="/orders"
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  View My Orders
                </Link>
                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-400 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </motion.div>
          ) : (
            /* ── Form state ── */
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Save your account</h1>
                <p className="text-sm text-gray-500">Create a free account to track this order and shop faster next time.</p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4"
              >
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="Adebayo"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                      />
                    </div>
                  </Field>
                  <Field label="Last Name">
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={set("lastName")}
                      placeholder="Johnson"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                    />
                  </Field>
                </div>

                <Field label="Email Address" required>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                    />
                  </div>
                </Field>

                <Field label="Password" required hint="At least 8 characters">
                  <PasswordInput
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Phone Number" hint="Optional — for order updates via SMS">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="08012345678"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                    />
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

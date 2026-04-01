"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { loginAction } from "@/app/actions/auth";

const Input = ({ label, type = "text", placeholder, icon: Icon, error, value, onChange, name }) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={inputType}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full ${Icon ? "pl-12" : "pl-4"} ${
            type === "password" ? "pr-12" : "pr-4"
          } py-3.5 rounded-xl border-2 ${
            error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-primary"
          } focus:outline-none transition-all duration-300 bg-white`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && (
        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
          {error}
        </motion.p>
      )}
    </div>
  );
};

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setIsLoading(true);
    try {
      await loginAction({ email: formData.email, password: formData.password });
      // Invalidate the React Query cache so AuthProvider re-fetches the user
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      toast.success("Welcome back!");
      const from = searchParams.get("from");
      router.push(from?.startsWith("/") ? from : "/");
    } catch (err) {
      toast.error(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Banner */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <Image src="/auth-banner.jpg" alt="Login to CarmelMart" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-tl from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 p-12 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="text-5xl font-bold mb-4">Welcome Back</h1>
            <p className="text-xl opacity-90">Continue your shopping journey</p>
          </motion.div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-linear-to-br from-gray-50 to-white">
        <div className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary group">
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center group-hover:border-primary">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold">Back to Home</span>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-lg text-gray-600">Sign in to continue your shopping journey</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">New User?</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Please verify your email address before signing in. Check your inbox for the verification link.
                  </p>
                </div>
              </div>
            </motion.div>

            <Input label="Email Address" type="email" name="email" placeholder="you@example.com" icon={Mail} value={formData.email} onChange={handleChange} error={errors.email} />

            <div>
              <Input label="Password" type="password" name="password" placeholder="Enter your password" icon={Lock} value={formData.password} onChange={handleChange} error={errors.password} />
              <div className="flex justify-end mt-3">
                <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-linear-to-br from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              New to CarmelMart?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

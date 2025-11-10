"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  CreditCard,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authHelpers } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const Input = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  error,
  value,
  onChange,
  name,
}) => {
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
            error
              ? "border-red-300 focus:border-red-500"
              : "border-gray-200 focus:border-primary"
          } focus:outline-none transition-all duration-300 bg-white`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

const Button = ({
  children,
  variant = "primary",
  size = "lg",
  isLoading,
  className = "",
  onClick,
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300";
  const variants = {
    primary:
      "bg-linear-to-br from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  };
  const sizes = { lg: "px-8 py-3.5 text-base" };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await authHelpers.signIn(
        formData.email,
        formData.password
      );
      if (error) throw error;
      setUser(data.user);
      setSession(data.session);
      toast.success("Welcome back!");
      router.push("/");
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Banner */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <Image
          src="/auth-banner.jpg"
          alt="Login to CarmelMart"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-tl from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-5xl font-bold mb-4">Welcome Back</h1>
            <p className="text-xl opacity-90">Continue your shopping journey</p>
          </motion.div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <a
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-primary group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center group-hover:border-primary">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold">Back to Home</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-lg text-gray-600">
              Sign in to continue your shopping journey
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Verification Notice - Minimal Design */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    New User?
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Please verify your email address before signing in. Check
                    your inbox for the verification link.
                  </p>
                </div>
              </div>
            </motion.div>

            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="you@example.com"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
            <div>
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
              />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Forgot Password?
                </a>
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              New to CarmelMart?{" "}
              <a
                href="/register"
                className="text-primary font-semibold hover:underline"
              >
                Create Account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

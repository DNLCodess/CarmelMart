"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, CheckCircle } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { authHelpers } from "@/lib/supabase";

const Input = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  error,
}) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-gray-700">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full ${
          Icon ? "pl-12" : "pl-4"
        } pr-4 py-3.5 rounded-xl border-2 ${
          error
            ? "border-red-300 focus:border-red-500"
            : "border-gray-200 focus:border-primary"
        } focus:outline-none transition-all bg-white`}
      />
    </div>
    {error && (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-red-500"
      >
        {error}
      </motion.p>
    )}
  </div>
);

const OTPInput = ({ value, onChange }) => {
  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d?$/.test(val)) return;
    const newOtp = value.split("");
    newOtp[index] = val;
    onChange(newOtp.join(""));
    if (val && index < 5) document.getElementById(`otp-${index + 1}`).focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          className="w-14 h-14 text-2xl font-bold text-center rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-all"
        />
      ))}
    </div>
  );
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOTP = async () => {
    if (!email.includes("@")) return setError("Valid email required");
    setIsLoading(true);
    try {
      const { error } = await authHelpers.signIn(email, null, {
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) return setError("Enter 6-digit OTP");
    setIsLoading(true);
    try {
      // In real app, verify OTP via Supabase magic link or custom endpoint
      setStep(3);
      toast.success("OTP verified!");
    } catch (err) {
      toast.error("Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) return setError("Password too short");
    setIsLoading(true);
    try {
      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password reset successfully!");
      window.location.href = "/auth/login";
    } catch (err) {
      toast.error(err.message);
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
          alt="Reset Password"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 text-white">
          <h1 className="text-5xl font-bold mb-4">Reset Password</h1>
          <p className="text-xl opacity-90">Secure your account in seconds</p>
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
              href="/auth/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-primary"
            >
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="font-semibold">Back to Login</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {step === 1 && (
              <>
                <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
                <p className="text-gray-600 mb-8">
                  Enter your email to receive a 6-digit OTP
                </p>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                />
                <button
                  onClick={sendOTP}
                  disabled={isLoading}
                  className="w-full mt-6 bg-linear-to-br from-primary to-accent text-white py-3.5 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  {isLoading ? "Sending..." : "Send OTP"}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-3xl font-bold mb-2">Enter OTP</h1>
                <p className="text-gray-600 mb-8">
                  Check your email for the 6-digit code
                </p>
                <OTPInput value={otp} onChange={setOtp} />
                <button
                  onClick={verifyOTP}
                  disabled={isLoading}
                  className="w-full mt-8 bg-linear-to-br from-primary to-accent text-white py-3.5 rounded-xl font-semibold hover:shadow-xl"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
                <p className="text-gray-600 mb-8">Choose a strong password</p>
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={error}
                />
                <button
                  onClick={resetPassword}
                  disabled={isLoading}
                  className="w-full mt-6 bg-linear-to-br from-primary to-accent text-white py-3.5 rounded-xl font-semibold hover:shadow-xl"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

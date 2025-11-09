"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Mail,
  Lock,
  Phone,
  User,
  ShoppingBag,
  Store,
  Shield,
  Check,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Package,
} from "lucide-react";

import toast from "react-hot-toast";
import { authHelpers, dbHelpers } from "@/lib/supabase";
import { generateReferralCode } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import VendorVerification from "@/components/shared/auth/VendorVerification";

const Input = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  error,
  register,
  name,
  required,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-[--color-accent]">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          {...register}
          className={`w-full ${Icon ? "pl-12" : "pl-4"} ${
            type === "password" ? "pr-12" : "pr-4"
          } py-3.5 rounded-xl border-2 ${
            error
              ? "border-red-300 focus:border-red-500"
              : "border-gray-200 focus:border-primary"
          } focus:outline-none transition-all duration-300 text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300`}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
          className="text-sm text-red-500 flex items-center gap-1"
        >
          <span className="w-1 h-1 bg-red-500 rounded-full" />
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
  type = "button",
  disabled,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-linear-to-br from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
    ghost: "text-gray-600 hover:text-primary hover:bg-gray-50",
  };
  const sizes = {
    lg: "px-8 py-3.5 text-base",
    md: "px-6 py-2.5 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

const RoleCard = ({
  icon: Icon,
  title,
  description,
  benefits,
  selected,
  onClick,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left w-full ${
      selected
        ? "border-primary bg-linear-to-br from-primary/5 to-accent/5 shadow-lg"
        : "border-gray-200 hover:border-primary/50 hover:shadow-md bg-white"
    }`}
  >
    {selected && (
      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    )}

    <div
      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        selected ? "bg-linear-to-br from-primary to-accent" : "bg-gray-100"
      }`}
    >
      <Icon
        className={`w-7 h-7 ${selected ? "text-white" : "text-gray-600"}`}
      />
    </div>

    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-sm mb-4">{description}</p>

    <div className="space-y-2">
      {benefits.map((benefit, index) => (
        <div
          key={index}
          className="flex items-start gap-2 text-sm text-gray-600"
        >
          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>{benefit}</span>
        </div>
      ))}
    </div>
  </motion.button>
);

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [step, setStep] = useState(1); // 1: Role, 2: Form, 3: Vendor Verification
  const [selectedRole, setSelectedRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch("password");
  const referralCode = watch("referralCode");

  const roles = [
    {
      id: "customer",
      icon: ShoppingBag,
      title: "Customer",
      description: "Shop from verified vendors nationwide",
      benefits: [
        "Access to 12K+ authentic products",
        "Secure payment with Paystack",
        "Nationwide delivery coverage",
        "24/7 customer support",
      ],
    },
    {
      id: "vendor",
      icon: Store,
      title: "Vendor",
      description: "Sell your products to thousands of buyers",
      benefits: [
        "Reach 45K+ active shoppers",
        "Easy inventory management",
        "Automated order processing",
        "Marketing tools & analytics",
      ],
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep(2);
  };

  const onSubmit = async (formData) => {
    setIsLoading(true);

    try {
      // Step 1: Create user account with Supabase Auth
      const { data: authData, error } = await authHelpers.signUp(
        formData.email,
        formData.password
      );

      if (error) {
        throw new Error(error.message);
      }

      const user = authData?.user;
      const session = authData?.session;

      if (!user) {
        throw new Error("Failed to create user account");
      }

      // Step 2: Handle role-specific flow
      if (selectedRole === "vendor") {
        setUserData({
          userId: user.id,
          email: formData.email,
          phone: formData.phone,
          referralCode: formData.referralCode || null,
        });
        setStep(3);
        toast.success("Account created! Please complete verification.");
      } else {
        await completeCustomerRegistration(user, formData);
        setUser(user);
        setSession(session);
        toast.success("Welcome to CarmelMart! 🎉");
        router.push("/");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete customer registration
  const completeCustomerRegistration = async (user, data) => {
    try {
      // Store customer profile in database
      const customerData = {
        user_id: user.id,
        email: data.email,
        phone: data.phone,
        role: "customer",
        status: "active",
        created_at: new Date().toISOString(),
      };

      // Save to database (adjust based on your DB structure)
      await dbHelpers.createProfile(customerData);

      // Process referral if provided
      if (data.referralCode) {
        await processCustomerReferral(data.referralCode, user.id);
      }
    } catch (error) {
      console.error("Error completing customer registration:", error);
      throw error;
    }
  };

  // Process customer referral (optional - if you have customer referrals)
  const processCustomerReferral = async (referralCode, userId) => {
    try {
      // Implement customer referral logic if needed
      console.log("Processing customer referral:", referralCode);
    } catch (error) {
      console.error("Error processing customer referral:", error);
    }
  };

  // Handle vendor verification completion
  const handleVendorComplete = (vendorData) => {
    // Set user session
    setUser(vendorData);

    // Redirect to vendor dashboard
    router.push("/vendor/dashboard");

    // Show success message
    toast.success("🎉 Welcome to CarmelMart! Your vendor account is active.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CarmelMart</h1>
          </motion.div>
          {step === 1 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600"
            >
              Join thousands of buyers and sellers on Nigeria's trusted
              marketplace
            </motion.p>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Choose Your Account Type
                  </h2>
                  <p className="text-gray-600">
                    Select how you want to use CarmelMart
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      {...role}
                      selected={selectedRole === role.id}
                      onClick={() => handleRoleSelect(role.id)}
                    />
                  ))}
                </div>

                <div className="mt-8 text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <a
                    href="/auth/login"
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign in
                  </a>
                </div>
              </motion.div>
            )}

            {/* Step 2: Registration Form */}
            {step === 2 && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12"
              >
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change account type
                </button>

                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedRole === "customer" ? "bg-primary" : "bg-accent"
                      }`}
                    >
                      {selectedRole === "customer" ? (
                        <ShoppingBag className="w-4 h-4 text-white" />
                      ) : (
                        <Store className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {selectedRole} Account
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Create Your Account
                  </h2>
                  <p className="text-gray-600">
                    Fill in your details to get started
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    icon={Mail}
                    register={register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Invalid email address",
                      },
                    })}
                    error={errors.email?.message}
                    required
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    name="phone"
                    placeholder="+234 XXX XXX XXXX"
                    icon={Phone}
                    register={register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^(\+234|0)[789][01]\d{8}$/,
                        message: "Invalid Nigerian phone number",
                      },
                    })}
                    error={errors.phone?.message}
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    placeholder="Create a strong password"
                    icon={Lock}
                    register={register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message:
                          "Password must contain uppercase, lowercase, and number",
                      },
                    })}
                    error={errors.password?.message}
                    required
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    icon={Lock}
                    register={register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === password || "Passwords do not match",
                    })}
                    error={errors.confirmPassword?.message}
                    required
                  />

                  <Input
                    label="Referral Code"
                    type="text"
                    name="referralCode"
                    placeholder="Enter code (optional)"
                    register={register("referralCode")}
                  />

                  {referralCode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-900 mb-1">
                            Referral Bonus Active!
                          </p>
                          <p className="text-xs text-green-700">
                            {selectedRole === "vendor"
                              ? "Your referrer earns ₦500 when you complete verification"
                              : "You'll receive special benefits from your referrer"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        {...register("terms", {
                          required: "You must accept the terms",
                        })}
                        className="w-5 h-5 mt-0.5 text-primary border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                        I agree to CarmelMart's{" "}
                        <a
                          href="#"
                          className="text-primary font-semibold hover:underline"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="#"
                          className="text-primary font-semibold hover:underline"
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="text-sm text-red-500 mt-2 ml-8">
                        {errors.terms.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    {selectedRole === "vendor"
                      ? "Continue to Verification"
                      : "Create Account"}
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <a
                      href="/auth/login"
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign in
                    </a>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Vendor Verification */}
            {step === 3 && userData && (
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-8 lg:p-12"
              >
                <VendorVerification
                  userId={userData.userId}
                  email={userData.email}
                  referralCode={userData.referralCode}
                  onComplete={handleVendorComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Secure & Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span>12K+ Products</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>45K+ Active Users</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

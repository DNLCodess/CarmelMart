"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  CheckCircle2,
  Loader2,
  Building2,
  CreditCard,
  Shield,
  ArrowRight,
  AlertCircle,
  Star,
  Check,
  Gift,
} from "lucide-react";

import { qoreIdHelpers } from "@/lib/qoreId";
import { flutterwaveHelpers } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/client";
import { completeVendorPaymentAction } from "@/app/actions/vendor";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";

const supabase = createClient();

export default function VendorVerification({
  userId,
  email,
  referredBy, // referral code of the person who referred this user
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationType, setVerificationType] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [isSubmittingBusiness, setIsSubmittingBusiness] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    nin: { verified: false, loading: false },
    cac: { verified: false, loading: false },
    payment: { verified: false, loading: false, processing: false },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const [verifiedAccountName, setVerifiedAccountName] = useState(null);
  const [bankVerifying, setBankVerifying] = useState(false);

  const watchedAccountNumber = watch("accountNumber");
  const watchedBankCode      = watch("bankCode");

  // Clear verification when either field changes
  useEffect(() => {
    setVerifiedAccountName(null);
  }, [watchedAccountNumber, watchedBankCode]);

  // Steps vary by tier; only show tier-specific steps once a tier is chosen
  const getSteps = () => {
    const base = [
      { id: 1, title: "Business", icon: Building2 },
      { id: 2, title: "Tier", icon: Shield },
      { id: 3, title: "NIN", icon: Shield },
    ];
    if (verificationType === "nin_cac") {
      base.push({ id: 4, title: "CAC", icon: Building2 });
      base.push({ id: 5, title: "Payment", icon: CreditCard });
    } else if (verificationType === "nin") {
      base.push({ id: 4, title: "Payment", icon: CreditCard });
    }
    // No extra steps shown until the user picks a tier on step 2
    return base;
  };

  const steps = getSteps();
  const paymentStep = verificationType === "nin_cac" ? 5 : 4;
  const totalSteps = steps.length;

  // ── Bank Account Verification ─────────────────────────────────────────────
  const verifyBankAccount = async () => {
    const accountNumber = watch("accountNumber");
    const bankCode      = watch("bankCode");
    if (!accountNumber || !bankCode) {
      toast.error("Enter account number and bank code first");
      return;
    }
    setBankVerifying(true);
    try {
      const res = await fetch("/api/flutterwave/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerifiedAccountName(data.account_name);
      toast.success(`Account verified: ${data.account_name}`);
    } catch (err) {
      toast.error(err.message || "Could not verify bank account");
    } finally {
      setBankVerifying(false);
    }
  };

  // ── Step 1: Business Details ──────────────────────────────────────────────
  const handleBusinessDetails = async (data) => {
    if (!verifiedAccountName) {
      toast.error("Please verify your bank account number before continuing");
      return;
    }
    setIsSubmittingBusiness(true);
    try {
      // vendor shell was created in signupAction — just update with business details
      const { error: vendorError } = await supabase
        .from("vendors")
        .update({
          business_name:        data.businessName,
          address:              data.address,
          phone:                data.phone,
          bank_account_number:  data.accountNumber,
          bank_name:            data.bankName,
          bank_code:            data.bankCode,
          updated_at:           new Date().toISOString(),
        })
        .eq("id", userId);

      if (vendorError) throw vendorError;

      setBusinessName(data.businessName);
      toast.success("Business details saved!");
      setCurrentStep(2);
    } catch (error) {
      toast.error("Failed to save business details");
      console.error(error);
    } finally {
      setIsSubmittingBusiness(false);
    }
  };

  // ── Step 2: Choose Verification Tier ──────────────────────────────────────
  const handleVerificationChoice = async (type) => {
    try {
      const { error } = await supabase
        .from("vendors")
        .update({ verification_type: type })
        .eq("id", userId);
      if (error) throw error;
      setVerificationType(type);
      toast.success(
        type === "nin_cac" ? "Business verification selected" : "Starter verification selected"
      );
      setCurrentStep(3);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save tier selection. Please try again.");
    }
  };

  // ── Step 3: NIN Verification ───────────────────────────────────────────────
  const handleNINVerification = async (data) => {
    setVerificationStatus((prev) => ({ ...prev, nin: { verified: false, loading: true } }));
    try {
      const result = await qoreIdHelpers.verifyNIN(data.nin, data.firstName, data.lastName);
      if (result.success) {
        // vendors.nin_verified is written server-side inside /api/qoreid/verify-nin
        setVerificationStatus((prev) => ({ ...prev, nin: { verified: true, loading: false } }));
        toast.success("NIN verified successfully");
        setTimeout(() => setCurrentStep(4), 1500);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, nin: { verified: false, loading: false } }));
      toast.error(error.message || "NIN verification failed");
    }
  };

  // ── Step 4: CAC Verification (Premium only) ───────────────────────────────
  const handleCACVerification = async (data) => {
    setVerificationStatus((prev) => ({ ...prev, cac: { verified: false, loading: true } }));
    try {
      const result = await qoreIdHelpers.verifyCAC(data.cacNumber);
      if (result.success) {
        // vendors.cac_verified is written server-side inside /api/qoreid/verify-cac
        setVerificationStatus((prev) => ({ ...prev, cac: { verified: true, loading: false } }));
        toast.success("CAC verified successfully");
        setTimeout(() => setCurrentStep(5), 1500);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, cac: { verified: false, loading: false } }));
      toast.error(error.message || "CAC verification failed");
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    const reference = flutterwaveHelpers.generateReference();
    const customerName = businessName || email.split("@")[0];
    const amount = verificationType === "nin_cac" ? 10000 : 5000;

    setVerificationStatus((prev) => ({
      ...prev,
      payment: { verified: false, loading: true, processing: false },
    }));

    try {
      await supabase.from("payments").insert([{
        user_id: userId,
        amount,
        reference,
        status: "pending",
        type: "vendor_fee",
        payment_provider: "flutterwave",
        verification_type: verificationType,
      }]);

      await flutterwaveHelpers.initializePayment(
        email,
        amount,
        reference,
        customerName,
        verificationType,
        // Success callback
        async (response) => {
          try {
            setVerificationStatus((prev) => ({
              ...prev,
              payment: { verified: false, loading: false, processing: true },
            }));

            // Verify payment server-side and activate vendor
            await completeVendorPaymentAction({
              transactionId: response.transaction_id,
              reference,
              flwRef: response.flw_ref,
            });

            setVerificationStatus((prev) => ({
              ...prev,
              payment: { verified: true, loading: false, processing: false },
            }));

            toast.success(
              referredBy
                ? "Payment successful! Your referrer earned ₦500 bonus!"
                : "Payment successful! Welcome to CarmelMart!",
              { duration: 4000 }
            );

            await new Promise((resolve) => setTimeout(resolve, 2000));
            router.push(`/register-success?registrationtype=${verificationType}`);
          } catch (error) {
            console.error("Payment processing error:", error);
            setVerificationStatus((prev) => ({
              ...prev,
              payment: { verified: false, loading: false, processing: false },
            }));
            await supabase
              .from("payments")
              .update({ status: "failed", error_message: error.message })
              .eq("reference", reference);
            toast.error("Failed to complete registration. Please contact support.", {
              duration: 5000,
            });
          }
        },
        // Close callback
        () => {
          setVerificationStatus((prev) => ({
            ...prev,
            payment: { verified: false, loading: false, processing: false },
          }));
          toast.error("Payment cancelled");
          supabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("reference", reference);
        }
      );
    } catch (error) {
      console.error("Payment initialization error:", error);
      setVerificationStatus((prev) => ({
        ...prev,
        payment: { verified: false, loading: false, processing: false },
      }));
      toast.error(
        error.message === "Failed to load Flutterwave script"
          ? "Payment service unavailable. Please refresh and try again."
          : "Failed to initialize payment. Please try again."
      );
    }
  };

  // ── Progress Indicator ────────────────────────────────────────────────────
  const currentStepMeta = steps.find((s) => s.id === currentStep) || steps[0];

  return (
    <div className="w-full max-w-2xl mx-auto px-0">
      {/* Referral bonus banner */}
      {referredBy && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3.5 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 border-2 border-green-200 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900 text-sm">Referral Bonus Active!</p>
            <p className="text-xs text-green-700">
              Complete verification to credit ₦500 to your referrer
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Progress — mobile: text + bar; desktop: icon stepper ── */}
      <div className="mb-6">
        {/* Mobile */}
        <div className="flex sm:hidden flex-col gap-2 mb-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-xs font-medium text-gray-600">{currentStepMeta.title}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? "#22c55e" : isActive ? "#560238" : "#e5e7eb",
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} />
                    )}
                  </motion.div>
                  <p
                    className={`mt-1.5 text-[11px] font-medium text-center ${
                      isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="h-full bg-green-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >

          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-6">
              <form onSubmit={handleSubmit(handleBusinessDetails)} className="space-y-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    Business Information
                  </h2>
                  <p className="text-sm text-gray-500">Tell us about your business to get started</p>
                </div>

                <Input
                  label="Business Name"
                  placeholder="Your registered business name"
                  {...register("businessName", { required: "Business name is required" })}
                  error={errors.businessName?.message}
                />

                <Input
                  label="Business Address"
                  placeholder="Physical business location"
                  {...register("address", { required: "Address is required" })}
                  error={errors.address?.message}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  inputMode="tel"
                  placeholder="+234 XXX XXX XXXX"
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^(\+234|0)[789][01]\d{8}$/,
                      message: "Enter a valid Nigerian phone number",
                    },
                  })}
                  error={errors.phone?.message}
                />

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="font-semibold text-gray-900 mb-4 text-sm">Bank Account Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Account Number"
                        placeholder="10-digit NUBAN"
                        maxLength={10}
                        inputMode="numeric"
                        {...register("accountNumber", {
                          required: "Account number is required",
                          pattern: { value: /^\d{10}$/, message: "Must be 10 digits" },
                        })}
                        error={errors.accountNumber?.message}
                      />
                      <Input
                        label="Bank Code"
                        placeholder="e.g. 011 (First Bank)"
                        maxLength={6}
                        inputMode="numeric"
                        {...register("bankCode", {
                          required: "Bank code is required",
                          pattern: { value: /^\d{3,6}$/, message: "3–6 digit code" },
                        })}
                        error={errors.bankCode?.message}
                      />
                    </div>
                    <Input
                      label="Bank Name"
                      placeholder="e.g. First Bank, GTBank"
                      {...register("bankName", { required: "Bank name is required" })}
                      error={errors.bankName?.message}
                    />

                    {/* Verify account number */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={verifyBankAccount}
                        disabled={bankVerifying}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      >
                        {bankVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                          </>
                        ) : verifiedAccountName ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            Verify Account Number
                          </>
                        )}
                      </button>

                      {verifiedAccountName && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-sm font-medium text-green-800">{verifiedAccountName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full group"
                  isLoading={isSubmittingBusiness}
                  disabled={isSubmittingBusiness || !verifiedAccountName}
                >
                  {isSubmittingBusiness ? "Saving..." : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Choose Verification Tier */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
                  Choose Your Verification Tier
                </h2>
                <p className="text-sm text-gray-500">
                  Pick a verification level that suits your business
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Starter */}
                <button
                  onClick={() => handleVerificationChoice("nin")}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-gray-700" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Starter</h3>
                      </div>
                      <span className="text-sm font-bold text-gray-700">₦5,000</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">NIN Verification — Individual sellers</p>
                    <ul className="text-sm text-gray-600 space-y-2">
                      {["Quick verification", "Unlimited listings", "Verified badge"].map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-500 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-5 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Select Starter
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>

                {/* Business */}
                <button
                  onClick={() => handleVerificationChoice("nin_cac")}
                  className="bg-white border-2 border-gray-800 rounded-xl p-5 hover:shadow-md transition-all text-left flex flex-col justify-between relative"
                >
                  <span className="absolute top-2.5 right-3 text-[10px] font-bold text-gray-800 uppercase bg-gray-100 px-2 py-0.5 rounded">
                    Priority
                  </span>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                          <Star className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Business</h3>
                      </div>
                      <span className="text-sm font-bold text-gray-800">₦10,000</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">NIN + CAC Verification — Registered businesses</p>
                    <ul className="text-sm text-gray-600 space-y-2">
                      {["All Starter benefits", "Enhanced credibility", "Priority visibility"].map((b) => (
                        <li key={b} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-gray-800 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-5 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
                    Select Business
                    <Star className="w-4 h-4" />
                  </div>
                </button>
              </div>

              <div className="flex gap-3 border border-gray-200 bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <AlertCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-0.5">Why Business?</p>
                  <p>Vendors with CAC verification get higher trust and better search visibility.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: NIN Verification */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-6">
              {verificationStatus.nin.verified ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">NIN Verified</h3>
                  <p className="text-sm text-gray-500">
                    {verificationType === "nin_cac"
                      ? "Proceeding to CAC verification..."
                      : "Proceeding to payment..."}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(handleNINVerification)} className="space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      NIN Verification
                    </h2>
                    <p className="text-sm text-gray-500">
                      Verify your identity with your National Identity Number
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-0.5">Secure & Confidential</p>
                      <p className="text-blue-700 text-xs">
                        Your NIN is encrypted and used only for identity verification.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      placeholder="As on your NIN"
                      {...register("firstName", {
                        required: "First name is required",
                        minLength: { value: 2, message: "Must be at least 2 characters" },
                      })}
                      error={errors.firstName?.message}
                    />
                    <Input
                      label="Last Name"
                      placeholder="As on your NIN"
                      {...register("lastName", {
                        required: "Last name is required",
                        minLength: { value: 2, message: "Must be at least 2 characters" },
                      })}
                      error={errors.lastName?.message}
                    />
                  </div>

                  <Input
                    label="National Identity Number (NIN)"
                    placeholder="11-digit NIN"
                    maxLength={11}
                    {...register("nin", {
                      required: "NIN is required",
                      pattern: { value: /^\d{11}$/, message: "NIN must be exactly 11 digits" },
                    })}
                    error={errors.nin?.message}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={verificationStatus.nin.loading}
                    disabled={verificationStatus.nin.loading}
                  >
                    {verificationStatus.nin.loading ? "Verifying..." : "Verify NIN"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Step 4: CAC Verification (Premium only) */}
          {currentStep === 4 && verificationType === "nin_cac" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-6">
              {verificationStatus.cac.verified ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-10"
                >
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">CAC Verified</h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold mb-2">
                    <Star className="w-3.5 h-3.5" fill="currentColor" />
                    Premium Status Unlocked
                  </div>
                  <p className="text-sm text-gray-500">Proceeding to payment...</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(handleCACVerification)} className="space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      CAC Verification
                    </h2>
                    <p className="text-sm text-gray-500">
                      Verify your business registration with CAC
                    </p>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex gap-3">
                    <Star className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary mb-0.5">Premium Verification</p>
                      <p className="text-gray-600 text-xs">
                        CAC verification confirms your business is legally registered and gives
                        you priority marketplace placement.
                      </p>
                    </div>
                  </div>

                  <Input
                    label="CAC Registration Number"
                    placeholder="e.g., BN1234567 or RC123456"
                    {...register("cacNumber", {
                      required: "CAC number is required",
                      pattern: {
                        value: /^(BN|RC|IT|LLP)[0-9]{6,}$/i,
                        message: "Invalid CAC format (e.g., BN1234567 or RC123456)",
                      },
                    })}
                    error={errors.cacNumber?.message}
                  />

                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">Accepted registration types:</p>
                    <ul className="space-y-1 ml-4 list-disc text-xs">
                      <li>Business Name (BN)</li>
                      <li>Registered Company (RC)</li>
                      <li>Limited Liability Partnership (LLP)</li>
                      <li>Incorporated Trustees (IT)</li>
                    </ul>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={verificationStatus.cac.loading}
                    disabled={verificationStatus.cac.loading}
                  >
                    {verificationStatus.cac.loading ? "Verifying..." : "Verify CAC"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Payment Step */}
          {currentStep === paymentStep && (
            <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-6">
              {verificationStatus.payment.processing ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Processing Payment...</h3>
                  <p className="text-sm text-gray-500">Please wait while we verify your payment</p>
                  {referredBy && (
                    <p className="text-xs text-green-600 mt-2">Crediting referral bonus...</p>
                  )}
                </motion.div>
              ) : verificationStatus.payment.verified ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                  {verificationType === "nin_cac" && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-linear-to-br from-primary to-accent text-white rounded-full font-semibold text-sm mb-3">
                      <Star className="w-4 h-4" fill="currentColor" />
                      Business Vendor Active
                    </div>
                  )}
                  {referredBy && (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-3">
                      <Gift className="w-4 h-4" />
                      Referral bonus credited!
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mb-4">Redirecting to your dashboard...</p>
                  <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto" />
                </motion.div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      Registration Fee
                    </h2>
                    <p className="text-sm text-gray-500">
                      One-time payment to activate your vendor account
                    </p>
                  </div>

                  {/* Price */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                      One-time fee
                    </p>
                    <p className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
                      ₦{verificationType === "nin_cac" ? "10,000" : "5,000"}
                    </p>
                    {verificationType === "nin_cac" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                        <Star className="w-3 h-3" fill="currentColor" />
                        Business Tier
                      </div>
                    )}
                  </div>

                  {/* Included benefits */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="font-semibold text-green-900 mb-3 text-sm">What's Included:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        "Full vendor dashboard",
                        "Unlimited listings",
                        "Verified badge",
                        "Referral earnings",
                        ...(verificationType === "nin_cac"
                          ? ["Priority placement", "Enhanced badge"]
                          : []),
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <Check
                            className={`w-4 h-4 shrink-0 ${
                              verificationType === "nin_cac" &&
                              (item === "Priority placement" || item === "Enhanced badge")
                                ? "text-primary"
                                : "text-green-600"
                            }`}
                            strokeWidth={2}
                          />
                          <span
                            className={`text-xs ${
                              verificationType === "nin_cac" &&
                              (item === "Priority placement" || item === "Enhanced badge")
                                ? "text-primary font-medium"
                                : "text-green-900"
                            }`}
                          >
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Referral reminder */}
                  {referredBy && (
                    <div className="flex items-center gap-3 bg-linear-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3.5">
                      <Gift className="w-5 h-5 text-green-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900 text-sm">Bonus Reminder</p>
                        <p className="text-xs text-green-700">
                          Your referrer will receive ₦500 when you complete this payment
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePayment}
                    variant="accent"
                    size="lg"
                    className="w-full group"
                    isLoading={verificationStatus.payment.loading}
                    disabled={verificationStatus.payment.loading}
                  >
                    {verificationStatus.payment.loading ? (
                      "Processing..."
                    ) : (
                      <>
                        Pay ₦{verificationType === "nin_cac" ? "10,000" : "5,000"}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <Shield className="w-3.5 h-3.5" />
                    Secure payment powered by Flutterwave
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}

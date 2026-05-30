"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  saveVendorBusinessDetailsAction,
  setVendorTierAction,
  createVendorPaymentRecordAction,
  updateVendorPaymentStatusAction,
  completeVendorPaymentAction,
  completeFreeTierRegistrationAction,
} from "@/app/actions/vendor";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";
import BankSelect from "@/components/ui/BankSelect";

// Determine which step to start on based on previously saved DB state
function computeInitialStep(r) {
  if (!r?.business_name) return 1;
  if (!r.verification_type) return 2;
  if (!r.nin_verified) return 3;
  if (r.verification_type === "free") return 3; // NIN is the final step for free tier
  if (r.verification_type === "nin_cac" && !r.cac_verified) return 4;
  return r.verification_type === "nin_cac" ? 5 : 4;
}

export default function VendorVerification({
  email,
  phone,
  referredBy,
  resumeState = null, // vendor row fetched server-side; null for first-time flow
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(() => computeInitialStep(resumeState));
  const [verificationType, setVerificationType] = useState(resumeState?.verification_type ?? null);
  const [businessName, setBusinessName] = useState(resumeState?.business_name ?? "");
  const [isSubmittingBusiness, setIsSubmittingBusiness] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState({
    nin: { verified: resumeState?.nin_verified  ?? false, loading: false },
    cac: { verified: resumeState?.cac_verified  ?? false, loading: false },
    payment: { verified: false, loading: false, processing: false },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phone:         resumeState?.phone              ?? phone ?? "",
      businessName:  resumeState?.business_name      ?? "",
      address:       resumeState?.address            ?? "",
      accountNumber: resumeState?.bank_account_number ?? "",
      bankCode:      resumeState?.bank_code          ?? "",
      bankName:      resumeState?.bank_name          ?? "",
    },
  });

  const [verifiedAccountName, setVerifiedAccountName] = useState(null);
  const [bankVerifying, setBankVerifying]             = useState(false);
  const [bankVerifyError, setBankVerifyError]         = useState(null);

  const watchedAccountNumber = watch("accountNumber");
  const watchedBankCode      = watch("bankCode");

  // Clear verification and error when either field changes
  useEffect(() => {
    setVerifiedAccountName(null);
    setBankVerifyError(null);
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
    // "free" tier: NIN is the last step — no payment
    return base;
  };

  const steps = getSteps();
  const paymentStep = verificationType === "nin_cac" ? 5 : 4;
  const totalSteps = steps.length;

  // ── Bank Account Verification ─────────────────────────────────────────────
  const verifyBankAccount = async () => {
    const accountNumber = watch("accountNumber");
    const bankCode      = watch("bankCode");
    if (!accountNumber || !bankCode) return;
    setBankVerifying(true);
    setBankVerifyError(null);
    try {
      const res = await fetch("/api/flutterwave/verify-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerifiedAccountName(data.account_name);
      setBankVerifyError(null);
      toast.success(`Account verified: ${data.account_name}`);
    } catch (err) {
      setBankVerifyError(err.message || "Could not verify bank account");
      toast.error(err.message || "Could not verify bank account");
    } finally {
      setBankVerifying(false);
    }
  };

  // Auto-verify when account number reaches 10 digits and bank is selected
  useEffect(() => {
    if (
      watchedAccountNumber?.length === 10 &&
      watchedBankCode &&
      !verifiedAccountName &&
      !bankVerifying
    ) {
      verifyBankAccount();
    }
  }, [watchedAccountNumber, watchedBankCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: Business Details ──────────────────────────────────────────────
  const handleBusinessDetails = async (data) => {
    if (!verifiedAccountName) {
      toast.error("Please verify your bank account number before continuing");
      return;
    }
    setIsSubmittingBusiness(true);
    try {
      await saveVendorBusinessDetailsAction({
        businessName: data.businessName,
        address:      data.address,
        phone:        data.phone,
        accountNumber: data.accountNumber,
        bankName:     data.bankName,
        bankCode:     data.bankCode,
      });
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
      await setVendorTierAction(type);
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
      const result = await qoreIdHelpers.verifyNIN(
        data.nin.trim(),
        data.firstName.trim(),
        data.lastName.trim()
      );
      if (result.success) {
        // vendors.nin_verified is written server-side inside /api/qoreid/verify-nin
        setVerificationStatus((prev) => ({ ...prev, nin: { verified: true, loading: false } }));
        toast.success("NIN verified successfully");
        if (verificationType === "free") {
          setTimeout(async () => {
            try {
              await completeFreeTierRegistrationAction();
              router.push("/vendor-pending");
            } catch {
              toast.error("Could not complete registration. Please try again.");
            }
          }, 1500);
        } else {
          setTimeout(() => setCurrentStep(4), 1500);
        }
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
      const result = await qoreIdHelpers.verifyCAC(data.cacNumber.trim().toUpperCase());
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
      await createVendorPaymentRecordAction({ reference, amount, verificationType });

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
            await updateVendorPaymentStatusAction(reference, "failed", error.message);
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
          updateVendorPaymentStatusAction(reference, "cancelled");
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
                    {/* Searchable bank combobox */}
                    <input type="hidden" {...register("bankCode", { required: "Please select your bank" })} />
                    <input type="hidden" {...register("bankName", { required: true })} />
                    <BankSelect
                      value={watchedBankCode}
                      onChange={(code, name) => {
                        setValue("bankCode", code, { shouldValidate: true });
                        setValue("bankName", name);
                        setVerifiedAccountName(null);
                        setBankVerifyError(null);
                      }}
                      error={errors.bankCode?.message}
                    />
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

                    {/* Account verification */}
                    <div className="flex flex-col gap-2">
                      {/* Auto-verifies on 10 digits — button is retry after failure */}
                      {!verifiedAccountName && (
                        <button
                          type="button"
                          onClick={verifyBankAccount}
                          disabled={bankVerifying || !watchedBankCode || watchedAccountNumber?.length !== 10}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          {bankVerifying ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
                          ) : bankVerifyError ? (
                            <><Shield className="w-4 h-4" />Re-verify Account</>
                          ) : (
                            <><Shield className="w-4 h-4" />Verify Account Number</>
                          )}
                        </button>
                      )}

                      {bankVerifyError && !verifiedAccountName && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {bankVerifyError}
                        </p>
                      )}

                      {verifiedAccountName && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-sm font-medium text-green-800">{verifiedAccountName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nudge: explain why Continue is disabled */}
                {!verifiedAccountName && watchedAccountNumber?.length === 10 && watchedBankCode && !bankVerifying && (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 -mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {bankVerifyError
                      ? "Verification failed — tap \"Re-verify Account\" above before continuing"
                      : "Account verification is required to continue"}
                  </p>
                )}

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
                  Choose Your Plan
                </h2>
                <p className="text-sm text-gray-500">
                  Start free or unlock more with a one-time upgrade
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Free */}
                <button
                  onClick={() => handleVerificationChoice("free")}
                  className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-primary/40 hover:shadow-sm transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900">Free</h3>
                      <span className="text-lg font-bold text-gray-700">₦0</span>
                    </div>
                    <p className="text-xs text-gray-500">NIN only · Get verified and start selling</p>
                    <div className="hidden sm:flex gap-3 mt-2">
                      {["Standard badge", "Unlimited listings", "Quick approval"].map((b) => (
                        <span key={b} className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-gray-400 shrink-0" />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>

                {/* Starter */}
                <button
                  onClick={() => handleVerificationChoice("nin")}
                  className="bg-white border-2 border-primary/30 rounded-xl p-4 sm:p-5 hover:border-primary hover:shadow-sm transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900">Starter</h3>
                      <span className="text-lg font-bold text-gray-900">₦5,000</span>
                      <span className="text-xs text-gray-400 font-normal">one-time</span>
                    </div>
                    <p className="text-xs text-gray-500">NIN only · Verified badge + referral earnings</p>
                    <div className="hidden sm:flex gap-3 mt-2">
                      {["Verified badge", "Referral earnings", "Priority support"].map((b) => (
                        <span key={b} className="inline-flex items-center gap-1 text-xs text-primary">
                          <Check className="w-3 h-3 shrink-0" />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                </button>

                {/* Business */}
                <button
                  onClick={() => handleVerificationChoice("nin_cac")}
                  className="bg-gray-900 border-2 border-gray-900 rounded-xl p-4 sm:p-5 hover:bg-gray-800 transition-all text-left flex items-center gap-4 relative overflow-hidden"
                >
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-gray-900 uppercase bg-white/90 px-1.5 py-0.5 rounded">
                    Best
                  </span>
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <h3 className="font-semibold text-white">Business</h3>
                      <span className="text-lg font-bold text-white">₦10,000</span>
                      <span className="text-xs text-white/50 font-normal">one-time</span>
                    </div>
                    <p className="text-xs text-white/60">NIN + CAC · Priority visibility + enhanced badge</p>
                    <div className="hidden sm:flex gap-3 mt-2">
                      {["CAC verified", "Priority search placement", "Enhanced badge"].map((b) => (
                        <span key={b} className="inline-flex items-center gap-1 text-xs text-white/80">
                          <Check className="w-3 h-3 shrink-0" />{b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                You can upgrade your plan anytime from your account settings.
              </p>
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

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Enter your name <strong className="font-semibold">exactly as it appears on your NIN slip</strong> — any spelling difference will cause verification to fail.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      placeholder="As on your NIN slip"
                      {...register("firstName", {
                        required: "First name is required",
                        minLength: { value: 2, message: "Must be at least 2 characters" },
                      })}
                      error={errors.firstName?.message}
                    />
                    <Input
                      label="Last Name"
                      placeholder="As on your NIN slip"
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
                    inputMode="numeric"
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

          {/* Payment Step — paid tiers only */}
          {currentStep === paymentStep && verificationType !== "free" && (
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
                      {verificationType === "nin_cac" ? "Business Upgrade" : "Starter Upgrade"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Unlock {verificationType === "nin_cac" ? "priority placement and enhanced credibility" : "your verified badge and referral earnings"}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                      {verificationType === "nin_cac" ? "Business tier" : "Starter tier"}
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

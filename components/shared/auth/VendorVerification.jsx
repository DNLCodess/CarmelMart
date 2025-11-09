"use client";

import { useState } from "react";
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
} from "lucide-react";

import { qoreIdHelpers } from "@/lib/qoreId";
import { flutterwaveHelpers } from "@/lib/flutterwave";
import { dbHelpers } from "@/lib/supabase";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";

export default function VendorVerification({ userId, email, onComplete }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationType, setVerificationType] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({
    nin: { verified: false, loading: false },
    cac: { verified: false, loading: false },
    payment: { verified: false, loading: false, processing: false },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // Dynamic steps based on verification type
  const getSteps = () => {
    const baseSteps = [
      { id: 1, title: "Business Info", icon: Building2 },
      { id: 2, title: "Select Tier", icon: Shield },
      { id: 3, title: "NIN Verification", icon: Shield },
    ];

    if (verificationType === "nin_cac") {
      baseSteps.push({ id: 4, title: "CAC Verification", icon: Building2 });
      baseSteps.push({ id: 5, title: "Payment", icon: CreditCard });
    } else if (verificationType === "nin") {
      baseSteps.push({ id: 4, title: "Payment", icon: CreditCard });
    }

    return baseSteps;
  };

  const steps = getSteps();

  // Step 1: Business Details
  const handleBusinessDetails = async (data) => {
    try {
      const { data: vendorData, error } = await dbHelpers.createVendorProfile({
        user_id: userId,
        business_name: data.businessName,
        address: data.address,
        phone: data.phone,
        bank_details: {
          account_number: data.accountNumber,
          bank_name: data.bankName,
          account_name: data.accountName,
        },
        nin_verified: false,
        cac_verified: false,
        payment_verified: false,
        verification_type: null,
      });

      if (error) throw error;

      setBusinessData(data);
      toast.success("Business details saved!");
      setCurrentStep(2);
    } catch (error) {
      toast.error("Failed to save business details");
      console.error(error);
    }
  };

  // Step 2: Choose Verification Method
  const handleVerificationChoice = async (type) => {
    setVerificationType(type);

    await dbHelpers.updateVendorProfile(userId, {
      verification_type: type,
    });

    toast.success(
      type === "nin_cac"
        ? "Premium verification selected"
        : "Standard verification selected"
    );
    setCurrentStep(3);
  };

  // Step 3: NIN Verification
  const handleNINVerification = async (data) => {
    setVerificationStatus((prev) => ({
      ...prev,
      nin: { verified: false, loading: true },
    }));

    try {
      const result = await qoreIdHelpers.verifyNIN(
        data.nin,
        data.firstName,
        data.lastName
      );

      if (result.success) {
        await dbHelpers.updateVendorProfile(userId, {
          nin_verified: true,
          nin_data: {
            first_name: data.firstName,
            last_name: data.lastName,
            nin: data.nin,
          },
        });

        setVerificationStatus((prev) => ({
          ...prev,
          nin: { verified: true, loading: false },
        }));

        toast.success("NIN verified successfully");

        setTimeout(() => {
          if (verificationType === "nin_cac") {
            setCurrentStep(4);
          } else {
            setCurrentStep(4);
          }
        }, 1500);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error) {
      setVerificationStatus((prev) => ({
        ...prev,
        nin: { verified: false, loading: false },
      }));
      toast.error(error.message || "NIN verification failed");
    }
  };

  // Step 4: CAC Verification
  const handleCACVerification = async (data) => {
    setVerificationStatus((prev) => ({
      ...prev,
      cac: { verified: false, loading: true },
    }));

    try {
      const result = await qoreIdHelpers.verifyCAC(data.cacNumber);

      if (result.success) {
        await dbHelpers.updateVendorProfile(userId, {
          cac_verified: true,
          cac_number: data.cacNumber,
        });

        setVerificationStatus((prev) => ({
          ...prev,
          cac: { verified: true, loading: false },
        }));

        toast.success("CAC verified successfully");
        setTimeout(() => setCurrentStep(5), 1500);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (error) {
      setVerificationStatus((prev) => ({
        ...prev,
        cac: { verified: false, loading: false },
      }));
      toast.error(error.message || "CAC verification failed");
    }
  };

  // Process successful payment
  const processSuccessfulPayment = async (transactionData) => {
    try {
      setVerificationStatus((prev) => ({
        ...prev,
        payment: { verified: false, loading: false, processing: true },
      }));

      await dbHelpers.updatePayment(transactionData.reference, {
        status: "success",
        transaction_id: transactionData.transaction_id,
        flw_ref: transactionData.flw_ref,
      });

      await dbHelpers.updateVendorProfile(userId, {
        payment_verified: true,
        status: "active",
      });

      setVerificationStatus((prev) => ({
        ...prev,
        payment: { verified: true, loading: false, processing: false },
      }));

      toast.success("Payment successful! Welcome to the platform!", {
        duration: 3000,
      });

      const flwModal = document.querySelector(".flw-modal");
      if (flwModal) flwModal.style.display = "none";
      const modalBackdrop = document.querySelector(".flw-modal-backdrop");
      if (modalBackdrop) modalBackdrop.style.display = "none";

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: vendorData } = await dbHelpers.getVendorProfile(userId);

      router.push(`/register-success?registrationtype=${verificationType}`);

      if (onComplete) {
        onComplete(vendorData);
      }
    } catch (error) {
      console.error("Payment processing error:", error);

      setVerificationStatus((prev) => ({
        ...prev,
        payment: { verified: false, loading: false, processing: false },
      }));

      toast.error("Failed to complete registration. Please contact support.");
    }
  };

  // Final Step: Payment
  const handlePayment = async () => {
    const reference = flutterwaveHelpers.generateReference();
    const customerName = businessData?.businessName || email.split("@")[0];
    const amount = verificationType === "nin_cac" ? 10000 : 5000;

    setVerificationStatus((prev) => ({
      ...prev,
      payment: { verified: false, loading: true, processing: false },
    }));

    try {
      await dbHelpers.createPayment({
        user_id: userId,
        amount: amount,
        reference,
        status: "pending",
        type: "vendor_fee",
        payment_provider: "flutterwave",
        verification_type: verificationType,
      });

      await flutterwaveHelpers.initializePayment(
        email,
        amount,
        verificationType,
        reference,
        customerName,
        async (response) => {
          try {
            const verifyResult = await flutterwaveHelpers.verifyPayment(
              response.transaction_id
            );

            if (verifyResult.success) {
              await processSuccessfulPayment({
                reference,
                transaction_id: response.transaction_id,
                flw_ref: response.flw_ref,
              });
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment callback error:", error);

            setVerificationStatus((prev) => ({
              ...prev,
              payment: { verified: false, loading: false, processing: false },
            }));

            toast.error("Payment verification failed. Please contact support.");

            await dbHelpers.updatePayment(reference, {
              status: "failed",
              error_message: error.message,
            });
          }
        },
        () => {
          setVerificationStatus((prev) => ({
            ...prev,
            payment: { verified: false, loading: false, processing: false },
          }));

          toast.error("Payment cancelled");

          dbHelpers.updatePayment(reference, {
            status: "cancelled",
          });
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

      await dbHelpers.updatePayment(reference, {
        status: "failed",
        error_message: error.message,
      });
    }
  };

  const getPaymentStep = () => {
    return verificationType === "nin_cac" ? 5 : 4;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Progress Steps - Clean Design */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted
                        ? "#22c55e"
                        : isActive
                        ? "#560238"
                        : "#e5e7eb",
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                    ) : (
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? "text-white" : "text-gray-400"
                        }`}
                      />
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <p
                    className={`mt-2 text-xs font-medium text-center ${
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{
                        width: currentStep > step.id ? "100%" : "0%",
                      }}
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

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <form
                onSubmit={handleSubmit(handleBusinessDetails)}
                className="space-y-6"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Business Information
                  </h2>
                  <p className="text-gray-600">
                    Tell us about your business to get started
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Business Name"
                    placeholder="Your registered business name"
                    {...register("businessName", {
                      required: "Business name is required",
                    })}
                    error={errors.businessName?.message}
                  />

                  <Input
                    label="Business Address"
                    placeholder="Physical business location"
                    {...register("address", {
                      required: "Address is required",
                    })}
                    error={errors.address?.message}
                  />

                  <Input
                    label="Phone Number"
                    placeholder="+234 XXX XXX XXXX"
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^(\+234|0)[789][01]\d{8}$/,
                        message: "Invalid Nigerian phone number",
                      },
                    })}
                    error={errors.phone?.message}
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Bank Account Details
                  </h3>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Account Number"
                        placeholder="10-digit account"
                        maxLength={10}
                        {...register("accountNumber", {
                          required: "Account number is required",
                          pattern: {
                            value: /^\d{10}$/,
                            message: "Must be 10 digits",
                          },
                        })}
                        error={errors.accountNumber?.message}
                      />

                      <Input
                        label="Bank Name"
                        placeholder="Your bank"
                        {...register("bankName", {
                          required: "Bank name is required",
                        })}
                        error={errors.bankName?.message}
                      />
                    </div>

                    <Input
                      label="Account Name"
                      placeholder="As it appears on your account"
                      {...register("accountName", {
                        required: "Account name is required",
                      })}
                      error={errors.accountName?.message}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full group"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Choose Verification Tier */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Choose Your Verification Tier
                </h2>
                <p className="text-gray-600">
                  Select the verification level that fits your business needs
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Standard Tier */}
                <button
                  onClick={() => handleVerificationChoice("nin")}
                  className="group text-left"
                >
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-gray-300 transition-all duration-300 h-full flex flex-col">
                    <div className="mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-gray-700" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Standard
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        NIN Verification
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          ₦5,000
                        </span>
                        <span className="text-sm text-gray-500">one-time</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 flex-grow">
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Quick verification process
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Unlimited product listings
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Access to verified customers
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Standard vendor badge
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 group-hover:bg-gray-100 transition-colors w-full justify-center">
                      Select Standard
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Premium Tier */}
                <button
                  onClick={() => handleVerificationChoice("nin_cac")}
                  className="group text-left relative"
                >
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className="gradient-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" />
                      PRIORITY
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border-2 border-primary p-8 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                    <div className="mb-6">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                        <Star
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-primary mb-1">
                        Premium
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        NIN + CAC Verification
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-primary">
                          ₦10,000
                        </span>
                        <span className="text-sm text-gray-500">one-time</span>
                      </div>
                    </div>

                    {/* Priority Highlight */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                      <p className="text-sm font-semibold text-primary mb-1">
                        Priority Marketplace Placement
                      </p>
                      <p className="text-xs text-gray-600">
                        Your products appear first in search results and
                        category pages
                      </p>
                    </div>

                    <div className="space-y-3 mb-6 flex-grow">
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          All Standard tier benefits
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Enhanced credibility badge
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          3x higher visibility
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-gray-700">
                          Priority customer support
                        </span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-lg text-sm font-medium group-hover:shadow-md transition-all w-full justify-center">
                      Select Premium
                      <Star className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 mb-1">
                    Why Premium?
                  </p>
                  <p className="text-blue-800 leading-relaxed">
                    Premium vendors with CAC verification receive significantly
                    higher marketplace visibility, leading to more sales and
                    customer trust.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: NIN Verification */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {!verificationStatus.nin.verified ? (
                <form
                  onSubmit={handleSubmit(handleNINVerification)}
                  className="space-y-6"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      NIN Verification
                    </h2>
                    <p className="text-gray-600">
                      Verify your identity with your National Identity Number
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Secure & Confidential</p>
                      <p className="text-blue-800">
                        Your NIN is encrypted and used only for identity
                        verification to maintain marketplace trust.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        placeholder="As on your NIN"
                        {...register("firstName", {
                          required: "First name is required",
                          minLength: {
                            value: 2,
                            message: "Must be at least 2 characters",
                          },
                        })}
                        error={errors.firstName?.message}
                      />

                      <Input
                        label="Last Name"
                        placeholder="As on your NIN"
                        {...register("lastName", {
                          required: "Last name is required",
                          minLength: {
                            value: 2,
                            message: "Must be at least 2 characters",
                          },
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
                        pattern: {
                          value: /^\d{11}$/,
                          message: "NIN must be exactly 11 digits",
                        },
                      })}
                      error={errors.nin?.message}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={verificationStatus.nin.loading}
                    disabled={verificationStatus.nin.loading}
                  >
                    {verificationStatus.nin.loading
                      ? "Verifying..."
                      : "Verify NIN"}
                  </Button>
                </form>
              ) : (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    NIN Verified Successfully
                  </h3>
                  <p className="text-gray-600">
                    {verificationType === "nin_cac"
                      ? "Proceeding to CAC verification..."
                      : "Proceeding to payment..."}
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Step 4: CAC Verification (Premium Only) */}
          {currentStep === 4 && verificationType === "nin_cac" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {!verificationStatus.cac.verified ? (
                <form
                  onSubmit={handleSubmit(handleCACVerification)}
                  className="space-y-6"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      CAC Verification
                    </h2>
                    <p className="text-gray-600">
                      Verify your business registration with CAC
                    </p>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary mb-1">
                        Premium Verification
                      </p>
                      <p className="text-gray-700">
                        CAC verification confirms your business is legally
                        registered and gives you priority marketplace placement.
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
                        message:
                          "Invalid CAC format (e.g., BN1234567 or RC123456)",
                      },
                    })}
                    error={errors.cacNumber?.message}
                  />

                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-2">
                      Accepted registration types:
                    </p>
                    <ul className="space-y-1 ml-4 list-disc">
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
                    {verificationStatus.cac.loading
                      ? "Verifying..."
                      : "Verify CAC"}
                  </Button>
                </form>
              ) : (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    CAC Verified Successfully
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-2">
                    <Star className="w-4 h-4" fill="currentColor" />
                    Premium Status Unlocked
                  </div>
                  <p className="text-gray-600">Proceeding to payment...</p>
                </motion.div>
              )}
            </div>
          )}

          {/* Payment Step */}
          {currentStep === getPaymentStep() && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {verificationStatus.payment.processing ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Processing Payment...
                  </h3>
                  <p className="text-gray-600">
                    Please wait while we verify your payment
                  </p>
                </motion.div>
              ) : !verificationStatus.payment.verified ? (
                <div className="space-y-6">
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Registration Fee
                    </h2>
                    <p className="text-gray-600">
                      Complete your vendor registration with a one-time payment
                    </p>
                  </div>

                  {/* Price Card */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      One-time Registration Fee
                    </p>
                    <p className="text-5xl font-bold text-gray-900 mb-2">
                      ₦{verificationType === "nin_cac" ? "10,000" : "5,000"}
                    </p>
                    {verificationType === "nin_cac" && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                        <Star className="w-3.5 h-3.5" fill="currentColor" />
                        Premium Tier
                      </div>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h3 className="font-semibold text-green-900 mb-4">
                      What's Included:
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-green-900">
                          Full vendor dashboard
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-green-900">
                          Unlimited listings
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-green-900">
                          Verified badge
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check
                          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-green-900">
                          Referral earnings
                        </span>
                      </div>
                      {verificationType === "nin_cac" && (
                        <>
                          <div className="flex items-start gap-2">
                            <Star
                              className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                              fill="currentColor"
                            />
                            <span className="text-sm text-primary font-medium">
                              Priority placement
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Star
                              className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                              fill="currentColor"
                            />
                            <span className="text-sm text-primary font-medium">
                              Enhanced badge
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

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
                        Pay ₦
                        {verificationType === "nin_cac" ? "10,000" : "5,000"}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="w-4 h-4" />
                    <span>Secure payment powered by Flutterwave</span>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Payment Successful!
                  </h3>
                  {verificationType === "nin_cac" && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-full font-semibold mb-4">
                      <Star className="w-4 h-4" fill="currentColor" />
                      Premium Vendor Active
                    </div>
                  )}
                  <p className="text-gray-600 mb-4">
                    Redirecting to your dashboard...
                  </p>
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

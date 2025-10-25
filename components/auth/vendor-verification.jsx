"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Building2,
  IdCard,
  Sparkles,
} from "lucide-react";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import toast from "react-hot-toast";

const VERIFICATION_FEE = 5000;

// Step indicator component
const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === index + 1;
          const isCompleted = currentStep > index + 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-500 border-green-500"
                      : isActive
                      ? "bg-linear-to-br from-primary to-accent border-transparent"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <step.icon
                      className={`w-6 h-6 ${
                        isActive ? "text-white" : "text-gray-400"
                      }`}
                    />
                  )}
                </motion.div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isActive || isCompleted ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 bg-gray-200 relative overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: isCompleted ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute h-full bg-linear-to-r from-primary to-accent"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Input component
const Input = ({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  error,
  register,
  required,
  helperText,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-accent">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          {...register}
          className={`w-full ${
            Icon ? "pl-12" : "pl-4"
          } pr-4 py-3.5 rounded-xl border-2 ${
            error
              ? "border-red-300 focus:border-red-500"
              : "border-gray-200 focus:border-primary"
          } focus:outline-none transition-all duration-300 text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300`}
        />
      </div>
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
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

// Button component
const Button = ({
  children,
  variant = "primary",
  isLoading,
  className = "",
  onClick,
  type = "button",
  disabled,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3.5 text-base";
  const variants = {
    primary:
      "bg-linear-to-br from-primary to-accent text-white hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default function VendorVerification({
  userId,
  email,
  referralCode,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationData, setVerificationData] = useState({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const steps = [
    { id: 1, label: "NIN Verification", icon: IdCard },
    { id: 2, label: "CAC Verification", icon: Building2 },
    { id: 3, label: "Payment", icon: CreditCard },
  ];

  // Flutterwave configuration
  const flutterwaveConfig = {
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: `VENDOR_${userId}_${Date.now()}`,
    amount: VERIFICATION_FEE,
    currency: "NGN",
    payment_options: "card,banktransfer,ussd",
    customer: {
      email: email,
      name: verificationData.fullName || "Vendor",
    },
    customizations: {
      title: "CarmelMart Vendor Registration",
      description: "One-time vendor verification fee",
      logo: "https://carmelmart.com/logo.png", // Replace with your actual logo URL
    },
    meta: {
      userId: userId,
      referralCode: referralCode || null,
    },
  };

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig);

  // Step 1: NIN Verification
  const handleNINVerification = async (data) => {
    setIsVerifying(true);

    try {
      const response = await fetch("/api/vendor/verify-nin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ninNumber: data.ninNumber,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("NIN verified successfully!");
        setVerificationData((prev) => ({
          ...prev,
          nin: data.ninNumber,
          ninData: result.data,
          fullName: `${data.firstName} ${data.lastName}`,
        }));
        setCurrentStep(2);
      } else {
        toast.error(result.message || "NIN verification failed");
      }
    } catch (error) {
      toast.error("An error occurred during NIN verification");
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: CAC Verification
  const handleCACVerification = async (data) => {
    setIsVerifying(true);

    try {
      const response = await fetch("/api/vendor/verify-cac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          rcNumber: data.rcNumber,
          companyName: data.companyName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("CAC verified successfully!");
        setVerificationData((prev) => ({
          ...prev,
          cac: data.rcNumber,
          cacData: result.data,
          companyName: data.companyName,
        }));
        setCurrentStep(3);
      } else {
        toast.error(result.message || "CAC verification failed");
      }
    } catch (error) {
      toast.error("An error occurred during CAC verification");
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Payment Processing
  const handlePayment = () => {
    handleFlutterPayment({
      callback: async (response) => {
        console.log("Payment response:", response);
        closePaymentModal();

        if (response.status === "successful") {
          setPaymentStatus("processing");

          try {
            // Verify payment and complete vendor registration
            const verifyResponse = await fetch(
              "/api/vendor/complete-registration",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  transactionId: response.transaction_id,
                  verificationData: {
                    ...verificationData,
                    email,
                  },
                  referralCode: referralCode || null,
                }),
              }
            );

            const result = await verifyResponse.json();

            if (result.success) {
              setPaymentStatus("success");
              toast.success("Payment successful! Welcome to CarmelMart!");

              // Wait a moment before redirecting
              setTimeout(() => {
                onComplete(result.data);
              }, 2000);
            } else {
              setPaymentStatus("failed");
              toast.error(result.message || "Payment verification failed");
            }
          } catch (error) {
            setPaymentStatus("failed");
            toast.error("An error occurred during payment verification");
            console.error(error);
          }
        } else {
          toast.error("Payment was not successful");
        }
      },
      onClose: () => {
        console.log("Payment modal closed");
      },
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-gray-900">
            Vendor Verification
          </span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Complete Your Verification
        </h2>
        <p className="text-gray-600">
          Secure your vendor account with identity and business verification
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={steps} />

      <AnimatePresence mode="wait">
        {/* Step 1: NIN Verification */}
        {currentStep === 1 && (
          <motion.div
            key="nin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <IdCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  National Identity Number (NIN)
                </h3>
                <p className="text-sm text-gray-600">
                  Verify your identity with your NIN from NIMC
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(handleNINVerification)}
              className="space-y-5"
            >
              <Input
                label="First Name"
                type="text"
                placeholder="Enter your first name"
                icon={null}
                register={register("firstName", {
                  required: "First name is required",
                })}
                error={errors.firstName?.message}
                required
              />

              <Input
                label="Last Name"
                type="text"
                placeholder="Enter your last name"
                icon={null}
                register={register("lastName", {
                  required: "Last name is required",
                })}
                error={errors.lastName?.message}
                required
              />

              <Input
                label="NIN Number"
                type="text"
                placeholder="Enter your 11-digit NIN"
                icon={IdCard}
                register={register("ninNumber", {
                  required: "NIN is required",
                  pattern: {
                    value: /^\d{11}$/,
                    message: "NIN must be exactly 11 digits",
                  },
                })}
                error={errors.ninNumber?.message}
                helperText="Your National Identity Number from NIMC"
                required
              />

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Privacy Notice</p>
                    <p className="text-blue-700">
                      Your NIN is used solely for identity verification and is
                      encrypted and stored securely in compliance with data
                      protection regulations.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isVerifying}
              >
                Verify NIN
                <ArrowRight className="w-5 h-5" />
              </Button>
            </form>
          </motion.div>
        )}

        {/* Step 2: CAC Verification */}
        {currentStep === 2 && (
          <motion.div
            key="cac"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  Business Registration (CAC)
                </h3>
                <p className="text-sm text-gray-600">
                  Verify your business registration with CAC
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(handleCACVerification)}
              className="space-y-5"
            >
              <Input
                label="Company Name"
                type="text"
                placeholder="Enter your registered company name"
                icon={null}
                register={register("companyName", {
                  required: "Company name is required",
                })}
                error={errors.companyName?.message}
                required
              />

              <Input
                label="RC Number"
                type="text"
                placeholder="Enter your CAC registration number"
                icon={Building2}
                register={register("rcNumber", {
                  required: "RC number is required",
                  pattern: {
                    value: /^[A-Z0-9]+$/,
                    message: "Invalid RC number format",
                  },
                })}
                error={errors.rcNumber?.message}
                helperText="Your Corporate Affairs Commission registration number"
                required
              />

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Business Verification</p>
                    <p className="text-amber-700">
                      We verify your business details with the Corporate Affairs
                      Commission to ensure legitimacy and build trust with
                      customers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isVerifying}
                >
                  Verify CAC
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {paymentStatus === "success" ? (
              <div className="bg-white rounded-2xl border-2 border-green-200 p-8 shadow-sm text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Registration Complete!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your vendor account has been successfully verified and
                  activated
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to your dashboard...</span>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Complete Your Payment
                      </h3>
                      <p className="text-sm text-gray-600">
                        One-time vendor registration fee
                      </p>
                    </div>
                  </div>

                  {/* Verification Summary */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Identity Verified
                          </p>
                          <p className="text-xs text-gray-600">
                            NIN: {verificationData.nin}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Business Verified
                          </p>
                          <p className="text-xs text-gray-600">
                            RC: {verificationData.cac}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="border-t border-b border-gray-200 py-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Verification Fee</span>
                      <span className="font-semibold text-gray-900">
                        ₦{VERIFICATION_FEE.toLocaleString()}
                      </span>
                    </div>
                    {referralCode && (
                      <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                        <Sparkles className="w-4 h-4" />
                        <span>
                          Referral bonus will be credited to your referrer
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 mb-6">
                    <div className="flex gap-3">
                      <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-900">
                        <p className="font-semibold mb-1">Secure Payment</p>
                        <p className="text-gray-700">
                          Your payment is processed securely by Flutterwave. We
                          never store your card details.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handlePayment}
                      className="flex-1"
                      isLoading={paymentStatus === "processing"}
                    >
                      Pay ₦{VERIFICATION_FEE.toLocaleString()}
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* What You Get */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-4">
                    What's Included:
                  </h4>
                  <div className="space-y-3">
                    {[
                      "Verified vendor badge on your profile",
                      "Access to dashboard and analytics",
                      "Unlimited product listings",
                      "Built-in payment processing",
                      "Customer management tools",
                      "Marketing and promotional tools",
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  CreditCard,
  Shield,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { qoreIdHelpers } from "@/lib/qoreId";
import { paystackHelpers } from "@/lib/paystack";
import { dbHelpers } from "@/lib/supabase";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";
import Card from "@/components/ui/Card";

export default function VendorVerification({ userId, email, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState({
    nin: { verified: false, loading: false },
    cac: { verified: false, loading: false },
    payment: { verified: false, loading: false },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const steps = [
    { id: 1, title: "Business Details", icon: Building2 },
    { id: 2, title: "NIN Verification", icon: Shield },
    { id: 3, title: "CAC Verification", icon: Shield },
    { id: 4, title: "Payment", icon: CreditCard },
  ];

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
      });

      if (error) throw error;

      toast.success("Business details saved!");
      setCurrentStep(2);
    } catch (error) {
      toast.error("Failed to save business details");
      console.error(error);
    }
  };

  // Step 2: NIN Verification
  const handleNINVerification = async (data) => {
    setVerificationStatus((prev) => ({
      ...prev,
      nin: { verified: false, loading: true },
    }));

    try {
      const result = await qoreIdHelpers.verifyNIN(data.nin);

      if (result.success) {
        await dbHelpers.updateVendorProfile(userId, { nin_verified: true });

        setVerificationStatus((prev) => ({
          ...prev,
          nin: { verified: true, loading: false },
        }));

        toast.success("NIN verified successfully!");
        setTimeout(() => setCurrentStep(3), 1500);
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

  // Step 3: CAC Verification
  const handleCACVerification = async (data) => {
    setVerificationStatus((prev) => ({
      ...prev,
      cac: { verified: false, loading: true },
    }));

    try {
      const result = await qoreIdHelpers.verifyCAC(data.cac);

      if (result.success) {
        await dbHelpers.updateVendorProfile(userId, { cac_verified: true });

        setVerificationStatus((prev) => ({
          ...prev,
          cac: { verified: true, loading: false },
        }));

        toast.success("CAC verified successfully!");
        setTimeout(() => setCurrentStep(4), 1500);
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

  // Step 4: Payment
  const handlePayment = async () => {
    const reference = paystackHelpers.generateReference();

    setVerificationStatus((prev) => ({
      ...prev,
      payment: { verified: false, loading: true },
    }));

    // Create payment record
    await dbHelpers.createPayment({
      user_id: userId,
      amount: 5000,
      reference,
      status: "pending",
      type: "vendor_fee",
    });

    paystackHelpers.initializePayment(
      email,
      5000,
      reference,
      async (response) => {
        // Verify payment
        const verifyResult = await paystackHelpers.verifyPayment(
          response.reference
        );

        if (verifyResult.success) {
          await dbHelpers.updatePayment(response.reference, {
            status: "success",
          });
          await dbHelpers.updateVendorProfile(userId, {
            payment_verified: true,
          });

          setVerificationStatus((prev) => ({
            ...prev,
            payment: { verified: true, loading: false },
          }));

          toast.success("Payment successful!");

          setTimeout(() => {
            if (onComplete) onComplete();
          }, 2000);
        } else {
          throw new Error("Payment verification failed");
        }
      },
      () => {
        setVerificationStatus((prev) => ({
          ...prev,
          payment: { verified: false, loading: false },
        }));
        toast.error("Payment cancelled");
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
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
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isCompleted
                        ? "#22c55e"
                        : isActive
                        ? "#560238"
                        : "#e5e7eb",
                    }}
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 shadow-lg
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <Icon
                        className={`w-6 h-6 ${
                          isActive ? "text-white" : "text-gray-400"
                        }`}
                      />
                    )}
                  </motion.div>
                  <p
                    className={`
                    mt-2 text-xs font-semibold text-center
                    ${isActive ? "text-primary" : "text-gray-500"}
                  `}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gray-200 rounded">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: currentStep > step.id ? "100%" : "0%",
                      }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-primary rounded"
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
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8">
            {/* Step 1: Business Details */}
            {currentStep === 1 && (
              <form
                onSubmit={handleSubmit(handleBusinessDetails)}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold text-gray-800">
                    Business Information
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Tell us about your business
                  </p>
                </div>

                <Input
                  label="Business Name"
                  placeholder="Enter your business name"
                  {...register("businessName", {
                    required: "Business name is required",
                  })}
                  error={errors.businessName?.message}
                />

                <Input
                  label="Business Address"
                  placeholder="Enter your business address"
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

                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4">
                    Bank Details
                  </h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Account Number"
                      placeholder="Enter account number"
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
                      placeholder="Select your bank"
                      {...register("bankName", {
                        required: "Bank name is required",
                      })}
                      error={errors.bankName?.message}
                    />
                  </div>

                  <Input
                    label="Account Name"
                    placeholder="Enter account name"
                    className="mt-4"
                    {...register("accountName", {
                      required: "Account name is required",
                    })}
                    error={errors.accountName?.message}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>
            )}

            {/* Step 2: NIN Verification */}
            {currentStep === 2 && (
              <form
                onSubmit={handleSubmit(handleNINVerification)}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold text-gray-800">
                    NIN Verification
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Verify your National Identity Number
                  </p>
                </div>

                {!verificationStatus.nin.verified && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Why we need this:</p>
                        <p>
                          Your NIN helps us verify your identity and maintain a
                          secure marketplace for all users.
                        </p>
                      </div>
                    </div>

                    <Input
                      label="National Identity Number (NIN)"
                      placeholder="Enter your 11-digit NIN"
                      maxLength={11}
                      {...register("nin", {
                        required: "NIN is required",
                        pattern: {
                          value: /^\d{11}$/,
                          message: "NIN must be 11 digits",
                        },
                      })}
                      error={errors.nin?.message}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      isLoading={verificationStatus.nin.loading}
                    >
                      Verify NIN
                    </Button>
                  </>
                )}

                {verificationStatus.nin.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-4" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">
                      NIN Verified!
                    </h4>
                    <p className="text-gray-600">
                      Proceeding to CAC verification...
                    </p>
                  </motion.div>
                )}
              </form>
            )}

            {/* Step 3: CAC Verification */}
            {currentStep === 3 && (
              <form
                onSubmit={handleSubmit(handleCACVerification)}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold text-gray-800">
                    CAC Verification
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Verify your business registration
                  </p>
                </div>

                {!verificationStatus.cac.verified && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Why we need this:</p>
                        <p>
                          CAC verification confirms your business is legally
                          registered in Nigeria.
                        </p>
                      </div>
                    </div>

                    <Input
                      label="CAC Registration Number"
                      placeholder="Enter your CAC number"
                      {...register("cac", {
                        required: "CAC number is required",
                        pattern: {
                          value: /^[A-Z0-9]{7,}$/,
                          message: "Invalid CAC format",
                        },
                      })}
                      error={errors.cac?.message}
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full"
                      isLoading={verificationStatus.cac.loading}
                    >
                      Verify CAC
                    </Button>
                  </>
                )}

                {verificationStatus.cac.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-4" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">
                      CAC Verified!
                    </h4>
                    <p className="text-gray-600">Proceeding to payment...</p>
                  </motion.div>
                )}
              </form>
            )}

            {/* Step 4: Payment */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold text-gray-800">
                    Vendor Registration Fee
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Complete your registration
                  </p>
                </div>

                {!verificationStatus.payment.verified && (
                  <>
                    <Card className="p-6 bg-linear-to-br from-primary to-primary-dark text-white">
                      <div className="text-center">
                        <p className="text-sm opacity-90 mb-2">
                          One-time Registration Fee
                        </p>
                        <p className="text-5xl font-bold mb-2">₦5,000</p>
                        <p className="text-sm opacity-90">
                          Unlock access to thousands of customers
                        </p>
                      </div>
                    </Card>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        What you get:
                      </h4>
                      <ul className="space-y-2 text-sm text-green-800">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Full access to vendor dashboard</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>List unlimited products</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Access to verified customer base</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Referral earnings program</span>
                        </li>
                      </ul>
                    </div>

                    <Button
                      onClick={handlePayment}
                      variant="accent"
                      size="lg"
                      className="w-full"
                      isLoading={verificationStatus.payment.loading}
                    >
                      Pay ₦5,000 Now
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      Secure payment powered by Paystack
                    </p>
                  </>
                )}

                {verificationStatus.payment.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-4" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">
                      Payment Successful!
                    </h4>
                    <p className="text-gray-600 mb-6">
                      Your vendor account is now active
                    </p>
                    <div className="inline-block animate-pulse">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

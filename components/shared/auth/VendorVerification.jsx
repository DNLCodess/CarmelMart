"use client";

import { useState } from "react";
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
  Zap,
  Check,
} from "lucide-react";

import { qoreIdHelpers } from "@/lib/qoreId";
import { flutterwaveHelpers } from "@/lib/flutterwave";
import { dbHelpers } from "@/lib/supabase";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";
import Card from "@/components/ui/Card";

export default function VendorVerification({ userId, email, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationType, setVerificationType] = useState(null); // 'nin' or 'nin_cac'
  const [businessData, setBusinessData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({
    nin: { verified: false, loading: false },
    cac: { verified: false, loading: false },
    payment: { verified: false, loading: false },
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
      { id: 1, title: "Business Details", icon: Building2 },
      { id: 2, title: "Verification Method", icon: Shield },
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

      // Store business data for payment initialization
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

    // Update vendor profile with chosen verification type
    await dbHelpers.updateVendorProfile(userId, {
      verification_type: type,
    });

    toast.success(
      type === "nin_cac"
        ? "Premium verification selected!"
        : "Standard verification selected!"
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

        toast.success("NIN verified successfully!");

        // Proceed to next step based on verification type
        setTimeout(() => {
          if (verificationType === "nin_cac") {
            setCurrentStep(4);
          } else {
            setCurrentStep(4); // Payment for NIN only
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

  // Step 4: CAC Verification (only for nin_cac type)
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

        toast.success("CAC verified successfully!");
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

  // Final Step: Payment
  const handlePayment = async () => {
    const reference = flutterwaveHelpers.generateReference();
    const customerName = businessData?.businessName || email.split("@")[0];

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
      payment_provider: "flutterwave",
    });

    flutterwaveHelpers.initializePayment(
      email,
      5000,
      reference,
      customerName,
      async (response) => {
        // Verify payment with Flutterwave
        const verifyResult = await flutterwaveHelpers.verifyPayment(
          response.transaction_id
        );

        if (verifyResult.success) {
          await dbHelpers.updatePayment(reference, {
            status: "success",
            transaction_id: response.transaction_id,
            flw_ref: response.flw_ref,
          });
          await dbHelpers.updateVendorProfile(userId, {
            payment_verified: true,
            status: "active",
          });

          setVerificationStatus((prev) => ({
            ...prev,
            payment: { verified: true, loading: false },
          }));

          toast.success("Payment successful! Welcome to the platform!");

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

        // Update payment record as cancelled
        dbHelpers.updatePayment(reference, {
          status: "cancelled",
        });
      }
    );
  };

  const getPaymentStep = () => {
    return verificationType === "nin_cac" ? 5 : 4;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-12">
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
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative"
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
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary opacity-20"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </motion.div>
                  <p
                    className={`mt-2 text-xs font-semibold text-center transition-colors ${
                      isActive ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: currentStep > step.id ? "100%" : "0%",
                      }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="h-full gradient-primary"
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
          transition={{ duration: 0.4 }}
        >
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <Card className="p-8 border-2 border-gray-100 shadow-xl">
              <form
                onSubmit={handleSubmit(handleBusinessDetails)}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    Business Information
                  </h3>
                  <p className="text-gray-600">
                    Let's start with your business details
                  </p>
                </div>

                <div className="space-y-5">
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
                </div>

                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Bank Details
                  </h4>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Account Number"
                        placeholder="Enter account number"
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
                  Continue to Verification
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </Card>
          )}

          {/* Step 2: Choose Verification Method */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  Choose Your Verification Path
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Select how you'd like to verify your business identity
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Standard Verification */}
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="p-8 cursor-pointer border-2 border-gray-200 hover:border-primary transition-all duration-300 h-full"
                    onClick={() => handleVerificationChoice("nin")}
                  >
                    <div className="flex flex-col h-full">
                      <div className="mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                          <Shield className="w-7 h-7 text-gray-700" />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">
                          Standard
                        </h4>
                        <p className="text-gray-600 text-sm">
                          NIN Verification Only
                        </p>
                      </div>

                      <div className="space-y-3 mb-6 flex-grow">
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Quick verification process
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Access to marketplace
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Start selling immediately
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full group"
                        onClick={() => handleVerificationChoice("nin")}
                      >
                        Choose Standard
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>

                {/* Premium Verification */}
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-8 cursor-pointer border-2 border-primary relative overflow-hidden h-full">
                    {/* Premium Badge */}
                    <div className="absolute top-0 right-0">
                      <div className="gradient-primary text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        PRIORITY
                      </div>
                    </div>

                    <div className="flex flex-col h-full">
                      <div className="mb-6">
                        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4">
                          <Zap className="w-7 h-7 text-white" />
                        </div>
                        <h4 className="text-2xl font-bold gradient-text mb-2">
                          Premium
                        </h4>
                        <p className="text-gray-600 text-sm">
                          NIN + CAC Verification
                        </p>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-2 mb-2">
                          <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 fill-current" />
                          <p className="text-sm font-semibold text-primary">
                            Higher Priority in Marketplace
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 ml-7">
                          Your products get boosted visibility and appear first
                          in search results
                        </p>
                      </div>

                      <div className="space-y-3 mb-6 flex-grow">
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Everything in Standard
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Enhanced credibility badge
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Priority customer support
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">
                            Featured vendor opportunities
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full group"
                        onClick={() => handleVerificationChoice("nin_cac")}
                      >
                        Choose Premium
                        <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3 max-w-3xl mx-auto">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Why choose Premium?</p>
                  <p className="text-blue-800">
                    Vendors with both NIN and CAC verification receive
                    significantly higher visibility in our marketplace, leading
                    to more sales and customer trust. You can always upgrade
                    later, but starting with Premium gives you an immediate
                    advantage.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: NIN Verification */}
          {currentStep === 3 && (
            <Card className="p-8 border-2 border-gray-100 shadow-xl">
              <form
                onSubmit={handleSubmit(handleNINVerification)}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    NIN Verification
                  </h3>
                  <p className="text-gray-600">
                    Verify your identity with your National Identity Number
                  </p>
                </div>

                {!verificationStatus.nin.verified && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">
                          Secure & Confidential
                        </p>
                        <p className="text-blue-800">
                          Your NIN is used only for identity verification and is
                          stored securely. This helps maintain a trusted
                          marketplace for all users.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-4">
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
                        placeholder="Enter your 11-digit NIN"
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
                  </>
                )}

                {verificationStatus.nin.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-6" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">
                      NIN Verified Successfully!
                    </h4>
                    <p className="text-gray-600">
                      {verificationType === "nin_cac"
                        ? "Proceeding to CAC verification..."
                        : "Proceeding to payment..."}
                    </p>
                  </motion.div>
                )}
              </form>
            </Card>
          )}

          {/* Step 4: CAC Verification (only for nin_cac) */}
          {currentStep === 4 && verificationType === "nin_cac" && (
            <Card className="p-8 border-2 border-gray-100 shadow-xl">
              <form
                onSubmit={handleSubmit(handleCACVerification)}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    CAC Verification
                  </h3>
                  <p className="text-gray-600">
                    Verify your business registration
                  </p>
                </div>

                {!verificationStatus.cac.verified && (
                  <>
                    <div className="bg-linear-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-5 flex gap-3">
                      <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 fill-current" />
                      <div className="text-sm">
                        <p className="font-semibold text-primary mb-1">
                          Premium Verification
                        </p>
                        <p className="text-gray-700">
                          CAC verification confirms your business is legally
                          registered and gives you priority placement in our
                          marketplace.
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
                      <p className="font-semibold text-gray-900 mb-2">
                        Where to find your CAC number:
                      </p>
                      <ul className="space-y-1 ml-4">
                        <li className="list-disc">
                          Business Name Registration Certificate (BN)
                        </li>
                        <li className="list-disc">
                          Certificate of Incorporation (RC for companies)
                        </li>
                        <li className="list-disc">
                          Limited Liability Partnership (LLP)
                        </li>
                        <li className="list-disc">
                          Incorporated Trustees (IT)
                        </li>
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
                  </>
                )}

                {verificationStatus.cac.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-6" />
                    </motion.div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">
                      CAC Verified Successfully!
                    </h4>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full font-semibold mb-4">
                      <Star className="w-4 h-4 fill-current" />
                      Premium Status Unlocked
                    </div>
                    <p className="text-gray-600">Proceeding to payment...</p>
                  </motion.div>
                )}
              </form>
            </Card>
          )}

          {/* Final Step: Payment */}
          {currentStep === getPaymentStep() && (
            <Card className="p-8 border-2 border-gray-100 shadow-xl">
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
                  </motion.div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    Registration Fee
                  </h3>
                  <p className="text-gray-600">
                    Complete your vendor registration
                  </p>
                </div>

                {!verificationStatus.payment.verified && (
                  <>
                    <div className="relative">
                      <Card className="p-8 gradient-primary text-white relative overflow-hidden">
                        <motion.div
                          className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <div className="relative text-center">
                          <p className="text-sm opacity-90 mb-2">
                            One-time Registration Fee
                          </p>
                          <p className="text-6xl font-bold mb-3">₦5,000</p>
                          <p className="text-sm opacity-90">
                            Unlock unlimited earning potential
                          </p>
                        </div>
                      </Card>

                      {verificationType === "nin_cac" && (
                        <div className="absolute -top-3 -right-3">
                          <div className="gradient-accent text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            PREMIUM
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2 text-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        What you get:
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-green-900">
                            Full vendor dashboard access
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-green-900">
                            Unlimited product listings
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-green-900">
                            Verified customer base
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-green-900">
                            Referral earnings program
                          </span>
                        </div>
                        {verificationType === "nin_cac" && (
                          <>
                            <div className="flex items-start gap-2">
                              <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 fill-current" />
                              <span className="text-sm text-primary font-semibold">
                                Priority marketplace placement
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 fill-current" />
                              <span className="text-sm text-primary font-semibold">
                                Enhanced credibility badge
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
                          Pay ₦5,000 Now
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <Shield className="w-4 h-4" />
                      <span>Secure payment powered by Flutterwave</span>
                    </div>
                  </>
                )}

                {verificationStatus.payment.verified && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 mb-6" />
                    </motion.div>
                    <h4 className="text-3xl font-bold text-gray-900 mb-3">
                      Payment Successful!
                    </h4>
                    {verificationType === "nin_cac" && (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-full font-semibold mb-4">
                        <Star className="w-5 h-5 fill-current" />
                        Premium Vendor Status Active
                      </div>
                    )}
                    <p className="text-gray-600 mb-6 text-lg">
                      Welcome to the marketplace!
                    </p>
                    <div className="inline-block">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

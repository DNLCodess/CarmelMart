"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  Shield, AlertCircle, CheckCircle2, Building2, Lock,
} from "lucide-react";
import { qoreIdHelpers } from "@/lib/qoreId";
import { completeFreeTierRegistrationAction } from "@/app/actions/vendor";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

export default function VendorKYCWall({ kycData }) {
  const qc = useQueryClient();

  const needsNin = !kycData.nin_verified;
  const needsCac = kycData.verification_type === "nin_cac" && !kycData.cac_verified;

  // If NIN is already done and only CAC remains, start there
  const [step, setStep] = useState(needsNin ? "nin" : "cac");
  const [ninDone, setNinDone] = useState(!needsNin);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleNINSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await qoreIdHelpers.verifyNIN(data.nin, data.firstName, data.lastName);
      if (!result.success) throw new Error(result.error || "Verification failed");
      toast.success("NIN verified successfully!");
      setNinDone(true);
      if (needsCac) {
        reset();
        setStep("cac");
      } else {
        if (kycData.verification_type === "free") {
          try {
            await completeFreeTierRegistrationAction();
          } catch {
            // non-fatal — dashboard unlocks via nin_verified regardless
          }
        }
        await qc.invalidateQueries({ queryKey: ["vendor-kyc-status"] });
      }
    } catch (err) {
      toast.error(err.message || "NIN verification failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCACSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await qoreIdHelpers.verifyCAC(data.cacNumber);
      if (!result.success) throw new Error(result.error || "Verification failed");
      toast.success("Business verified! Loading your dashboard...");
      await qc.invalidateQueries({ queryKey: ["vendor-kyc-status"] });
    } catch (err) {
      toast.error(err.message || "CAC verification failed. Please check the registration number.");
    } finally {
      setLoading(false);
    }
  };

  const bothRequired = needsNin && needsCac;

  return (
    <div className="flex items-start justify-center min-h-[60vh] pt-10 px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Complete KYC verification to unlock your vendor dashboard. This is a one-time step.
          </p>
        </div>

        {/* Step indicator — only when both NIN and CAC are needed */}
        {bothRequired && (
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              step === "nin" ? "border-primary bg-primary/5 text-primary" : "border-green-300 bg-green-50 text-green-700"
            }`}>
              {ninDone
                ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                : <Shield className="w-4 h-4 shrink-0" />}
              NIN Verification
            </div>
            <div className="w-6 h-0.5 bg-gray-200 shrink-0" />
            <div className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              step === "cac"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 bg-gray-50 text-gray-400"
            }`}>
              <Building2 className="w-4 h-4 shrink-0" />
              CAC Verification
            </div>
          </div>
        )}

        {/* NIN form */}
        {step === "nin" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">NIN Verification</h3>
                <p className="text-xs text-gray-400">National Identity Number</p>
              </div>
            </div>

            <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Your NIN is encrypted and used only for identity verification. It is never stored in plain text.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleNINSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="As on your NIN"
                  {...register("firstName", {
                    required: "Required",
                    minLength: { value: 2, message: "Min 2 characters" },
                  })}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  placeholder="As on your NIN"
                  {...register("lastName", {
                    required: "Required",
                    minLength: { value: 2, message: "Min 2 characters" },
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
                  pattern: { value: /^\d{11}$/, message: "Must be exactly 11 digits" },
                })}
                error={errors.nin?.message}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify NIN"}
              </Button>
            </form>
          </div>
        )}

        {/* CAC form */}
        {step === "cac" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">CAC Verification</h3>
                <p className="text-xs text-gray-400">Business Registration Number</p>
              </div>
            </div>

            {ninDone && (
              <div className="flex gap-3 bg-green-50 border border-green-200 rounded-xl p-3.5 mb-5">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-800 font-medium">
                  NIN verified. One more step — verify your business registration.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(handleCACSubmit)} className="space-y-4">
              <Input
                label="CAC Registration Number"
                placeholder="e.g. BN1234567 or RC123456"
                {...register("cacNumber", {
                  required: "CAC number is required",
                  pattern: {
                    value: /^(BN|RC|IT|LLP)[0-9]{6,}$/i,
                    message: "Invalid format (e.g. BN1234567 or RC123456)",
                  },
                })}
                error={errors.cacNumber?.message}
              />
              <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Accepted formats:</p>
                <p>Business Name (BN) · Registered Company (RC) · Limited Liability Partnership (LLP) · Incorporated Trustees (IT)</p>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={loading}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Business Registration"}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble?{" "}
          <a href="mailto:support@carmelmart.com" className="text-primary hover:underline font-medium">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

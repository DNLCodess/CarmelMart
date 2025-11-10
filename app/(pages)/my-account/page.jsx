"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Gift,
  Copy,
  Check,
  Users,
  Wallet,
  Store,
  Shield,
  ChevronRight,
  LogOut,
  Settings,
  Bell,
  TrendingUp,
  Calendar,
  Package,
  Activity,
} from "lucide-react";
import { supabase, dbHelpers, authHelpers } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";

const StatCard = ({ icon: Icon, label, value, trend, color = "primary" }) => {
  const colorClasses = {
    primary: "from-[#560238]/10 to-[#560238]/5 text-[#560238]",
    accent: "from-[#f49238]/10 to-[#f49238]/5 text-[#f49238]",
    neutral: "from-gray-100 to-gray-50 text-gray-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl bg-white border-2 border-gray-100 p-6 transition-all duration-300 hover:border-[#560238]/20 hover:shadow-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-linear-to-br ${colorClasses[color]} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </motion.div>
  );
};

const InfoRow = ({ icon: Icon, label, value, action }) => (
  <div className="flex items-center justify-between py-4 px-5 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 group-hover:text-[#560238] transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
    {action && action}
  </div>
);

const ReferralCard = ({ referralCode, referralCount, totalEarnings }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#560238] to-[#3d0127] p-8 text-white"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#f49238]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-[#f49238]" />
              <span className="text-sm font-semibold text-white/80 uppercase tracking-wide">
                Your Referral Program
              </span>
            </div>
            <h3 className="text-2xl font-bold">Earn ₦500 per referral</h3>
          </div>
        </div>

        {/* Referral Code Display */}
        <div className="mb-6">
          <label className="text-sm font-medium text-white/70 mb-2 block">
            Your Unique Code
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
              <p className="text-xl font-bold tracking-wider">
                {referralCode || "LOADING..."}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="px-6 py-3 bg-white text-[#560238] rounded-xl font-semibold hover:bg-white/90 transition-all duration-300 flex items-center gap-2 whitespace-nowrap hover:shadow-lg"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#f49238]" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                Total Referrals
              </span>
            </div>
            <p className="text-2xl font-bold">{referralCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#f49238]" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                Total Earned
              </span>
            </div>
            <p className="text-2xl font-bold">
              ₦{totalEarnings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Share Link */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-white/70 mb-2">
            Share your link with friends and earn rewards when they sign up
          </p>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2">
            <p className="text-xs font-mono text-white/60 break-all">
              {`${
                typeof window !== "undefined" ? window.location.origin : ""
              }?ref=${referralCode}`}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick, variant = "default" }) => {
  const variants = {
    default:
      "bg-white hover:bg-gray-50 text-gray-900 border-gray-200 hover:border-gray-300",
    danger:
      "bg-white hover:bg-red-50 text-red-600 border-gray-200 hover:border-red-200",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg group ${variants[variant]}`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          variant === "danger"
            ? "bg-red-50 group-hover:bg-red-100"
            : "bg-gray-50 group-hover:bg-gray-100"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-semibold flex-1 text-left">{label}</span>
      <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </button>
  );
};

export default function MyAccountPage() {
  const { user } = useAuthStore();
  const {
    profile,
    vendorProfile,
    referrals,
    setProfile,
    setVendorProfile,
    setReferrals,
  } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch user profile
        const { data: userProfile, error: profileError } =
          await dbHelpers.getUserProfile(user.id);
        if (profileError) throw profileError;
        setProfile(userProfile);

        // Fetch vendor profile if user is a vendor
        if (userProfile?.role === "vendor") {
          const { data: vendor, error: vendorError } =
            await dbHelpers.getVendorProfile(user.id);
          if (vendorError && vendorError.code !== "PGRST116") {
            throw vendorError;
          }
          setVendorProfile(vendor);
        }

        // Fetch referrals
        const { data: referralData, error: referralError } =
          await dbHelpers.getReferrals(user.id);
        if (referralError) throw referralError;
        setReferrals(referralData || []);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user, setProfile, setVendorProfile, setReferrals]);

  const handleLogout = async () => {
    await authHelpers.signOut();
    window.location.href = "/";
  };
  console.log(`Logged in Profile is`, profile);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#560238]/20 border-t-[#560238] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border-2 border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#560238] text-white rounded-xl font-semibold hover:bg-[#3d0127] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
          <p className="text-gray-600">Please log in to view your account.</p>
        </div>
      </div>
    );
  }

  const referralCount = referrals?.length || 0;
  const totalEarnings = referralCount * 500;
  console.log(vendorProfile);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                My Account
              </h1>
              <p className="text-gray-600">
                Manage your profile and track your activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-[#560238] transition-all border border-gray-200">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={User}
            label="Account Type"
            value={
              profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)
            }
            color="primary"
          />
          <StatCard
            icon={Calendar}
            label="Member Since"
            value={new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
            color="neutral"
          />
          {profile.role === "vendor" && (
            <StatCard
              icon={Store}
              label="Vendor Status"
              value={vendorProfile?.verification_status || "Pending"}
              color="accent"
            />
          )}
          {profile.role === "customer" && (
            <StatCard
              icon={Package}
              label="Total Orders"
              value="0"
              color="accent"
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#560238]" />
                  Profile Information
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <InfoRow
                  icon={User}
                  label="Full Name"
                  value={profile.full_name || "Not provided"}
                />
                <InfoRow
                  icon={Mail}
                  label="Email Address"
                  value={user?.email}
                />
                <InfoRow
                  icon={Phone}
                  label="Phone Number"
                  value={profile.phone || "Not provided"}
                />
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={profile.location || "Not provided"}
                />
              </div>
            </motion.div>

            {/* Vendor-Specific Info */}
            {profile.role === "vendor" && vendorProfile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-[#560238]" />
                    Vendor Details
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  <InfoRow
                    icon={Store}
                    label="Business Name"
                    value={vendorProfile.business_name || "Not provided"}
                  />
                  <InfoRow
                    icon={Shield}
                    label="Verification Tier"
                    value={vendorProfile.verification_tier || "Not verified"}
                  />
                  <InfoRow
                    icon={Activity}
                    label="Verification Status"
                    value={vendorProfile.verification_status || "Pending"}
                    action={
                      vendorProfile.verification_status === "verified" && (
                        <div className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verified
                        </div>
                      )
                    }
                  />
                </div>
              </motion.div>
            )}

            {/* Referral Program */}
            {profile.role === "vendor" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ReferralCard
                  referralCode={profile.referral_code}
                  referralCount={referralCount}
                  totalEarnings={totalEarnings}
                />
              </motion.div>
            )}
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <QuickAction
                  icon={Settings}
                  label="Account Settings"
                  onClick={() => (window.location.href = "/settings")}
                />
                {profile.role === "vendor" && (
                  <QuickAction
                    icon={Store}
                    label="Vendor Dashboard"
                    onClick={() => (window.location.href = "/my-account")}
                  />
                )}
                {profile.role === "customer" && (
                  <QuickAction
                    icon={Package}
                    label="My Orders"
                    onClick={() => (window.location.href = "/orders")}
                  />
                )}
                {profile.role === "vendor" && (
                  <QuickAction
                    icon={Gift}
                    label="Referral History"
                    onClick={() => (window.location.href = "/referrals")}
                  />
                )}

                <QuickAction
                  icon={LogOut}
                  label="Sign Out"
                  onClick={handleLogout}
                  variant="danger"
                />
              </div>
            </motion.div>

            {/* Activity Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 bg-[#560238] rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Account Created
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(profile.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
                {referralCount > 0 && (
                  <div className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 bg-[#f49238] rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {referralCount} Successful Referral
                        {referralCount > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Earned ₦{totalEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Shield, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { authHelpers, dbHelpers } from "@/lib/supabase";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import Button from "@/components/UI/Button";
import toast from "react-hot-toast";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { profile, setProfile } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { user: currentUser } = await authHelpers.getUser();

      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      const { data: profileData } = await dbHelpers.getUserProfile(
        currentUser.id
      );

      if (!profileData || profileData.role !== "admin") {
        toast.error("Access denied - Admin only");
        router.push("/");
        return;
      }

      setProfile(profileData);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/auth/login");
    } finally {
      setIsLoading(false);
    }
    RetryADContinuejavascript;
  };

  const handleLogout = async () => {
    await authHelpers.signOut();
    logout();
    toast.success("Logged out successfully");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">CarmelMart</h1>
                <p className="text-xs text-gray-600">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Settings className="w-5 h-5" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard user={user} />
      </main>
    </div>
  );
}

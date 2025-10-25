"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Settings,
  Bell,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Menu,
  X,
  LogOut,
  Store,
  BarChart3,
  Wallet,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Stat Card Component
const StatCard = ({ title, value, change, icon: Icon, trend }) => {
  const isPositive = trend === "up";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
            isPositive
              ? "from-green-50 to-emerald-50"
              : "from-red-50 to-pink-50"
          } flex items-center justify-center`}
        >
          <Icon
            className={`w-6 h-6 ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          />
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            isPositive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isPositive ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          <span>{change}</span>
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </motion.div>
  );
};

// Quick Action Button
const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  color = "primary",
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-${color} hover:bg-gradient-to-br hover:from-${color}/5 hover:to-${color}/10 transition-all duration-300`}
    >
      <div
        className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}
      >
        <Icon className={`w-5 h-5 text-${color}`} />
      </div>
      <span className="text-sm font-semibold text-gray-900">{label}</span>
    </motion.button>
  );
};

// Recent Order Row
const RecentOrderRow = ({ order }) => {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
          <Package className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{order.id}</p>
          <p className="text-sm text-gray-600">{order.customer}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-semibold text-gray-900">
            ₦{order.amount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">{order.date}</p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            statusColors[order.status]
          }`}
        >
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

// Top Product Card
const TopProductCard = ({ product }) => {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors">
      <img
        src={product.image}
        alt={product.name}
        className="w-16 h-16 rounded-lg object-cover"
      />
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{product.sold} sold</span>
          <span className="text-primary font-semibold">
            ₦{product.revenue.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
          <TrendingUp className="w-4 h-4" />
          <span>{product.growth}%</span>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function VendorDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [vendorData, setVendorData] = useState(null);

  // Mock data - Replace with actual API calls
  const stats = [
    {
      title: "Total Revenue",
      value: "₦2,450,000",
      change: "+12.5%",
      icon: DollarSign,
      trend: "up",
    },
    {
      title: "Total Orders",
      value: "1,248",
      change: "+8.2%",
      icon: ShoppingCart,
      trend: "up",
    },
    {
      title: "Products Listed",
      value: "156",
      change: "+5.1%",
      icon: Package,
      trend: "up",
    },
    {
      title: "Active Customers",
      value: "892",
      change: "+15.3%",
      icon: Users,
      trend: "up",
    },
  ];

  const recentOrders = [
    {
      id: "#ORD-2024-001",
      customer: "Adebayo Johnson",
      amount: 45000,
      date: "2 hours ago",
      status: "pending",
    },
    {
      id: "#ORD-2024-002",
      customer: "Chioma Nwankwo",
      amount: 32000,
      date: "5 hours ago",
      status: "processing",
    },
    {
      id: "#ORD-2024-003",
      customer: "Ibrahim Mohammed",
      amount: 78000,
      date: "1 day ago",
      status: "shipped",
    },
    {
      id: "#ORD-2024-004",
      customer: "Blessing Okon",
      amount: 21000,
      date: "2 days ago",
      status: "delivered",
    },
  ];

  const topProducts = [
    {
      name: "Premium Wireless Earbuds",
      image:
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
      sold: 245,
      revenue: 1225000,
      growth: 23,
    },
    {
      name: "Smart Watch Series 5",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
      sold: 189,
      revenue: 945000,
      growth: 18,
    },
    {
      name: "Laptop Stand Pro",
      image:
        "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200",
      sold: 156,
      revenue: 468000,
      growth: 15,
    },
  ];

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
    { name: "Products", icon: Package, id: "products" },
    { name: "Orders", icon: ShoppingCart, id: "orders" },
    { name: "Customers", icon: Users, id: "customers" },
    { name: "Analytics", icon: BarChart3, id: "analytics" },
    { name: "Wallet", icon: Wallet, id: "wallet" },
    { name: "Referrals", icon: Gift, id: "referrals" },
    { name: "Settings", icon: Settings, id: "settings" },
  ];

  useEffect(() => {
    // Fetch vendor data
    const fetchVendorData = async () => {
      try {
        const response = await fetch("/api/vendor/dashboard");
        const data = await response.json();
        setVendorData(data);
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      }
    };

    fetchVendorData();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        className="fixed lg:relative inset-y-0 left-0 z-50 lg:z-0 lg:w-72 bg-white border-r-2 border-gray-200 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">CarmelMart</h2>
              <p className="text-xs text-gray-600">Vendor Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t-2 border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              JD
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">John Doe</p>
              <p className="text-xs text-gray-600">[email protected]</p>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b-2 border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back! 👋
                </h1>
                <p className="text-sm text-gray-600">
                  Here's what's happening with your store today
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border-2 border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 w-48"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-3 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
              </button>

              {/* Profile */}
              <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                  JD
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon={Plus}
                label="Add Product"
                onClick={() => router.push("/vendor/products/new")}
              />
              <QuickActionButton
                icon={ShoppingCart}
                label="View Orders"
                onClick={() => setActiveTab("orders")}
              />
              <QuickActionButton
                icon={BarChart3}
                label="Analytics"
                onClick={() => setActiveTab("analytics")}
              />
              <QuickActionButton
                icon={Download}
                label="Export Data"
                onClick={() => {}}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Recent Orders
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  View All
                  <ArrowUp className="w-4 h-4 rotate-45" />
                </button>
              </div>
              <div className="space-y-2">
                {recentOrders.map((order, index) => (
                  <RecentOrderRow key={index} order={order} />
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Top Products
              </h3>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <TopProductCard key={index} product={product} />
                ))}
              </div>
            </div>
          </div>

          {/* Referral Program */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border-2 border-primary/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Referral Program
                  </h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Invite other vendors and earn ₦500 for each successful
                  registration!
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-white border-2 border-gray-200">
                    <code className="flex-1 font-mono text-sm font-semibold text-primary">
                      {vendorData?.referralCode || "LOADING..."}
                    </code>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300">
                    Share
                  </button>
                </div>
              </div>
              <div className="hidden lg:block text-center ml-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex flex-col items-center justify-center text-white mb-2">
                  <p className="text-3xl font-bold">
                    {vendorData?.totalReferrals || 0}
                  </p>
                  <p className="text-xs">Referrals</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  ₦{((vendorData?.totalReferrals || 0) * 500).toLocaleString()}{" "}
                  earned
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

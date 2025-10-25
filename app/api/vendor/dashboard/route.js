import { NextResponse } from "next/server";

/**
 * API Route: GET /api/vendor/dashboard
 * Fetches vendor dashboard data including stats, orders, and analytics
 */
export async function GET(request) {
  try {
    // Get vendor ID from session/auth
    // Replace with your actual auth implementation
    const vendorId = await getVendorIdFromSession(request);

    if (!vendorId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch vendor data
    const vendor = await getVendorData(vendorId);

    // Fetch dashboard statistics
    const stats = await getDashboardStats(vendorId);

    // Fetch recent orders
    const recentOrders = await getRecentOrders(vendorId, 10);

    // Fetch top products
    const topProducts = await getTopProducts(vendorId, 5);

    // Fetch referral data
    const referralData = await getReferralData(vendorId);

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          companyName: vendor.companyName,
          referralCode: vendor.referralCode,
          walletBalance: vendor.walletBalance,
          status: vendor.status,
          verificationStatus: vendor.verificationStatus,
        },
        stats,
        recentOrders,
        topProducts,
        referrals: referralData,
      },
    });
  } catch (error) {
    console.error("Dashboard Data Fetch Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get vendor ID from session
 */
async function getVendorIdFromSession(request) {
  // Implement your auth logic here
  // Example using next-auth:
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.id) return null;
  // return session.user.id;

  // For now, return mock ID
  return "vendor_123";
}

/**
 * Get vendor data
 */
async function getVendorData(vendorId) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('vendors')
  //   .select('*')
  //   .eq('id', vendorId)
  //   .single();

  // if (error) throw error;
  // return data;

  // Mock data
  return {
    id: vendorId,
    name: "John Doe",
    email: "[email protected]",
    companyName: "Doe Enterprises Ltd",
    referralCode: "VNDJDOE123",
    walletBalance: 45000,
    status: "active",
    verificationStatus: "verified",
  };
}

/**
 * Get dashboard statistics
 */
async function getDashboardStats(vendorId) {
  // Replace with your actual database queries
  // Example using Supabase:
  // const [revenue, orders, products, customers] = await Promise.all([
  //   getTotalRevenue(vendorId),
  //   getTotalOrders(vendorId),
  //   getTotalProducts(vendorId),
  //   getTotalCustomers(vendorId),
  // ]);

  // Mock data
  return {
    totalRevenue: 2450000,
    revenueChange: 12.5,
    totalOrders: 1248,
    ordersChange: 8.2,
    totalProducts: 156,
    productsChange: 5.1,
    totalCustomers: 892,
    customersChange: 15.3,
  };
}

/**
 * Get recent orders
 */
async function getRecentOrders(vendorId, limit = 10) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('orders')
  //   .select('*, customer:customers(*)')
  //   .eq('vendor_id', vendorId)
  //   .order('created_at', { ascending: false })
  //   .limit(limit);

  // if (error) throw error;
  // return data;

  // Mock data
  return [
    {
      id: "ORD-2024-001",
      customer: { name: "Adebayo Johnson", email: "[email protected]" },
      amount: 45000,
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ORD-2024-002",
      customer: { name: "Chioma Nwankwo", email: "[email protected]" },
      amount: 32000,
      status: "processing",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

/**
 * Get top products
 */
async function getTopProducts(vendorId, limit = 5) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('products')
  //   .select('*, order_items(quantity, price)')
  //   .eq('vendor_id', vendorId)
  //   .order('total_sales', { ascending: false })
  //   .limit(limit);

  // if (error) throw error;
  // return data.map(product => ({
  //   ...product,
  //   totalSold: product.order_items.reduce((sum, item) => sum + item.quantity, 0),
  //   totalRevenue: product.order_items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
  // }));

  // Mock data
  return [
    {
      id: "prod_1",
      name: "Premium Wireless Earbuds",
      image:
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200",
      sold: 245,
      revenue: 1225000,
      growth: 23,
    },
    {
      id: "prod_2",
      name: "Smart Watch Series 5",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200",
      sold: 189,
      revenue: 945000,
      growth: 18,
    },
  ];
}

/**
 * Get referral data
 */
async function getReferralData(vendorId) {
  // Replace with your actual database query
  // Example using Supabase:
  // const { data, error } = await supabase
  //   .from('referrals')
  //   .select('*')
  //   .eq('referrer_id', vendorId);

  // if (error) throw error;
  // return {
  //   totalReferrals: data.length,
  //   totalEarned: data.reduce((sum, ref) => sum + ref.bonus_amount, 0),
  //   referrals: data,
  // };

  // Mock data
  return {
    totalReferrals: 12,
    totalEarned: 6000,
    referrals: [],
  };
}

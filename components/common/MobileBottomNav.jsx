"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Grid3X3, ShoppingCart, Package, User } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/",          icon: Home,        label: "Home"       },
  { href: "/shop",      icon: Grid3X3,     label: "Shop"       },
  { href: "/cart",      icon: ShoppingCart, label: "Cart"      },
  { href: "/orders",    icon: Package,     label: "Orders"     },
  { href: "/my-account", icon: User,       label: "Account"   },
];

export default function MobileBottomNav() {
  const pathname   = usePathname();
  const cartCount  = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { isAuthenticated, isVendor } = useAuth();

  // Build items, swap Account link for vendors
  const items = NAV_ITEMS.map((item) => {
    if (item.label === "Account" && isVendor) {
      return { ...item, href: "/vendor/dashboard", label: "Dashboard" };
    }
    if (item.label === "Account" && !isAuthenticated) {
      return { ...item, href: "/login" };
    }
    return item;
  });

  // Don't show on auth pages
  const isAuthPage = pathname.startsWith("/(auth)") || ["/login", "/register", "/forgot-password", "/verify-email", "/confirm-email", "/register-success"].includes(pathname);
  if (isAuthPage) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const showBadge = label === "Cart" && cartCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                isActive ? "text-primary" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-gray-400"}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

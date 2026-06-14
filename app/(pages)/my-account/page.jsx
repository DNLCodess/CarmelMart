"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  User, Mail, Phone, MapPin, Gift, Copy, Check, Users, Wallet,
  Store, Shield, ChevronRight, LogOut, Settings, Package,
  ShoppingCart, Clock, Truck, CheckCircle, XCircle, RefreshCw,
  Plus, Trash2, Star, Edit2, Home, Activity,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatNigerianPhone } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import toast from "react-hot-toast";
import StateLgaPicker from "@/components/ui/StateLgaPicker";

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchProfile()       { const r = await fetch("/api/customer/profile"); return r.json(); }
async function fetchOrders()        { const r = await fetch("/api/customer/orders");  return r.json(); }

// ── Order status config ───────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: "Pending",   icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200"  },
  confirmed: { label: "Confirmed", icon: CheckCircle,  cls: "bg-blue-50  text-blue-700  border-blue-200"   },
  shipped:   { label: "Shipped",   icon: Truck,        cls: "bg-purple-50 text-purple-700 border-purple-200"},
  delivered: { label: "Delivered", icon: CheckCircle,  cls: "bg-green-50 text-green-700  border-green-200" },
  cancelled: { label: "Cancelled", icon: XCircle,      cls: "bg-red-50   text-red-700    border-red-200"   },
  refunded:  { label: "Refunded",  icon: RefreshCw,    cls: "bg-gray-100 text-gray-600   border-gray-200"  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}


// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ profile }) {
  const qc = useQueryClient();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const { register, handleSubmit, setValue, formState: { isSubmitting, isDirty } } = useForm({
    defaultValues: {
      first_name: profile?.first_name ?? "",
      last_name:  profile?.last_name  ?? "",
      phone:      profile?.phone      ?? "",
      location:   profile?.location   ?? "",
    },
  });

  const { mutate: saveProfile } = useMutation({
    mutationFn: async (data) => {
      const r = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["customer-profile"] });
    },
    onError: (e) => toast.error(e.message || "Failed to update profile. Please try again."),
  });

  return (
    <div className="space-y-5">
      {/* Avatar + name hero */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          <label className="relative group cursor-pointer shrink-0">
            <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-extrabold overflow-hidden">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" sizes="80px" />
              ) : (
                ((profile?.first_name?.[0] ?? profile?.email?.[0]) ?? "?").toUpperCase()
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Edit2 className="w-5 h-5 text-white" />}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
                setAvatarUploading(true);
                try {
                  const fd = new FormData();
                  fd.append("file", file);
                  const r = await fetch("/api/customer/profile/avatar", { method: "POST", body: fd });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.error ?? "Upload failed");
                  toast.success("Photo updated");
                  qc.invalidateQueries({ queryKey: ["customer-profile"] });
                } catch (err) {
                  toast.error(err.message || "Failed to update photo. Please try again.");
                } finally {
                  setAvatarUploading(false);
                }
              }}
            />
          </label>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Your Name"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                profile?.role === "vendor" ? "bg-violet-50 text-violet-700 border border-violet-200" :
                profile?.role === "admin"  ? "bg-red-50 text-red-700 border border-red-200" :
                                             "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Customer"}
              </span>
              <span className="text-xs text-gray-400">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-NG", { month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable profile form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="font-bold text-gray-900">Personal Information</h3>
        <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name</label>
              <input
                {...register("first_name")}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name</label>
              <input
                {...register("last_name")}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input
              value={profile?.email ?? ""}
              disabled
              className="w-full px-4 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Contact support.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
            <input
              {...register("phone")}
              type="tel"
              placeholder="e.g. 08012345678"
              onBlur={(e) => { const v = e.target.value.trim(); if (v) setValue("phone", formatNigerianPhone(v)); }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / State</label>
            <input
              {...register("location")}
              placeholder="e.g. Lagos, Lagos State"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Wallet */}
      <div className="bg-primary rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70 font-semibold">Wallet Balance</p>
            <p className="text-3xl font-extrabold mt-1">₦{(profile?.wallet_balance ?? 0).toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick links */}
      {profile?.role === "vendor" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Vendor Account</h3>
          <Link
            href="/vendor/dashboard"
            className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-primary" />
              <span className="font-semibold text-gray-900">Go to Vendor Dashboard</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchOrders,
    staleTime: 30_000,
    retry: false,
  });

  const orders = data?.orders ?? [];

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900 text-lg mb-2">No orders yet</h3>
        <p className="text-sm text-gray-500 mb-6">Start shopping to see your order history here.</p>
        <Link href="/shop" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
          Browse Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {order.firstImage ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <Image src={order.firstImage} alt={order.firstItem} fill className="object-cover" sizes="56px" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-primary">{order.shortId}</p>
                <p className="text-sm text-gray-700 mt-0.5">{order.firstItem}{order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ""}</p>
                <p className="text-xs text-gray-400 mt-0.5">{order.date}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-extrabold text-gray-900 text-lg">₦{(order.total || 0).toLocaleString()}</p>
              <div className="mt-1"><StatusBadge status={order.status} /></div>
            </div>
          </div>
          {order.deliveryAddress?.city && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Delivering to {order.deliveryAddress.city}{order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Addresses Tab ─────────────────────────────────────────────────────────────
function AddressesTab({ profile }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const addresses = profile?.addresses ?? [];

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm();

  const { mutate: saveAddresses } = useMutation({
    mutationFn: async (newAddresses) => {
      const r = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: newAddresses }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Addresses updated");
      qc.invalidateQueries({ queryKey: ["customer-profile"] });
      setShowForm(false);
      reset();
    },
    onError: (e) => toast.error(e.message || "Failed to save address. Please try again."),
  });

  const handleAdd = (data) => {
    const newAddr = {
      id:                   Date.now().toString(),
      label:                data.label || "Home",
      recipient:            data.recipient,
      phone:                data.phone,
      street:               data.street,
      landmark:             data.landmark,
      city:                 data.city,
      state:                data.state,
      lga:                  data.lga,
      delivery_instructions: data.delivery_instructions,
      is_default:           addresses.length === 0,
    };
    saveAddresses([...addresses, newAddr]);
  };

  const handleDelete = (addrId) => {
    saveAddresses(addresses.filter((a) => a.id !== addrId));
  };

  const handleSetDefault = (addrId) => {
    saveAddresses(addresses.map((a) => ({ ...a, is_default: a.id === addrId })));
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 py-14 text-center">
          <Home className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">No saved addresses</h3>
          <p className="text-sm text-gray-500 mb-5">Add a delivery address to speed up checkout.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>
      )}

      {addresses.map((addr) => (
        <div key={addr.id} className={`bg-white rounded-2xl border p-5 ${addr.is_default ? "border-primary/30" : "border-gray-100"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{addr.label}</p>
                  {addr.is_default && (
                    <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full">Default</span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{addr.recipient}</p>
                <p className="text-sm text-gray-600">{addr.street}</p>
                {addr.landmark && <p className="text-xs text-gray-500">Near: {addr.landmark}</p>}
                <p className="text-sm text-gray-600">{[addr.city, addr.lga, addr.state].filter(Boolean).join(", ")}</p>
                <p className="text-sm text-gray-500 mt-0.5">{addr.phone}</p>
                {addr.delivery_instructions && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-2">
                    Note: {addr.delivery_instructions}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!addr.is_default && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-xs font-semibold text-primary hover:underline px-2 py-1"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add address form */}
      {showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">New Delivery Address</h3>
          <form onSubmit={handleSubmit(handleAdd)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Label</label>
                <select {...register("label")} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option>Home</option>
                  <option>Office</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipient Name <span className="text-red-500">*</span></label>
                <input {...register("recipient", { required: true })} placeholder="Full name" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input {...register("phone", { required: true })} type="tel" placeholder="08012345678" onBlur={(e) => { const v = e.target.value.trim(); if (v) setValue("phone", formatNigerianPhone(v)); }} className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address <span className="text-red-500">*</span></label>
              <input {...register("street", { required: true })} placeholder="House no., street name" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Landmark <span className="text-gray-400 font-normal">— critical for Nigerian delivery</span>
              </label>
              <input {...register("landmark")} placeholder="e.g. Beside First Bank, opposite Total filling station" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City <span className="text-red-500">*</span></label>
              <input {...register("city", { required: true })} placeholder="e.g. Ikeja" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <StateLgaPicker
              stateValue={watch("state") ?? ""}
              lgaValue={watch("lga") ?? ""}
              onStateChange={(v) => { setValue("state", v); setValue("lga", ""); }}
              onLgaChange={(v) => setValue("lga", v)}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Instructions</label>
              <input {...register("delivery_instructions")} placeholder="e.g. Call on arrival, gate is blue, 3rd floor" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 disabled:opacity-60 transition-opacity">
                {isSubmitting ? "Saving…" : "Save Address"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        addresses.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="w-4 h-4" /> Add another address
          </button>
        )
      )}
    </div>
  );
}

// ── Referrals Tab ─────────────────────────────────────────────────────────────
function ReferralsTab({ profile }) {
  const [copied, setCopied] = useState(false);
  const code = profile?.referral_code ?? "—";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referralLink = typeof window !== "undefined" ? `${window.location.origin}?ref=${code}` : "";

  return (
    <div className="space-y-5">
      {/* Main referral card */}
      <div className="bg-primary rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-4 w-36 h-36 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-orange-300" />
            <span className="text-sm font-semibold text-white/80 uppercase tracking-wide">Referral Program</span>
          </div>
          <h2 className="text-2xl font-bold mb-5">Earn ₦500 per referral</h2>

          <div className="mb-5">
            <label className="text-sm text-white/70 mb-2 block">Your Unique Code</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                <p className="text-xl font-bold tracking-widest">{code}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-3 bg-white text-primary text-sm font-bold rounded-xl hover:bg-white/90 transition-all whitespace-nowrap"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-orange-300" />
                <span className="text-xs text-white/70 uppercase tracking-wide font-semibold">Referrals</span>
              </div>
              <p className="text-2xl font-bold">{profile?.referral_count ?? 0}</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Wallet className="w-4 h-4 text-orange-300" />
                <span className="text-xs text-white/70 uppercase tracking-wide font-semibold">Earned</span>
              </div>
              <p className="text-2xl font-bold">₦{(profile?.referral_earnings ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share link */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-bold text-gray-900">Share Your Link</h3>
        <p className="text-sm text-gray-500">When friends sign up with your link and complete their first order, you earn ₦500.</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 min-w-0">
          <p className="text-xs font-mono text-gray-600 truncate flex-1">{referralLink}</p>
          <button onClick={handleCopy} className="shrink-0 text-xs font-bold text-primary hover:underline">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join CarmelMart with my referral code ${code} and get ₦500 off your first order! ${referralLink}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-colors"
          >
            Share via WhatsApp
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-900">How It Works</h3>
        {[
          { step: "1", text: "Share your unique referral code or link with friends" },
          { step: "2", text: "They sign up and complete their first purchase on CarmelMart" },
          { step: "3", text: "You earn ₦500 credited to your wallet automatically" },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
              {step}
            </div>
            <p className="text-sm text-gray-700 pt-0.5">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
const ACTIVITY_ICONS = {
  order:    { icon: ShoppingCart, bg: "bg-blue-100 dark:bg-blue-900/30",   color: "text-blue-600 dark:text-blue-400"   },
  review:   { icon: Star,         bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" },
  referral: { icon: Users,        bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
};

function ActivityTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["customer-activity"],
    queryFn:  () => fetch("/api/customer/activity").then((r) => r.json()),
    staleTime: 60_000,
  });

  const events = data?.events ?? [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
          <Activity className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-700">No activity yet</p>
          <p className="text-sm text-gray-400 mt-1">Your orders, reviews, and referrals will show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
      {events.map((e) => {
        const cfg = ACTIVITY_ICONS[e.type] ?? ACTIVITY_ICONS.order;
        const Icon = cfg.icon;
        const content = (
          <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{e.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{e.subtitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium text-gray-500">{e.date}</p>
              <p className="text-xs text-gray-400">{e.time}</p>
            </div>
          </div>
        );

        return e.href ? (
          <Link key={e.id} href={e.href}>{content}</Link>
        ) : (
          <div key={e.id}>{content}</div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",   label: "Profile",   icon: User        },
  { id: "orders",    label: "Orders",    icon: ShoppingCart },
  { id: "addresses", label: "Addresses", icon: MapPin       },
  { id: "referrals", label: "Referrals", icon: Gift         },
  { id: "activity",  label: "Activity",  icon: Activity     },
];

export default function MyAccountPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { user }    = useAuth();
  const router      = useRouter();
  const qc          = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: fetchProfile,
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });

  const profile = data?.profile ?? null;

  const handleLogout = async () => {
    await logoutAction();
    qc.invalidateQueries({ queryKey: ["auth-user"] });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const CONTENT = {
    profile:   <ProfileTab profile={profile} />,
    orders:    <OrdersTab />,
    addresses: <AddressesTab profile={profile} />,
    referrals: <ReferralsTab profile={profile} />,
    activity:  <ActivityTab />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your profile, orders, and addresses</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="p-2.5 text-gray-500 hover:bg-white hover:text-gray-900 rounded-xl border border-gray-200 transition-colors" title="Settings">
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl border border-gray-200 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-1 justify-center ${
                activeTab === id
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {CONTENT[activeTab]}
        </div>
      </div>
    </div>
  );
}

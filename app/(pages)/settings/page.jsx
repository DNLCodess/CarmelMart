"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, MapPin, Bell, Shield, ChevronRight, Camera,
  Eye, EyeOff, Check, Plus, Trash2, Phone, Mail,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";
import { formatNigerianPhone } from "@/lib/utils";

const TABS = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "addresses",     label: "Addresses",     icon: MapPin },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security",      label: "Security",      icon: Shield },
];

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

// ── sub-tabs ─────────────────────────────────────────────────────────────────

function ProfileTab({ user }) {
  const [form, setForm] = useState({
    fullName: user?.user_metadata?.full_name ?? "",
    phone:    user?.phone ?? "",
    email:    user?.email ?? "",
    location: user?.user_metadata?.location ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // TODO: call updateProfileAction(form)
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center">
            {user?.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="Avatar" width={80} height={80} className="object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">
                {(form.fullName || form.email || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow hover:opacity-90 transition-opacity">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <div>
          <p className="font-bold text-gray-900">{form.fullName || "Your Name"}</p>
          <p className="text-sm text-gray-500">{form.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">Tap the camera to upload a new photo</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Adebayo Johnson"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-sm border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500">+234</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={(e) => { const v = e.target.value.trim(); if (v) setForm((f) => ({ ...f, phone: formatNigerianPhone(v) })); }}
                placeholder="08012345678"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location (City/State)</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Lagos, Lagos State"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddressesTab() {
  const [addresses, setAddresses] = useState([
    {
      id: 1, label: "Home", fullName: "Adebayo Johnson", phone: "08012345678",
      street: "14 Adeola Odeku Street", landmark: "Opposite Access Bank",
      area: "Victoria Island", city: "Lagos", state: "Lagos", isDefault: true,
    },
  ]);
  const [adding, setAdding] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: "", fullName: "", phone: "", street: "", landmark: "", area: "", city: "", state: "Lagos",
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.landmark) {
      toast.error("Street and landmark are required"); return;
    }
    setAddresses((prev) => [...prev, { ...newAddr, id: Date.now(), isDefault: prev.length === 0 }]);
    setNewAddr({ label: "", fullName: "", phone: "", street: "", landmark: "", area: "", city: "", state: "Lagos" });
    setAdding(false);
    toast.success("Address saved");
  };

  const removeAddress = (id) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address removed");
  };

  const setDefault = (id) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success("Default address updated");
  };

  return (
    <div className="space-y-4">
      {addresses.map((addr) => (
        <div key={addr.id} className="bg-gray-50 rounded-2xl p-5 relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-700">
                  {addr.label || "Address"}
                </span>
                {addr.isDefault && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{addr.fullName}</p>
              <p className="text-sm text-gray-600">{addr.street}</p>
              <p className="text-sm text-gray-500">{addr.landmark}</p>
              <p className="text-sm text-gray-600">{[addr.area, addr.city, addr.state].filter(Boolean).join(", ")}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5" /> {addr.phone}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {!addr.isDefault && (
                <button
                  onClick={() => setDefault(addr.id)}
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => removeAddress(addr.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add new address */}
      {adding ? (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-dashed border-primary/40 p-5 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm mb-2">New Address</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="Label (e.g. Home, Work)" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={newAddr.fullName} onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })} placeholder="Recipient name" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="tel" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} onBlur={(e) => { const v = e.target.value.trim(); if (v) setNewAddr((a) => ({ ...a, phone: formatNigerianPhone(v) })); }} placeholder="Phone number" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })} placeholder="Street address *" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" required />
            <input type="text" value={newAddr.landmark} onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })} placeholder="Landmark (e.g. Opp. Access Bank) *" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2" required />
            <input type="text" value={newAddr.area} onChange={(e) => setNewAddr({ ...newAddr, area: e.target.value })} placeholder="Area / Neighbourhood" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} placeholder="City" className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full hover:opacity-90 transition-opacity">
              <Check className="w-4 h-4" /> Save Address
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-5 py-2 text-sm font-semibold border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      )}
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    orderUpdates:  true,
    promotions:    true,
    newArrivals:   false,
    priceDrops:    true,
    reviews:       false,
    newsletter:    true,
    smsAlerts:     true,
    emailDigest:   false,
  });

  const toggle = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    toast.success("Preference updated");
  };

  const items = [
    { key: "orderUpdates",  label: "Order Updates",     desc: "Status changes, dispatch & delivery" },
    { key: "promotions",    label: "Promotions & Deals", desc: "Flash sales, discount codes" },
    { key: "newArrivals",   label: "New Arrivals",       desc: "When vendors list new products" },
    { key: "priceDrops",    label: "Price Drops",        desc: "When wishlisted items go on sale" },
    { key: "reviews",       label: "Review Reminders",   desc: "Prompts to review delivered orders" },
    { key: "newsletter",    label: "Weekly Newsletter",  desc: "CarmelMart updates & highlights" },
    { key: "smsAlerts",     label: "SMS Alerts",         desc: "Delivery notifications via SMS" },
    { key: "emailDigest",   label: "Email Digest",       desc: "Weekly summary of your activity" },
  ];

  return (
    <div className="space-y-1">
      {items.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${prefs[key] ? "bg-primary" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

function SecurityTab() {
  const [form, setForm]       = useState({ current: "", next: "", confirm: "" });
  const [show, setShow]       = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving]   = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) { toast.error("Passwords don't match"); return; }
    if (form.next.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    // TODO: call Supabase updateUser({ password: form.next }) via server action
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setForm({ current: "", next: "", confirm: "" });
    toast.success("Password updated successfully");
  };

  const ToggleIcon = ({ field }) => (
    <button type="button" onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
      {show[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Password change */}
      <div>
        <h3 className="font-bold text-gray-900 mb-5">Change Password</h3>
        <form onSubmit={handleSave} className="space-y-4 max-w-sm">
          {[
            { field: "current", label: "Current Password" },
            { field: "next",    label: "New Password" },
            { field: "confirm", label: "Confirm New Password" },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show[field] ? "text" : "password"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full px-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <ToggleIcon field={field} />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border-t border-gray-100 pt-8">
        <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        <button className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-300 text-red-600 text-sm font-semibold rounded-full hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to manage settings</h2>
          <Link href="/login?next=/settings" className="text-primary font-semibold hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const ActiveComponent = {
    profile:       <ProfileTab user={user} />,
    addresses:     <AddressesTab />,
    notifications: <NotificationsTab />,
    security:      <SecurityTab />,
  }[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/my-account" className="p-2 rounded-full border border-gray-200 text-gray-600 hover:border-primary hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <nav className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-colors ${active ? "bg-primary/5 text-primary border-r-2 border-primary" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <ChevronRight className={`w-4 h-4 ml-auto transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-white rounded-2xl border border-gray-100 p-6"
          >
            <h2 className="font-bold text-gray-900 text-lg mb-6">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            {ActiveComponent}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

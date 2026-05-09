"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown, Store, Mail, Phone, Calendar, MapPin,
  Edit3, Check, X, ExternalLink, RefreshCw, ShieldCheck, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

async function fetchVipVendors() {
  const r = await fetch("/api/admin/vip-vendors");
  if (!r.ok) throw new Error("Failed to load VIP vendors");
  return r.json();
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function VendorCard({ vendor, onSaveNote }) {
  const [editing, setEditing]   = useState(false);
  const [note, setNote]         = useState(vendor.account_note ?? "");
  const [saving, setSaving]     = useState(false);

  const days = daysLeft(vendor.subscription?.expires_at);
  const isExpiringSoon = days !== null && days <= 7;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNote(vendor.id, note);
      setEditing(false);
      toast.success("Note saved");
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const whatsappUrl = vendor.phone
    ? `https://wa.me/${vendor.phone.replace(/\D/g, "").replace(/^0/, "234")}`
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 dark:text-gray-100">{vendor.business_name}</p>
              {vendor.verification_status === "verified" && (
                <ShieldCheck className="w-4 h-4 text-green-500" title="KYC Verified" />
              )}
            </div>
            {(vendor.city || vendor.state) && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {[vendor.city, vendor.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/admin/vendors/${vendor.id}`}
          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors shrink-0"
          title="Full vendor profile"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Subscription status */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
        <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {vendor.subscription?.billing_cycle === "annual" ? "Annual VIP" : "Monthly VIP"}
            {vendor.subscription?.expires_at && ` · Renews ${formatDate(vendor.subscription.expires_at)}`}
          </p>
          {!vendor.subscription && (
            <p className="text-xs text-amber-600 dark:text-amber-400">No active subscription record</p>
          )}
        </div>
        {days !== null && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            isExpiringSoon
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}>
            {days === 0 ? "Expires today" : `${days}d left`}
          </span>
        )}
        {isExpiringSoon && (
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" title="Expiring soon — consider reaching out" />
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`mailto:${vendor.email}`}
          className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary/5 hover:border-primary/20 transition-colors group"
        >
          <Mail className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-primary truncate">
            {vendor.email ?? "No email"}
          </span>
        </a>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20 transition-colors group"
          >
            <Phone className="w-4 h-4 text-gray-400 group-hover:text-green-600 shrink-0" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-green-600 truncate">
              WhatsApp
            </span>
          </a>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 opacity-40">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">No phone</span>
          </div>
        )}
      </div>

      {/* Account manager note */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account Note</p>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs font-bold text-green-600 hover:underline disabled:opacity-50">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setNote(vendor.account_note ?? ""); setEditing(false); }} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:underline">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add notes about this VIP vendor — account manager name, special arrangements, renewal reminders…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
          />
        ) : (
          <p className={`text-sm rounded-xl px-3 py-2 ${
            note
              ? "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50"
              : "text-gray-400 dark:text-gray-500 italic"
          }`}>
            {note || "No notes yet — click Edit to add one"}
          </p>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">VIP since {formatDate(vendor.created_at)}</p>
    </div>
  );
}

export default function VipVendorsPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-vip-vendors"],
    queryFn: fetchVipVendors,
    staleTime: 30_000,
  });

  const saveNote = useMutation({
    mutationFn: ({ vendor_id, note }) =>
      fetch("/api/admin/vip-vendors", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vendor_id, note }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vip-vendors"] }),
  });

  const vendors = data?.vendors ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">VIP Vendors</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage dedicated support, account notes, and quick outreach for VIP-tier vendors.
          </p>
        </div>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-full">
          {isLoading ? "—" : vendors.length} VIP vendor{vendors.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Expiring soon banner */}
      {!isLoading && vendors.some((v) => {
        const d = daysLeft(v.subscription?.expires_at);
        return d !== null && d <= 7;
      }) && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Subscriptions expiring soon</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              One or more VIP vendors have subscriptions expiring within 7 days. Reach out now to retain them.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" /> Failed to load VIP vendors. Please refresh.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && vendors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Crown className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-4" />
          <p className="font-semibold text-gray-500 dark:text-gray-400">No VIP vendors yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Vendors who upgrade to the VIP plan will appear here.
          </p>
        </div>
      )}

      {/* Vendor cards */}
      {!isLoading && vendors.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              onSaveNote={(vendor_id, note) => saveNote.mutateAsync({ vendor_id, note })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

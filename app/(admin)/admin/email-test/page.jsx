"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Send, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";

const TEST_RECIPIENTS = ["aboderindaniel482@gmail.com", "dnlcodes4@gmail.com"];

const EMAIL_GROUPS = [
  {
    group: "Customer Emails",
    description: "Sent to shoppers via Resend API",
    color: "blue",
    emails: [
      { type: "order_confirmation",       label: "Order Confirmation",        desc: "Sent when a customer places an order" },
      { type: "order_status_confirmed",   label: "Order Status — Confirmed",  desc: "Vendor confirms the order" },
      { type: "order_status_processing",  label: "Order Status — Processing", desc: "Vendor starts preparing the order" },
      { type: "order_status_shipped",     label: "Order Status — Shipped",    desc: "Order dispatched for delivery" },
      { type: "order_status_delivered",   label: "Order Status — Delivered",  desc: "Order marked as delivered" },
      { type: "receipt_confirmed",        label: "Receipt Confirmed",         desc: "Customer confirms they received the order" },
      { type: "order_cancelled_customer", label: "Order Cancelled + Refund",  desc: "Order cancelled, wallet refund issued" },
    ],
  },
  {
    group: "Vendor Emails",
    description: "Sent to vendors via Resend API",
    color: "amber",
    emails: [
      { type: "vendor_new_order",         label: "New Order Received",        desc: "Vendor gets a new order to fulfill" },
      { type: "vendor_order_delivered",   label: "Delivery Confirmed",        desc: "Customer confirmed receipt of vendor's order" },
      { type: "vendor_order_cancelled",   label: "Order Cancelled",           desc: "An order with vendor items was cancelled" },
      { type: "vendor_kyc_approved",      label: "KYC Approved",              desc: "Admin approved the vendor's KYC application" },
      { type: "vendor_kyc_rejected",      label: "KYC Rejected",              desc: "Admin rejected KYC with reason" },
      { type: "vendor_payout",            label: "Payout Processed",          desc: "Vendor withdrawal completed" },
      { type: "vendor_welcome",           label: "Vendor Welcome",            desc: "Sent after vendor registration is complete" },
      { type: "vendor_product_approved",  label: "Product Approved",          desc: "Admin approved a product listing" },
      { type: "vendor_product_rejected",  label: "Product Rejected",          desc: "Admin rejected a product listing with reason" },
    ],
  },
  {
    group: "Admin Emails",
    description: "Sent to admin via Resend API",
    color: "red",
    emails: [
      { type: "admin_new_vendor",         label: "New Vendor Registration",   desc: "A vendor completed registration and needs review" },
      { type: "admin_new_dispute",        label: "New Dispute Filed",         desc: "A customer filed a dispute on an order" },
    ],
  },
  {
    group: "Auth Emails",
    description: "Sent via Resend API directly",
    color: "green",
    emails: [
      { type: "auth_signup",              label: "Email Confirmation",        desc: "Sent when a new account is created" },
      { type: "auth_recovery",            label: "Password Reset OTP",        desc: "6-digit OTP for password reset" },
      { type: "auth_magiclink",           label: "Magic Link Sign-In",        desc: "Passwordless login link" },
      { type: "auth_email_change",        label: "Email Change Confirmation", desc: "Confirm an email address change" },
      { type: "auth_vendor_activated",    label: "Vendor Store Live",         desc: "Sent when vendor KYC + payment complete" },
      { type: "auth_reauthentication",    label: "Re-authentication OTP",     desc: "Confirm sensitive account action" },
      { type: "auth_invite",              label: "Admin Invitation",          desc: "Invite a user to the platform" },
    ],
  },
];

const GROUP_COLORS = {
  blue:  { header: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",    dot: "bg-blue-500"  },
  amber: { header: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  red:   { header: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",          dot: "bg-red-500"   },
  green: { header: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", dot: "bg-green-500" },
};

async function sendTest(type) {
  const r = await fetch("/api/admin/test-email", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ type }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed");
  return d;
}

function StatusIcon({ status }) {
  if (status === "sending") return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  if (status === "ok")      return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "error")   return <XCircle className="w-4 h-4 text-red-500" />;
  return null;
}

export default function EmailTestPage() {
  const [statuses,   setStatuses]   = useState({});
  const [sendingAll, setSendingAll] = useState(false);

  const setStatus = (type, status) => setStatuses((prev) => ({ ...prev, [type]: status }));

  const handleSend = async (type) => {
    setStatus(type, "sending");
    try {
      await sendTest(type);
      setStatus(type, "ok");
      toast.success(`Sent: ${type.replace(/_/g, " ")}`);
    } catch (e) {
      setStatus(type, "error");
      toast.error(e.message);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    const allTypes = EMAIL_GROUPS.flatMap((g) => g.emails.map((e) => e.type));
    allTypes.forEach((type) => setStatus(type, "sending"));
    await Promise.allSettled(
      allTypes.map((type) =>
        sendTest(type)
          .then(() => setStatus(type, "ok"))
          .catch(() => setStatus(type, "error"))
      )
    );
    setSendingAll(false);
    toast.success("All test emails sent!");
  };

  const totalTypes = EMAIL_GROUPS.flatMap((g) => g.emails).length;
  const sentCount  = Object.values(statuses).filter((s) => s === "ok").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Email Test Lab</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All emails send to:{" "}
            {TEST_RECIPIENTS.map((r, i) => (
              <span key={r}>
                <span className="font-medium text-gray-700 dark:text-gray-300">{r}</span>
                {i < TEST_RECIPIENTS.length - 1 && <span className="text-gray-400"> &amp; </span>}
              </span>
            ))}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {sentCount > 0 && (
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {sentCount}/{totalTypes} sent
            </span>
          )}
          <button
            onClick={handleSendAll}
            disabled={sendingAll}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
          >
            {sendingAll
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending all…</>
              : <><Send className="w-4 h-4" /> Send All ({totalTypes})</>
            }
          </button>
        </div>
      </div>

      {/* Groups */}
      {EMAIL_GROUPS.map(({ group, description, color, emails }) => {
        const cfg = GROUP_COLORS[color];
        return (
          <div key={group} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 ${cfg.header}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <div>
                <span className="text-sm font-bold">{group}</span>
                <span className="text-xs ml-2 opacity-70">{description}</span>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
              {emails.map(({ type, label, desc }) => {
                const status = statuses[type];
                return (
                  <div key={type} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/40 dark:hover:bg-gray-700/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${status === "ok" ? "text-green-700 dark:text-green-400" : status === "error" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                        {label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <StatusIcon status={status} />
                      <button
                        onClick={() => handleSend(type)}
                        disabled={status === "sending" || sendingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 rounded-lg transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

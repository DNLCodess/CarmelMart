"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Truck, MessageCircle, Mail, RefreshCw,
  X, ChevronDown, Search, Check, AlertCircle, Loader2,
  Package, User, MapPin, Phone, Clock, ExternalLink,
  CheckCircle2, Circle, ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchOrders(params) {
  const r = await fetch(`/api/logistics/orders?${params}`);
  if (!r.ok) throw new Error("Failed to fetch orders");
  return r.json();
}

async function fetchPartners() {
  const r = await fetch("/api/admin/logistics-partners?active=true");
  if (!r.ok) return { partners: [] };
  return r.json();
}

async function fetchOrderDetail(orderId) {
  const r = await fetch(`/api/logistics/orders/${orderId}`);
  if (!r.ok) throw new Error("Failed to load order");
  return r.json();
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:    { label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"    },
  confirmed:  { label: "Confirmed",  cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"        },
  processing: { label: "Processing", cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800" },
  shipped:    { label: "Shipped",    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"  },
  delivered:  { label: "Delivered",  cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"    },
  cancelled:  { label: "Cancelled",  cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"               },
  refunded:   { label: "Refunded",   cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"           },
};

const DELIVERY_STEPS = [
  { status: "confirmed",  label: "Confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped",    label: "Shipped" },
  { status: "delivered",  label: "Delivered" },
];

const STATUS_NEXT = {
  pending:    "confirmed",
  confirmed:  "processing",
  processing: "shipped",
  shipped:    "delivered",
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ── Order detail drawer ───────────────────────────────────────────────────────

function OrderDrawer({ orderId, partners, onClose }) {
  const qc = useQueryClient();
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [showRefundForm, setShowRefundForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["logistics-order-detail", orderId],
    queryFn: () => fetchOrderDetail(orderId),
    staleTime: 10_000,
    retry: false,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ partner_id }) => {
      const r = await fetch(`/api/logistics/orders/${orderId}/assign`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ partner_id, send_email: sendEmail }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Assignment failed");
      return d;
    },
    onSuccess: (res) => {
      toast.success("Partner assigned successfully!");
      qc.invalidateQueries({ queryKey: ["logistics-orders"] });
      qc.invalidateQueries({ queryKey: ["logistics-order-detail", orderId] });
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const r = await fetch(`/api/logistics/orders/${orderId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Status update failed");
      return d;
    },
    onSuccess: (_, newStatus) => {
      toast.success(`Order marked as ${newStatus}`);
      qc.invalidateQueries({ queryKey: ["logistics-orders"] });
      qc.invalidateQueries({ queryKey: ["logistics-order-detail", orderId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const refundRequestMutation = useMutation({
    mutationFn: async ({ amount, reason }) => {
      const r = await fetch("/api/logistics/auth-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          operation_type: "refund",
          operation_data: {
            order_id:    orderId,
            customer_id: data?.order?.customer_id,
            amount:      Number(amount),
            reason,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Request failed");
      return d;
    },
    onSuccess: () => {
      toast.success("Refund request submitted — awaiting super admin approval.");
      setShowRefundForm(false);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleWhatsApp = (assignment) => {
    if (!assignment?.partner) return;
    const order = data?.order ?? {};
    const addr  = order.delivery_address ?? {};
    const shortId = order.shortId ?? `#CM-${orderId.slice(0, 8).toUpperCase()}`;
    const itemLines = (data?.items ?? [])
      .map((it) => `• ${it.name} ×${it.quantity} (₦${(it.unit_price * it.quantity).toLocaleString("en-NG")})`)
      .join("\n");

    const msg = [
      `🚚 *CarmelMart Delivery Assignment*`,
      ``,
      `*Order:* ${shortId}`,
      `*Customer:* ${addr.fullName ?? "—"}`,
      `*Phone:* ${addr.phone ?? "—"}`,
      `*Address:* ${[addr.houseNumber, addr.street].filter(Boolean).join(" ") || "—"}`,
      addr.area ? `*Area:* ${addr.area}` : null,
      `*City:* ${addr.city ?? "—"}, ${addr.state ?? ""}`,
      addr.landmark ? `*Landmark:* ${addr.landmark}` : null,
      ``,
      `*Items:*`,
      itemLines,
      ``,
      `*Total:* ₦${(order.total ?? 0).toLocaleString("en-NG")}`,
      `*Payment:* ${order.payment_method === "pod" ? "⚠️ Pay on Delivery" : "✅ Paid online"}`,
      ``,
      `Please confirm receipt and update on pickup & delivery.`,
      `- CarmelMart Logistics`,
    ].filter((l) => l !== null).join("\n");

    let phone = assignment.partner.phone.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "234" + phone.slice(1);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <DrawerShell onClose={onClose} title="Loading…">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </DrawerShell>
    );
  }

  if (error || !data) {
    return (
      <DrawerShell onClose={onClose} title="Error">
        <div className="flex items-center gap-3 text-red-600 p-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Failed to load order details.</p>
        </div>
      </DrawerShell>
    );
  }

  const { order, customer, items, assignment } = data;
  const addr = order.delivery_address ?? {};
  const nextStatus = STATUS_NEXT[order.status];
  const isTerminal = ["delivered", "cancelled", "refunded"].includes(order.status);
  const currentStepIdx = DELIVERY_STEPS.findIndex((s) => s.status === order.status);

  return (
    <DrawerShell onClose={onClose} title={order.shortId ?? `#CM-${orderId.slice(0, 8).toUpperCase()}`}>
      <div className="space-y-5">

        {/* Status + progress */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ₦{(order.total ?? 0).toLocaleString()} ·{" "}
              {order.payment_method === "pod" ? "Pay on Delivery" : "Paid Online"}
            </span>
          </div>

          {/* Delivery progress bar */}
          <div className="flex items-center gap-0.5">
            {DELIVERY_STEPS.map((step, i) => {
              const done    = currentStepIdx >= i;
              const current = currentStepIdx === i;
              return (
                <div key={step.status} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full h-1.5 rounded-full ${i === 0 ? "rounded-l-full" : ""} ${i === DELIVERY_STEPS.length - 1 ? "rounded-r-full" : ""} ${done ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                  <span className={`text-[10px] font-semibold ${current ? "text-emerald-600 dark:text-emerald-400" : done ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-600"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer + address */}
        <Section title="Customer" icon={User}>
          <InfoRow label="Name" value={[customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || addr.fullName || "—"} />
          <InfoRow label="Email" value={customer?.email ?? "—"} />
          <InfoRow label="Phone" value={addr.phone ?? customer?.phone ?? "—"} />
        </Section>

        <Section title="Delivery Address" icon={MapPin}>
          <InfoRow label="Address" value={[addr.houseNumber, addr.street].filter(Boolean).join(" ") || "—"} />
          {addr.area && <InfoRow label="Area" value={addr.area} />}
          <InfoRow label="City / LGA" value={[addr.city, addr.lga].filter(Boolean).join(", ") || "—"} />
          <InfoRow label="State" value={addr.state ?? "—"} />
          {addr.landmark && <InfoRow label="Landmark" value={addr.landmark} />}
          {addr.delivery_instructions && (
            <InfoRow label="Instructions" value={addr.delivery_instructions} />
          )}
        </Section>

        {/* Items */}
        <Section title="Items" icon={Package}>
          <div className="space-y-2 mt-1">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {it.name} <span className="text-gray-400">×{it.quantity}</span>
                  </p>
                  {it.vendor && (
                    <p className="text-xs text-gray-400">Vendor: {it.vendor.business_name}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 shrink-0">
                  ₦{(it.unit_price * it.quantity).toLocaleString("en-NG")}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Logistics assignment */}
        <Section title="Logistics Partner" icon={Truck}>
          {assignment?.partner ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{assignment.partner.name}</p>
                  {assignment.partner.contact_name && (
                    <p className="text-xs text-gray-500">{assignment.partner.contact_name}</p>
                  )}
                  <p className="text-xs text-gray-400">{assignment.partner.phone}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleWhatsApp(assignment)}
                    className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors"
                    title="Send WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                {assignment.whatsapp_sent && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp sent
                  </span>
                )}
                {assignment.email_sent && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Email sent
                  </span>
                )}
                {assignment.pickup_confirmed_at && (
                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pickup confirmed
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No partner assigned yet.</p>
          )}

          {/* Assign / reassign form */}
          {!isTerminal && (
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {assignment?.partner ? "Reassign partner" : "Assign partner"}
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                <option value="">— Select partner —</option>
                {(partners ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Send email to partner
              </label>
              <button
                onClick={() => assignMutation.mutate({ partner_id: selectedPartnerId })}
                disabled={!selectedPartnerId || assignMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {assignMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    {assignment?.partner ? "Reassign & Notify" : "Assign & Notify"}
                  </>
                )}
              </button>
            </div>
          )}
        </Section>

        {/* Status actions */}
        {!isTerminal && nextStatus && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Update Status
            </p>
            <button
              onClick={() => statusMutation.mutate(nextStatus)}
              disabled={statusMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
            >
              {statusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Mark as {STATUS_CFG[nextStatus]?.label ?? nextStatus}
                </>
              )}
            </button>
          </div>
        )}

        {/* Refund request (logistics admin escalation) */}
        {!["refunded", "cancelled"].includes(order.status) && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            {!showRefundForm ? (
              <button
                onClick={() => setShowRefundForm(true)}
                className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <ShieldAlert className="w-4 h-4" />
                Request Refund Authorization
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Refunds require super admin approval. Your request will be queued for review.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Refund amount (₦) — max ₦{(order.total ?? 0).toLocaleString()}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={order.total}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Reason
                  </label>
                  <input
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Item not delivered, damaged goods"
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRefundForm(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => refundRequestMutation.mutate({ amount: refundAmount, reason: refundReason })}
                    disabled={!refundAmount || Number(refundAmount) <= 0 || refundRequestMutation.isPending}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {refundRequestMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : "Submit Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ── Drawer shell ──────────────────────────────────────────────────────────────

function DrawerShell({ children, title, onClose }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
          <p className="font-extrabold text-gray-900 dark:text-gray-100">{title}</p>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 px-5 py-4">{children}</div>
      </motion.aside>
    </>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="text-xs text-gray-400 dark:text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1 min-w-0 break-words">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "",           label: "All"        },
  { value: "pending",    label: "Pending"    },
  { value: "confirmed",  label: "Confirmed"  },
  { value: "processing", label: "Processing" },
  { value: "shipped",    label: "Shipped"    },
  { value: "delivered",  label: "Delivered"  },
];

const ASSIGNED_TABS = [
  { value: "",    label: "All"         },
  { value: "no",  label: "Unassigned"  },
  { value: "yes", label: "Assigned"    },
];

export default function LogisticsOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter,   setStatusFilter]   = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [openOrderId,    setOpenOrderId]    = useState(null);

  const params = new URLSearchParams({ page });
  if (statusFilter)   params.set("status", statusFilter);
  if (assignedFilter) params.set("assigned", assignedFilter);
  if (search)         params.set("search", search);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["logistics-orders", statusFilter, assignedFilter, search, page],
    queryFn:  () => fetchOrders(params.toString()),
    staleTime: 30_000,
    retry:    false,
  });

  const { data: partnersData } = useQuery({
    queryKey: ["logistics-partners-active"],
    queryFn:  fetchPartners,
    staleTime: 300_000,
  });

  const orders   = data?.orders  ?? [];
  const pages    = data?.pages   ?? 1;
  const total    = data?.total   ?? 0;
  const partners = partnersData?.partners ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total.toLocaleString()} total orders · {partners.length} active partner{partners.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order, customer, phone…"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === value
                  ? "bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Assignment filter */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {ASSIGNED_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setAssignedFilter(value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                assignedFilter === value
                  ? "bg-white dark:bg-gray-600 text-emerald-700 dark:text-emerald-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="font-semibold text-gray-400 dark:text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {["Order ID", "Customer", "Amount", "Status", "Partner", "City", "Date", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenOrderId(o.id)}
                    className="hover:bg-gray-50/60 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{o.shortId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{o.customer.name}</p>
                      {o.customer.phone && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{o.customer.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900 dark:text-gray-100">
                      ₦{(o.total ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-4">
                      {o.assignment?.partner ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{o.assignment.partner.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {o.assignment.email_sent && (
                              <span title="Email sent" className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            )}
                            {o.assignment.whatsapp_sent && (
                              <span title="WhatsApp sent" className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{o.city}</td>
                    <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">{o.date}</td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        View →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Page {page} of {pages} · {total.toLocaleString()} orders
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail drawer */}
      <AnimatePresence>
        {openOrderId && (
          <OrderDrawer
            key={openOrderId}
            orderId={openOrderId}
            partners={partners}
            onClose={() => setOpenOrderId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

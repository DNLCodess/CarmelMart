"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Plus, Pencil, Trash2, X, Loader2, AlertCircle,
  Phone, Mail, User, CheckCircle2, XCircle, RefreshCw,
  MessageCircle, ToggleLeft, ToggleRight,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Data fetching ─────────────────────────────────────────────────────────────

const fetchPartners = () =>
  fetch("/api/admin/logistics-partners").then((r) => r.json());

// ── Partner form modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:         "",
  contact_name: "",
  phone:        "",
  email:        "",
  description:  "",
};

function PartnerModal({ partner, onClose, onSave, saving }) {
  const isEdit = !!partner?.id;
  const [form, setForm] = useState(
    isEdit
      ? {
          name:         partner.name         ?? "",
          contact_name: partner.contact_name ?? "",
          phone:        partner.phone        ?? "",
          email:        partner.email        ?? "",
          description:  partner.description  ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Partner name is required.";
    if (!form.phone.trim()) errs.phone = "Phone / WhatsApp number is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, id: partner?.id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? "Edit Partner" : "Add Logistics Partner"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner name */}
          <Field label="Partner / Company Name *" error={errors.name}>
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Lagos Express Riders"
              className={inputCls(errors.name)}
            />
          </Field>

          {/* Contact person */}
          <Field label="Contact Person">
            <input
              value={form.contact_name}
              onChange={set("contact_name")}
              placeholder="e.g. Adewale Ogundipe"
              className={inputCls()}
            />
          </Field>

          {/* WhatsApp / phone */}
          <Field label="WhatsApp / Phone Number *" error={errors.phone}>
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="e.g. 08012345678 or +2348012345678"
              className={inputCls(errors.phone)}
            />
          </Field>

          {/* Email */}
          <Field label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="rider@partner.com"
              className={inputCls()}
            />
          </Field>

          {/* Notes */}
          <Field label="Description / Coverage Notes">
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              placeholder="e.g. Covers Lagos Island & Mainland. Fast delivery within 4 hours."
              className={`${inputCls()} resize-none`}
            />
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save Changes" : "Add Partner"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteModal({ partner, onClose, onConfirm, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Remove Partner</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Remove <strong>{partner.name}</strong>? If this partner has order history, they will be deactivated instead of deleted to preserve records.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Partner card ──────────────────────────────────────────────────────────────

function PartnerCard({ partner, onEdit, onDelete, onToggle, toggling }) {
  const waPhone = (() => {
    let p = partner.phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = "234" + p.slice(1);
    return p;
  })();

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border ${
        partner.active
          ? "border-gray-100 dark:border-gray-700"
          : "border-red-100 dark:border-red-900/40 opacity-70"
      } p-5 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${partner.active ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
            <Truck className={`w-5 h-5 ${partner.active ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{partner.name}</p>
            {partner.contact_name && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{partner.contact_name}</p>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
          partner.active
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}>
          {partner.active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{partner.phone}</span>
        </div>
        {partner.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{partner.email}</span>
          </div>
        )}
        {partner.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-2">{partner.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-50 dark:border-gray-700 pt-3">
        <a
          href={`https://wa.me/${waPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:underline"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Toggle active */}
          <button
            onClick={() => onToggle(partner)}
            disabled={toggling === partner.id}
            title={partner.active ? "Deactivate" : "Activate"}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            {toggling === partner.id
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : partner.active
              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
              : <ToggleLeft className="w-4 h-4" />}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(partner)}
            title="Edit"
            className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(partner)}
            title="Remove"
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(error) {
  return `w-full px-4 py-2.5 text-sm border ${
    error
      ? "border-red-300 dark:border-red-700 focus:ring-red-300/30"
      : "border-gray-200 dark:border-gray-600 focus:ring-emerald-400/30"
  } rounded-xl focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLogisticsPartnersPage() {
  const qc = useQueryClient();
  const [editPartner,   setEditPartner]   = useState(null);
  const [deletePartner, setDeletePartner] = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [toggling,      setToggling]      = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logistics-partners"],
    queryFn:  fetchPartners,
    staleTime: 30_000,
    retry:    false,
  });

  const partners = data?.partners ?? [];
  const active   = partners.filter((p) => p.active).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-logistics-partners"] });

  const createMutation = useMutation({
    mutationFn: (form) =>
      fetch("/api/admin/logistics-partners", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Create failed");
        return d;
      }),
    onSuccess: () => { toast.success("Partner added!"); setShowCreate(false); invalidate(); },
    onError:   (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...form }) =>
      fetch(`/api/admin/logistics-partners/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Update failed");
        return d;
      }),
    onSuccess: () => { toast.success("Partner updated!"); setEditPartner(null); invalidate(); },
    onError:   (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      fetch(`/api/admin/logistics-partners/${id}`, { method: "DELETE" }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Delete failed");
        return d;
      }),
    onSuccess: (res) => {
      toast.success(res.deactivated ? "Partner deactivated (has order history)." : "Partner removed.");
      setDeletePartner(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleToggle = async (partner) => {
    setToggling(partner.id);
    try {
      const r = await fetch(`/api/admin/logistics-partners/${partner.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ active: !partner.active }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Toggle failed");
      toast.success(`Partner ${!partner.active ? "activated" : "deactivated"}.`);
      invalidate();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Logistics Partners</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {partners.length} partner{partners.length !== 1 ? "s" : ""} · {active} active
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Truck className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">No logistics partners yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Add your first logistics partner to start assigning deliveries.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Add Partner
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onEdit={setEditPartner}
              onDelete={setDeletePartner}
              onToggle={handleToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <PartnerModal
            key="create"
            partner={null}
            onClose={() => setShowCreate(false)}
            onSave={(form) => createMutation.mutate(form)}
            saving={createMutation.isPending}
          />
        )}
        {editPartner && (
          <PartnerModal
            key="edit"
            partner={editPartner}
            onClose={() => setEditPartner(null)}
            onSave={(form) => updateMutation.mutate(form)}
            saving={updateMutation.isPending}
          />
        )}
        {deletePartner && (
          <DeleteModal
            key="delete"
            partner={deletePartner}
            onClose={() => setDeletePartner(null)}
            onConfirm={() => deleteMutation.mutate(deletePartner.id)}
            saving={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

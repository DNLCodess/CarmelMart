"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, RefreshCw, X, CheckCircle, Mail, MailOpen } from "lucide-react";
import toast from "react-hot-toast";

async function fetchEmails(params) {
  const r = await fetch(`/api/admin/support-emails?${params}`);
  return r.json();
}

async function updateStatus(id, status) {
  const r = await fetch(`/api/admin/support-emails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Failed");
  return d;
}

const STATUS_CFG = {
  unread:   { label: "Unread",   cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  read:     { label: "Read",     cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600" },
  resolved: { label: "Resolved", cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.read;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function EmailModal({ email, onClose, onStatusChange, saving }) {
  if (!email) return null;

  const senderLabel = email.from_name
    ? `${email.from_name} <${email.from_email}>`
    : email.from_email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">{email.subject || "(no subject)"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{senderLabel}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(email.received_at)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {email.body_html ? (
            <iframe
              srcDoc={email.body_html}
              className="w-full border-0 rounded-xl"
              style={{ minHeight: "300px" }}
              onLoad={(e) => {
                const doc = e.target.contentDocument;
                if (doc) e.target.style.height = doc.body.scrollHeight + 32 + "px";
              }}
              sandbox="allow-same-origin"
              title="Email body"
            />
          ) : (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
              {email.body_text || "(empty)"}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <StatusBadge status={email.status} />
          <div className="flex gap-2">
            {email.status !== "read" && (
              <button
                onClick={() => onStatusChange(email.id, "read")}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <MailOpen className="w-3.5 h-3.5" /> Mark Read
              </button>
            )}
            {email.status !== "resolved" && (
              <button
                onClick={() => onStatusChange(email.id, "resolved")}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Mark Resolved
              </button>
            )}
            <a
              href={`mailto:${email.from_email}?subject=Re: ${encodeURIComponent(email.subject || "")}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Reply
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { value: "",         label: "All"      },
  { value: "unread",   label: "Unread"   },
  { value: "read",     label: "Read"     },
  { value: "resolved", label: "Resolved" },
];

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("unread");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  const params = new URLSearchParams({ page });
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey:  ["admin-support-emails", statusFilter, page],
    queryFn:   () => fetchEmails(params.toString()),
    staleTime: 30_000,
    retry:     false,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: (d) => {
      toast.success(`Marked as ${d.status}`);
      qc.invalidateQueries({ queryKey: ["admin-support-emails"] });
      if (modal && modal.id === d.id) setModal((prev) => ({ ...prev, status: d.status }));
    },
    onError: (e) => toast.error(e.message),
  });

  const openEmail = (email) => {
    setModal(email);
    if (email.status === "unread") {
      mutation.mutate({ id: email.id, status: "read" });
    }
  };

  const emails = data?.emails ?? [];
  const pages  = data?.pages  ?? 1;
  const total  = data?.total  ?? 0;

  return (
    <div className="space-y-5">
      <EmailModal
        email={modal}
        saving={mutation.isPending}
        onClose={() => setModal(null)}
        onStatusChange={(id, status) => mutation.mutate({ id, status })}
      />

      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-xl">Support Inbox</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Emails received at support@carmelmart.store · {total.toLocaleString()} total
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ value, label }) => (
          <button
            key={label}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === value
                ? "bg-white dark:bg-gray-600 text-primary shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 dark:text-gray-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading emails…</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-14 text-center">
            <Inbox className="w-10 h-10 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {emails.map((email) => {
              const isUnread = email.status === "unread";
              const senderLabel = email.from_name || email.from_email;
              const preview = (email.body_text || "").slice(0, 120).trim();

              return (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      {isUnread
                        ? <Mail className="w-4 h-4 text-primary" />
                        : <MailOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-sm truncate max-w-[200px] ${isUnread ? "font-bold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                          {senderLabel}
                        </span>
                        <StatusBadge status={email.status} />
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{formatDate(email.received_at)}</span>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                        {email.subject || "(no subject)"}
                      </p>
                      {preview && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{preview}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

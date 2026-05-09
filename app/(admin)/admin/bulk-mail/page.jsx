"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail, Users, Store, ShieldCheck, Globe, Zap, Crown, Gift, Star,
  RefreshCw, Megaphone, Newspaper, Send, FlaskConical, ChevronRight,
  AlertCircle, CheckCircle, Eye, Edit3, Tag,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Brand constants ──────────────────────────────────────────────────────────
const PRIMARY  = "#560238";
const ACCENT   = "#f49238";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://carmelmart.ng";

// ─── Audience options ─────────────────────────────────────────────────────────
const AUDIENCES = [
  { id: "all",              label: "All Users",          sub: "Every registered account",              icon: Globe,       color: "bg-violet-50 text-violet-700 border-violet-200"  },
  { id: "customers",        label: "Customers Only",     sub: "Buyers with at least one account",      icon: Users,       color: "bg-blue-50 text-blue-700 border-blue-200"         },
  { id: "vendors",          label: "All Vendors",        sub: "Every vendor account",                  icon: Store,       color: "bg-emerald-50 text-emerald-700 border-emerald-200"},
  { id: "verified_vendors", label: "Verified Vendors",   sub: "KYC-approved vendors only",             icon: ShieldCheck, color: "bg-teal-50 text-teal-700 border-teal-200"         },
  { id: "paid_vendors",     label: "Premium + VIP",      sub: "All paying vendor subscribers",         icon: Zap,         color: "bg-indigo-50 text-indigo-700 border-indigo-200"   },
  { id: "premium_vendors",  label: "Premium Vendors",    sub: "Premium-tier subscribers only",         icon: Zap,         color: "bg-blue-50 text-blue-700 border-blue-200"         },
  { id: "vip_vendors",      label: "VIP Vendors",        sub: "VIP-tier — exclusive campaigns",        icon: Crown,       color: "bg-amber-50 text-amber-700 border-amber-200"      },
];

// ─── Templates ───────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:             "flash_sale",
    label:          "Flash Sale",
    emoji:          "🔥",
    description:    "Urgent limited-time sale announcement",
    accentColor:    "#dc2626",
    defaults: {
      subject:      "🔥 Flash Sale — Up to 70% OFF Today Only!",
      headline:     "Flash Sale is LIVE",
      subheadline:  "Incredible deals — up to 70% off. Ends tonight at midnight.",
      body:         "Don't miss CarmelMart's biggest sale of the season. Thousands of products slashed to their lowest prices ever.",
      ctaText:      "Shop the Sale Now",
      ctaUrl:       `${BASE_URL}/shop?sort=flash_sale`,
      badge:        "LIMITED TIME",
    },
  },
  {
    id:             "new_arrivals",
    label:          "New Arrivals",
    emoji:          "✨",
    description:    "Showcase new products just added",
    accentColor:    PRIMARY,
    defaults: {
      subject:      "✨ New Arrivals Just Dropped on CarmelMart",
      headline:     "Fresh Picks Just Arrived",
      subheadline:  "Hundreds of new products from verified Nigerian vendors.",
      body:         "Our vendors have been busy — discover the latest arrivals across Fashion, Electronics, Beauty, and more. Be the first to shop them.",
      ctaText:      "Browse New Arrivals",
      ctaUrl:       `${BASE_URL}/shop?sort=newest`,
      badge:        "NEW IN",
    },
  },
  {
    id:             "promo_code",
    label:          "Promo Code",
    emoji:          "🎁",
    description:    "Share an exclusive discount code",
    accentColor:    "#16a34a",
    defaults: {
      subject:      "🎁 Your Exclusive CarmelMart Promo Code Inside",
      headline:     "Here's a Special Discount Just for You",
      subheadline:  "Use your exclusive code at checkout and save instantly.",
      body:         "As a valued CarmelMart member, we're giving you an exclusive discount on your next order. No minimum spend required.",
      ctaText:      "Claim Your Discount",
      ctaUrl:       `${BASE_URL}/shop`,
      badge:        "SAVE15",
    },
  },
  {
    id:             "re_engagement",
    label:          "We Miss You",
    emoji:          "💌",
    description:    "Win back inactive users",
    accentColor:    "#7c3aed",
    defaults: {
      subject:      "💌 We Miss You — Here's What's New on CarmelMart",
      headline:     "It's Been a While…",
      subheadline:  "A lot has changed on CarmelMart. Come see what's new.",
      body:         "We've added hundreds of new verified vendors, better prices, faster delivery, and exciting new product categories. Your next great find is waiting.",
      ctaText:      "Come Back and Shop",
      ctaUrl:       `${BASE_URL}/shop`,
      badge:        "",
    },
  },
  {
    id:             "platform_update",
    label:          "Platform Update",
    emoji:          "📢",
    description:    "Announce features or policy changes",
    accentColor:    "#0284c7",
    defaults: {
      subject:      "📢 Important Update from CarmelMart",
      headline:     "We've Made Some Improvements",
      subheadline:  "New features and improvements to make your experience better.",
      body:         "We've been working hard to improve CarmelMart. Here's what's new and what you need to know.",
      ctaText:      "See What's New",
      ctaUrl:       `${BASE_URL}/help`,
      badge:        "UPDATE",
    },
  },
  {
    id:             "seasonal",
    label:          "Seasonal",
    emoji:          "🎊",
    description:    "Eid, Christmas, New Year, etc.",
    accentColor:    ACCENT,
    defaults: {
      subject:      "🎊 Season's Greetings from CarmelMart!",
      headline:     "Wishing You a Season of Joy",
      subheadline:  "Celebrate with the best gifts at the best prices.",
      body:         "From all of us at CarmelMart, we wish you and your loved ones a wonderful celebration. Shop our curated seasonal gift guide and find the perfect gift for everyone on your list.",
      ctaText:      "Shop Seasonal Gifts",
      ctaUrl:       `${BASE_URL}/shop`,
      badge:        "SEASON SALE",
    },
  },
  {
    id:             "vendor_update",
    label:          "Vendor Bulletin",
    emoji:          "🏪",
    description:    "News and updates for vendors",
    accentColor:    "#0f766e",
    defaults: {
      subject:      "🏪 CarmelMart Vendor Bulletin — Important Updates",
      headline:     "An Update for Our Vendor Partners",
      subheadline:  "Important news and tips to help you sell more on CarmelMart.",
      body:         "We value our vendor community and want to keep you informed. Please read the latest updates regarding policies, payouts, and new selling tools.",
      ctaText:      "Go to Vendor Dashboard",
      ctaUrl:       `${BASE_URL}/vendor/dashboard`,
      badge:        "VENDORS",
    },
  },
  {
    id:             "custom",
    label:          "Custom",
    emoji:          "✏️",
    description:    "Write a completely custom email",
    accentColor:    PRIMARY,
    defaults: {
      subject:      "",
      headline:     "",
      subheadline:  "",
      body:         "",
      ctaText:      "Visit CarmelMart",
      ctaUrl:       `${BASE_URL}`,
      badge:        "",
    },
  },
];

// ─── Build preview HTML (client-side, no logo img since it's localhost) ───────
function buildPreviewHtml({ templateId, headline, subheadline, body, ctaText, ctaUrl, badge, accentColor }) {
  const accent = accentColor || PRIMARY;

  const badgeHtml = badge
    ? `<div style="display:inline-block;background:${accent};color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:5px 14px;border-radius:50px;margin-bottom:18px;">${badge}</div><br/>`
    : "";

  const ctaHtml = ctaText && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:50px;text-decoration:none;margin-top:20px;letter-spacing:0.3px;">${ctaText}</a>`
    : "";

  const flashNotice = templateId === "flash_sale"
    ? `<div style="margin-top:24px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;"><p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">⏰ Limited time offer — ends soon. Don't miss out!</p></div>`
    : "";

  const promoBox = templateId === "promo_code"
    ? `<div style="margin-top:24px;background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:20px;text-align:center;"><p style="margin:0 0 6px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Promo Code</p><p style="margin:0;font-size:28px;font-weight:800;color:#15803d;letter-spacing:4px;font-family:monospace;">${badge || "CODE"}</p><p style="margin:6px 0 0;font-size:12px;color:#4ade80;">Apply at checkout</p></div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${PRIMARY} 0%,#3d0127 100%);padding:24px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:-apple-system,sans-serif;">CarmelMart</div>
          <p style="color:rgba(255,255,255,0.55);margin:6px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Nigeria's Multi-Vendor Marketplace</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">
          ${badgeHtml}
          ${headline ? `<h2 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 10px;line-height:1.25;">${headline}</h2>` : '<p style="color:#94a3b8;font-style:italic;">Headline will appear here…</p>'}
          ${subheadline ? `<p style="font-size:15px;color:#64748b;margin:0 0 18px;line-height:1.6;">${subheadline}</p>` : ""}
          ${body ? `<div style="font-size:14px;color:#475569;line-height:1.7;margin-bottom:20px;">${body}</div>` : ""}
          ${ctaHtml}
          ${flashNotice}
          ${promoBox}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;color:#64748b;"><strong style="color:${PRIMARY};">CarmelMart</strong> · Lagos, Nigeria</p>
          <p style="margin:0;font-size:10px;color:#cbd5e1;">© ${new Date().getFullYear()} CarmelMart. You received this because of your account activity.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function AudienceCard({ item, selected, onClick, count }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected ? "border-primary bg-primary/5" : "border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${selected ? "text-primary" : "text-gray-900 dark:text-gray-100"}`}>{item.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.sub}</p>
        </div>
        {count !== undefined && (
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{count.toLocaleString()}</span>
        )}
      </div>
    </button>
  );
}

function TemplateCard({ tmpl, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected ? "border-primary bg-primary/5" : "border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{tmpl.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${selected ? "text-primary" : "text-gray-900 dark:text-gray-100"}`}>{tmpl.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{tmpl.description}</p>
        </div>
        {selected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
      </div>
    </button>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BulkMailPage() {
  const [audience,    setAudience]    = useState("customers");
  const [templateId,  setTemplateId]  = useState("flash_sale");
  const [subject,     setSubject]     = useState(TEMPLATES[0].defaults.subject);
  const [headline,    setHeadline]    = useState(TEMPLATES[0].defaults.headline);
  const [subheadline, setSubheadline] = useState(TEMPLATES[0].defaults.subheadline);
  const [body,        setBody]        = useState(TEMPLATES[0].defaults.body);
  const [ctaText,     setCtaText]     = useState(TEMPLATES[0].defaults.ctaText);
  const [ctaUrl,      setCtaUrl]      = useState(TEMPLATES[0].defaults.ctaUrl);
  const [badge,       setBadge]       = useState(TEMPLATES[0].defaults.badge);
  const [tab,         setTab]         = useState("edit");   // "edit" | "preview"
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState(null);     // last send result

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const accentColor      = selectedTemplate.accentColor;

  // Fetch recipient count for selected audience
  const { data: countData, isLoading: countLoading } = useQuery({
    queryKey: ["bulk-mail-count", audience],
    queryFn: () => fetch(`/api/admin/bulk-mail?audience=${audience}`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const recipientCount = countData?.count ?? 0;

  // Apply template defaults
  const applyTemplate = useCallback((tmpl) => {
    setTemplateId(tmpl.id);
    setSubject(tmpl.defaults.subject);
    setHeadline(tmpl.defaults.headline);
    setSubheadline(tmpl.defaults.subheadline);
    setBody(tmpl.defaults.body);
    setCtaText(tmpl.defaults.ctaText);
    setCtaUrl(tmpl.defaults.ctaUrl);
    setBadge(tmpl.defaults.badge);
  }, []);

  // Live preview HTML
  const previewHtml = useMemo(() =>
    buildPreviewHtml({ templateId, headline, subheadline, body, ctaText, ctaUrl, badge, accentColor }),
    [templateId, headline, subheadline, body, ctaText, ctaUrl, badge, accentColor]
  );

  const sendCampaign = async (testMode = false) => {
    if (!subject.trim())  { toast.error("Subject line is required"); return; }
    if (!headline.trim()) { toast.error("Email headline is required"); return; }
    if (!testMode && recipientCount === 0) { toast.error("No recipients found"); return; }

    const confirmMsg = testMode
      ? "Send a test email to your admin address?"
      : `Send to ${recipientCount.toLocaleString()} recipients? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/bulk-mail", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience, template: templateId, subject, headline, subheadline,
          body, ctaText, ctaUrl, badge, accentColor, testMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setResult({ ...data, testMode });
      toast.success(testMode ? "Test email sent to your inbox!" : `Campaign sent to ${data.sent} recipients`);
    } catch (err) {
      toast.error(err.message || "Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bulk Mail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Compose and send email campaigns to your users and vendors
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-full">
          <Mail className="w-3.5 h-3.5" /> Campaign Builder
        </span>
      </div>

      {/* ── Result banner ────────────────────────────────────────── */}
      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${result.testMode ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}`}>
          <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${result.testMode ? "text-blue-600" : "text-green-600"}`} />
          <div>
            <p className={`font-bold text-sm ${result.testMode ? "text-blue-800 dark:text-blue-300" : "text-green-800 dark:text-green-300"}`}>
              {result.testMode ? "Test email sent!" : "Campaign delivered!"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {result.testMode
                ? "Check your admin inbox to preview the email."
                : `Sent: ${result.sent.toLocaleString()} · Failed: ${result.failed} · Total: ${result.total.toLocaleString()}`}
            </p>
          </div>
          <button onClick={() => setResult(null)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── LEFT — Builder ───────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Step 1 — Audience */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Choose Audience</h3>
              {!countLoading && (
                <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {recipientCount.toLocaleString()} recipients
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {AUDIENCES.map((a) => (
                <AudienceCard
                  key={a.id}
                  item={a}
                  selected={audience === a.id}
                  onClick={() => setAudience(a.id)}
                />
              ))}
            </div>
          </div>

          {/* Step 2 — Template */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Pick a Template</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <TemplateCard
                  key={t.id}
                  tmpl={t}
                  selected={templateId === t.id}
                  onClick={() => applyTemplate(t)}
                />
              ))}
            </div>
          </div>

          {/* Step 3 — Customize */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Customise Content</h3>
            </div>

            <div className="space-y-4">
              <FormField label="Subject Line *" hint="Appears in the recipient's inbox — keep it under 60 characters">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. 🔥 Flash Sale — Up to 70% OFF Today Only!"
                  maxLength={100}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{subject.length}/100</p>
              </FormField>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Badge / Label" hint="e.g. LIMITED TIME, SALE, NEW IN">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={badge}
                      onChange={(e) => setBadge(e.target.value.toUpperCase())}
                      placeholder="FLASH SALE"
                      maxLength={20}
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 font-mono uppercase"
                    />
                  </div>
                </FormField>

                <FormField label="Accent Colour">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={selectedTemplate.accentColor}
                      onChange={() => {}}
                      className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer p-1"
                      title="Colour is set by the template"
                      readOnly
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{selectedTemplate.accentColor}</span>
                    <span className="text-xs text-gray-400">(set by template)</span>
                  </div>
                </FormField>
              </div>

              <FormField label="Headline *" hint="Large bold text — the first thing readers see">
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Flash Sale is LIVE"
                  maxLength={80}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </FormField>

              <FormField label="Subheadline" hint="One supporting sentence under the headline">
                <input
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  placeholder="e.g. Incredible deals — up to 70% off. Ends tonight."
                  maxLength={120}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
              </FormField>

              <FormField label="Body Copy" hint="2–3 sentences that expand on the offer or message">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="Enter the main body of your email…"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
                />
              </FormField>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="CTA Button Text">
                  <input
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Shop Now"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </FormField>
                <FormField label="CTA Link URL">
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://carmelmart.ng/shop"
                    type="url"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Preview + Send ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab bar */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            <button
              onClick={() => setTab("preview")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === "preview" ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => setTab("edit")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors ${tab === "edit" ? "bg-white dark:bg-gray-600 text-primary shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Details
            </button>
          </div>

          {tab === "preview" ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{subject || "No subject"}</span>
              </div>
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "600px" }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : (
            /* Details tab — summary card */
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Campaign Summary</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Audience",   value: AUDIENCES.find((a) => a.id === audience)?.label },
                  { label: "Template",   value: `${selectedTemplate.emoji} ${selectedTemplate.label}` },
                  { label: "Subject",    value: subject || "—" },
                  { label: "Recipients", value: countLoading ? "Counting…" : recipientCount.toLocaleString() },
                  { label: "CTA",        value: ctaText || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-right truncate">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3 sticky top-24">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Sending to <strong className="text-gray-900 dark:text-gray-100">{countLoading ? "…" : recipientCount.toLocaleString()}</strong> recipients.
                This action cannot be undone.
              </span>
            </div>

            {/* Test send */}
            <button
              onClick={() => sendCampaign(true)}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Send Test to My Email
            </button>

            {/* Live send */}
            <button
              onClick={() => sendCampaign(false)}
              disabled={sending || recipientCount === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send Campaign — {recipientCount.toLocaleString()} recipients</>}
            </button>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              Use <strong>Send Test</strong> first to verify the email looks correct in your inbox before sending to everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

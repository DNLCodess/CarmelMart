"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ShoppingBag, CreditCard, Truck, RotateCcw,
  Store, Shield, Phone, Mail, MessageCircle, Search,
} from "lucide-react";
import Link from "next/link";

// ── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    id: "shopping",
    icon: ShoppingBag,
    label: "Shopping & Orders",
    color: "bg-blue-50 text-blue-600",
    faqs: [
      {
        q: "How do I place an order?",
        a: "Browse products, add items to your cart, then proceed to checkout. You'll enter your delivery address (including a landmark for easy delivery), choose a delivery method, and pay securely via Flutterwave or Pay on Delivery.",
      },
      {
        q: "Can I order from multiple vendors in one checkout?",
        a: "Yes! CarmelMart supports multi-vendor carts. All items are grouped into a single order and paid for at once. Each vendor fulfils their own items.",
      },
      {
        q: "How do I track my order?",
        a: "Go to My Orders from your account menu. Click any order to see the full tracking timeline — from Order Placed through to Delivered.",
      },
      {
        q: "Can I cancel my order?",
        a: "You can cancel orders that are still in Pending or Processing status. Once shipped, cancellation is no longer possible. Go to My Orders → select the order → tap Cancel Order.",
      },
      {
        q: "Why is the landmark field required?",
        a: "Nigerian deliveries rely heavily on landmarks for accurate drop-off. Streets can be unnamed or addresses unclear — a landmark like 'Opposite Access Bank' ensures our riders reach you quickly.",
      },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    label: "Payments",
    color: "bg-green-50 text-green-600",
    faqs: [
      {
        q: "What payment methods are accepted?",
        a: "We accept debit/credit cards (Visa, Mastercard, Verve), bank transfers, USSD, and Pay on Delivery (POD) for eligible orders — all processed securely via Flutterwave.",
      },
      {
        q: "Is Pay on Delivery available?",
        a: "Yes! POD is available for most orders. For orders above ₦10,000, a 10% deposit is required at checkout to confirm your order. This helps reduce order fraud and keeps our vendors protected.",
      },
      {
        q: "Is my payment information secure?",
        a: "Absolutely. CarmelMart does not store your card details. All payments go through Flutterwave, which is PCI-DSS compliant and regulated by the CBN.",
      },
      {
        q: "What happens if my payment fails?",
        a: "If your payment fails, your order is not placed. No money is deducted. Try again with a different card or payment method. Contact support if you were charged but the order wasn't created.",
      },
      {
        q: "Can I get a refund?",
        a: "Yes. Refunds are issued for cancelled orders or confirmed disputes. Refunds are returned to your original payment method within 3–7 business days, depending on your bank.",
      },
    ],
  },
  {
    id: "delivery",
    icon: Truck,
    label: "Delivery & Shipping",
    color: "bg-purple-50 text-purple-600",
    faqs: [
      {
        q: "What delivery options are available?",
        a: "We offer Standard Delivery (3–5 business days, ₦1,500) and Express Delivery (1–2 business days, ₦3,500). Delivery fees may vary by state and LGA.",
      },
      {
        q: "Do you deliver across Nigeria?",
        a: "Yes, we deliver to all 36 states and the FCT. Delivery timelines may be longer for remote areas. Our riders will call you before arrival.",
      },
      {
        q: "What if I miss my delivery?",
        a: "Our rider will call you before arrival. If you're unavailable, they'll attempt re-delivery once. You can also reschedule via the My Orders page.",
      },
      {
        q: "How are delivery fees calculated?",
        a: "Delivery fees depend on your state, LGA, and selected delivery speed. The fee is shown clearly at checkout before you pay.",
      },
    ],
  },
  {
    id: "returns",
    icon: RotateCcw,
    label: "Returns & Refunds",
    color: "bg-orange-50 text-orange-600",
    faqs: [
      {
        q: "What is the return policy?",
        a: "Items can be returned within 7 days of delivery if they are defective, damaged, or not as described. Items must be unused and in original packaging.",
      },
      {
        q: "How do I initiate a return?",
        a: "Go to My Orders, select the order, and tap 'Request Return'. Describe the issue and upload photos. Our team will review within 24 hours.",
      },
      {
        q: "Who pays for return shipping?",
        a: "If the item is faulty or not as described, the vendor covers return shipping. For change-of-mind returns, you bear the return shipping cost.",
      },
    ],
  },
  {
    id: "vendors",
    icon: Store,
    label: "Selling on CarmelMart",
    color: "bg-rose-50 text-rose-600",
    faqs: [
      {
        q: "How do I become a vendor?",
        a: "Click 'Sell on CarmelMart' and complete the registration form. You'll need to verify your identity with your NIN (for individuals) or CAC registration number (for businesses).",
      },
      {
        q: "How long does vendor verification take?",
        a: "NIN verification is typically instant via QoreID. CAC verification may take up to 24 hours. Once approved, you can start listing products immediately.",
      },
      {
        q: "How do I get paid?",
        a: "Vendor earnings go into your CarmelMart wallet after each delivered order. You can withdraw to your linked bank account anytime via the Wallet tab in your dashboard.",
      },
      {
        q: "What commission does CarmelMart charge?",
        a: "CarmelMart charges a platform fee on each transaction. The rate depends on your subscription tier (Free, Basic, Premium). Full details are shown during vendor registration.",
      },
      {
        q: "Can I list both physical and digital products?",
        a: "Currently, CarmelMart supports physical products only. Digital product support is on our roadmap.",
      },
    ],
  },
  {
    id: "account",
    icon: Shield,
    label: "Account & Security",
    color: "bg-indigo-50 text-indigo-600",
    faqs: [
      {
        q: "How do I reset my password?",
        a: "Go to the login page and click 'Forgot Password'. Enter your email address and we'll send a reset link. Check your spam folder if you don't see it.",
      },
      {
        q: "How do I update my profile details?",
        a: "Go to My Account → Settings to update your name, phone number, and delivery addresses.",
      },
      {
        q: "Is my personal data safe?",
        a: "Yes. CarmelMart follows Nigerian Data Protection Regulation (NDPR) guidelines. We do not sell your data to third parties. Your KYC documents are encrypted and stored securely.",
      },
    ],
  },
];

// ── sub-components ────────────────────────────────────────────────────────────
function FAQItem({ faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className={`text-sm font-semibold transition-colors ${open ? "text-primary" : "text-gray-900"}`}>
          {faq.q}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform mt-0.5 ${open ? "rotate-180 text-primary" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-600 pb-4 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [search, setSearch]           = useState("");
  const [activeSection, setActiveSection] = useState(null);

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    faqs: section.faqs.filter(
      (f) =>
        !search ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.faqs.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-primary text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">How can we help?</h1>
          <p className="text-white/80 mb-8">Find answers to common questions about CarmelMart</p>
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help articles…"
              className="w-full pl-12 pr-4 py-3.5 rounded-full text-gray-900 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Category quick-links ──────────────────────────────────────── */}
        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
            {FAQ_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(active ? null : section.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all ${active ? "bg-primary border-primary text-white shadow-md" : "bg-white border-gray-100 text-gray-700 hover:border-primary hover:shadow-sm"}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-white/20" : section.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold leading-tight">{section.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── FAQ sections ──────────────────────────────────────────────── */}
        <div className="space-y-6">
          {(search ? filteredSections : (activeSection ? filteredSections.filter((s) => s.id === activeSection) : filteredSections)).map((section) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-gray-900">{section.label}</h2>
                </div>
                <div className="px-6">
                  {section.faqs.map((faq, i) => <FAQItem key={i} faq={faq} />)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── No results ────────────────────────────────────────────────── */}
        {filteredSections.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-1">No results found</h3>
            <p className="text-sm text-gray-500">Try a different search term or browse the categories above.</p>
          </div>
        )}

        {/* ── Still need help? contact card ─────────────────────────────── */}
        <div className="mt-10 bg-primary/5 border border-primary/20 rounded-2xl p-7 text-center">
          <h3 className="font-bold text-gray-900 text-lg mb-1">Still need help?</h3>
          <p className="text-sm text-gray-600 mb-6">Our support team is available Monday–Friday, 8 AM–6 PM WAT.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:support@carmelmart.com"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Mail className="w-4 h-4" /> Email Support
            </a>
            <a
              href="tel:+2348000000000"
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-full text-sm font-semibold hover:bg-primary/5 transition-colors"
            >
              <Phone className="w-4 h-4" /> Call Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  CreditCard,
  Truck,
  ChevronRight,
  CheckCircle,
  ShieldCheck,
  Phone,
  User,
  Home,
  Landmark,
  Banknote,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/lib/auth-context";
import { formatNigerianPhone } from "@/lib/utils";
import StateLgaPicker from "@/components/ui/StateLgaPicker";

const DELIVERY_FALLBACK = [
  { id: "standard", label: "Standard Delivery", duration: "3–7 business days", fee: 1500 },
  { id: "express",  label: "Express Delivery",  duration: "1–2 business days", fee: 3500 },
];

const PAYMENT_METHODS = [
  { id: "flutterwave", label: "Card / Bank Transfer / USSD", icon: CreditCard, sub: "Powered by Flutterwave" },
  { id: "pod",         label: "Pay on Delivery (POD)",        icon: Banknote,    sub: "10% deposit required for orders above ₦10,000" },
];

const STEPS = ["Address", "Delivery", "Payment", "Review"];

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i < current ? "bg-green-500 text-white" :
              i === current ? "bg-primary text-white" :
              "bg-gray-200 text-gray-500"
            }`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${i === current ? "text-primary" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-12 sm:w-20 mb-4 mx-1 transition-colors ${i < current ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const clearCart = useCartStore((s) => s.clearCart);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null); // { promoId, code, discount, description }

  const [address, setAddress] = useState({
    fullName: user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name ?? ""}`.trim() : "",
    phone: "",
    email: user?.email ?? "",
    houseNumber: "",
    street: "",
    landmark: "",
    area: "",
    city: "",
    state: "",
    lga: "",
    deliveryInstructions: "",
  });

  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("flutterwave");

  // Fetch delivery zones for the selected state
  const { data: zoneData } = useQuery({
    queryKey: ["delivery-zones", address.state],
    queryFn: () => fetch(`/api/delivery-zones?state=${encodeURIComponent(address.state)}`).then((r) => r.json()),
    enabled: !!address.state,
    staleTime: 10 * 60 * 1000,
  });

  // Build delivery options with real fees when zone data is available
  const DELIVERY_OPTIONS = useMemo(() => {
    const zones = zoneData?.zones ?? [];
    // Use state-level zone (LGA = null or first result) as base fee
    const zone = zones.find((z) => !z.lga || z.lga.trim() === "") ?? zones[0];
    if (!zone) return DELIVERY_FALLBACK;
    return [
      { id: "standard", label: "Standard Delivery", duration: `${zone.estimated_days ?? "3–7"} business days`, fee: zone.base_fee ?? 1500 },
      { id: "express",  label: "Express Delivery",  duration: "1–2 business days",                             fee: Math.round((zone.base_fee ?? 1500) * 2) },
    ];
  }, [zoneData]);

  const deliveryFee = DELIVERY_OPTIONS.find((o) => o.id === delivery)?.fee ?? 1500;
  const discount = appliedPromo?.discount ?? 0;
  const discountedSubtotal = Math.max(0, total - discount);
  const requiresPODDeposit = payment === "pod" && discountedSubtotal > 10000;
  const podDeposit = requiresPODDeposit ? Math.ceil(discountedSubtotal * 0.1) : 0;
  const grandTotal = discountedSubtotal + deliveryFee;
  const amountDue = payment === "pod" ? podDeposit + deliveryFee : grandTotal;

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), order_total: total }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedPromo({ promoId: data.promoId, code: data.code, discount: data.discount, description: data.description });
        toast.success(`Promo applied: ${data.description}`);
        setPromoInput("");
      } else {
        toast.error(data.error ?? "Invalid promo code");
      }
    } catch {
      toast.error("Could not validate promo code");
    }
    setPromoValidating(false);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    toast("Promo code removed");
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateAddress = () => {
    const required = ["fullName", "phone", "street", "landmark", "city", "state", "lga"];
    const missing = required.filter((f) => !address[f].trim());
    if (missing.length) {
      toast.error("Please fill in all required fields");
      return false;
    }
    const phoneClean = address.phone.replace(/\s/g, "");
    if (!/^(\+234|0)[789]\d{9}$/.test(phoneClean)) {
      toast.error("Enter a valid Nigerian phone number");
      return false;
    }
    return true;
  };

  const next = () => {
    if (step === 0 && !validateAddress()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Order creation ────────────────────────────────────────────────────────────
  const createOrder = async ({ paymentRef, paymentStatus, podDeposit = 0 }) => {
    const res = await fetch("/api/customer/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          vendorId:  i.vendorId,
          name:      i.name,
          price:     i.price,
          quantity:  i.quantity,
          image:     i.image ?? null,
        })),
        delivery_address: {
          fullName:               address.fullName,
          phone:                  address.phone,
          houseNumber:            address.houseNumber,
          street:                 address.street,
          landmark:               address.landmark,
          area:                   address.area,
          city:                   address.city,
          lga:                    address.lga,
          state:                  address.state,
          delivery_instructions:  address.deliveryInstructions,
          delivery_method:        delivery,
          delivery_fee:           deliveryFee,
        },
        payment_method: payment === "pod" ? "pod" : "card",
        payment_ref:    paymentRef ?? null,
        payment_status: paymentStatus ?? "pending",
        promo_id:       appliedPromo?.promoId ?? null,
        discount:       discount,
        subtotal:       total,
        total:          grandTotal,
        pod_deposit:    podDeposit,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not create order");
    return data.order_id;
  };

  // ── Flutterwave payment ───────────────────────────────────────────────────────
  const initiateFlutterwave = () => {
    const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
    if (!publicKey || typeof window.FlutterwaveCheckout === "undefined") {
      toast.error("Payment gateway not available. Please try again.");
      return;
    }

    const txRef = `CM-FLW-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: txRef,
      amount: amountDue,
      currency: "NGN",
      payment_options: "card,ussd,banktransfer",
      customer: {
        email: address.email,
        phone_number: address.phone,
        name: address.fullName,
      },
      customizations: {
        title: "CarmelMart",
        description: `Order payment${requiresPODDeposit ? " (10% POD deposit)" : ""}`,
        logo: `${window.location.origin}/logo-black.png`,
      },
      callback: async (response) => {
        if (response.status === "successful") {
          try {
            // 1. Verify payment with Flutterwave
            const verifyRes = await fetch("/api/flutterwave/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transaction_id: response.transaction_id }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              toast.error("Payment verification failed. Contact support.");
              return;
            }
            // 2. Create the order in the database
            const orderId = await createOrder({
              paymentRef:    txRef,
              paymentStatus: "paid",
              podDeposit:    requiresPODDeposit ? podDeposit : 0,
            });
            clearCart();
            router.push(`/checkout/success?order_id=${orderId}`);
          } catch (err) {
            toast.error(err.message || "Could not place order. Contact support.");
          }
        } else {
          toast.error("Payment was not completed.");
        }
      },
      onclose: () => {
        setLoading(false);
      },
    });
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    if (payment === "flutterwave") {
      initiateFlutterwave();
      // loading reset handled in onclose / callback
    } else {
      // POD without deposit — create order directly, no payment gateway needed
      try {
        const orderId = await createOrder({ paymentRef: null, paymentStatus: "pending", podDeposit: 0 });
        clearCart();
        router.push(`/checkout/success?order_id=${orderId}&pod=1`);
      } catch (err) {
        toast.error(err.message || "Could not place order. Please try again.");
        setLoading(false);
      }
    }
    setLoading(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
          <Link href="/shop" className="text-primary font-semibold hover:underline">Browse products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Flutterwave SDK */}
      <script src="https://checkout.flutterwave.com/v3.js" async />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Checkout</h1>
        <StepBar current={step} />

        <div className="grid lg:grid-cols-5 gap-8">
          {/* ── Main content ──────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {/* STEP 0 — Address */}
              {step === 0 && (
                <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5"
                >
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" /> Delivery Address
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <input value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                        placeholder="Adebayo Johnson" />
                    </Field>

                    <Field label="Phone Number" required hint="e.g. 08012345678">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                          onBlur={(e) => { const v = e.target.value.trim(); if (v) setAddress((a) => ({ ...a, phone: formatNigerianPhone(v) })); }}
                          type="tel" inputMode="numeric"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                          placeholder="08012345678" />
                      </div>
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="House No.">
                      <input value={address.houseNumber} onChange={(e) => setAddress({ ...address, houseNumber: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                        placeholder="12" />
                    </Field>

                    <Field label="Street" required className="sm:col-span-2">
                      <input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                        placeholder="Adeola Odeku Street" />
                    </Field>
                  </div>

                  <Field label="Landmark" required hint="Critical for Nigerian delivery — e.g. 'Close to Access Bank', 'Opposite Total petrol station'">
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                        placeholder="Opposite Access Bank, beside Total petrol station" />
                    </div>
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Area / Estate">
                      <input value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                        placeholder="Victoria Island" />
                    </Field>

                    <Field label="City" required>
                      <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                        placeholder="Lagos" />
                    </Field>
                  </div>

                  <StateLgaPicker
                    stateValue={address.state}
                    lgaValue={address.lga}
                    onStateChange={(val) => setAddress({ ...address, state: val, lga: "" })}
                    onLgaChange={(val) => setAddress({ ...address, lga: val })}
                  />

                  <Field label="Delivery Instructions" hint="Optional: gate colour, floor, call on arrival">
                    <textarea value={address.deliveryInstructions} onChange={(e) => setAddress({ ...address, deliveryInstructions: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm resize-none"
                      placeholder="Blue gate, 2nd floor, call 10 mins before arrival" />
                  </Field>
                </motion.div>
              )}

              {/* STEP 1 — Delivery */}
              {step === 1 && (
                <motion.div key="delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4"
                >
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" /> Choose Delivery
                  </h2>
                  {DELIVERY_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      delivery === opt.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" value={opt.id} checked={delivery === opt.id} onChange={() => setDelivery(opt.id)} className="accent-primary" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.duration}</p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">₦{opt.fee.toLocaleString()}</span>
                    </label>
                  ))}
                </motion.div>
              )}

              {/* STEP 2 — Payment */}
              {step === 2 && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4"
                >
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Payment Method
                  </h2>
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      payment === m.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <input type="radio" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="accent-primary mt-0.5" />
                      <m.icon className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                        <p className="text-xs text-gray-500">{m.sub}</p>
                      </div>
                    </label>
                  ))}

                  {payment === "pod" && total > 10000 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                      <p className="font-semibold mb-1">POD Deposit Required</p>
                      <p>A refundable 10% deposit of <strong>₦{podDeposit.toLocaleString()}</strong> is required now via Flutterwave. The remaining <strong>₦{(total - podDeposit).toLocaleString()}</strong> is paid on delivery.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Review */}
              {step === 3 && (
                <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6"
                >
                  <h2 className="font-bold text-gray-900">Order Review</h2>

                  {/* Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address summary */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                    <p className="font-semibold text-gray-900 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Delivery to</p>
                    <p className="text-gray-700">{[address.houseNumber, address.street].filter(Boolean).join(" ")}</p>
                    <p className="text-gray-700">{address.landmark}</p>
                    <p className="text-gray-700">{[address.area, address.city, address.lga, address.state].filter(Boolean).join(", ")}</p>
                    <p className="text-gray-700 font-medium">{address.phone}</p>
                  </div>

                  {/* Delivery & payment summary */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Delivery</p>
                      <p className="font-semibold text-gray-900">{DELIVERY_OPTIONS.find((o) => o.id === delivery)?.label}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Payment</p>
                      <p className="font-semibold text-gray-900">{PAYMENT_METHODS.find((m) => m.id === payment)?.label.split("(")[0].trim()}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button onClick={back} className="flex-1 py-3 rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors">
                  Back
                </button>
              )}
              {step < 3 ? (
                <button onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-linear-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-xl hover:shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Processing..." : payment === "pod" && requiresPODDeposit ? `Pay ₦${amountDue.toLocaleString()} Deposit` : `Pay ₦${amountDue.toLocaleString()}`}
                </button>
              )}
            </div>
          </div>

          {/* ── Order summary sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Order Summary</h3>

              <div className="space-y-2 text-sm max-h-52 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-gray-600">
                    <span className="line-clamp-1 flex-1">{item.name} ×{item.quantity}</span>
                    <span className="shrink-0 ml-2 font-medium text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Promo code input */}
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">{appliedPromo.code}</span>
                    <span>— {appliedPromo.description}</span>
                  </div>
                  <button onClick={removePromo} className="text-green-500 hover:text-green-700 transition-colors ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                      placeholder="Promo code"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono uppercase"
                    />
                  </div>
                  <button
                    onClick={applyPromo}
                    disabled={promoValidating || !promoInput.trim()}
                    className="px-3 py-2 text-xs font-semibold text-primary border border-primary rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-40"
                  >
                    {promoValidating ? "…" : "Apply"}
                  </button>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">₦{total.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">−₦{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="font-medium text-gray-900">₦{deliveryFee.toLocaleString()}</span>
                </div>
                {requiresPODDeposit && (
                  <div className="flex justify-between text-amber-700">
                    <span>POD deposit (10%)</span>
                    <span className="font-medium">₦{podDeposit.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base text-gray-900">
                  <span>Total</span>
                  <span className="text-primary">₦{grandTotal.toLocaleString()}</span>
                </div>
                {requiresPODDeposit && (
                  <p className="text-xs text-gray-500">Due now: <strong>₦{amountDue.toLocaleString()}</strong></p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Secured by Flutterwave
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

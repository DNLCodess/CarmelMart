import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendReceiptConfirmed,
  sendOrderCancelledCustomer,
  sendVendorNewOrder,
  sendVendorOrderDelivered,
  sendVendorOrderCancelled,
  sendVendorKYCDecision,
  sendVendorPayoutProcessed,
  sendVendorWelcome,
  sendVendorProductDecision,
  sendAdminNewDispute,
} from "@/lib/email";
import { authEmailTemplates } from "@/lib/email/auth";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createAdminClient();
  const { data: p } = await admin.from("users").select("role").eq("id", user.id).single();
  if (!p || p.role !== "admin") return null;
  return user;
}

const TEST_RECIPIENTS = [
  "aboderindaniel482@gmail.com",
  "dnlcodes4@gmail.com",
];

const MOCK_ORDER = {
  id: "abc12345def67890",
  total: 12500,
  delivery_fee: 1500,
  discount: 500,
  items: [
    { name: "Ankara Print Fabric (3 yards)", quantity: 2, price: 4500 },
    { name: "CarmelMart Tote Bag",            quantity: 1, price: 1000 },
  ],
  delivery_address: {
    fullName:    "Adaeze Okonkwo",
    phone:       "08012345678",
    houseNumber: "14B",
    street:      "Allen Avenue",
    area:        "Ikeja",
    city:        "Lagos",
    lga:         "Ikeja",
    state:       "Lagos",
    landmark:    "Beside First Bank",
    delivery_instructions: "Call before delivery",
  },
};

const MOCK_VENDOR_ITEMS = [
  { name: "Ankara Print Fabric (3 yards)", quantity: 2, price: 4500 },
];

const MOCK_VENDOR = {
  business_name: "Adeola Fabrics & More",
  email:         TEST_RECIPIENTS[0],
  phone:         "09087654321",
  kyc_status:    "pending",
};

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "https://carmelmart.store").replace(/\/$/, "");

async function sendAuthEmail({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "CarmelMart <support@carmelmart.store>",
    to,
    subject,
    html,
  });
}

const HANDLERS = {
  // ── Customer ──────────────────────────────────────────────────────────────
  order_confirmation: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendOrderConfirmation({ to, order: MOCK_ORDER })));
  },
  order_status_confirmed: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendOrderStatusUpdate({ to, order: MOCK_ORDER, newStatus: "confirmed" })));
  },
  order_status_processing: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendOrderStatusUpdate({ to, order: MOCK_ORDER, newStatus: "processing" })));
  },
  order_status_shipped: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendOrderStatusUpdate({ to, order: MOCK_ORDER, newStatus: "shipped" })));
  },
  order_status_delivered: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendOrderStatusUpdate({ to, order: MOCK_ORDER, newStatus: "delivered" })));
  },
  receipt_confirmed: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendReceiptConfirmed({ to, order: MOCK_ORDER })));
  },
  order_cancelled_customer: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendOrderCancelledCustomer({ to, order: MOCK_ORDER, reason: "Item out of stock", refundAmount: 12500 })
    ));
  },

  // ── Vendor ────────────────────────────────────────────────────────────────
  vendor_new_order: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorNewOrder({ to, order: MOCK_ORDER, vendorItems: MOCK_VENDOR_ITEMS })
    ));
  },
  vendor_order_delivered: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) => sendVendorOrderDelivered({ to, order: MOCK_ORDER })));
  },
  vendor_order_cancelled: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorOrderCancelled({ to, order: MOCK_ORDER, reason: "Customer requested cancellation" })
    ));
  },
  vendor_kyc_approved: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorKYCDecision({ to, vendorName: MOCK_VENDOR.business_name, approved: true })
    ));
  },
  vendor_kyc_rejected: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorKYCDecision({ to, vendorName: MOCK_VENDOR.business_name, approved: false, reason: "CAC number could not be verified. Please resubmit with a clearer document." })
    ));
  },
  vendor_payout: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorPayoutProcessed({ to, vendorName: MOCK_VENDOR.business_name, amount: 45000, reference: "PAY-TEST-REF-12345" })
    ));
  },
  vendor_welcome: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorWelcome({ to, vendorName: MOCK_VENDOR.business_name, referralCode: "ADEOLA2025" })
    ));
  },
  vendor_product_approved: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorProductDecision({ to, vendorName: MOCK_VENDOR.business_name, productName: "Ankara Print Fabric (3 yards)", approved: true })
    ));
  },
  vendor_product_rejected: async () => {
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      sendVendorProductDecision({ to, vendorName: MOCK_VENDOR.business_name, productName: "Ankara Print Fabric (3 yards)", approved: false, reason: "Product images are too blurry. Please upload high-resolution photos." })
    ));
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin_new_vendor: async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from   = process.env.RESEND_FROM_EMAIL || "CarmelMart <support@carmelmart.store>";
    await Promise.all(TEST_RECIPIENTS.map((to) =>
      resend.emails.send({
        from, to,
        subject: "New Vendor Registration Awaiting Review — CarmelMart",
        html: `<div style="font-family:sans-serif;padding:24px;">
          <h2>New Vendor Registration</h2>
          <p>A new vendor has completed registration and is awaiting review.</p>
          <table style="border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Business Name</td><td style="font-weight:600;">${MOCK_VENDOR.business_name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Email</td><td>${MOCK_VENDOR.email}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Phone</td><td>${MOCK_VENDOR.phone}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">KYC Status</td><td>Pending</td></tr>
          </table>
          <p style="margin-top:20px;"><a href="${BASE_URL}/admin/vendors" style="background:#560238;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Review Vendor</a></p>
        </div>`,
      })
    ));
  },
  admin_new_dispute: async () => {
    await sendAdminNewDispute({
      dispute: { reason: "Item not as described", description: "The product colour was different from the listing photo." },
      order:   MOCK_ORDER,
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL || "CarmelMart <support@carmelmart.store>",
      to:      TEST_RECIPIENTS[1],
      subject: `⚠️ New Dispute Filed — #CM-ABC12345`,
      html:    `<p>Test: dispute filed for order #CM-ABC12345. <a href="${BASE_URL}/admin/disputes">View disputes</a>.</p>`,
    });
  },

  // ── Auth (Resend) ─────────────────────────────────────────────────────────
  auth_signup: async () => {
    const tmpl = authEmailTemplates.signup({ name: "Test User", confirmUrl: `${BASE_URL}/confirm-email?token_hash=test123&type=signup` });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_recovery: async () => {
    const tmpl = authEmailTemplates.recovery({ name: "Test User", otp: "847291" });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_magiclink: async () => {
    const tmpl = authEmailTemplates.magiclink({ email: "test@example.com", confirmUrl: `${BASE_URL}/confirm-email?token_hash=test123&type=magiclink` });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_email_change: async () => {
    const tmpl = authEmailTemplates.email_change({ name: "Test User", confirmUrl: `${BASE_URL}/confirm-email?token_hash=test123&type=email_change`, isNewAddress: false });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_vendor_activated: async () => {
    const tmpl = authEmailTemplates.vendor_activated({ name: MOCK_VENDOR.business_name, dashboardUrl: `${BASE_URL}/vendor/dashboard` });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_reauthentication: async () => {
    const tmpl = authEmailTemplates.reauthentication({ name: "Test User", otp: "394817" });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
  auth_invite: async () => {
    const tmpl = authEmailTemplates.invite({ confirmUrl: `${BASE_URL}/confirm-email?token_hash=test123&type=invite` });
    await Promise.all(TEST_RECIPIENTS.map((to) => sendAuthEmail({ to, ...tmpl })));
  },
};

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await request.json();

  const handler = HANDLERS[type];
  if (!handler) {
    return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
  }

  try {
    await handler();
    return NextResponse.json({ ok: true, type, recipients: TEST_RECIPIENTS });
  } catch (e) {
    console.error(`[test-email] ${type} failed:`, e?.message);
    return NextResponse.json({ error: e?.message ?? "Send failed" }, { status: 500 });
  }
}

/**
 * lib/email.js — CarmelMart email notifications via Resend
 *
 * Required env vars:
 *   RESEND_API_KEY          — from resend.com
 *   EMAIL_FROM              — e.g. "CarmelMart <orders@carmelmart.ng>"
 *   ADMIN_EMAIL             — admin inbox, e.g. "admin@carmelmart.ng"
 *   NEXT_PUBLIC_APP_URL     — e.g. "https://carmelmart.ng"
 *
 * All functions are fire-and-forget safe — they swallow errors so email
 * failures never crash the main request flow.
 */

import { Resend } from "resend";

const resend   = new Resend(process.env.RESEND_API_KEY);
const FROM     = process.env.EMAIL_FROM     || "CarmelMart <noreply@carmelmart.ng>";
const ADMIN    = process.env.ADMIN_EMAIL    || "admin@carmelmart.ng";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://carmelmart.ng";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ngn(amount) {
  return `₦${Number(amount ?? 0).toLocaleString("en-NG")}`;
}

function wrap(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">CarmelMart</h1>
              <p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Nigeria's Multi-Vendor Marketplace</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 CarmelMart · Lagos, Nigeria</p>
              <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">
                You're receiving this because of activity on your CarmelMart account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(label, href) {
  return `<a href="${href}"
    style="display:inline-block;background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;
           padding:12px 28px;border-radius:50px;text-decoration:none;margin-top:20px;">
    ${label}
  </a>`;
}

function orderItemsTable(items) {
  const rows = (items ?? []).map((it) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">
        ${it.name ?? it.product_name ?? "Product"} &times;${it.quantity}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">
        ${ngn((it.price ?? it.unit_price ?? 0) * it.quantity)}
      </td>
    </tr>`).join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-top:12px;">
      ${rows}
    </table>`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:5px 0;font-size:13px;color:#64748b;width:140px;">${label}</td>
    <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:600;">${value}</td>
  </tr>`;
}

async function send({ to, subject, html }) {
  try {
    await resend.emails.send({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html });
  } catch (err) {
    console.error("[email] failed to send:", subject, err?.message);
  }
}

// ─── Customer notifications ───────────────────────────────────────────────────

/**
 * Sent immediately when an order is placed (card/bank/USSD payments).
 */
export async function sendOrderConfirmation({ to, order }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;
  const addr    = order.delivery_address ?? {};

  const html = wrap("Order Confirmed — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">Order Confirmed! 🎉</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 24px;">
      Hi ${addr.fullName ?? "there"}, your order <strong>${shortId}</strong> has been received and is being processed.
    </p>

    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Order ID", shortId)}
        ${infoRow("Payment", order.payment_method === "pod" ? "Pay on Delivery" : "Paid online")}
        ${infoRow("Delivery to", [addr.city, addr.state].filter(Boolean).join(", "))}
        ${infoRow("Landmark", addr.landmark ?? "—")}
      </table>
    </div>

    <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 4px;">Items Ordered</p>
    ${orderItemsTable(order.items)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      ${order.discount > 0 ? infoRow("Discount", `-${ngn(order.discount)}`) : ""}
      ${infoRow("Delivery", ngn(order.delivery_fee ?? 0))}
      ${infoRow("Total", `<span style="font-size:16px;color:#16a34a;">${ngn(order.total)}</span>`)}
    </table>

    ${btn("Track Your Order", `${BASE_URL}/orders/${order.id}`)}

    <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
      Your vendor will update the order status as it progresses. You'll receive email updates at each stage.
    </p>
  `);

  await send({ to, subject: `Order Confirmed ${shortId} — CarmelMart`, html });
}

/**
 * Sent to customer when vendor updates the order status.
 */
export async function sendOrderStatusUpdate({ to, order, newStatus }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;

  const messages = {
    confirmed:  { emoji: "✅", title: "Order Confirmed",       body: "Your order has been confirmed by the vendor and is being prepared." },
    processing: { emoji: "📦", title: "Order Being Packed",    body: "Great news! Your order is being packed and will be dispatched soon." },
    shipped:    { emoji: "🚚", title: "Order On Its Way",      body: "Your order has been dispatched and is on its way to you. The vendor will contact you before delivery." },
    delivered:  { emoji: "🎉", title: "Order Delivered",       body: "Your order has been marked as delivered. Please confirm receipt in your CarmelMart account." },
    cancelled:  { emoji: "❌", title: "Order Cancelled",       body: "Your order has been cancelled. If you paid online, a refund will be processed within 3–5 business days." },
  };

  const msg = messages[newStatus] ?? { emoji: "📋", title: `Order ${newStatus}`, body: `Your order status has been updated to ${newStatus}.` };

  const html = wrap(`${msg.title} — CarmelMart`, `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">${msg.emoji} ${msg.title}</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Order <strong>${shortId}</strong>: ${msg.body}
    </p>
    ${btn("View Order", `${BASE_URL}/orders/${order.id}`)}
  `);

  await send({ to, subject: `${msg.emoji} ${msg.title} — ${shortId}`, html });
}

/**
 * Sent to customer when they click "Confirm I received this order".
 */
export async function sendReceiptConfirmed({ to, order }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;

  const html = wrap("Receipt Confirmed — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">Thanks for confirming! 🙏</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      You've confirmed receipt of order <strong>${shortId}</strong>. We hope you love your purchase!
    </p>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Would you like to leave a review for the products you received?
    </p>
    ${btn("Leave a Review", `${BASE_URL}/orders/${order.id}`)}
  `);

  await send({ to, subject: `Receipt Confirmed — ${shortId}`, html });
}

/**
 * Sent to customer when their order is cancelled (by them or admin).
 */
export async function sendOrderCancelledCustomer({ to, order, reason }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;

  const html = wrap("Order Cancelled — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">❌ Order Cancelled</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 12px;">
      Order <strong>${shortId}</strong> has been cancelled.
      ${reason ? `<br/>Reason: <em>${reason}</em>` : ""}
    </p>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      If you paid online, a refund will be processed to your original payment method within 3–5 business days.
      Contact support if you have any questions.
    </p>
    ${btn("Browse Products", `${BASE_URL}/shop`)}
  `);

  await send({ to, subject: `Order Cancelled — ${shortId}`, html });
}

// ─── Vendor notifications ─────────────────────────────────────────────────────

/**
 * Sent to each vendor when they receive items in a new order.
 */
export async function sendVendorNewOrder({ to, order, vendorItems }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;
  const addr    = order.delivery_address ?? {};

  const html = wrap("New Order — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">🛒 New Order Received!</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      You have a new order <strong>${shortId}</strong>. Please confirm and start processing it.
    </p>

    <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 4px;">Items to Fulfill</p>
    ${orderItemsTable(vendorItems)}

    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 8px;">📍 Delivery Address</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Name", addr.fullName ?? "—")}
        ${infoRow("Phone", addr.phone ?? "—")}
        ${infoRow("Address", [addr.houseNumber, addr.street].filter(Boolean).join(" ") || "—")}
        ${infoRow("Landmark", addr.landmark ?? "—")}
        ${infoRow("Area", [addr.area, addr.city, addr.lga, addr.state].filter(Boolean).join(", ") || "—")}
        ${addr.delivery_instructions ? infoRow("Note", addr.delivery_instructions) : ""}
      </table>
    </div>

    <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Payment: <strong>${order.payment_method === "pod" ? "Pay on Delivery" : "Paid online ✅"}</strong></p>

    ${btn("Manage This Order", `${BASE_URL}/vendor/orders/${order.id}`)}

    <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
      Arrange delivery directly with your logistics provider and update the order status in your vendor dashboard.
    </p>
  `);

  await send({ to, subject: `🛒 New Order ${shortId} — CarmelMart`, html });
}

/**
 * Sent to vendor when the customer confirms they received the order.
 */
export async function sendVendorOrderDelivered({ to, order }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;

  const html = wrap("Customer Confirmed Delivery — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">✅ Delivery Confirmed!</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      The customer has confirmed receipt of order <strong>${shortId}</strong>.
      Your earnings for this order will be processed to your wallet.
    </p>
    ${btn("View Order", `${BASE_URL}/vendor/orders/${order.id}`)}
  `);

  await send({ to, subject: `✅ Delivery Confirmed — ${shortId}`, html });
}

/**
 * Sent to vendor when their order is cancelled.
 */
export async function sendVendorOrderCancelled({ to, order, reason }) {
  const shortId = `#CM-${(order.id ?? "").slice(0, 8).toUpperCase()}`;

  const html = wrap("Order Cancelled — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">❌ Order Cancelled</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Order <strong>${shortId}</strong> has been cancelled.
      ${reason ? `<br/>Reason: <em>${reason}</em>` : ""}
    </p>
    ${btn("View Dashboard", `${BASE_URL}/vendor/orders`)}
  `);

  await send({ to, subject: `Order Cancelled — ${shortId}`, html });
}

/**
 * Sent to vendor after KYC is approved or rejected.
 */
export async function sendVendorKYCDecision({ to, vendorName, approved, reason }) {
  const subject = approved
    ? "🎉 Your CarmelMart Store is Approved!"
    : "CarmelMart Vendor Application Update";

  const html = wrap(subject, approved ? `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">🎉 You're Approved!</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Congratulations, <strong>${vendorName}</strong>! Your CarmelMart vendor account has been verified.
      You can now list products and start selling to thousands of Nigerian shoppers.
    </p>
    ${btn("Go to Vendor Dashboard", `${BASE_URL}/vendor/dashboard`)}
  ` : `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">Application Update</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 12px;">
      Hi <strong>${vendorName}</strong>, we were unable to approve your vendor application at this time.
    </p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="font-size:13px;color:#b91c1c;margin:0;"><strong>Reason:</strong> ${reason}</p>
    </div>` : ""}
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Please contact our support team if you believe this is an error or need help with your application.
    </p>
    ${btn("Contact Support", `${BASE_URL}/help`)}
  `);

  await send({ to, subject, html });
}

/**
 * Sent to vendor when a payout is processed.
 */
export async function sendVendorPayoutProcessed({ to, vendorName, amount, reference }) {
  const html = wrap("Payout Processed — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">💰 Payout Sent!</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Hi <strong>${vendorName}</strong>, your withdrawal of <strong>${ngn(amount)}</strong> has been processed successfully.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Amount", ngn(amount))}
        ${infoRow("Reference", reference ?? "—")}
        ${infoRow("Status", "Completed ✅")}
      </table>
    </div>
    <p style="font-size:13px;color:#64748b;">
      Funds typically arrive in your bank account within 1–3 business days depending on your bank.
    </p>
    ${btn("View Wallet", `${BASE_URL}/vendor/wallet`)}
  `);

  await send({ to, subject: `💰 Payout of ${ngn(amount)} Processed — CarmelMart`, html });
}

/**
 * Welcome email sent when vendor registration is completed.
 */
export async function sendVendorWelcome({ to, vendorName, referralCode }) {
  const html = wrap("Welcome to CarmelMart!", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">Welcome to CarmelMart! 🚀</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">
      Hi <strong>${vendorName}</strong>, your vendor account is active.
      Start listing your products and reach thousands of Nigerian shoppers today.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <p style="font-size:13px;font-weight:700;color:#166534;margin:0 0 12px;">📋 Quick Start Checklist</p>
      <ul style="font-size:13px;color:#475569;margin:0;padding-left:20px;line-height:2;">
        <li>Add your first product via the Vendor Dashboard</li>
        <li>Set up your shipping zones</li>
        <li>Add your bank account for payouts</li>
        <li>Share your store link with customers</li>
      </ul>
    </div>

    ${referralCode ? `<p style="font-size:13px;color:#64748b;margin-bottom:20px;">
      Your referral code: <strong style="font-family:monospace;font-size:15px;color:#0f172a;">${referralCode}</strong>
      — Earn ₦500 for every vendor you refer!
    </p>` : ""}

    ${btn("Open Vendor Dashboard", `${BASE_URL}/vendor/dashboard`)}
  `);

  await send({ to, subject: "Welcome to CarmelMart — Your Store is Ready! 🚀", html });
}

// ─── Admin notifications ──────────────────────────────────────────────────────

/**
 * Sent to admin when a new vendor completes registration.
 */
export async function sendAdminNewVendor({ vendor }) {
  const html = wrap("New Vendor Registration — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">New Vendor Registration</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">A new vendor has completed registration and is awaiting review.</p>
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Business Name", vendor.business_name ?? "—")}
        ${infoRow("Email", vendor.email ?? "—")}
        ${infoRow("Phone", vendor.phone ?? "—")}
        ${infoRow("KYC Status", vendor.kyc_status ?? "Pending")}
        ${infoRow("Registered", new Date().toLocaleDateString("en-NG"))}
      </table>
    </div>
    ${btn("Review Vendor", `${BASE_URL}/admin/vendors`)}
  `);

  await send({ to: ADMIN, subject: "New Vendor Registration Awaiting Review — CarmelMart", html });
}

/**
 * Sent to admin when a new dispute is raised.
 */
export async function sendAdminNewDispute({ dispute, order }) {
  const shortId = `#CM-${(order?.id ?? "").slice(0, 8).toUpperCase()}`;

  const html = wrap("New Dispute — CarmelMart", `
    <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 6px;">⚠️ New Dispute Filed</h2>
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">A customer has filed a dispute for order ${shortId}.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Order", shortId)}
        ${infoRow("Reason", dispute.reason ?? "—")}
        ${infoRow("Description", dispute.description ?? "—")}
      </table>
    </div>
    ${btn("Resolve Dispute", `${BASE_URL}/admin/disputes`)}
  `);

  await send({ to: ADMIN, subject: `⚠️ New Dispute Filed — ${shortId}`, html });
}

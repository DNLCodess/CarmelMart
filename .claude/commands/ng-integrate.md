# /ng-integrate

Integrate a Nigerian service into CarmelMart. Covers Flutterwave, Paystack, Termii (SMS), QoreID, GIG Logistics, Sendbox, and more.

## Instructions

The user names a service or feature to integrate. Implement it following project patterns.

---

## Supported Integrations

### 1. Flutterwave — Split Payments (Multi-Vendor)
When a customer buys from multiple vendors, split the payment at source using Flutterwave subaccounts.

```js
// app/api/checkout/initiate/route.js
const splitConfig = orderItems.map(item => ({
  id: item.vendor.flw_subaccount_id, // pre-created subaccount per vendor
  transaction_charge_type: "percentage",
  transaction_charge: 90, // vendor gets 90%, platform keeps 10%
}));

const payload = {
  tx_ref: generateRef("CM-ORD"),
  amount: order.total,
  currency: "NGN",
  redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/callback`,
  customer: { email, name, phonenumber: phone },
  subaccounts: splitConfig,
  meta: { order_id: order.id },
};
```

### 2. Flutterwave — Virtual Accounts (Pay by Bank Transfer)
Generate a dedicated virtual account per transaction for bank transfer payment.

```js
// POST https://api.flutterwave.com/v3/virtual-account-numbers
const response = await fetch("https://api.flutterwave.com/v3/virtual-account-numbers", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: customer.email,
    is_permanent: false,
    bvn: customer.bvn, // required for permanent accounts
    tx_ref: generateRef("CM-VA"),
    amount: order.total,
    currency: "NGN",
    narration: `CarmelMart Order #${order.order_number}`,
  }),
});
// Returns: { account_number, bank_name, expiry_date }
```

### 3. Paystack — Dedicated Virtual Accounts (DVA)
Better for permanent per-customer accounts.

```js
// Create a Paystack customer + dedicated virtual account
const customer = await fetch("https://api.paystack.co/customer", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  body: JSON.stringify({ email, first_name, last_name, phone }),
}).then(r => r.json());

const dva = await fetch("https://api.paystack.co/dedicated_account", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  body: JSON.stringify({ customer: customer.data.customer_code, preferred_bank: "wema-bank" }),
}).then(r => r.json());
// Returns permanent account: { bank: { name }, account_number, account_name }
```

### 4. Paystack — Subaccounts (Vendor Onboarding)
Each vendor needs a Paystack subaccount for automatic payout splits.

```js
// app/api/vendor/create-subaccount/route.js
const subaccount = await fetch("https://api.paystack.co/subaccount", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  body: JSON.stringify({
    business_name: vendor.business_name,
    settlement_bank: vendor.bank_code,    // use Paystack bank list
    account_number: vendor.account_number,
    percentage_charge: 10, // platform takes 10% commission
  }),
}).then(r => r.json());

// Save subaccount_code to vendors table
await supabase.from("vendors").update({ paystack_subaccount_code: subaccount.data.subaccount_code }).eq("id", vendor.id);
```

### 5. Termii — OTP & Transactional SMS

```js
// lib/termii.js
export const termii = {
  sendOTP: async (phone, pinId) => {
    const res = await fetch("https://api.ng.termii.com/api/sms/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        message_type: "NUMERIC",
        to: phone.startsWith("0") ? `234${phone.slice(1)}` : phone, // normalize to 234XXXXXXXXXX
        from: process.env.TERMII_SENDER_ID || "CarmelMart",
        channel: "dnd", // use "generic" if DND fails
        pin_attempts: 3,
        pin_time_to_live: 10, // minutes
        pin_length: 6,
        pin_placeholder: "< 1234 >",
        message_text: "Your CarmelMart verification code is < 1234 >. Valid for 10 minutes.",
        pin_type: "NUMERIC",
      }),
    });
    return res.json(); // { pinId, to, smsStatus }
  },

  verifyOTP: async (pinId, pin) => {
    const res = await fetch("https://api.ng.termii.com/api/sms/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TERMII_API_KEY, pin_id: pinId, pin }),
    });
    return res.json(); // { verified: true/false }
  },

  sendSMS: async (phone, message) => {
    const to = phone.startsWith("0") ? `234${phone.slice(1)}` : phone;
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to,
        from: process.env.TERMII_SENDER_ID || "CarmelMart",
        sms: message,
        type: "plain",
        channel: "generic",
      }),
    });
    return res.json();
  },

  // Pre-built message templates (Nigerian tone)
  templates: {
    orderPlaced: (orderNum, total) =>
      `Your CarmelMart order #${orderNum} has been placed! Total: ₦${total.toLocaleString()}. We'll notify you when it ships. Shop more at carmelmart.com`,
    orderShipped: (orderNum, trackingNum, provider) =>
      `Great news! Your order #${orderNum} has been shipped via ${provider}. Tracking: ${trackingNum}. Expected delivery in 2-4 days.`,
    orderDelivered: (orderNum) =>
      `Your CarmelMart order #${orderNum} has been delivered! Satisfied? Leave a review. Issues? Contact us on WhatsApp.`,
    paymentConfirmed: (amount, orderNum) =>
      `Payment of ₦${amount.toLocaleString()} confirmed for order #${orderNum}. Thank you for shopping with CarmelMart!`,
    vendorPayout: (amount, bankName) =>
      `Your CarmelMart payout of ₦${amount.toLocaleString()} has been sent to your ${bankName} account. It may take 1-2 hours to reflect.`,
  },
};
```

### 6. GIG Logistics — Rate & Shipment API

```js
// lib/gigl.js
const GIGL_BASE_URL = "https://api.giglogistics.com";

export const gigl = {
  getRate: async (origin, destination, weight) => {
    const res = await fetch(`${GIGL_BASE_URL}/api/shipment/price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GIGL_API_KEY}`,
      },
      body: JSON.stringify({
        originServiceCentreCode: origin,   // e.g., "LAG" for Lagos
        destinationServiceCentreCode: destination,
        weight,
        itemType: "NORMAL",
      }),
    });
    return res.json(); // { price, estimatedDeliveryDays }
  },

  createShipment: async (shipmentData) => {
    const res = await fetch(`${GIGL_BASE_URL}/api/shipment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GIGL_API_KEY}`,
      },
      body: JSON.stringify({
        ...shipmentData,
        // Required fields:
        // SenderName, SenderAddress, SenderPhoneNumber, SenderEmail
        // ReceiverName, ReceiverAddress, ReceiverPhoneNumber
        // Weight, Description, Value, ItemType
        PaymentType: "PREPAID",
      }),
    });
    return res.json(); // { waybillNumber, ... }
  },

  trackShipment: async (waybillNumber) => {
    const res = await fetch(`${GIGL_BASE_URL}/api/shipment/track/${waybillNumber}`, {
      headers: { Authorization: `Bearer ${process.env.GIGL_API_KEY}` },
    });
    return res.json();
  },
};
```

### 7. Nigerian States & LGAs

```js
// Install: npm install nigeria-states-lga
// lib/nigeria-geo.js
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// Or use the npm package for LGAs:
// import naijaStates from "naija-state-local-government";
// const lagosLGAs = naijaStates.lgas("Lagos").lgas;
```

```jsx
// components/shared/address/NigerianAddressForm.jsx
"use client";
import { useState } from "react";
import naijaStates from "naija-state-local-government";

export default function NigerianAddressForm({ onChange }) {
  const [selectedState, setSelectedState] = useState("");
  const lgas = selectedState ? naijaStates.lgas(selectedState)?.lgas ?? [] : [];

  return (
    <div className="space-y-4">
      <input name="streetAddress" placeholder="House/flat number & street name" className="..." />
      {/* CRITICAL for Nigerian delivery */}
      <input name="landmark" placeholder="Nearest landmark (e.g., Opposite GTBank, Near Total filling station)" className="..." required />
      <input name="area" placeholder="Area / Estate / Neighbourhood" className="..." />
      <select name="state" onChange={e => setSelectedState(e.target.value)} className="...">
        <option value="">Select State</option>
        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select name="lga" className="..." disabled={!selectedState}>
        <option value="">Select LGA</option>
        {lgas.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <input name="phone" placeholder="Delivery contact phone (+234...)" className="..." />
      <textarea name="deliveryInstructions" placeholder="Delivery instructions (optional: gate color, floor, call on arrival...)" className="..." />
    </div>
  );
}
```

### 8. Pay on Delivery (POD) Flow

```js
// app/api/orders/route.js (create order endpoint)
// POD requires a small deposit to reduce fraud

export async function POST(request) {
  const { payment_method, total, ...orderData } = await request.json();

  if (payment_method === "pay_on_delivery") {
    // Require 10-20% deposit for POD orders > ₦10,000 (fraud prevention)
    const requiresDeposit = total > 10000;
    const depositAmount = requiresDeposit ? Math.ceil(total * 0.1) : 0;

    const order = await createOrder({ ...orderData, total, payment_method, deposit_amount: depositAmount, status: "pending" });

    return NextResponse.json({
      success: true,
      order,
      requiresDeposit,
      depositAmount,
      // If deposit required, initiate Flutterwave for deposit amount
    });
  }
  // ... handle other payment methods
}
```

---

## Env Variables Required

```
# Termii SMS
TERMII_API_KEY=
TERMII_SENDER_ID=CarmelMart

# GIG Logistics
GIGL_API_KEY=
GIGL_BASE_URL=https://api.giglogistics.com

# Sendbox
SENDBOX_API_KEY=
SENDBOX_BASE_URL=https://api.sendbox.co

# Paystack subaccounts
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

Now implement the integration for: **$ARGUMENTS**

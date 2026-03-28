# /security-review

Perform a thorough security review of CarmelMart code — with focus on Nigerian fintech & e-commerce threat vectors.

## Instructions

Review the file or feature described by the user. Check ALL of the following categories and flag issues with severity levels.

---

## Review Checklist

### CRITICAL — Fix Before Launch

#### Payment Security
- [ ] **Webhook signature verification**: Flutterwave routes must check `verif-hash` header against `FLUTTERWAVE_WEBHOOK_HASH` env var. Paystack must verify HMAC-SHA512 with secret key.
- [ ] **Server-side amount verification**: Never trust amounts from client or webhook payload. Always re-verify with the payment gateway's `/verify` endpoint before crediting wallets or completing orders.
- [ ] **Double-spend prevention**: Check if a payment reference has already been processed before acting on it. Use DB unique constraint on `reference` column.
- [ ] **No raw card data**: Ensure no card numbers, CVVs, or PINs are logged, stored, or passed through the server.

#### Authentication & Authorization
- [ ] **Auth on all protected routes**: Every API route that reads/writes user-specific data must verify `supabase.auth.getUser(token)`.
- [ ] **Role-based access**: Vendor actions (add product, mark order shipped) must verify `users.role = 'vendor'`. Admin actions must verify `role = 'admin'`.
- [ ] **Supabase RLS enabled**: Every table must have RLS enabled with appropriate policies. Check with: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- [ ] **Service role key server-only**: `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in client-side code or be prefixed with `NEXT_PUBLIC_`.

#### Injection & XSS
- [ ] **Product descriptions**: Rich text / HTML in product descriptions must be sanitized before rendering (use `DOMPurify` or equivalent).
- [ ] **Search inputs**: Supabase `.textSearch()` and `.ilike()` are parameterized — safe. But validate/sanitize before passing to any raw SQL.
- [ ] **File uploads**: If vendors upload product images, validate file type (magic bytes, not just extension), size limits, and serve from CDN (not the app server).

---

### HIGH — Fix Before Production Traffic

#### Fraud Prevention (Nigerian Context)
- [ ] **Card testing prevention**: Rate-limit payment initiation per user/IP (max 3 attempts per 10 minutes). Flag accounts with >3 failed payments.
- [ ] **POD fraud**: Pay on Delivery orders over ₦10,000 should require a 10-20% deposit. Track POD delivery refusal rate per customer.
- [ ] **Vendor payout fraud**: New vendors should have funds held for T+7 days after delivery confirmation. Implement incremental limits.
- [ ] **SIM swap / account takeover**: Do not rely solely on SMS OTP for high-value actions (wallet withdrawals, bank account changes). Require email confirmation too.
- [ ] **Referral abuse**: One referral bonus per phone number (not just email). Verify with NIN/BVN before releasing referral credits.

#### Rate Limiting
- [ ] **KYC endpoints** (NIN/BVN/CAC verification): Max 3 attempts per user per day — each call costs money and enables scraping.
- [ ] **OTP endpoints** (Termii): Rate-limit OTP sends per phone number (max 5/hour) to prevent SMS bombing/billing fraud.
- [ ] **Login endpoint**: Implement exponential backoff on failed logins.
- [ ] **Search endpoint**: Rate-limit to prevent competitor scraping of product catalog.

#### Data Exposure
- [ ] **Vendor financials**: Bank account numbers and BVNs must never be returned in public vendor API responses.
- [ ] **User profiles**: Phone numbers should be masked in public-facing APIs (e.g., `+234***1234`).
- [ ] **Cost price**: Product `cost_price` must never appear in client-side API responses (only `price` and `sale_price`).
- [ ] **Error messages**: Production errors should return generic messages; never expose stack traces, SQL errors, or internal paths.

---

### MEDIUM — Fix Within 30 Days

#### Nigerian Regulatory Compliance
- [ ] **NDPR Privacy Policy**: Must include what data is collected, why, who it's shared with, and how to request deletion.
- [ ] **Cookie consent**: Required before tracking cookies (analytics, Facebook Pixel, etc.).
- [ ] **VAT**: Orders over ₦25M annual revenue require VAT to be calculated and remitted. Add VAT calculation to checkout.
- [ ] **Data retention**: Define and implement data retention policy (e.g., order data kept 7 years for tax compliance).

#### Input Validation
- [ ] **Nigerian phone numbers**: Validate format (`/^(\+234|0)[789]\d{9}$/`). Normalize to `+234` format before storage.
- [ ] **NIN format**: 11 digits numeric only.
- [ ] **BVN format**: 11 digits numeric only.
- [ ] **CAC number**: RC/BN prefix + digits.
- [ ] **Amount bounds**: Maximum transaction amounts (e.g., max single order ₦5,000,000 for fraud prevention).

#### Session & Token Security
- [ ] **Token expiry**: Supabase JWT tokens auto-expire — ensure refresh token flow works correctly.
- [ ] **Logout**: `supabase.auth.signOut()` must invalidate the session on the server side.
- [ ] **CORS**: Restrict API CORS to your domain only in production.

---

### LOW — Best Practices

- [ ] **Content Security Policy (CSP)**: Set CSP headers to prevent XSS via injected scripts.
- [ ] **HTTPS redirect**: Ensure all HTTP → HTTPS in production.
- [ ] **Dependency audit**: Run `npm audit` — fix critical and high severity vulnerabilities.
- [ ] **Admin audit log**: All admin actions (approve vendor, refund order, ban user) should be logged with timestamp and admin ID.
- [ ] **Sensitive env vars**: Ensure `.env.local` is in `.gitignore`. Check for accidental commits with `git log --all -S "FLUTTERWAVE"`.
- [ ] **Flutterwave keys in public**: Check `public/flutterwave-keys.txt` — this file should be DELETED immediately and keys rotated if it contains real keys.

---

## Quick Security Fixes

```js
// 1. Webhook signature verification
function verifyFlutterwaveWebhook(request) {
  const hash = request.headers.get("verif-hash");
  if (!hash || hash !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
    throw new Error("Invalid webhook signature");
  }
}

// 2. Paystack webhook verification
import crypto from "crypto";
function verifyPaystackWebhook(payload, signature) {
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload)).digest("hex");
  return hash === signature;
}

// 3. Nigerian phone validation
function validateNigerianPhone(phone) {
  return /^(\+234|0)[789]\d{9}$/.test(phone);
}

// 4. Prevent double-spend
async function markPaymentUsed(supabase, reference) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "completed" })
    .eq("reference", reference)
    .eq("status", "pending"); // Only update if still pending
  if (error) throw new Error("Payment already processed or not found");
}

// 5. Mask sensitive data in API responses
function maskBankAccount(accountNumber) {
  return "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}
```

---

## URGENT: Check This File Now

Looking at `public/flutterwave-keys.txt` — **this file must be deleted immediately** if it contains real API keys. Real keys committed to git or served publicly expose the entire payment system.

```bash
# Check if keys are real (not placeholders)
cat public/flutterwave-keys.txt
# If real: delete file, rotate keys in Flutterwave dashboard, check git history
```

---

Now review: **$ARGUMENTS**

If no argument given, review the currently open file or the most recently modified file.

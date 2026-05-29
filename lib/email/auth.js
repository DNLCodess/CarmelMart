import {
  emailBase,
  emailBtn,
  emailDivider,
  emailH1,
  emailP,
  warningBox,
  dangerBox,
} from "./base.js";

// ─── Templates ────────────────────────────────────────────────────────────────

export const authEmailTemplates = {

  /**
   * Sent when a new account is created and email confirmation is required.
   * confirmUrl → /confirm-email?token_hash=...&type=signup
   */
  signup: ({ name, confirmUrl }) => ({
    subject: "Confirm your CarmelMart account",
    html: emailBase({
      preheader: "One click to activate your account — the link expires in 24 hours.",
      title: "Confirm Your Email — CarmelMart",
      body: `
        ${emailH1("Confirm your email address")}
        ${emailP(`Hi ${name},`)}
        ${emailP("Thanks for signing up on CarmelMart — Nigeria's multi-vendor marketplace. Click the button below to verify your email address and activate your account.")}
        ${emailBtn("Confirm Email Address", confirmUrl)}
        ${warningBox("<strong>This link expires in 24 hours.</strong>")}
        ${emailP("If you did not create a CarmelMart account you can safely ignore this email.", "font-size:13px;color:#6b7280;")}
        ${emailDivider()}
        ${emailP("Shop from thousands of verified Nigerian vendors.", "font-size:14px;color:#6b7280;")}
      `,
    }),
  }),

  /**
   * Sent when the user requests a password reset.
   * CarmelMart uses an OTP-based flow (verifyOtp), so the email shows
   * the 6-digit numeric code rather than a magic-link button.
   * otp → the token from the Supabase auth hook payload
   */
  recovery: ({ name, otp }) => ({
    subject: "Your CarmelMart password reset code",
    html: emailBase({
      preheader: `Your password reset code is ${otp}. Valid for 1 hour.`,
      title: "Password Reset Code — CarmelMart",
      body: `
        ${emailH1("Reset your password")}
        ${emailP(`Hi ${name},`)}
        ${emailP("We received a request to reset the password on your CarmelMart account. Enter the code below in the reset form:")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0;">
          <tr>
            <td align="center">
              <div style="display:inline-block;background-color:#fdf0f7;border:2px solid #560238;border-radius:10px;padding:18px 44px;font-family:monospace,monospace;font-size:40px;font-weight:700;color:#560238;letter-spacing:12px;">${otp}</div>
            </td>
          </tr>
        </table>
        ${warningBox("<strong>This code expires in 1 hour and can only be used once.</strong>")}
        ${emailP("If you did not request a password reset, your account is safe — simply ignore this email.", "font-size:13px;color:#6b7280;")}
        ${emailDivider()}
        ${emailP("Never share this code with anyone. CarmelMart staff will never ask for it.", "font-size:13px;color:#9ca3af;")}
      `,
    }),
  }),

  /**
   * Sent when a user requests a magic link (passwordless) sign-in.
   * confirmUrl → /confirm-email?token_hash=...&type=magiclink
   */
  magiclink: ({ email, confirmUrl }) => ({
    subject: "Your CarmelMart sign-in link",
    html: emailBase({
      preheader: "Click the link to sign in. Valid for 15 minutes.",
      title: "Sign In — CarmelMart",
      body: `
        ${emailH1("Your sign-in link")}
        ${emailP("Hello,")}
        ${emailP(`Click the button below to sign in to your CarmelMart account (<strong>${email}</strong>).`)}
        ${emailBtn("Sign In to CarmelMart", confirmUrl)}
        ${warningBox("<strong>This link expires in 15 minutes and can only be used once.</strong>")}
        ${emailP("If you did not request this link you can safely ignore this email.", "font-size:13px;color:#6b7280;")}
        ${emailDivider()}
        ${emailP("Never share this link with anyone.", "font-size:13px;color:#9ca3af;")}
      `,
    }),
  }),

  /**
   * Sent when an admin invites a user to the platform.
   * confirmUrl → /confirm-email?token_hash=...&type=invite
   */
  invite: ({ confirmUrl }) => ({
    subject: "You've been invited to CarmelMart",
    html: emailBase({
      preheader: "Accept your invitation and set up your CarmelMart account.",
      title: "You're Invited — CarmelMart",
      body: `
        ${emailH1("You're invited to CarmelMart")}
        ${emailP("Hello,")}
        ${emailP("You have been invited to join CarmelMart — Nigeria's trusted multi-vendor marketplace. Click below to accept your invitation and set up your account.")}
        ${emailBtn("Accept Invitation", confirmUrl)}
        ${warningBox("<strong>This invitation expires in 24 hours.</strong>")}
        ${emailP("If you were not expecting this invitation you can safely ignore this email.", "font-size:13px;color:#6b7280;")}
        ${emailDivider()}
        ${emailP("Questions? Email <a href='mailto:support@carmelmart.com' style='color:#560238;text-decoration:none;'>support@carmelmart.com</a>.", "font-size:14px;color:#6b7280;")}
      `,
    }),
  }),

  /**
   * Sent (twice) when a user changes their email address:
   *   - once to the OLD address (isNewAddress: false)
   *   - once to the NEW address (isNewAddress: true)
   */
  email_change: ({ name, confirmUrl, isNewAddress = false, newEmail = "" }) => ({
    subject: "Confirm your CarmelMart email change",
    html: emailBase({
      preheader: "Action required: confirm the email change on your account.",
      title: "Confirm Email Change — CarmelMart",
      body: `
        ${emailH1("Confirm email change")}
        ${emailP(`Hi ${name},`)}
        ${isNewAddress
          ? emailP(`We need to verify this address (<strong>${newEmail}</strong>) before completing the change. Click below to confirm.`)
          : emailP("We received a request to change the email address on your CarmelMart account. Click below to confirm this change.")}
        ${emailBtn("Confirm Email Change", confirmUrl)}
        ${dangerBox(`<strong>This link expires in 24 hours.</strong><br>If you did not request an email change, contact <a href="mailto:support@carmelmart.com" style="color:#560238;text-decoration:none;">support@carmelmart.com</a> immediately.`)}
        ${emailDivider()}
        ${emailP("Never share this link with anyone.", "font-size:13px;color:#9ca3af;")}
      `,
    }),
  }),

  /**
   * Sent once a vendor completes KYC + payment and their store is live.
   * dashboardUrl → /vendor/dashboard
   */
  vendor_activated: ({ name, dashboardUrl }) => ({
    subject: "Your CarmelMart vendor store is live!",
    html: emailBase({
      preheader: "Congratulations — your store is verified and ready to receive orders.",
      title: "Vendor Store Live — CarmelMart",
      body: `
        ${emailH1("Your store is live!")}
        ${emailP(`Congratulations ${name},`)}
        ${emailP("Your identity has been verified and your payment received. Your CarmelMart vendor store is now active — you can start listing products and receiving orders.")}
        ${emailBtn("Go to Vendor Dashboard", dashboardUrl)}
        ${emailDivider()}
        ${emailP("Questions? Email <a href='mailto:support@carmelmart.com' style='color:#560238;text-decoration:none;'>support@carmelmart.com</a>.", "font-size:14px;color:#6b7280;")}
      `,
    }),
  }),

  /**
   * OTP code sent when Supabase requires re-authentication before a
   * sensitive action (e.g. deleting an account, changing email).
   * otp → the 6-digit code from the Supabase auth hook payload
   */
  reauthentication: ({ name, otp }) => ({
    subject: "Your CarmelMart confirmation code",
    html: emailBase({
      preheader: `Your one-time confirmation code is ${otp}. Valid for 10 minutes.`,
      title: "Confirmation Code — CarmelMart",
      body: `
        ${emailH1("Your confirmation code")}
        ${emailP(`Hi ${name},`)}
        ${emailP("Use the code below to confirm this action on your CarmelMart account:")}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0;">
          <tr>
            <td align="center">
              <div style="display:inline-block;background-color:#fdf0f7;border:2px solid #560238;border-radius:10px;padding:18px 44px;font-family:monospace,monospace;font-size:40px;font-weight:700;color:#560238;letter-spacing:12px;">${otp}</div>
            </td>
          </tr>
        </table>
        ${warningBox("<strong>This code expires in 10 minutes and can only be used once.</strong>")}
        ${emailP("Do not share this code with anyone. CarmelMart staff will never ask for it.", "font-size:13px;color:#6b7280;")}
        ${emailDivider()}
        ${emailP("If you did not request this, please contact support immediately.", "font-size:13px;color:#9ca3af;")}
      `,
    }),
  }),

};

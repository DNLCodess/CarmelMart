/**
 * lib/email/base.js — Shared email layout and component helpers for CarmelMart.
 *
 * Anti-spam decisions:
 *  - Table-based layout for Outlook Word-engine compatibility
 *  - Inline CSS only (Gmail strips <style> blocks in forwarded mail)
 *  - No CSS gradients or background images inside content cells
 *  - Preheader text on every email
 *  - CAN-SPAM compliant footer
 *  - Safe system font stack only
 */

const BRAND       = "#560238"; // Deep maroon — primary
const BRAND_DARK  = "#3d0127"; // Hover / darker maroon
const BRAND_LIGHT = "#f5e6ef"; // Light tint for cards/borders
const ACCENT      = "#f49238"; // Amber orange
const TEXT_DARK   = "#111827";
const TEXT_BODY   = "#4b5563";
const TEXT_MUTED  = "#9ca3af";
const BG_PAGE     = "#f9f3f6"; // Warm ivory tinted page background
const YEAR        = new Date().getFullYear();

const BASE_URL  = process.env.NEXT_PUBLIC_BASE_URL || "https://carmelmart.com";
const LOGO_URL  = `${BASE_URL}/logo-white.png`;

// ─── Outer shell ──────────────────────────────────────────────────────────────

export function emailBase({ preheader = "", title = "CarmelMart", body }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block}
    body{margin:0;padding:0;width:100%!important;background-color:${BG_PAGE}}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important}
      .card-pad{padding:32px 24px 28px!important}
      .header-pad{padding:28px 20px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_PAGE};">

  <!-- Preheader — hidden inbox preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BG_PAGE};">${preheader}&nbsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;</div>

  <!-- ── Page wrapper ── -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:${BG_PAGE};padding:40px 16px 52px;">
    <tr>
      <td align="center">

        <!-- ── Container max 600px ── -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;">

          <!-- ══ HEADER: maroon band with logo ══ -->
          <tr>
            <td class="header-pad" align="center" style="background-color:${BRAND};padding:34px 40px 28px;border-radius:16px 16px 0 0;">
              <a href="${BASE_URL}" target="_blank" style="text-decoration:none;display:block;">
                <!--[if mso]>
                <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
                <![endif]-->
                <img src="${LOGO_URL}"
                     alt="CarmelMart"
                     width="170"
                     style="width:170px;max-width:170px;height:auto;display:block;margin:0 auto;">
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
              </a>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;text-align:center;">Nigeria&rsquo;s Multi-Vendor Marketplace</p>
            </td>
          </tr>

          <!-- ══ BODY CARD ══ -->
          <tr>
            <td class="card-pad" style="background-color:#ffffff;padding:44px 48px 36px;border-left:1px solid ${BRAND_LIGHT};border-right:1px solid ${BRAND_LIGHT};">
              ${body}
            </td>
          </tr>

          <!-- ══ CARD FOOTER STRIP ══ -->
          <tr>
            <td style="background-color:#fdf6f0;padding:18px 48px;border:1px solid ${BRAND_LIGHT};border-top:1px solid #ede0e8;border-radius:0 0 16px 16px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${TEXT_MUTED};line-height:1.6;text-align:center;">
                Questions? <a href="mailto:support@carmelmart.com" style="color:${BRAND};text-decoration:none;font-weight:600;">support@carmelmart.com</a>
                &nbsp;&bull;&nbsp;
                <a href="${BASE_URL}" style="color:${TEXT_MUTED};text-decoration:none;">carmelmart.com</a>
              </p>
            </td>
          </tr>

          <!-- ══ PAGE FOOTER ══ -->
          <tr>
            <td style="padding:28px 16px 0;text-align:center;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#c4a8b8;line-height:1.6;">
                &copy; ${YEAR} CarmelMart &bull; This is a transactional email sent in connection with your account.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#d4bec8;line-height:1.6;">
                If you believe this was sent in error, contact <a href="mailto:support@carmelmart.com" style="color:#a87090;text-decoration:none;">support@carmelmart.com</a>
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

// ─── Component helpers ────────────────────────────────────────────────────────

/** Primary CTA button — table-based for Outlook */
export function emailBtn(text, href, bgColor = BRAND) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:28px 0 8px;">
  <tr>
    <td align="center">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="22%" fillcolor="${bgColor}" strokecolor="${bgColor}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;">${text}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" style="display:inline-block;min-width:240px;padding:15px 40px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;background-color:${bgColor};border-radius:50px;text-align:center;mso-hide:all;letter-spacing:0.2px;">${text}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/** Horizontal divider */
export function emailDivider() {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0;"><tr><td style="border-top:1px solid #f0e6ed;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/** Two-column label / value row */
export function emailRow(label, value) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;padding:9px 0;border-bottom:1px solid #faf0f5;vertical-align:top;width:44%;">${label}</td>
    <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${TEXT_DARK};font-weight:600;text-align:right;padding:9px 0;border-bottom:1px solid #faf0f5;vertical-align:top;">${value}</td>
  </tr>
</table>`;
}

/** Highlighted notice box with left-border accent */
export function emailInfoBox(html, bg = "#fdf0f7", border = "#c47090") {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:20px 0;">
  <tr>
    <td style="background-color:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT_BODY};line-height:1.65;">
      ${html}
    </td>
  </tr>
</table>`;
}

/** Section heading */
export function emailH1(text) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:${TEXT_DARK};letter-spacing:-0.5px;line-height:1.2;">${text}</p>`;
}

/** Body paragraph */
export function emailP(text, extraStyle = "") {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${TEXT_BODY};line-height:1.7;${extraStyle}">${text}</p>`;
}

/** Detail card wrapping emailRow() calls */
export function emailCard(innerHtml, bg = "#fdf6f9") {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:8px 0 20px;background-color:${bg};border:1px solid ${BRAND_LIGHT};border-radius:10px;">
  <tr>
    <td style="padding:6px 16px 4px;">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

// Convenience shorthands used by auth.js
export function warningBox(html) {
  return emailInfoBox(html, "#fffbeb", "#fbbf24");
}

export function dangerBox(html) {
  return emailInfoBox(html, "#fef2f2", "#fca5a5");
}

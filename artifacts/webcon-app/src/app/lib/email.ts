import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 8000,
  socketTimeout: 8000,
  greetingTimeout: 8000,
});

const SUPPORT_EMAIL = "support@edubridge.app";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://edubridge.app"
  );
}

function shellHtml(opts: {
  preheader: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  title: string;
  inner: string;
}): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e5e5;">
  <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${opts.preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0b0b0c;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <span style="display:inline-block;background:#ffffff10;border:1px solid #ffffff18;border-radius:10px;padding:8px 16px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.3px;">EduBridge</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:${opts.badgeBg};border:1px solid ${opts.badgeBorder};border-radius:999px;padding:5px 12px;color:${opts.badgeColor};font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;">${opts.badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#141416;border:1px solid #232328;border-radius:18px;padding:36px 32px;">
              ${opts.inner}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:24px 8px 0 8px;">
              <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:0 0 6px 0;">
                Need help? Reply to this email or contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#9ca3af;text-decoration:underline;">${SUPPORT_EMAIL}</a>.
              </p>
              <p style="color:#3f3f46;font-size:11px;line-height:1.6;margin:0;">
                &copy; ${year} EduBridge &mdash; AI-powered learning platform
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

function receiptRow(label: string, value: string, opts?: { strong?: boolean; accent?: string }): string {
  const valueColor = opts?.accent || "#ffffff";
  const valueWeight = opts?.strong ? "700" : "600";
  return `<tr>
    <td style="color:#7a7a82;font-size:13px;padding:8px 0;">${label}</td>
    <td style="color:${valueColor};font-size:13px;text-align:right;padding:8px 0;font-weight:${valueWeight};font-variant-numeric:tabular-nums;">${value}</td>
  </tr>`;
}

function divider(): string {
  return `<tr><td colspan="2" style="border-top:1px solid #26262c;line-height:0;font-size:0;">&nbsp;</td></tr>`;
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="margin:28px 0 4px 0;">
    <tr>
      <td align="center">
        <a href="${href}" style="display:inline-block;background:#ffffff;color:#0b0b0c;font-size:14px;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:10px;letter-spacing:-0.2px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export async function sendCreditsPurchaseEmail(
  to: string,
  firstName: string,
  credits: number,
  newBalance: number,
  packageName: string,
  amountNgn: number,
  reference?: string
): Promise<void> {
  const date = new Date().toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  // Defensive coercion: callers may pass numeric strings (e.g. when values
  // come from Paystack metadata or PG numeric columns).
  credits = Number(credits) || 0;
  newBalance = Number(newBalance) || 0;
  amountNgn = Number(amountNgn) || 0;
  const previousBalance = Math.max(0, newBalance - credits);
  const refDisplay = reference || `WC-${Date.now()}`;
  const dashboardUrl = `${siteUrl()}/chat`;
  const billingUrl = `${siteUrl()}/billing`;

  const inner = `
    <p style="color:#9ca3af;font-size:13px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Payment receipt</p>
    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px 0;letter-spacing:-0.5px;line-height:1.25;">
      ${credits.toLocaleString()} credits added to your wallet
    </h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px 0;">
      Hi ${firstName}, thanks for topping up. Your payment was successful and the credits are ready to use right now &mdash; they never expire.
    </p>

    <div style="background:#0f0f12;border:1px solid #26262c;border-radius:14px;padding:18px 20px;margin-bottom:20px;">
      <p style="color:#7a7a82;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 12px 0;font-weight:600;">Order summary</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${receiptRow("Package", packageName)}
        ${receiptRow("Credits purchased", `+${credits.toLocaleString()}`)}
        ${receiptRow("Amount paid", `&#8358;${amountNgn.toLocaleString()}`)}
        ${receiptRow("Payment method", "Paystack")}
        ${receiptRow("Reference", `<span style=\"font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#cbd5e1;\">${refDisplay}</span>`)}
        ${receiptRow("Date", date)}
      </table>
    </div>

    <div style="background:#0f0f12;border:1px solid #26262c;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#7a7a82;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 12px 0;font-weight:600;">Wallet balance</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;">
            <p style="color:#7a7a82;font-size:12px;margin:0 0 2px 0;">Previous</p>
            <p style="color:#cbd5e1;font-size:15px;margin:0;font-weight:600;font-variant-numeric:tabular-nums;">${previousBalance.toLocaleString()}</p>
          </td>
          <td align="center" style="vertical-align:middle;color:#4b5563;font-size:18px;width:40px;">&rarr;</td>
          <td align="right" style="vertical-align:middle;">
            <p style="color:#7a7a82;font-size:12px;margin:0 0 2px 0;">New balance</p>
            <p style="color:#22c55e;font-size:18px;margin:0;font-weight:700;font-variant-numeric:tabular-nums;">${newBalance.toLocaleString()}</p>
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
      <strong style="color:#ffffff;">What you can do with credits</strong>
    </p>
    <ul style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 8px 0;padding-left:18px;">
      <li>Chat with course-specific AI study agents</li>
      <li>Generate study guides, summaries and project plans</li>
      <li>Subscribe to Learning Hubs from top creators</li>
      <li>Schedule study sessions with smart reminders</li>
    </ul>

    ${ctaButton(dashboardUrl, "Start a study session")}

    <hr style="border:none;border-top:1px solid #26262c;margin:24px 0;" />

    <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:0;">
      Keep this email as your receipt. View your full transaction history in <a href="${billingUrl}" style="color:#9ca3af;text-decoration:underline;">Billing</a>. This is an automated message; replies are read by our team.
    </p>
  `;

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Receipt: ${credits.toLocaleString()} credits added (${packageName})`,
    html: shellHtml({
      preheader: `Your ${packageName} purchase is complete. ${credits.toLocaleString()} credits are now in your wallet.`,
      badge: "Payment confirmed",
      badgeColor: "#22c55e",
      badgeBg: "#16a34a18",
      badgeBorder: "#16a34a40",
      title: "Credits added — EduBridge",
      inner,
    }),
  });
}

export async function sendPlanUpgradeEmail(
  to: string,
  firstName: string,
  planId: string,
  planName: string,
  amountNgn: number,
  durationDays: number,
  expiresAt: string,
  bonusCredits: number,
  reference: string
): Promise<void> {
  const startDate = new Date().toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const renewDate = new Date(expiresAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dashboardUrl = `${siteUrl()}/chat`;
  const billingUrl = `${siteUrl()}/billing`;

  const planFeatures: Record<string, string[]> = {
    pro: [
      `${bonusCredits.toLocaleString()} bonus credits added to your wallet`,
      "Priority access to advanced AI study agents",
      "Higher message limits per conversation",
      "Vision support &mdash; upload images and screenshots",
      "Faster web search and document tools",
    ],
    creator: [
      "Free access to every Learning Hub on the platform",
      "Run your own Learning Hub and earn from subscribers",
      "Earn from documents you contribute to your hub",
      "Priority AI access and higher limits",
      "Direct payouts to your linked Nigerian bank account",
    ],
  };
  const features = planFeatures[planId] ?? [
    "Priority access to advanced AI study agents",
    "Higher message limits and faster responses",
  ];

  const inner = `
    <p style="color:#9ca3af;font-size:13px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Plan activated</p>
    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px 0;letter-spacing:-0.5px;line-height:1.25;">
      Welcome to ${planName}, ${firstName}
    </h1>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 28px 0;">
      Your subscription is now active. Everything below is unlocked on your account starting today &mdash; no extra setup needed.
    </p>

    <div style="background:#0f0f12;border:1px solid #26262c;border-radius:14px;padding:18px 20px;margin-bottom:20px;">
      <p style="color:#7a7a82;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 12px 0;font-weight:600;">Subscription summary</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        ${receiptRow("Plan", planName, { accent: "#a78bfa", strong: true })}
        ${receiptRow("Billing", `${durationDays}-day cycle`)}
        ${receiptRow("Amount paid", `&#8358;${amountNgn.toLocaleString()}`)}
        ${receiptRow("Payment method", "Paystack")}
        ${receiptRow("Started", startDate)}
        ${receiptRow("Renews on", renewDate)}
        ${receiptRow("Reference", `<span style=\"font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#cbd5e1;\">${reference}</span>`)}
        ${bonusCredits > 0 ? divider() + receiptRow("Bonus credits", `+${bonusCredits.toLocaleString()}`, { accent: "#22c55e", strong: true }) : ""}
      </table>
    </div>

    <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 10px 0;">
      <strong style="color:#ffffff;">What's included in ${planName}</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 8px 0;">
      ${features
        .map(
          (f) => `<tr>
        <td style="vertical-align:top;width:22px;padding:5px 0;color:#22c55e;font-size:13px;">&#10003;</td>
        <td style="vertical-align:top;padding:5px 0;color:#cbd5e1;font-size:13px;line-height:1.55;">${f}</td>
      </tr>`
        )
        .join("")}
    </table>

    ${ctaButton(dashboardUrl, "Open your dashboard")}

    <hr style="border:none;border-top:1px solid #26262c;margin:24px 0;" />

    <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:0 0 6px 0;">
      Your subscription will renew automatically on <strong style="color:#9ca3af;">${renewDate}</strong>. You can cancel or change your plan anytime from <a href="${billingUrl}" style="color:#9ca3af;text-decoration:underline;">Billing</a>.
    </p>
    <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:0;">
      Keep this email as your receipt. This is an automated message; replies are read by our team.
    </p>
  `;

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Welcome to ${planName} — your EduBridge subscription is active`,
    html: shellHtml({
      preheader: `${planName} is now active until ${renewDate}. Here's everything that's unlocked.`,
      badge: "Plan upgraded",
      badgeColor: "#a78bfa",
      badgeBg: "#7c3aed18",
      badgeBorder: "#7c3aed40",
      title: "Welcome to your new plan — EduBridge",
      inner,
    }),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  token: string,
  siteUrlArg: string
): Promise<void> {
  const resetUrl = `${siteUrlArg}/reset-password?token=${token}`;

  const inner = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px 0;letter-spacing:-0.5px;">
      Reset your password
    </h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px 0;">
      Hi ${firstName}, we received a request to reset the password for your EduBridge account. Click the button below to choose a new password.
    </p>

    ${ctaButton(resetUrl, "Reset Password")}

    <hr style="border:none;border-top:1px solid #26262c;margin:28px 0;" />

    <p style="color:#5a5a62;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 20px 0;">
      <a href="${resetUrl}" style="color:#9ca3af;font-size:12px;word-break:break-all;text-decoration:underline;">${resetUrl}</a>
    </p>

    <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:0;">
      This link expires in <strong style="color:#9ca3af;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.
    </p>
  `;

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your EduBridge password",
    html: shellHtml({
      preheader: "Reset your EduBridge password. This link expires in 1 hour.",
      badge: "Password reset",
      badgeColor: "#60a5fa",
      badgeBg: "#3b82f618",
      badgeBorder: "#3b82f640",
      title: "Reset your EduBridge password",
      inner,
    }),
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  siteUrlArg: string
): Promise<void> {
  const verifyUrl = `${siteUrlArg}/api/auth/verify-email?token=${token}`;

  const inner = `
    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px 0;letter-spacing:-0.5px;">
      Confirm your email address
    </h1>
    <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px 0;">
      Thanks for signing up for EduBridge! Click the button below to verify your email and activate your account. You'll get <strong style="color:#ffffff;">50 free credits</strong> to get started.
    </p>

    ${ctaButton(verifyUrl, "Verify Email Address")}

    <hr style="border:none;border-top:1px solid #26262c;margin:28px 0;" />

    <p style="color:#5a5a62;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <p style="margin:0;">
      <a href="${verifyUrl}" style="color:#9ca3af;font-size:12px;word-break:break-all;text-decoration:underline;">${verifyUrl}</a>
    </p>

    <p style="color:#5a5a62;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
      This link expires in <strong style="color:#9ca3af;">24 hours</strong>. If you didn't create an EduBridge account, you can safely ignore this email.
    </p>
  `;

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your EduBridge account",
    html: shellHtml({
      preheader: "Verify your email and claim 50 free credits.",
      badge: "Action required",
      badgeColor: "#fbbf24",
      badgeBg: "#f59e0b18",
      badgeBorder: "#f59e0b40",
      title: "Verify your EduBridge account",
      inner,
    }),
  });
}

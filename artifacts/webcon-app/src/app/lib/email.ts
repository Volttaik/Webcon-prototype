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

export async function sendCreditsPurchaseEmail(
  to: string,
  firstName: string,
  credits: number,
  newBalance: number,
  packageName: string,
  amountNgn: number
): Promise<void> {
  const year = new Date().getFullYear();
  const date = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${credits} credits added to your EduBridge account`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Credits Added — EduBridge</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:#ffffff10;border:1px solid #ffffff18;border-radius:12px;padding:10px 24px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">EduBridge</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:40px 36px;">

              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#16a34a18;border:1px solid #16a34a40;border-radius:50%;margin-bottom:16px;">
                  <span style="font-size:28px;">✓</span>
                </div>
                <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;letter-spacing:-0.5px;">
                  ${credits.toLocaleString()} credits added!
                </h1>
                <p style="color:#888888;font-size:14px;margin:0;">
                  Hi ${firstName}, your purchase was successful.
                </p>
              </div>

              <div style="background:#111111;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#666666;font-size:13px;padding-bottom:10px;">Package</td>
                    <td style="color:#ffffff;font-size:13px;text-align:right;padding-bottom:10px;font-weight:600;">${packageName}</td>
                  </tr>
                  <tr>
                    <td style="color:#666666;font-size:13px;padding-bottom:10px;">Credits purchased</td>
                    <td style="color:#ffffff;font-size:13px;text-align:right;padding-bottom:10px;font-weight:600;">+${credits.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color:#666666;font-size:13px;padding-bottom:10px;">Amount paid</td>
                    <td style="color:#ffffff;font-size:13px;text-align:right;padding-bottom:10px;font-weight:600;">₦${amountNgn.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-top:1px solid #2a2a2a;padding-top:10px;"></td>
                  </tr>
                  <tr>
                    <td style="color:#888888;font-size:13px;padding-top:2px;">New balance</td>
                    <td style="color:#22c55e;font-size:15px;text-align:right;font-weight:700;">${newBalance.toLocaleString()} credits</td>
                  </tr>
                </table>
              </div>

              <p style="color:#555555;font-size:13px;line-height:1.6;margin:0 0 4px 0;">
                Date: ${date}
              </p>
              <p style="color:#444444;font-size:12px;line-height:1.6;margin:0;">
                Questions? Reply to this email or visit your billing page.
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#444444;font-size:12px;margin:0;">
                &copy; ${year} EduBridge &mdash; AI-powered learning platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  siteUrl: string
): Promise<void> {
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;
  const year = new Date().getFullYear();

  await transporter.sendMail({
    from: `"EduBridge" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your EduBridge account",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your EduBridge account</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:#ffffff10;border:1px solid #ffffff18;border-radius:12px;padding:10px 24px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">EduBridge</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:40px 36px;">

              <!-- Heading -->
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 12px 0;letter-spacing:-0.5px;">
                Confirm your email address
              </h1>
              <p style="color:#888888;font-size:15px;line-height:1.6;margin:0 0 32px 0;">
                Thanks for signing up for EduBridge! Click the button below to verify your email and activate your account. You'll get <strong style="color:#ffffff;">50 free credits</strong> to get started.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:#ffffff;color:#000000;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:-0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;" />

              <!-- Fallback link -->
              <p style="color:#555555;font-size:13px;line-height:1.6;margin:0 0 8px 0;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="margin:0;">
                <a href="${verifyUrl}" style="color:#888888;font-size:12px;word-break:break-all;text-decoration:underline;">${verifyUrl}</a>
              </p>

              <!-- Warning -->
              <p style="color:#444444;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
                This link expires in <strong style="color:#555555;">24 hours</strong>. If you didn't create a EduBridge account, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#444444;font-size:12px;margin:0;">
                &copy; ${year} EduBridge &mdash; AI-powered learning platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}

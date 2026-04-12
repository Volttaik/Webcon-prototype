import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendVerificationEmail(
  to: string,
  token: string,
  siteUrl: string
): Promise<void> {
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${token}`;
  const year = new Date().getFullYear();

  await transporter.sendMail({
    from: `"WebCon" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your WebCon account",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your WebCon account</title>
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
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">WebCon</span>
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
                Thanks for signing up for WebCon! Click the button below to verify your email and activate your account. You'll get <strong style="color:#ffffff;">50 free credits</strong> to get started.
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
                This link expires in <strong style="color:#555555;">24 hours</strong>. If you didn't create a WebCon account, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#444444;font-size:12px;margin:0;">
                &copy; ${year} WebCon &mdash; AI-powered learning platform
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

const nodemailer = require("nodemailer");

const createTransporter = () => {
  if (process.env.EMAIL_PROVIDER === "ethereal") {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const otpEmailTemplate = (otp, expiresInMinutes = 10) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your QuberLedger Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:28px 40px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">💰</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                QuberLedger
              </h1>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">Email Verification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Use the code below to verify your email address and complete your account registration.
              </p>

              <!-- OTP Box -->
              <div style="background:#0f172a;border:2px solid #3b82f6;border-radius:12px;
                          padding:24px;text-align:center;margin:24px 0;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;
                           text-transform:uppercase;letter-spacing:2px;">
                  Verification Code
                </p>
                <div style="font-size:42px;font-weight:800;color:#60a5fa;
                             letter-spacing:10px;font-family:monospace;">
                  ${otp}
                </div>
                <p style="margin:12px 0 0;color:#64748b;font-size:12px;">
                  Expires in ${expiresInMinutes} minutes
                </p>
              </div>

              <!-- Warning -->
              <div style="background:#7c341320;border:1px solid #9a3412;border-radius:8px;
                          padding:14px 16px;margin-bottom:20px;">
                <p style="margin:0;color:#fb923c;font-size:13px;line-height:1.5;">
                  ⚠️ Never share this code with anyone. QuberLedger will never ask for your OTP.
                </p>
              </div>

              <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.
                Someone may have entered your address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:20px 40px;border-top:1px solid #1e293b;">
              <p style="margin:0;color:#334155;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} QuberLedger · This is an automated message, do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Send OTP Email ───────────────────────────────────────────────────────────
const sendOTPEmail = async (toEmail, otp) => {
  const transporter = createTransporter();

  const mailOptions = {
    from:    `"QuberLedger" <${process.env.SMTP_USER || process.env.ETHEREAL_USER || "noreply@QuberLedger.com"}>`,
    to:      toEmail,
    subject: `${otp} is your QuberLedger verification code`,
    html:    otpEmailTemplate(otp, 10),
    text:    `Your QuberLedger verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
  };

  const info = await transporter.sendMail(mailOptions);

  if (process.env.EMAIL_PROVIDER === "ethereal") {
    console.log(`📧 OTP Email Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

const setupEtherealAccount = async () => {
  if (process.env.EMAIL_PROVIDER !== "ethereal") return;
  if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) return;

  try {
    const testAccount = await nodemailer.createTestAccount();
    process.env.ETHEREAL_USER = testAccount.user;
    process.env.ETHEREAL_PASS = testAccount.pass;
    console.log("📧 Ethereal test account created:");
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    console.log("   (OTP preview links will appear in console when emails are sent)");
  } catch (err) {
    console.warn("⚠️  Could not create Ethereal test account:", err.message);
  }
};

module.exports = { sendOTPEmail, setupEtherealAccount };

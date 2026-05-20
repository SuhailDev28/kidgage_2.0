import nodemailer from "nodemailer";

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function getPort(value) {
  const port = Number(value || 465);
  return Number.isFinite(port) ? port : 465;
}

let cachedTransporter = null;

export function isEmailEnabled() {
  return bool(process.env.EMAIL_ENABLED, false);
}

export function getEmailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is required for email integration");
  }

  if (!process.env.SMTP_USER) {
    throw new Error("SMTP_USER is required for email integration");
  }

  if (!process.env.SMTP_PASS) {
    throw new Error("SMTP_PASS is required for email integration");
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: getPort(process.env.SMTP_PORT),
    secure: bool(process.env.SMTP_SECURE, true),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export function renderBaseEmail({
  title = "KidGage Notification",
  preview = "",
  greeting = "Hello,",
  message = "",
  buttonText = "",
  buttonUrl = "",
  footer = "Thank you for using KidGage.",
}) {
  const safeTitle = String(title || "");
  const safePreview = String(preview || "");
  const safeGreeting = String(greeting || "");
  const safeMessage = String(message || "");
  const safeButtonText = String(buttonText || "");
  const safeButtonUrl = String(buttonUrl || "");
  const safeFooter = String(footer || "");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${safePreview}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#ec7a3b;padding:22px 26px;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;">KidGage</h1>
                <p style="margin:6px 0 0;font-size:14px;opacity:.95;">Kids activity booking platform</p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 26px;">
                <h2 style="margin:0 0 14px;font-size:22px;line-height:1.35;color:#111827;">
                  ${safeTitle}
                </h2>

                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">
                  ${safeGreeting}
                </p>

                <div style="font-size:15px;line-height:1.75;color:#374151;">
                  ${safeMessage}
                </div>

                ${
                  safeButtonText && safeButtonUrl
                    ? `
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td>
                      <a href="${safeButtonUrl}" style="display:inline-block;background:#ec7a3b;color:#ffffff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700;font-size:14px;">
                        ${safeButtonText}
                      </a>
                    </td>
                  </tr>
                </table>
                `
                    : ""
                }

                <p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">
                  ${safeFooter}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 26px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
                This is an automated email from KidGage. Please do not reply directly to this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export async function sendEmail({ to, cc, bcc, subject, html, text, replyTo }) {
  if (!to) {
    return {
      success: false,
      skipped: true,
      reason: "Missing recipient email",
    };
  }

  if (!isEmailEnabled()) {
    return {
      success: false,
      skipped: true,
      reason: "EMAIL_ENABLED is false",
    };
  }

  const transporter = getEmailTransporter();

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    replyTo,
  });

  return {
    success: true,
    skipped: false,
    messageId: result?.messageId || "",
    response: result?.response || "",
  };
}

export async function sendTemplateEmail({
  to,
  subject,
  title,
  preview,
  greeting,
  message,
  buttonText,
  buttonUrl,
  footer,
}) {
  const html = renderBaseEmail({
    title,
    preview,
    greeting,
    message,
    buttonText,
    buttonUrl,
    footer,
  });

  const text = [
    title,
    "",
    greeting,
    "",
    String(message || "").replace(/<[^>]+>/g, " "),
    "",
    buttonUrl || "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

import EmailTemplate from "../../models/EmailTemplate.js";

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: "CONTACT_FORM_ADMIN",
    name: "Contact Form Notification",
    description: "Sent to admin when a visitor submits the contact form.",
    category: "CONTACT",
    subject: "New Contact Message: {{subject}}",
    variables: ["name", "email", "subject", "message", "siteName"],
    text: `New contact message from {{siteName}}

Name: {{name}}
Email: {{email}}
Subject: {{subject}}

Message:
{{message}}`,
    html: `
<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:20px;padding:24px;border:1px solid #e2e8f0">
    <div style="display:inline-block;background:#fff7ed;color:#ec7a3b;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">
      {{siteName}}
    </div>

    <h2 style="margin:18px 0 8px;color:#0f172a;font-size:26px">New Contact Message</h2>
    <p style="margin:0;color:#64748b;line-height:1.6">A visitor submitted the contact form.</p>

    <table style="width:100%;border-collapse:collapse;margin-top:20px">
      <tr>
        <td style="padding:10px 0;font-weight:bold;width:120px;color:#475569">Name</td>
        <td style="padding:10px 0;color:#0f172a">{{name}}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-weight:bold;color:#475569">Email</td>
        <td style="padding:10px 0;color:#0f172a">{{email}}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-weight:bold;color:#475569">Subject</td>
        <td style="padding:10px 0;color:#0f172a">{{subject}}</td>
      </tr>
    </table>

    <div style="margin-top:20px;padding:18px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa">
      <div style="font-weight:800;margin-bottom:8px;color:#0f172a">Message</div>
      <div style="white-space:pre-line;line-height:1.7;color:#334155">{{message}}</div>
    </div>

    <p style="margin-top:18px;font-size:12px;color:#94a3b8">
      Reply directly to this email to contact {{name}}.
    </p>
  </div>
</div>`,
  },

  {
    key: "BOOKING_CONFIRMATION",
    name: "Booking Confirmation",
    description: "Sent to parent after successful booking confirmation.",
    category: "BOOKING",
    subject: "Booking Confirmed: {{activityName}}",
    variables: [
      "parentName",
      "childName",
      "activityName",
      "academyName",
      "bookingId",
      "bookingDate",
      "siteName",
    ],
    text: `Hi {{parentName}},

Your booking has been confirmed.

Child: {{childName}}
Activity: {{activityName}}
Academy: {{academyName}}
Booking ID: {{bookingId}}
Date: {{bookingDate}}

Thank you,
{{siteName}}`,
    html: `
<div style="font-family:Arial,sans-serif;background:#fff7ed;padding:24px;color:#0f172a">
  <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:22px;padding:28px;border:1px solid #fed7aa">
    <h2 style="margin:0;color:#ec7a3b;font-size:28px">Booking Confirmed 🎉</h2>
    <p style="line-height:1.7;color:#475569">Hi {{parentName}}, your booking is confirmed.</p>

    <div style="margin-top:20px;background:#f8fafc;border-radius:18px;padding:18px;border:1px solid #e2e8f0">
      <p><strong>Child:</strong> {{childName}}</p>
      <p><strong>Activity:</strong> {{activityName}}</p>
      <p><strong>Academy:</strong> {{academyName}}</p>
      <p><strong>Booking ID:</strong> {{bookingId}}</p>
      <p><strong>Date:</strong> {{bookingDate}}</p>
    </div>

    <p style="margin-top:22px;color:#64748b">Thank you for using {{siteName}}.</p>
  </div>
</div>`,
  },

  {
    key: "PAYMENT_SUCCESS",
    name: "Payment Success",
    description: "Sent after successful online payment.",
    category: "PAYMENT",
    subject: "Payment Successful - {{bookingId}}",
    variables: [
      "parentName",
      "amount",
      "currency",
      "bookingId",
      "activityName",
      "siteName",
    ],
    text: `Hi {{parentName}},

Your payment was successful.

Amount: {{currency}} {{amount}}
Booking ID: {{bookingId}}
Activity: {{activityName}}

Thank you,
{{siteName}}`,
    html: `
<div style="font-family:Arial,sans-serif;background:#f0fdf4;padding:24px;color:#0f172a">
  <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:22px;padding:28px;border:1px solid #bbf7d0">
    <h2 style="margin:0;color:#16a34a;font-size:28px">Payment Successful</h2>
    <p style="line-height:1.7;color:#475569">Hi {{parentName}}, we received your payment.</p>

    <div style="margin-top:20px;background:#f8fafc;border-radius:18px;padding:18px;border:1px solid #e2e8f0">
      <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
      <p><strong>Booking ID:</strong> {{bookingId}}</p>
      <p><strong>Activity:</strong> {{activityName}}</p>
    </div>

    <p style="margin-top:22px;color:#64748b">Thank you for using {{siteName}}.</p>
  </div>
</div>`,
  },

  {
    key: "ACADEMY_REGISTRATION_SUBMITTED",
    name: "Academy Registration Submitted",
    description: "Sent/admin-used when a provider submits onboarding form.",
    category: "ACADEMY",
    subject: "New Academy Registration: {{academyName}}",
    variables: [
      "academyName",
      "location",
      "fullName",
      "email",
      "phone",
      "siteName",
    ],
    text: `New academy registration submitted.

Academy: {{academyName}}
Location: {{location}}
Contact: {{fullName}}
Email: {{email}}
Phone: {{phone}}`,
    html: `
<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:22px;padding:28px;border:1px solid #e2e8f0">
    <h2 style="margin:0;color:#ec7a3b;font-size:28px">New Academy Registration</h2>
    <p style="line-height:1.7;color:#475569">{{academyName}} submitted a provider onboarding request.</p>

    <div style="margin-top:20px;background:#fff7ed;border-radius:18px;padding:18px;border:1px solid #fed7aa">
      <p><strong>Academy:</strong> {{academyName}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Contact:</strong> {{fullName}}</p>
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Phone:</strong> {{phone}}</p>
    </div>
  </div>
</div>`,
  },
];

export function escapeTemplateHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderTemplateString(template = "", variables = {}) {
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key) => {
      const value = variables?.[key];

      if (value === undefined || value === null) {
        return "";
      }

      return String(value);
    },
  );
}

export function renderTemplateHtml(template = "", variables = {}) {
  const safeVariables = {};

  Object.entries(variables || {}).forEach(([key, value]) => {
    safeVariables[key] = escapeTemplateHtml(value);
  });

  return renderTemplateString(template, safeVariables);
}

export async function seedDefaultEmailTemplates() {
  const results = [];

  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    const row = await EmailTemplate.findOneAndUpdate(
      { key: template.key },
      {
        $setOnInsert: {
          ...template,
          active: true,
          isSystem: true,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    results.push(row);
  }

  return results;
}

export async function getEmailTemplateByKey(key) {
  const normalizedKey = String(key || "")
    .trim()
    .toUpperCase();

  if (!normalizedKey) return null;

  let template = await EmailTemplate.findOne({
    key: normalizedKey,
    active: true,
  }).lean();

  if (!template) {
    await seedDefaultEmailTemplates();

    template = await EmailTemplate.findOne({
      key: normalizedKey,
      active: true,
    }).lean();
  }

  return template;
}

export async function renderEmailTemplate(key, variables = {}) {
  const template = await getEmailTemplateByKey(key);

  if (!template) {
    throw new Error(`Email template not found: ${key}`);
  }

  return {
    template,
    subject: renderTemplateString(template.subject, variables),
    html: renderTemplateHtml(template.html, variables),
    text: renderTemplateString(template.text, variables),
  };
}

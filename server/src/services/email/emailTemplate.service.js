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
    key: "PARENT_ACCOUNT_WELCOME",
    name: "Parent Account Welcome",
    description:
      "Sent to a parent after their account is created. Includes login email and temporary password.",
    category: "AUTH",
    subject: "Welcome to {{siteName}} - Your Parent Account Details",
    variables: [
      "siteName",
      "parentName",
      "email",
      "password",
      "loginUrl",
      "supportEmail",
    ],
    text: `Hi {{parentName}},

Welcome to {{siteName}}.

Your parent account has been created successfully.

Login Email: {{email}}
Password: {{password}}

Login here:
{{loginUrl}}

For security, please change your password after logging in.

If you need help, contact us at {{supportEmail}}.

Thank you,
{{siteName}}`,
    html: `
<div style="font-family:Arial,sans-serif;background:#fff7ed;padding:24px;color:#0f172a">
  <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #fed7aa">
    <div style="background:linear-gradient(135deg,#ec7a3b,#f59e0b);padding:28px;color:#ffffff">
      <div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;opacity:.9">
        {{siteName}} Parent Portal
      </div>
      <h1 style="margin:14px 0 0;font-size:30px;line-height:1.2">
        Welcome to {{siteName}} 🎉
      </h1>
      <p style="margin:12px 0 0;line-height:1.7;font-size:15px;opacity:.95">
        Your parent account has been created successfully.
      </p>
    </div>

    <div style="padding:28px">
      <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155">
        Hi <strong>{{parentName}}</strong>,
      </p>

      <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475569">
        You can now log in to your parent dashboard to manage children, view bookings, and discover activities.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:20px;margin:22px 0">
        <div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:14px">
          Login Details
        </div>

        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:10px 0;font-weight:800;color:#475569;width:130px">Email</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:700">{{email}}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-weight:800;color:#475569">Password</td>
            <td style="padding:10px 0;color:#0f172a;font-weight:900">{{password}}</td>
          </tr>
        </table>
      </div>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;margin-bottom:24px">
        <div style="font-weight:900;color:#9a3412;margin-bottom:6px">Security note</div>
        <div style="font-size:14px;line-height:1.6;color:#9a3412">
          Please change your password after your first login. Do not share your login details with anyone.
        </div>
      </div>

      <a href="{{loginUrl}}" style="display:inline-block;background:#ec7a3b;color:#ffffff;text-decoration:none;font-weight:900;border-radius:16px;padding:14px 24px">
        Login to Parent Dashboard
      </a>

      <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b">
        Need help? Contact us at <strong>{{supportEmail}}</strong>.
      </p>
    </div>

    <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.6">
      This email was sent by {{siteName}}. If you did not request this account, please contact support.
    </div>
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

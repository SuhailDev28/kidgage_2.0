// server/src/services/emailTrigger.service.js

function normalizeString(value = "", fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getAppUrl() {
  return String(
    process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173",
  ).replace(/\/$/, "");
}

function pickGuestEmail(booking = {}, payment = {}) {
  return (
    booking?.guestParent?.email ||
    booking?.guestParentSnapshot?.email ||
    payment?.meta?.parentEmail ||
    payment?.meta?.guestParent?.email ||
    ""
  );
}

function pickParentName(booking = {}, payment = {}) {
  return normalizeString(
    booking?.guestParent?.fullName ||
      booking?.guestParent?.name ||
      booking?.guestParentSnapshot?.fullName ||
      booking?.parentId?.fullName ||
      booking?.parentId?.name ||
      payment?.meta?.parentName ||
      payment?.meta?.guestParent?.fullName ||
      payment?.meta?.guestParent?.name,
    "Parent",
  );
}

function pickChildName(booking = {}, payment = {}) {
  return normalizeString(
    booking?.guestChild?.fullName ||
      booking?.guestChild?.name ||
      booking?.guestChildSnapshot?.fullName ||
      booking?.childSnapshot?.fullName ||
      booking?.childId?.fullName ||
      booking?.childId?.name ||
      payment?.meta?.guestChild?.fullName ||
      payment?.meta?.guestChild?.name,
    "Child",
  );
}

function pickActivityTitle(booking = {}, payment = {}) {
  return normalizeString(
    booking?.activityId?.title ||
      booking?.activityId?.name ||
      booking?.activitySnapshot?.title ||
      payment?.meta?.activityTitle,
    "activity",
  );
}

function pickAcademyName(booking = {}, payment = {}) {
  return normalizeString(
    booking?.academyId?.name ||
      booking?.academySnapshot?.name ||
      payment?.meta?.academyName,
    "academy",
  );
}

function pickBookingNo(booking = {}, payment = {}) {
  return normalizeString(
    booking?.bookingNo || payment?.meta?.bookingNo || booking?._id,
    "booking",
  );
}

function pickAmount(payment = {}, booking = {}) {
  const amount = Number(payment?.amount || booking?.finalAmount || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function renderBaseEmail({
  title,
  preview,
  bodyHtml,
  ctaLabel = "",
  ctaUrl = "",
}) {
  const safeCta =
    ctaLabel && ctaUrl
      ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="background:#ec7a3b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;display:inline-block;">${ctaLabel}</a></p>`
      : "";

  return `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;">${preview || title}</div>
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e2e8f0;">
        <div style="font-size:22px;font-weight:800;color:#ec7a3b;margin-bottom:8px;">KidGage</div>
        <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${title}</h1>
        <div style="font-size:15px;line-height:1.7;color:#334155;">
          ${bodyHtml}
        </div>
        ${safeCta}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0;">
          This is an automated email from KidGage. Please keep this message for your records.
        </p>
      </div>
    </div>
  </div>`;
}

async function sendEmailSafe({ to, subject, html, text = "" }) {
  const enabled = String(process.env.EMAIL_ENABLED || "false").toLowerCase();

  if (!to || enabled !== "true") {
    return {
      skipped: true,
      reason: !to ? "Missing recipient" : "EMAIL_ENABLED is not true",
    };
  }

  try {
    const mod = await import("./email.service.js");

    const sendEmail =
      mod.sendEmail ||
      mod.sendMail ||
      mod.sendTransactionalEmail ||
      mod.default;

    if (typeof sendEmail !== "function") {
      return {
        skipped: true,
        reason: "No compatible sendEmail function found in email.service.js",
      };
    }

    return sendEmail({
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Email trigger failed:", error?.message || error);

    return {
      skipped: false,
      failed: true,
      error: error?.message || "Email trigger failed",
    };
  }
}

export async function sendGuestBookingCreatedEmail({
  booking,
  payment = null,
} = {}) {
  const to = pickGuestEmail(booking, payment);
  const parentName = pickParentName(booking, payment);
  const childName = pickChildName(booking, payment);
  const activityTitle = pickActivityTitle(booking, payment);
  const academyName = pickAcademyName(booking, payment);
  const bookingNo = pickBookingNo(booking, payment);
  const appUrl = getAppUrl();

  const paymentUrl =
    booking?._id && booking?.guestPaymentToken
      ? `${appUrl}/payment/myfatoorah/${booking._id}?guestToken=${booking.guestPaymentToken}`
      : "";

  const html = renderBaseEmail({
    title: "Your KidGage booking has been created",
    preview: `Booking ${bookingNo} has been created.`,
    ctaLabel: paymentUrl ? "Continue to payment" : "",
    ctaUrl: paymentUrl,
    bodyHtml: `
      <p>Hi ${parentName},</p>
      <p>Your booking has been created successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Booking No</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${bookingNo}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Child</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${childName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Activity</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${activityTitle}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Academy</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${academyName}</td></tr>
      </table>
      <p>Your booking will be confirmed after payment is completed or after admin confirmation for cash bookings.</p>
    `,
  });

  return sendEmailSafe({
    to,
    subject: `KidGage booking created - ${bookingNo}`,
    html,
    text: `Your KidGage booking ${bookingNo} has been created.`,
  });
}

export async function sendPaymentSuccessEmail({ booking, payment } = {}) {
  const to = pickGuestEmail(booking, payment);
  const parentName = pickParentName(booking, payment);
  const childName = pickChildName(booking, payment);
  const activityTitle = pickActivityTitle(booking, payment);
  const academyName = pickAcademyName(booking, payment);
  const bookingNo = pickBookingNo(booking, payment);
  const amount = pickAmount(payment, booking);
  const currency = payment?.currency || booking?.currency || "QAR";

  const html = renderBaseEmail({
    title: "Payment successful",
    preview: `Payment received for booking ${bookingNo}.`,
    bodyHtml: `
      <p>Hi ${parentName},</p>
      <p>Your payment has been received successfully and your booking is now confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Booking No</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${bookingNo}</strong></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Child</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${childName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Activity</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${activityTitle}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Academy</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${academyName}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">Amount</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${amount} ${currency}</strong></td></tr>
      </table>
      <p>Thank you for booking with KidGage.</p>
    `,
  });

  return sendEmailSafe({
    to,
    subject: `Payment successful - ${bookingNo}`,
    html,
    text: `Payment received for booking ${bookingNo}.`,
  });
}

export async function sendPaymentFailedEmail({ booking, payment } = {}) {
  const to = pickGuestEmail(booking, payment);
  const parentName = pickParentName(booking, payment);
  const bookingNo = pickBookingNo(booking, payment);
  const appUrl = getAppUrl();

  const retryUrl =
    booking?._id && booking?.guestPaymentToken
      ? `${appUrl}/payment/myfatoorah/${booking._id}?guestToken=${booking.guestPaymentToken}`
      : "";

  const html = renderBaseEmail({
    title: "Payment was not completed",
    preview: `Payment failed for booking ${bookingNo}.`,
    ctaLabel: retryUrl ? "Try payment again" : "",
    ctaUrl: retryUrl,
    bodyHtml: `
      <p>Hi ${parentName},</p>
      <p>Your payment for booking <strong>${bookingNo}</strong> was not completed.</p>
      <p>You can retry the payment using the button below.</p>
    `,
  });

  return sendEmailSafe({
    to,
    subject: `Payment failed - ${bookingNo}`,
    html,
    text: `Payment failed for booking ${bookingNo}.`,
  });
}

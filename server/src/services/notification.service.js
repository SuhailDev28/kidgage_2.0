// server/src/services/notification.service.js

import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/* -------------------------------------------------------------------------- */
/* BASIC HELPERS                                                              */
/* -------------------------------------------------------------------------- */

const ACADEMY_NOTIFICATION_ROLES = [
  "ACADEMY_ADMIN",
  "ACADEMY_MANAGER",
  "ACADEMY_STAFF",
];

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeRole(role = "") {
  const value = String(role || "")
    .trim()
    .toUpperCase();

  const roleMap = {
    ADMIN: "ACADEMY_ADMIN",
    ACADEMY: "ACADEMY_ADMIN",
    ACADEMY_ADMIN: "ACADEMY_ADMIN",
    ACADEMY_OWNER: "ACADEMY_ADMIN",

    MANAGER: "ACADEMY_MANAGER",
    ACADEMY_MANAGER: "ACADEMY_MANAGER",

    STAFF: "ACADEMY_STAFF",
    ACADEMY_STAFF: "ACADEMY_STAFF",

    SUPERADMIN: "SUPER_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",

    PARENT_USER: "PARENT",
    PARENT: "PARENT",
  };

  return roleMap[value] || value;
}

function normalizeUpper(value = "", fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

function normalizeString(value = "", fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeObjectId(value) {
  return isValidObjectId(value) ? value : null;
}

function normalizeMeta(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function normalizeActionUrl(value = "") {
  const text = normalizeString(value);

  if (!text) return "";

  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }

  return text.startsWith("/") ? text : `/${text}`;
}

function cleanPayload(payload = {}) {
  const recipientRole = normalizeRole(payload.recipientRole);
  const title = normalizeString(payload.title);
  const message = normalizeString(payload.message);

  if (!recipientRole || !title || !message) return null;

  return {
    academyId: normalizeObjectId(payload.academyId),
    recipientUserId: normalizeObjectId(payload.recipientUserId),
    recipientRole,

    type: normalizeUpper(payload.type, "SYSTEM"),
    category: normalizeUpper(payload.category, "SYSTEM"),
    priority: normalizeUpper(payload.priority, "NORMAL"),
    source: normalizeUpper(payload.source, "SYSTEM"),

    title,
    message,

    actionUrl: normalizeActionUrl(payload.actionUrl),

    entityType: normalizeUpper(payload.entityType),
    entityId: normalizeObjectId(payload.entityId),

    isRead: Boolean(payload.isRead || false),
    readAt: payload.isRead ? new Date() : null,
    deletedAt: null,

    createdByUserId: normalizeObjectId(payload.createdByUserId),

    meta: normalizeMeta(payload.meta),
  };
}

function buildAcademyRoleRows(payload = {}) {
  return ACADEMY_NOTIFICATION_ROLES.map((recipientRole) => ({
    ...payload,
    recipientRole,
  }));
}

/* -------------------------------------------------------------------------- */
/* CORE CREATE METHODS                                                        */
/* -------------------------------------------------------------------------- */

export async function createNotification(payload = {}) {
  const row = cleanPayload(payload);

  if (!row) return null;

  return Notification.create(row);
}

export async function createBulkNotifications(rows = []) {
  const safeRows = [];

  for (const row of rows) {
    const cleanRow = cleanPayload(row);
    if (cleanRow) safeRows.push(cleanRow);
  }

  if (!safeRows.length) return [];

  return Notification.insertMany(safeRows, { ordered: false });
}

/* -------------------------------------------------------------------------- */
/* ROLE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

export async function notifySuperAdmin(payload = {}) {
  return createNotification({
    ...payload,
    recipientRole: "SUPER_ADMIN",
    recipientUserId: null,
    academyId: null,
  });
}

// Alias to avoid breaking older imports.
export async function notifySuperAdmins(payload = {}) {
  return notifySuperAdmin(payload);
}

export async function notifyAcademy(payload = {}) {
  return createNotification({
    ...payload,
    recipientRole: payload.recipientRole || "ACADEMY_ADMIN",
  });
}

export async function notifyAcademyAdmins(payload = {}) {
  return createBulkNotifications(buildAcademyRoleRows(payload));
}

export async function notifyParent(payload = {}) {
  return createNotification({
    ...payload,
    recipientRole: "PARENT",
  });
}

export async function notifyUser(payload = {}) {
  return createNotification(payload);
}

/* -------------------------------------------------------------------------- */
/* BOOKING HELPERS                                                            */
/* -------------------------------------------------------------------------- */

function pickBookingNo(booking = {}, fallbackSource = {}) {
  return (
    booking?.bookingNo ||
    booking?.referenceNo ||
    booking?.bookingReference ||
    fallbackSource?.bookingNo ||
    fallbackSource?.referenceNo ||
    fallbackSource?.bookingReference ||
    String(booking?._id || fallbackSource?._id || "booking")
  );
}

function pickAcademyId(source = {}) {
  return (
    source?.academyId?._id ||
    source?.academyId?.id ||
    source?.academyId ||
    source?.academy?._id ||
    source?.academy?.id ||
    source?.academy ||
    null
  );
}

function pickParentId(source = {}) {
  return (
    source?.parentId?._id ||
    source?.parentId?.id ||
    source?.parentId ||
    source?.parentUserId?._id ||
    source?.parentUserId?.id ||
    source?.parentUserId ||
    source?.userId?._id ||
    source?.userId?.id ||
    source?.userId ||
    null
  );
}

function pickChildName(booking = {}) {
  return (
    booking?.childId?.fullName ||
    booking?.childId?.name ||
    booking?.guestChild?.fullName ||
    booking?.guestChild?.name ||
    booking?.guestChildSnapshot?.fullName ||
    booking?.childSnapshot?.fullName ||
    booking?.childName ||
    "Child"
  );
}

function pickParentName(booking = {}) {
  return (
    booking?.parentId?.fullName ||
    booking?.parentId?.name ||
    booking?.parentUserId?.fullName ||
    booking?.parentUserId?.name ||
    booking?.guestParent?.fullName ||
    booking?.guestParent?.name ||
    booking?.guestParentSnapshot?.fullName ||
    booking?.parentName ||
    "Parent"
  );
}

function pickAcademyName(booking = {}) {
  return (
    booking?.academyId?.name ||
    booking?.academy?.name ||
    booking?.academySnapshot?.name ||
    "Academy"
  );
}

function pickActivityTitle(booking = {}) {
  return (
    booking?.activityId?.title ||
    booking?.activityId?.name ||
    booking?.activitySnapshot?.title ||
    booking?.activityTitle ||
    booking?.activityName ||
    "activity"
  );
}

function bookingMeta(booking = {}, extra = {}) {
  const academyId = pickAcademyId(booking);
  const parentUserId = pickParentId(booking);

  return {
    bookingId: String(booking?._id || ""),
    bookingNo: pickBookingNo(booking),
    academyId: String(academyId || ""),
    parentUserId: String(parentUserId || ""),
    parentName: pickParentName(booking),
    childName: pickChildName(booking),
    academyName: pickAcademyName(booking),
    activityTitle: pickActivityTitle(booking),
    bookingStatus: booking?.bookingStatus || booking?.status || "",
    paymentStatus: booking?.paymentStatus || "",
    paymentMethod: booking?.paymentMethod || "",
    source: "BOOKING_TRIGGER",
    ...extra,
  };
}

/* -------------------------------------------------------------------------- */
/* BOOKING TRIGGERS                                                           */
/* -------------------------------------------------------------------------- */

export async function notifyBookingCreated({
  booking,
  createdByUserId = null,
} = {}) {
  if (!booking?._id) return [];

  const academyId = pickAcademyId(booking);
  const parentUserId = pickParentId(booking);
  const bookingNo = pickBookingNo(booking);
  const parentName = pickParentName(booking);
  const childName = pickChildName(booking);
  const academyName = pickAcademyName(booking);
  const activityTitle = pickActivityTitle(booking);

  const meta = bookingMeta(booking, {
    trigger: "BOOKING_CREATED",
  });

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "BOOKING_CREATED",
      source: "BOOKING_TRIGGER",
      title: "New booking created",
      message: `${parentName} created booking ${bookingNo} for ${childName} at ${academyName}.`,
      category: "BOOKING",
      priority: "HIGH",
      actionUrl: "/super-admin/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    },

    ...buildAcademyRoleRows({
      academyId,
      type: "BOOKING_CREATED",
      source: "BOOKING_TRIGGER",
      title: "New booking received",
      message: `${parentName} booked ${activityTitle} for ${childName}.`,
      category: "BOOKING",
      priority: "HIGH",
      actionUrl: "/academy/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    }),
  ];

  if (parentUserId && isValidObjectId(parentUserId)) {
    rows.push({
      academyId,
      recipientUserId: parentUserId,
      recipientRole: "PARENT",
      type: "BOOKING_CREATED",
      source: "BOOKING_TRIGGER",
      title: "Booking created",
      message: `Your booking ${bookingNo} has been created successfully.`,
      category: "BOOKING",
      priority: "NORMAL",
      actionUrl: "/parent/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    });
  }

  return createBulkNotifications(rows);
}

export async function notifyBookingConfirmed({
  booking,
  payment = null,
  createdByUserId = null,
} = {}) {
  if (!booking?._id) return [];

  const academyId = pickAcademyId(booking);
  const parentUserId = pickParentId(booking);
  const bookingNo = pickBookingNo(booking);
  const parentName = pickParentName(booking);
  const childName = pickChildName(booking);
  const academyName = pickAcademyName(booking);
  const activityTitle = pickActivityTitle(booking);

  const meta = bookingMeta(booking, {
    trigger: "BOOKING_CONFIRMED",
    paymentId: String(payment?._id || booking?.paymentId || ""),
    paymentGateway: payment?.paymentGateway || booking?.paymentGateway || "",
    amount:
      payment?.amount || booking?.finalAmount || booking?.totalAmount || 0,
    currency: payment?.currency || booking?.currency || "QAR",
  });

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "BOOKING_CONFIRMED",
      source: "BOOKING_TRIGGER",
      title: "Booking confirmed",
      message: `Booking ${bookingNo} has been confirmed for ${academyName}.`,
      category: "BOOKING",
      priority: "HIGH",
      actionUrl: "/super-admin/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    },

    ...buildAcademyRoleRows({
      academyId,
      type: "BOOKING_CONFIRMED",
      source: "BOOKING_TRIGGER",
      title: "Booking confirmed",
      message: `${parentName}'s booking for ${activityTitle} is confirmed.`,
      category: "BOOKING",
      priority: "HIGH",
      actionUrl: "/academy/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    }),
  ];

  if (parentUserId && isValidObjectId(parentUserId)) {
    rows.push({
      academyId,
      recipientUserId: parentUserId,
      recipientRole: "PARENT",
      type: "BOOKING_CONFIRMED",
      source: "BOOKING_TRIGGER",
      title: "Booking confirmed",
      message: `Your booking ${bookingNo} for ${childName} has been confirmed.`,
      category: "BOOKING",
      priority: "HIGH",
      actionUrl: "/parent/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    });
  }

  return createBulkNotifications(rows);
}

export async function notifyBookingCancelled({
  booking,
  reason = "",
  payment = null,
  createdByUserId = null,
} = {}) {
  if (!booking?._id) return [];

  const academyId = pickAcademyId(booking);
  const parentUserId = pickParentId(booking);
  const bookingNo = pickBookingNo(booking);
  const parentName = pickParentName(booking);
  const childName = pickChildName(booking);

  const safeReason = normalizeString(reason, "Booking was cancelled.");

  const meta = bookingMeta(booking, {
    trigger: "BOOKING_CANCELLED",
    reason: safeReason,
    paymentId: String(payment?._id || booking?.paymentId || ""),
  });

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "BOOKING_CANCELLED",
      source: "BOOKING_TRIGGER",
      title: "Booking cancelled",
      message: `Booking ${bookingNo} was cancelled. ${safeReason}`,
      category: "BOOKING",
      priority: "NORMAL",
      actionUrl: "/super-admin/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    },

    ...buildAcademyRoleRows({
      academyId,
      type: "BOOKING_CANCELLED",
      source: "BOOKING_TRIGGER",
      title: "Booking cancelled",
      message: `${parentName}'s booking ${bookingNo} was cancelled.`,
      category: "BOOKING",
      priority: "NORMAL",
      actionUrl: "/academy/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    }),
  ];

  if (parentUserId && isValidObjectId(parentUserId)) {
    rows.push({
      academyId,
      recipientUserId: parentUserId,
      recipientRole: "PARENT",
      type: "BOOKING_CANCELLED",
      source: "BOOKING_TRIGGER",
      title: "Booking cancelled",
      message: `Your booking ${bookingNo} for ${childName} was cancelled.`,
      category: "BOOKING",
      priority: "NORMAL",
      actionUrl: "/parent/bookings",
      entityType: "BOOKING",
      entityId: booking._id,
      createdByUserId,
      meta,
    });
  }

  return createBulkNotifications(rows);
}

/* -------------------------------------------------------------------------- */
/* PAYMENT TRIGGERS                                                           */
/* -------------------------------------------------------------------------- */

export async function notifyPaymentSuccessful({
  payment,
  booking = null,
  createdByUserId = null,
} = {}) {
  if (!payment?._id) return [];

  const source = booking || {};
  const academyId = pickAcademyId(payment) || pickAcademyId(source);
  const parentUserId = pickParentId(payment) || pickParentId(source);

  const bookingNo = pickBookingNo(source, payment);
  const parentName =
    payment?.meta?.parentName || pickParentName(source) || "Customer";
  const childName =
    payment?.meta?.childName || pickChildName(source) || "Child";
  const academyName =
    payment?.meta?.academyName || pickAcademyName(source) || "Academy";

  const amount =
    payment?.amount || payment?.totalAmount || payment?.paidAmount || 0;
  const currency = payment?.currency || source?.currency || "QAR";

  const meta = {
    ...bookingMeta(source, {
      trigger: "PAYMENT_SUCCESS",
    }),
    paymentId: String(payment._id),
    paymentStatus: payment.paymentStatus || payment.status || "PAID",
    paymentGateway: payment.paymentGateway || payment.gateway || "",
    amount,
    currency,
  };

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "PAYMENT_SUCCESS",
      source: "PAYMENT_TRIGGER",
      title: "Payment received",
      message: `${amount} ${currency} received for booking ${bookingNo} at ${academyName}.`,
      category: "PAYMENT",
      priority: "HIGH",
      actionUrl: "/super-admin/payments",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta,
    },

    ...buildAcademyRoleRows({
      academyId,
      type: "PAYMENT_SUCCESS",
      source: "PAYMENT_TRIGGER",
      title: "Payment received",
      message: `${parentName} paid ${amount} ${currency} for booking ${bookingNo}.`,
      category: "PAYMENT",
      priority: "HIGH",
      actionUrl: "/academy/bookings",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta,
    }),
  ];

  if (parentUserId && isValidObjectId(parentUserId)) {
    rows.push({
      academyId,
      recipientUserId: parentUserId,
      recipientRole: "PARENT",
      type: "PAYMENT_SUCCESS",
      source: "PAYMENT_TRIGGER",
      title: "Payment successful",
      message: `Your payment for booking ${bookingNo} has been received successfully.`,
      category: "PAYMENT",
      priority: "HIGH",
      actionUrl: "/parent/payments",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta: {
        ...meta,
        childName,
      },
    });
  }

  return createBulkNotifications(rows);
}

export async function notifyPaymentFailed({
  payment,
  booking = null,
  reason = "",
  createdByUserId = null,
} = {}) {
  if (!payment?._id) return [];

  const source = booking || {};
  const academyId = pickAcademyId(payment) || pickAcademyId(source);
  const parentUserId = pickParentId(payment) || pickParentId(source);

  const bookingNo = pickBookingNo(source, payment);
  const parentName =
    payment?.meta?.parentName || pickParentName(source) || "Customer";

  const safeReason = normalizeString(reason, "Payment was not completed.");

  const meta = {
    ...bookingMeta(source, {
      trigger: "PAYMENT_FAILED",
      reason: safeReason,
    }),
    paymentId: String(payment._id),
    paymentStatus: payment.paymentStatus || payment.status || "FAILED",
    paymentGateway: payment.paymentGateway || payment.gateway || "",
    amount: payment?.amount || payment?.totalAmount || 0,
    currency: payment?.currency || source?.currency || "QAR",
  };

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "PAYMENT_FAILED",
      source: "PAYMENT_TRIGGER",
      title: "Payment failed",
      message: `Payment failed for booking ${bookingNo}.`,
      category: "PAYMENT",
      priority: "HIGH",
      actionUrl: "/super-admin/payments",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta,
    },

    ...buildAcademyRoleRows({
      academyId,
      type: "PAYMENT_FAILED",
      source: "PAYMENT_TRIGGER",
      title: "Payment failed",
      message: `${parentName}'s payment for booking ${bookingNo} failed.`,
      category: "PAYMENT",
      priority: "NORMAL",
      actionUrl: "/academy/bookings",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta,
    }),
  ];

  if (parentUserId && isValidObjectId(parentUserId)) {
    rows.push({
      academyId,
      recipientUserId: parentUserId,
      recipientRole: "PARENT",
      type: "PAYMENT_FAILED",
      source: "PAYMENT_TRIGGER",
      title: "Payment failed",
      message: `Your payment for booking ${bookingNo} was not completed.`,
      category: "PAYMENT",
      priority: "HIGH",
      actionUrl: "/parent/payments",
      entityType: "PAYMENT",
      entityId: payment._id,
      createdByUserId,
      meta,
    });
  }

  return createBulkNotifications(rows);
}

/* -------------------------------------------------------------------------- */
/* ACADEMY REGISTRATION TRIGGERS                                              */
/* -------------------------------------------------------------------------- */

export async function notifyAcademyRegistrationSubmitted({
  registration,
  createdByUserId = null,
} = {}) {
  if (!registration?._id) return null;

  const academyName =
    registration.academyName || registration.name || "New academy";
  const location = registration.location || registration.city || "";

  return notifySuperAdmins({
    type: "REGISTRATION_CREATED",
    source: "ACADEMY_REGISTRATION_TRIGGER",
    title: "New academy registration",
    message: `${academyName} submitted a provider joining request.`,
    category: "REGISTRATION",
    priority: "HIGH",
    actionUrl: "/super-admin/requests",
    entityType: "ACADEMY_REGISTRATION",
    entityId: registration._id,
    createdByUserId,
    meta: {
      registrationId: String(registration._id),
      academyName,
      location,
      crNumber: registration.crNumber || "",
      phone: registration.phone || "",
      email: registration.email || "",
      fullName: registration.fullName || "",
      designation: registration.designation || "",
      website: registration.website || "",
      instagram: registration.instagram || "",
      source: "ACADEMY_REGISTRATION_TRIGGER",
    },
  });
}

export async function notifyAcademyRegistrationApproved({
  registration,
  academy = null,
  academyUserId = null,
  createdByUserId = null,
} = {}) {
  if (!registration?._id && !academy?._id) return [];

  const academyId = pickAcademyId(academy) || academy?._id || null;
  const academyName =
    academy?.name ||
    registration?.academyName ||
    registration?.name ||
    "Academy";

  const rows = [
    {
      recipientRole: "SUPER_ADMIN",
      type: "REGISTRATION_APPROVED",
      source: "ACADEMY_REGISTRATION_TRIGGER",
      title: "Academy registration approved",
      message: `${academyName} registration has been approved.`,
      category: "REGISTRATION",
      priority: "NORMAL",
      actionUrl: "/super-admin/academies",
      entityType: academy?._id ? "ACADEMY" : "ACADEMY_REGISTRATION",
      entityId: academy?._id || registration?._id,
      createdByUserId,
      meta: {
        registrationId: String(registration?._id || ""),
        academyId: String(academyId || ""),
        academyName,
        trigger: "REGISTRATION_APPROVED",
      },
    },
  ];

  if (academyId) {
    rows.push(
      ...buildAcademyRoleRows({
        academyId,
        recipientUserId: academyUserId,
        type: "REGISTRATION_APPROVED",
        source: "ACADEMY_REGISTRATION_TRIGGER",
        title: "Academy approved",
        message: `${academyName} has been approved on KidGage.`,
        category: "REGISTRATION",
        priority: "HIGH",
        actionUrl: "/academy/dashboard",
        entityType: "ACADEMY",
        entityId: academyId,
        createdByUserId,
        meta: {
          registrationId: String(registration?._id || ""),
          academyId: String(academyId || ""),
          academyName,
          trigger: "REGISTRATION_APPROVED",
        },
      }),
    );
  }

  return createBulkNotifications(rows);
}

export async function notifyAcademyRegistrationRejected({
  registration,
  reason = "",
  createdByUserId = null,
} = {}) {
  if (!registration?._id) return null;

  const academyName =
    registration.academyName || registration.name || "Academy";

  const safeReason = normalizeString(
    reason,
    "The provider joining request was rejected.",
  );

  return notifySuperAdmins({
    type: "REGISTRATION_REJECTED",
    source: "ACADEMY_REGISTRATION_TRIGGER",
    title: "Academy registration rejected",
    message: `${academyName} registration was rejected. ${safeReason}`,
    category: "REGISTRATION",
    priority: "NORMAL",
    actionUrl: "/super-admin/requests",
    entityType: "ACADEMY_REGISTRATION",
    entityId: registration._id,
    createdByUserId,
    meta: {
      registrationId: String(registration._id),
      academyName,
      reason: safeReason,
      trigger: "REGISTRATION_REJECTED",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* ACADEMY / ACTIVITY / CONTENT HELPERS                                       */
/* -------------------------------------------------------------------------- */

export async function notifyAcademyCreated({
  academy,
  createdByUserId = null,
} = {}) {
  if (!academy?._id) return [];

  const academyName = academy?.name || "Academy";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "ACADEMY_CREATED",
      source: "ACADEMY_TRIGGER",
      title: "Academy created",
      message: `${academyName} has been created.`,
      category: "ACADEMY",
      priority: "NORMAL",
      actionUrl: "/super-admin/academies",
      entityType: "ACADEMY",
      entityId: academy._id,
      createdByUserId,
      meta: {
        academyId: String(academy._id),
        academyName,
        trigger: "ACADEMY_CREATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId: academy._id,
      type: "ACADEMY_CREATED",
      source: "ACADEMY_TRIGGER",
      title: "Academy profile created",
      message: `${academyName} profile is now available.`,
      category: "ACADEMY",
      priority: "NORMAL",
      actionUrl: "/academy/dashboard",
      entityType: "ACADEMY",
      entityId: academy._id,
      createdByUserId,
      meta: {
        academyId: String(academy._id),
        academyName,
        trigger: "ACADEMY_CREATED",
      },
    }),
  ]);
}

export async function notifyAcademyUpdated({
  academy,
  createdByUserId = null,
} = {}) {
  if (!academy?._id) return [];

  const academyName = academy?.name || "Academy";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "ACADEMY_UPDATED",
      source: "ACADEMY_TRIGGER",
      title: "Academy updated",
      message: `${academyName} profile has been updated.`,
      category: "ACADEMY",
      priority: "NORMAL",
      actionUrl: "/super-admin/academies",
      entityType: "ACADEMY",
      entityId: academy._id,
      createdByUserId,
      meta: {
        academyId: String(academy._id),
        academyName,
        trigger: "ACADEMY_UPDATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId: academy._id,
      type: "ACADEMY_UPDATED",
      source: "ACADEMY_TRIGGER",
      title: "Academy profile updated",
      message: `${academyName} profile has been updated.`,
      category: "ACADEMY",
      priority: "NORMAL",
      actionUrl: "/academy/settings",
      entityType: "ACADEMY",
      entityId: academy._id,
      createdByUserId,
      meta: {
        academyId: String(academy._id),
        academyName,
        trigger: "ACADEMY_UPDATED",
      },
    }),
  ]);
}

export async function notifyActivityCreated({
  activity,
  createdByUserId = null,
} = {}) {
  if (!activity?._id) return [];

  const academyId = pickAcademyId(activity);
  const activityTitle = activity?.title || activity?.name || "Activity";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "ACTIVITY_CREATED",
      source: "ACTIVITY_TRIGGER",
      title: "Activity created",
      message: `${activityTitle} has been created.`,
      category: "ACTIVITY",
      priority: "NORMAL",
      actionUrl: "/super-admin/activities",
      entityType: "ACTIVITY",
      entityId: activity._id,
      createdByUserId,
      meta: {
        activityId: String(activity._id),
        academyId: String(academyId || ""),
        activityTitle,
        trigger: "ACTIVITY_CREATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "ACTIVITY_CREATED",
      source: "ACTIVITY_TRIGGER",
      title: "Activity created",
      message: `${activityTitle} has been created.`,
      category: "ACTIVITY",
      priority: "NORMAL",
      actionUrl: "/academy/activities",
      entityType: "ACTIVITY",
      entityId: activity._id,
      createdByUserId,
      meta: {
        activityId: String(activity._id),
        academyId: String(academyId || ""),
        activityTitle,
        trigger: "ACTIVITY_CREATED",
      },
    }),
  ]);
}

export async function notifyActivityUpdated({
  activity,
  createdByUserId = null,
} = {}) {
  if (!activity?._id) return [];

  const academyId = pickAcademyId(activity);
  const activityTitle = activity?.title || activity?.name || "Activity";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "ACTIVITY_UPDATED",
      source: "ACTIVITY_TRIGGER",
      title: "Activity updated",
      message: `${activityTitle} has been updated.`,
      category: "ACTIVITY",
      priority: "NORMAL",
      actionUrl: "/super-admin/activities",
      entityType: "ACTIVITY",
      entityId: activity._id,
      createdByUserId,
      meta: {
        activityId: String(activity._id),
        academyId: String(academyId || ""),
        activityTitle,
        trigger: "ACTIVITY_UPDATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "ACTIVITY_UPDATED",
      source: "ACTIVITY_TRIGGER",
      title: "Activity updated",
      message: `${activityTitle} has been updated.`,
      category: "ACTIVITY",
      priority: "NORMAL",
      actionUrl: "/academy/activities",
      entityType: "ACTIVITY",
      entityId: activity._id,
      createdByUserId,
      meta: {
        activityId: String(activity._id),
        academyId: String(academyId || ""),
        activityTitle,
        trigger: "ACTIVITY_UPDATED",
      },
    }),
  ]);
}

export async function notifyEventCreated({
  event,
  createdByUserId = null,
} = {}) {
  if (!event?._id) return [];

  const academyId = pickAcademyId(event);
  const eventTitle = event?.title || event?.name || "Event";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "EVENT_CREATED",
      source: "EVENT_TRIGGER",
      title: "Event created",
      message: `${eventTitle} has been created.`,
      category: "EVENT",
      priority: "NORMAL",
      actionUrl: "/super-admin/events",
      entityType: "EVENT",
      entityId: event._id,
      createdByUserId,
      meta: {
        eventId: String(event._id),
        academyId: String(academyId || ""),
        eventTitle,
        trigger: "EVENT_CREATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "EVENT_CREATED",
      source: "EVENT_TRIGGER",
      title: "Event created",
      message: `${eventTitle} has been created.`,
      category: "EVENT",
      priority: "NORMAL",
      actionUrl: "/academy/events",
      entityType: "EVENT",
      entityId: event._id,
      createdByUserId,
      meta: {
        eventId: String(event._id),
        academyId: String(academyId || ""),
        eventTitle,
        trigger: "EVENT_CREATED",
      },
    }),
  ]);
}

export async function notifyBlogCreated({ blog, createdByUserId = null } = {}) {
  if (!blog?._id) return [];

  const academyId = pickAcademyId(blog);
  const blogTitle = blog?.title || "Blog";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "BLOG_CREATED",
      source: "BLOG_TRIGGER",
      title: "Blog created",
      message: `${blogTitle} has been created.`,
      category: "BLOG",
      priority: "LOW",
      actionUrl: "/super-admin/blogs",
      entityType: "BLOG",
      entityId: blog._id,
      createdByUserId,
      meta: {
        blogId: String(blog._id),
        academyId: String(academyId || ""),
        blogTitle,
        trigger: "BLOG_CREATED",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "BLOG_CREATED",
      source: "BLOG_TRIGGER",
      title: "Blog created",
      message: `${blogTitle} has been created.`,
      category: "BLOG",
      priority: "LOW",
      actionUrl: "/academy/blogs",
      entityType: "BLOG",
      entityId: blog._id,
      createdByUserId,
      meta: {
        blogId: String(blog._id),
        academyId: String(academyId || ""),
        blogTitle,
        trigger: "BLOG_CREATED",
      },
    }),
  ]);
}

export async function notifyContentCreated({
  content,
  createdByUserId = null,
} = {}) {
  if (!content?._id) return null;

  const title = content?.title || "Content page";

  return notifySuperAdmins({
    type: "CONTENT_CREATED",
    source: "CONTENT_TRIGGER",
    title: "Content created",
    message: `${title} has been created.`,
    category: "CONTENT",
    priority: "LOW",
    actionUrl: "/super-admin/content-pages",
    entityType: "CONTENT",
    entityId: content._id,
    createdByUserId,
    meta: {
      contentId: String(content._id),
      title,
      slug: content?.slug || "",
      trigger: "CONTENT_CREATED",
    },
  });
}

export async function notifyContentUpdated({
  content,
  createdByUserId = null,
} = {}) {
  if (!content?._id) return null;

  const title = content?.title || "Content page";

  return notifySuperAdmins({
    type: "CONTENT_UPDATED",
    source: "CONTENT_TRIGGER",
    title: "Content updated",
    message: `${title} has been updated.`,
    category: "CONTENT",
    priority: "LOW",
    actionUrl: "/super-admin/content-pages",
    entityType: "CONTENT",
    entityId: content._id,
    createdByUserId,
    meta: {
      contentId: String(content._id),
      title,
      slug: content?.slug || "",
      trigger: "CONTENT_UPDATED",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* SETTLEMENT HELPERS                                                         */
/* -------------------------------------------------------------------------- */

export async function notifySettlementReady({
  settlement,
  createdByUserId = null,
} = {}) {
  if (!settlement?._id) return [];

  const academyId = pickAcademyId(settlement);
  const amount =
    settlement?.netAmount ||
    settlement?.amount ||
    settlement?.payableAmount ||
    0;
  const currency = settlement?.currency || "QAR";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "SETTLEMENT_READY",
      source: "SETTLEMENT_TRIGGER",
      title: "Settlement ready",
      message: `Settlement of ${amount} ${currency} is ready.`,
      category: "SETTLEMENT",
      priority: "HIGH",
      actionUrl: "/super-admin/settlements",
      entityType: "SETTLEMENT",
      entityId: settlement._id,
      createdByUserId,
      meta: {
        settlementId: String(settlement._id),
        academyId: String(academyId || ""),
        amount,
        currency,
        trigger: "SETTLEMENT_READY",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "SETTLEMENT_READY",
      source: "SETTLEMENT_TRIGGER",
      title: "Settlement ready",
      message: `Your settlement of ${amount} ${currency} is ready.`,
      category: "SETTLEMENT",
      priority: "HIGH",
      actionUrl: "/academy/settlements",
      entityType: "SETTLEMENT",
      entityId: settlement._id,
      createdByUserId,
      meta: {
        settlementId: String(settlement._id),
        academyId: String(academyId || ""),
        amount,
        currency,
        trigger: "SETTLEMENT_READY",
      },
    }),
  ]);
}

export async function notifySettlementPaid({
  settlement,
  createdByUserId = null,
} = {}) {
  if (!settlement?._id) return [];

  const academyId = pickAcademyId(settlement);
  const amount =
    settlement?.netAmount ||
    settlement?.amount ||
    settlement?.payableAmount ||
    0;
  const currency = settlement?.currency || "QAR";

  return createBulkNotifications([
    {
      recipientRole: "SUPER_ADMIN",
      type: "SETTLEMENT_PAID",
      source: "SETTLEMENT_TRIGGER",
      title: "Settlement paid",
      message: `Settlement of ${amount} ${currency} has been marked as paid.`,
      category: "SETTLEMENT",
      priority: "NORMAL",
      actionUrl: "/super-admin/settlements",
      entityType: "SETTLEMENT",
      entityId: settlement._id,
      createdByUserId,
      meta: {
        settlementId: String(settlement._id),
        academyId: String(academyId || ""),
        amount,
        currency,
        trigger: "SETTLEMENT_PAID",
      },
    },
    ...buildAcademyRoleRows({
      academyId,
      type: "SETTLEMENT_PAID",
      source: "SETTLEMENT_TRIGGER",
      title: "Settlement paid",
      message: `Your settlement of ${amount} ${currency} has been paid.`,
      category: "SETTLEMENT",
      priority: "HIGH",
      actionUrl: "/academy/settlements",
      entityType: "SETTLEMENT",
      entityId: settlement._id,
      createdByUserId,
      meta: {
        settlementId: String(settlement._id),
        academyId: String(academyId || ""),
        amount,
        currency,
        trigger: "SETTLEMENT_PAID",
      },
    }),
  ]);
}

/* -------------------------------------------------------------------------- */
/* MESSAGE / BROADCAST HELPERS                                                */
/* -------------------------------------------------------------------------- */

export async function notifyApprovalRequired({
  title = "Approval required",
  message = "A new item requires approval.",
  actionUrl = "/super-admin/requests",
  entityType = "",
  entityId = null,
  priority = "HIGH",
  meta = {},
  createdByUserId = null,
} = {}) {
  return notifySuperAdmins({
    type: "APPROVAL_REQUIRED",
    source: "APPROVAL_TRIGGER",
    title,
    message,
    category: "APPROVAL",
    priority,
    actionUrl,
    entityType,
    entityId,
    createdByUserId,
    meta: {
      ...normalizeMeta(meta),
      trigger: "APPROVAL_REQUIRED",
    },
  });
}

export async function notifyMessage({
  recipientRole,
  recipientUserId = null,
  academyId = null,
  title = "New message",
  message = "",
  actionUrl = "",
  priority = "NORMAL",
  entityType = "MESSAGE",
  entityId = null,
  meta = {},
  createdByUserId = null,
} = {}) {
  return createNotification({
    academyId,
    recipientUserId,
    recipientRole,
    type: "MESSAGE",
    source: "MESSAGE_TRIGGER",
    title,
    message,
    category: "MESSAGE",
    priority,
    actionUrl,
    entityType,
    entityId,
    createdByUserId,
    meta: {
      ...normalizeMeta(meta),
      trigger: "MESSAGE",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* READ / UNREAD / DELETE HELPERS                                             */
/* -------------------------------------------------------------------------- */

export async function markNotificationRead(notificationId, user = {}) {
  if (!isValidObjectId(notificationId)) return null;

  const query = buildRecipientQueryForUser(user);
  query._id = notificationId;
  query.deletedAt = null;

  return Notification.findOneAndUpdate(
    query,
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
    { new: true },
  );
}

export async function markNotificationUnread(notificationId, user = {}) {
  if (!isValidObjectId(notificationId)) return null;

  const query = buildRecipientQueryForUser(user);
  query._id = notificationId;
  query.deletedAt = null;

  return Notification.findOneAndUpdate(
    query,
    {
      $set: {
        isRead: false,
        readAt: null,
      },
    },
    { new: true },
  );
}

export async function markAllNotificationsReadForUser(user = {}) {
  const query = buildRecipientQueryForUser(user);
  query.isRead = false;
  query.deletedAt = null;

  return Notification.updateMany(query, {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function deleteNotificationForUser(notificationId, user = {}) {
  if (!isValidObjectId(notificationId)) return null;

  const query = buildRecipientQueryForUser(user);
  query._id = notificationId;
  query.deletedAt = null;

  return Notification.findOneAndUpdate(
    query,
    {
      $set: {
        deletedAt: new Date(),
      },
    },
    { new: true },
  );
}

/* -------------------------------------------------------------------------- */
/* QUERY HELPERS                                                              */
/* -------------------------------------------------------------------------- */

export function buildRecipientQueryForUser(user = {}) {
  const role = normalizeRole(user.role);
  const userId = user._id || user.id || user.userId;

  const academyId =
    user.academyId?._id ||
    user.academyId?.id ||
    user.academy?._id ||
    user.academy?.id ||
    user.assignedAcademyId?._id ||
    user.assignedAcademyId?.id ||
    user.assignedAcademyId ||
    user.academyId ||
    null;

  const query = {
    recipientRole: role,
  };

  if (role === "SUPER_ADMIN") {
    query.recipientUserId = null;
    query.academyId = null;
  } else if (role === "PARENT") {
    query.recipientUserId = normalizeObjectId(userId);
  } else if (role.startsWith("ACADEMY")) {
    query.academyId = normalizeObjectId(academyId);
  } else {
    query.recipientUserId = normalizeObjectId(userId);
  }

  return query;
}

export function buildNotificationListQueryForUser(user = {}, filters = {}) {
  const query = buildRecipientQueryForUser(user);

  query.deletedAt = null;

  const status = normalizeUpper(filters.status, "ALL");
  const category = normalizeUpper(filters.category, "ALL");
  const priority = normalizeUpper(filters.priority, "ALL");
  const search = normalizeString(filters.search);

  if (status === "READ") {
    query.isRead = true;
  }

  if (status === "UNREAD") {
    query.isRead = false;
  }

  if (category && category !== "ALL") {
    query.category = category;
  }

  if (priority && priority !== "ALL") {
    query.priority = priority;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
      { type: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { source: { $regex: search, $options: "i" } },
    ];
  }

  return query;
}

/* -------------------------------------------------------------------------- */
/* COUNTS                                                                     */
/* -------------------------------------------------------------------------- */

export async function getUnreadNotificationCountForUser(user = {}) {
  const query = buildRecipientQueryForUser(user);

  query.isRead = false;
  query.deletedAt = null;

  return Notification.countDocuments(query);
}

export async function getNotificationStatsForUser(user = {}) {
  const baseQuery = buildRecipientQueryForUser(user);
  baseQuery.deletedAt = null;

  const [total, unread, read] = await Promise.all([
    Notification.countDocuments(baseQuery),
    Notification.countDocuments({
      ...baseQuery,
      isRead: false,
    }),
    Notification.countDocuments({
      ...baseQuery,
      isRead: true,
    }),
  ]);

  return {
    total,
    unread,
    read,
  };
}

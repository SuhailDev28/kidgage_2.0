// server/src/routes/payment.routes.js
import express from "express";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendTemplateEmail } from "../services/email.service.js";

import {
  createMyFatoorahEmbeddedSession,
  getMyFatoorahClientConfig,
  isMyFatoorahConfigured,
  syncMyFatoorahPaymentStatus,
  verifyMyFatoorahEmbeddedResult,
} from "../services/payment/myfatoorah.service.js";

import Payment from "../models/Payment.js";
import Academy from "../models/Academy.js";

let Booking = null;

try {
  const mod = await import("../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    req.user = null;
    return next();
  }

  return auth(req, res, next);
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100) / 100;
}

function normalizeUpper(value, fallback = "") {
  const v = String(value || "")
    .trim()
    .toUpperCase();

  return v || fallback;
}

function normalizeStatus(value) {
  return normalizeUpper(value);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDateStart(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeDateEnd(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(23, 59, 59, 999);
  return d;
}

function buildPaymentDateFilter(req) {
  const createdAt = {};

  const from = normalizeDateStart(req.query.from || req.query.dateFrom);
  const to = normalizeDateEnd(req.query.to || req.query.dateTo);

  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  return Object.keys(createdAt).length ? createdAt : null;
}

function pickUserId(req) {
  return req?.user?._id || req?.user?.id || null;
}

function pickUserRole(req) {
  return normalizeUpper(req?.user?.role || "");
}

function pickUserAcademyId(req) {
  return (
    req?.user?.academyId?._id ||
    req?.user?.academyId?.id ||
    req?.user?.academyId ||
    req?.user?.academy?._id ||
    req?.user?.academy?.id ||
    req?.user?.academy ||
    null
  );
}

function isAcademyAdminRole(role) {
  return role === "ACADEMY_ADMIN" || role === "ADMIN";
}

function getCommissionConfig() {
  const type = normalizeUpper(
    process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE",
  );

  const value = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);

  return {
    type: type === "FIXED" ? "FIXED" : "PERCENTAGE",
    value: Number.isFinite(value) && value >= 0 ? value : 10,
  };
}

function calculateCommission(amount) {
  const safeAmount = toMoney(amount, 0);
  const config = getCommissionConfig();

  let commission = 0;

  if (config.type === "FIXED") {
    commission = config.value;
  } else {
    commission = (safeAmount * config.value) / 100;
  }

  commission = Math.min(safeAmount, Math.max(0, commission));

  return {
    kidgageCommissionType: config.type,
    kidgageCommissionValue: config.value,
    kidgageCommissionAmount: toMoney(commission, 0),
    academyPayableAmount: toMoney(safeAmount - commission, 0),
  };
}

function isGuestBooking(booking) {
  return Boolean(
    booking?.isGuestBooking ||
    booking?.guestBooking ||
    booking?.bookingSource === "GUEST" ||
    booking?.bookingType === "GUEST" ||
    booking?.guestParent?.email ||
    booking?.guestParent?.phone ||
    booking?.guestParentSnapshot?.email ||
    booking?.guestParentSnapshot?.phone,
  );
}

function canAccessBooking(req, booking) {
  const role = pickUserRole(req);
  const userId = String(pickUserId(req) || "");
  const userAcademyId = String(pickUserAcademyId(req) || "");

  if (role === "SUPER_ADMIN") return true;

  if (isAcademyAdminRole(role)) {
    return (
      String(booking?.academyId?._id || booking?.academyId || "") ===
      userAcademyId
    );
  }

  if (role === "PARENT") {
    return (
      String(booking?.parentId?._id || booking?.parentId || "") === userId ||
      String(booking?.userId?._id || booking?.userId || "") === userId
    );
  }

  return false;
}

function buildPaymentFilter(req) {
  const filter = {
    paymentReceiver: "KIDGAGE",
  };

  if (req.query.academyId && isValidObjectId(req.query.academyId)) {
    filter.academyId = req.query.academyId;
  }

  if (req.query.paymentStatus) {
    filter.paymentStatus = normalizeStatus(req.query.paymentStatus);
  }

  if (req.query.settlementStatus) {
    filter.settlementStatus = normalizeStatus(req.query.settlementStatus);
  }

  if (req.query.paymentMethod) {
    filter.paymentMethod = normalizeStatus(req.query.paymentMethod);
  }

  if (req.query.gateway) {
    filter.paymentGateway = normalizeStatus(req.query.gateway);
  }

  if (req.query.paymentGateway) {
    filter.paymentGateway = normalizeStatus(req.query.paymentGateway);
  }

  const createdAt = buildPaymentDateFilter(req);
  if (createdAt) filter.createdAt = createdAt;

  return filter;
}

function buildPaymentFilterForUser(req, baseFilter = {}) {
  const role = pickUserRole(req);
  const userId = pickUserId(req);
  const academyId = pickUserAcademyId(req);

  const filter = {
    ...baseFilter,
  };

  if (role === "SUPER_ADMIN") return filter;

  if (isAcademyAdminRole(role)) {
    filter.academyId = academyId;
    return filter;
  }

  if (role === "PARENT") {
    filter.parentId = userId;
    return filter;
  }

  filter._id = null;
  return filter;
}

async function getBookingAmount(booking, fallbackAmount = 0) {
  return toMoney(
    booking?.finalAmount ||
      booking?.totalAmount ||
      booking?.payableAmount ||
      booking?.amount ||
      booking?.price ||
      booking?.packageSnapshot?.price ||
      booking?.activitySnapshot?.price ||
      fallbackAmount,
    0,
  );
}

function getPaymentGatewayForMethod(paymentMethod) {
  if (paymentMethod === "ONLINE") return "MYFATOORAH";
  return "MANUAL";
}

function getPaymentReference(payment) {
  return (
    payment?.gatewayPaymentId ||
    payment?.gatewayOrderId ||
    payment?.gatewayInvoiceId ||
    payment?.gatewayReference ||
    ""
  );
}

function getGuestParentAsCustomer(booking) {
  const guest =
    booking?.guestParent ||
    booking?.guestParentSnapshot ||
    booking?.parentSnapshot ||
    {};

  return {
    _id: null,
    fullName:
      guest.fullName ||
      guest.name ||
      booking?.parentName ||
      booking?.customerName ||
      "KidGage Guest",
    name:
      guest.fullName ||
      guest.name ||
      booking?.parentName ||
      booking?.customerName ||
      "KidGage Guest",
    email: guest.email || booking?.parentEmail || booking?.email || "",
    phone: guest.phone || guest.mobile || booking?.parentPhone || "",
    mobile: guest.mobile || guest.phone || booking?.parentPhone || "",
  };
}

function getGuestChildAsCustomer(booking) {
  const guest =
    booking?.guestChild ||
    booking?.guestChildSnapshot ||
    booking?.childSnapshot ||
    {};

  return {
    _id: null,
    fullName:
      guest.fullName || guest.name || booking?.childName || "KidGage Child",
    name: guest.fullName || guest.name || booking?.childName || "KidGage Child",
  };
}

function normalizePaymentForClient(payment) {
  if (!payment) return null;

  const raw =
    typeof payment.toObject === "function" ? payment.toObject() : payment;

  const academy = raw.academyId || {};
  const booking = raw.bookingId || {};
  const parent = raw.parentId || {};
  const child = raw.childId || {};
  const activity = raw.activityId || {};
  const pkg = raw.packageId || {};

  const academyIsObject = academy && typeof academy === "object";
  const bookingIsObject = booking && typeof booking === "object";
  const parentIsObject = parent && typeof parent === "object";
  const childIsObject = child && typeof child === "object";
  const activityIsObject = activity && typeof activity === "object";
  const packageIsObject = pkg && typeof pkg === "object";

  const guestParent =
    raw?.meta?.guestParent ||
    booking?.guestParent ||
    booking?.guestParentSnapshot ||
    null;

  const guestChild =
    raw?.meta?.guestChild ||
    booking?.guestChild ||
    booking?.guestChildSnapshot ||
    null;

  return {
    _id: raw._id,
    id: raw._id,

    academyId: academyIsObject ? academy?._id || null : raw.academyId,
    academyName: academyIsObject ? academy?.name || "Academy" : "Academy",
    academyCity: academyIsObject ? academy?.city || "" : "",
    academyLogo: academyIsObject ? academy?.logo || "" : "",

    bookingId: bookingIsObject ? booking?._id || null : raw.bookingId,
    bookingNo: bookingIsObject
      ? booking?.bookingNo || booking?.referenceNo || ""
      : "",

    parentId: parentIsObject ? parent?._id || null : raw.parentId,
    parentName: parentIsObject
      ? parent?.fullName ||
        parent?.name ||
        guestParent?.fullName ||
        guestParent?.name ||
        raw?.meta?.parentName ||
        "Parent / Guest"
      : raw?.meta?.parentName ||
        guestParent?.fullName ||
        guestParent?.name ||
        "Parent / Guest",
    parentEmail: parentIsObject
      ? parent?.email || guestParent?.email || raw?.meta?.parentEmail || ""
      : raw?.meta?.parentEmail || guestParent?.email || "",
    parentPhone: parentIsObject
      ? parent?.phone || guestParent?.phone || ""
      : guestParent?.phone || "",

    childId: childIsObject ? child?._id || null : raw.childId,
    childName: childIsObject
      ? child?.fullName ||
        child?.name ||
        child?.childName ||
        guestChild?.fullName ||
        guestChild?.name ||
        ""
      : guestChild?.fullName || guestChild?.name || "",

    activityId: activityIsObject ? activity?._id || null : raw.activityId,
    activityName: activityIsObject
      ? activity?.title || activity?.name || "Activity"
      : "Activity",

    packageId: packageIsObject ? pkg?._id || null : raw.packageId,
    packageName: packageIsObject
      ? pkg?.title || pkg?.name || "Package"
      : "Package",

    paymentMethod: raw.paymentMethod || "CASH",

    amount: toMoney(raw.amount, 0),
    currency: raw.currency || "QAR",

    paymentReceiver: raw.paymentReceiver || "KIDGAGE",
    paymentGateway: raw.paymentGateway || "MANUAL",

    gatewayOrderId: raw.gatewayOrderId || "",
    gatewayInvoiceId: raw.gatewayInvoiceId || "",
    gatewayPaymentId: raw.gatewayPaymentId || "",
    gatewayReference: raw.gatewayReference || "",
    gatewayCheckoutUrl: raw.gatewayCheckoutUrl || "",
    gatewaySessionId: raw.gatewaySessionId || "",

    paymentStatus: raw.paymentStatus || raw.status || "PENDING",
    status: raw.status || raw.paymentStatus || "PENDING",
    gatewayStatus: raw.gatewayStatus || "",
    settlementStatus: raw.settlementStatus || "PENDING",

    kidgageCommissionType: raw.kidgageCommissionType || "PERCENTAGE",
    kidgageCommissionValue: toMoney(raw.kidgageCommissionValue, 0),
    kidgageCommissionAmount: toMoney(raw.kidgageCommissionAmount, 0),
    academyPayableAmount: toMoney(raw.academyPayableAmount, 0),

    paidAt: raw.paidAt || null,
    failedAt: raw.failedAt || null,
    cancelledAt: raw.cancelledAt || null,
    refundedAt: raw.refundedAt || null,

    confirmedBy: raw.confirmedBy || null,
    confirmedAt: raw.confirmedAt || null,

    notes: raw.notes || "",
    meta: raw.meta || {},

    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

async function syncBookingPaymentSuccess(payment, extra = {}) {
  if (!Booking || !payment?.bookingId) return null;

  return Booking.findOneAndUpdate(
    {
      _id: payment.bookingId,
      academyId: payment.academyId,
    },
    {
      $set: {
        bookingStatus: "CONFIRMED",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: payment.paymentMethod || "ONLINE",
        paymentGateway: payment.paymentGateway || "MYFATOORAH",
        paymentReference: getPaymentReference(payment),
        paymentId: payment._id,
        paidAt: payment.paidAt || new Date(),
        expiresAt: null,
        cancelledAt: null,
        ...extra,
      },
    },
    { new: true },
  );
}

async function syncBookingPaymentFailed(payment, extra = {}) {
  if (!Booking || !payment?.bookingId) return null;

  return Booking.findOneAndUpdate(
    {
      _id: payment.bookingId,
      academyId: payment.academyId,
    },
    {
      $set: {
        bookingStatus: "PENDING",
        paymentStatus: "FAILED",
        paymentMethod: payment.paymentMethod || "ONLINE",
        paymentGateway: payment.paymentGateway || "MYFATOORAH",
        paymentId: payment._id,
        ...extra,
      },
    },
    { new: true },
  );
}

function populatePaymentQuery(query) {
  return query
    .populate("academyId", "name logo city email")
    .populate(
      "bookingId",
      "bookingNo referenceNo bookingStatus paymentStatus createdAt guestParent guestParentSnapshot parentEmail bookingSource isGuestBooking",
    )
    .populate("parentId", "fullName name email phone")
    .populate("childId", "fullName name childName")
    .populate("activityId", "title name")
    .populate("packageId", "title name price currency");
}

function pickPaymentEmail(payment, booking = null, parent = null) {
  return String(
    parent?.email ||
      booking?.guestParent?.email ||
      booking?.guestParentSnapshot?.email ||
      booking?.parentEmail ||
      payment?.parentId?.email ||
      payment?.meta?.parentEmail ||
      payment?.meta?.guestParent?.email ||
      "",
  )
    .trim()
    .toLowerCase();
}

function pickPaymentParentName(payment, booking = null, parent = null) {
  return (
    parent?.fullName ||
    parent?.name ||
    booking?.guestParent?.fullName ||
    booking?.guestParent?.name ||
    booking?.guestParentSnapshot?.fullName ||
    booking?.guestParentSnapshot?.name ||
    payment?.parentId?.fullName ||
    payment?.parentId?.name ||
    payment?.meta?.parentName ||
    payment?.meta?.guestParent?.fullName ||
    payment?.meta?.guestParent?.name ||
    "Parent"
  );
}

function pickPaymentBookingNo(payment, booking = null) {
  return (
    booking?.bookingNo ||
    booking?.referenceNo ||
    payment?.bookingId?.bookingNo ||
    payment?.bookingId?.referenceNo ||
    String(payment?._id || "")
  );
}

async function sendPaymentEmailSafe({
  payment,
  booking = null,
  parent = null,
  type = "CREATED",
}) {
  try {
    const to = pickPaymentEmail(payment, booking, parent);

    if (!to) {
      return {
        skipped: true,
        reason: "Recipient email missing",
      };
    }

    const parentName = escapeHtml(
      pickPaymentParentName(payment, booking, parent),
    );
    const bookingNo = escapeHtml(pickPaymentBookingNo(payment, booking));
    const amount = `${payment?.currency || "QAR"} ${toMoney(
      payment?.amount,
      0,
    ).toFixed(2)}`;
    const paymentMethod = escapeHtml(payment?.paymentMethod || "CASH");
    const paymentStatus = escapeHtml(payment?.paymentStatus || "PENDING");

    let subject = "KidGage payment update";
    let title = "Payment Update";
    let preview = "Your KidGage payment has been updated.";
    let message = "";

    if (type === "CREATED") {
      subject = "KidGage payment created";
      title = "Payment Created";
      preview = "Your KidGage payment has been created.";
      message = `
        <p style="margin:0 0 12px;">Hi ${parentName},</p>
        <p style="margin:0 0 12px;">Your KidGage payment has been created for booking <strong>${bookingNo}</strong>.</p>
        <p style="margin:0 0 12px;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
        <p style="margin:0;"><strong>Payment method:</strong> ${paymentMethod}</p>
      `;
    }

    if (type === "PAID") {
      subject = "KidGage payment confirmed";
      title = "Payment Confirmed";
      preview = "Your KidGage payment has been confirmed.";
      message = `
        <p style="margin:0 0 12px;">Hi ${parentName},</p>
        <p style="margin:0 0 12px;">Your payment for booking <strong>${bookingNo}</strong> has been confirmed successfully.</p>
        <p style="margin:0 0 12px;"><strong>Amount paid:</strong> ${escapeHtml(amount)}</p>
        <p style="margin:0;">Your booking is now confirmed.</p>
      `;
    }

    if (type === "FAILED") {
      subject = "KidGage payment failed";
      title = "Payment Failed";
      preview = "Your KidGage payment could not be completed.";
      message = `
        <p style="margin:0 0 12px;">Hi ${parentName},</p>
        <p style="margin:0 0 12px;">Your payment for booking <strong>${bookingNo}</strong> could not be completed.</p>
        <p style="margin:0 0 12px;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
        <p style="margin:0;">Please try again or contact KidGage support.</p>
      `;
    }

    return await sendTemplateEmail({
      to,
      subject,
      title,
      preview,
      greeting: "Hello,",
      message,
      buttonText: "Open KidGage",
      buttonUrl: process.env.CLIENT_URL || "http://localhost:5173",
      footer: `Payment status: ${paymentStatus}`,
    });
  } catch (error) {
    console.error("Payment email failed:", error?.message || error);

    return {
      skipped: false,
      failed: true,
      message: error?.message || "Payment email failed",
    };
  }
}

async function loadPaymentEmailContext(payment) {
  if (!payment) return { booking: null, parent: null };

  let booking = null;

  const bookingId =
    typeof payment.bookingId === "object"
      ? payment.bookingId?._id
      : payment.bookingId;

  if (Booking && bookingId && isValidObjectId(bookingId)) {
    booking = await Booking.findById(bookingId)
      .lean()
      .catch(() => null);
  }

  return {
    booking,
    parent: null,
  };
}

async function createOrReusePaymentForBooking({
  req,
  booking,
  paymentMethod = "ONLINE",
  guest = false,
}) {
  const academyId =
    booking.academyId?._id || booking.academyId || req.body.academyId;

  if (!academyId || !isValidObjectId(academyId)) {
    const err = new Error("Invalid academy id");
    err.statusCode = 400;
    throw err;
  }

  const amount = await getBookingAmount(booking, req.body.amount);

  if (amount <= 0) {
    const err = new Error("Payment amount must be greater than zero");
    err.statusCode = 400;
    throw err;
  }

  const currency = normalizeUpper(
    booking.currency || req.body.currency || "QAR",
    "QAR",
  );

  const commission = calculateCommission(amount);
  const paymentGateway = getPaymentGatewayForMethod(paymentMethod);

  const guestParent = getGuestParentAsCustomer(booking);
  const guestChild = getGuestChildAsCustomer(booking);

  const parentEmail = guest
    ? guestParent.email
    : booking?.guestParent?.email ||
      booking?.guestParentSnapshot?.email ||
      booking?.parentEmail ||
      booking?.parentId?.email ||
      req?.user?.email ||
      "";

  const parentName = guest
    ? guestParent.fullName || guestParent.name
    : booking?.guestParent?.fullName ||
      booking?.guestParent?.name ||
      booking?.guestParentSnapshot?.fullName ||
      booking?.parentId?.fullName ||
      booking?.parentId?.name ||
      req?.user?.fullName ||
      req?.user?.name ||
      "";

  let payment = await Payment.findOne({
    bookingId: booking._id,
  });

  if (payment) {
    if (payment.paymentStatus === "PAID") {
      return {
        payment,
        alreadyPaid: true,
      };
    }

    payment.paymentMethod = paymentMethod;
    payment.paymentGateway = paymentGateway;
    payment.amount = amount;
    payment.currency = currency;
    payment.status = "PENDING";
    payment.paymentStatus = "PENDING";
    payment.gatewayStatus = "PENDING";
    payment.settlementStatus = "PENDING";
    payment.failedAt = null;
    payment.cancelledAt = null;
    payment.refundedAt = null;

    payment.kidgageCommissionType = commission.kidgageCommissionType;
    payment.kidgageCommissionValue = commission.kidgageCommissionValue;
    payment.kidgageCommissionAmount = commission.kidgageCommissionAmount;
    payment.academyPayableAmount = commission.academyPayableAmount;

    payment.meta = {
      ...(payment.meta || {}),
      source: "KIDGAGE_PLATFORM_PAYMENT",
      retryFrom: guest ? "GUEST_BOOKING" : "AUTH_BOOKING",
      retriedAt: new Date(),
      requestedPaymentMethod: paymentMethod,
      parentEmail,
      parentName,
      guestParent: guest ? guestParent : payment.meta?.guestParent || null,
      guestChild: guest ? guestChild : payment.meta?.guestChild || null,
    };

    await payment.save();

    return {
      payment,
      alreadyPaid: false,
    };
  }

  const academy = await Academy.findById(academyId).lean();

  if (!academy) {
    const err = new Error("Academy not found");
    err.statusCode = 404;
    throw err;
  }

  payment = await Payment.create({
    academyId,
    bookingId: booking._id,
    parentId: guest
      ? null
      : booking.parentId?._id ||
        booking.parentId ||
        booking.userId ||
        pickUserId(req) ||
        null,
    childId: guest ? null : booking.childId?._id || booking.childId || null,
    activityId: booking.activityId?._id || booking.activityId || null,
    packageId: booking.packageId?._id || booking.packageId || null,

    paymentMethod,
    amount,
    currency,

    paymentReceiver: "KIDGAGE",
    paymentGateway,

    status: "PENDING",
    paymentStatus: "PENDING",
    gatewayStatus: "PENDING",
    settlementStatus: "PENDING",

    ...commission,

    meta: {
      source: "KIDGAGE_PLATFORM_PAYMENT",
      createdFrom: guest ? "GUEST_BOOKING" : "AUTH_BOOKING",
      academyName: academy.name || "",
      createdByRole: pickUserRole(req) || (guest ? "GUEST" : ""),
      createdByUserId: pickUserId(req),
      requestedPaymentMethod: paymentMethod,
      parentEmail,
      parentName,
      guestParent: guest ? guestParent : null,
      guestChild: guest ? guestChild : null,
    },
  });

  booking.paymentStatus = "PENDING";
  booking.paymentMethod = paymentMethod;
  booking.paymentGateway = paymentGateway;
  booking.paymentId = payment._id;

  if (!booking.bookingStatus) {
    booking.bookingStatus = "PENDING";
  }

  await booking.save();

  return {
    payment,
    alreadyPaid: false,
  };
}

async function findPaymentForVerifyAccess({
  req,
  localPaymentId = "",
  bookingId = "",
  paymentId = "",
  invoiceId = "",
}) {
  let payment = null;

  if (localPaymentId && isValidObjectId(localPaymentId)) {
    payment = await Payment.findById(localPaymentId);
  }

  if (!payment && bookingId && isValidObjectId(bookingId)) {
    payment = await Payment.findOne({ bookingId });
  }

  if (!payment && paymentId) {
    payment = await Payment.findOne({
      $or: [
        { gatewayPaymentId: String(paymentId) },
        { gatewayReference: String(paymentId) },
        { "meta.myfatoorahPaymentId": String(paymentId) },
      ],
    });
  }

  if (!payment && invoiceId) {
    payment = await Payment.findOne({
      $or: [
        { gatewayOrderId: String(invoiceId) },
        { gatewayInvoiceId: String(invoiceId) },
        { gatewayReference: String(invoiceId) },
        { "meta.myfatoorahInvoiceId": String(invoiceId) },
      ],
    });
  }

  if (!payment) {
    const error = new Error("Payment not found");
    error.statusCode = 404;
    throw error;
  }

  let booking = null;

  if (Booking && payment.bookingId) {
    booking = await Booking.findById(payment.bookingId)
      .populate("academyId")
      .populate("parentId")
      .populate("childId");
  }

  if (!booking) {
    return {
      payment,
      booking: null,
    };
  }

  const guest = isGuestBooking(booking);
  const guestToken = String(
    req.body?.guestToken ||
      req.query?.guestToken ||
      req.body?.token ||
      req.query?.token ||
      "",
  ).trim();

  if (guest && booking.guestPaymentToken) {
    if (!guestToken || guestToken !== String(booking.guestPaymentToken)) {
      const error = new Error("Invalid guest payment token");
      error.statusCode = 403;
      throw error;
    }
  }

  if (!guest && !canAccessBooking(req, booking)) {
    const error = new Error("You are not allowed to verify this payment");
    error.statusCode = 403;
    throw error;
  }

  return {
    payment,
    booking,
  };
}

async function initializeMyFatoorahEmbeddedSession({
  req,
  bookingId,
  guestToken = "",
}) {
  if (!Booking) {
    const error = new Error("Booking model not available");
    error.statusCode = 500;
    throw error;
  }

  if (!isValidObjectId(bookingId)) {
    const error = new Error("Valid bookingId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!isMyFatoorahConfigured()) {
    const error = new Error(
      "MyFatoorah is not configured. Please add MYFATOORAH_TOKEN in server/.env.",
    );
    error.statusCode = 500;
    throw error;
  }

  const booking = await Booking.findById(bookingId)
    .populate("academyId")
    .populate("parentId")
    .populate("childId")
    .populate("activityId")
    .populate("packageId");

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.paymentStatus === "PAID") {
    const payment = await Payment.findOne({ bookingId: booking._id });

    return {
      guest: isGuestBooking(booking),
      booking,
      payment,
      alreadyPaid: true,
      embedded: null,
    };
  }

  const guest = isGuestBooking(booking);
  const role = pickUserRole(req);
  const isAdmin =
    role === "SUPER_ADMIN" || role === "ACADEMY_ADMIN" || role === "ADMIN";

  if (!guest && !isAdmin && !canAccessBooking(req, booking)) {
    const error = new Error("You are not allowed to pay for this booking");
    error.statusCode = 403;
    throw error;
  }

  if (guest && booking.guestPaymentToken) {
    if (!guestToken || guestToken !== String(booking.guestPaymentToken)) {
      const error = new Error("Invalid guest payment token");
      error.statusCode = 403;
      throw error;
    }
  }

  const { payment, alreadyPaid } = await createOrReusePaymentForBooking({
    req,
    booking,
    paymentMethod: "ONLINE",
    guest,
  });

  if (alreadyPaid || payment.paymentStatus === "PAID") {
    return {
      guest,
      booking,
      payment,
      alreadyPaid: true,
      embedded: null,
    };
  }

  const embedded = await createMyFatoorahEmbeddedSession({
    payment,
    booking,
    parent: guest
      ? getGuestParentAsCustomer(booking)
      : booking.parentId || req.user || {},
    child: guest ? getGuestChildAsCustomer(booking) : booking.childId || {},
  });

  return {
    guest,
    booking,
    payment,
    alreadyPaid: false,
    embedded,
  };
}

async function sendPaymentStatusEmailFromResult(result) {
  if (
    !result?.previousStatus ||
    result.previousStatus === result.status ||
    !["PAID", "FAILED"].includes(result.status)
  ) {
    return null;
  }

  return sendPaymentEmailSafe({
    payment: result.payment,
    booking: result.booking,
    type: result.status,
  });
}

/* -------------------------------------------------------------------------- */
/* PUBLIC / OPTIONAL AUTH: MYFATOORAH CONFIG + SESSION + VERIFY               */
/* -------------------------------------------------------------------------- */

router.get("/myfatoorah/config", optionalAuth, async (_req, res, next) => {
  try {
    return res.json({
      success: true,
      configured: isMyFatoorahConfigured(),
      myfatoorah: getMyFatoorahClientConfig(),
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/myfatoorah/session/:bookingId",
  optionalAuth,
  async (req, res, next) => {
    try {
      const guestToken = String(
        req.query.guestToken || req.query.token || "",
      ).trim();

      const result = await initializeMyFatoorahEmbeddedSession({
        req,
        bookingId: req.params.bookingId,
        guestToken,
      });

      return res.json({
        success: true,
        message: result.alreadyPaid
          ? "Payment already paid"
          : "MyFatoorah embedded session created successfully",
        guest: result.guest,
        alreadyPaid: result.alreadyPaid,
        bookingId: result.booking?._id || req.params.bookingId,
        payment: normalizePaymentForClient(result.payment),
        myfatoorah: result.embedded,
        nextAction: result.alreadyPaid ? "ALREADY_PAID" : "MYFATOORAH_EMBED",
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          details: error.details || undefined,
        });
      }

      next(error);
    }
  },
);

router.post("/myfatoorah/session", optionalAuth, async (req, res, next) => {
  try {
    const bookingId = String(req.body.bookingId || "").trim();

    const guestToken = String(
      req.body.guestToken ||
        req.body.token ||
        req.query.guestToken ||
        req.query.token ||
        "",
    ).trim();

    const result = await initializeMyFatoorahEmbeddedSession({
      req,
      bookingId,
      guestToken,
    });

    return res.json({
      success: true,
      message: result.alreadyPaid
        ? "Payment already paid"
        : "MyFatoorah embedded session created successfully",
      guest: result.guest,
      alreadyPaid: result.alreadyPaid,
      bookingId: result.booking?._id || bookingId,
      payment: normalizePaymentForClient(result.payment),
      myfatoorah: result.embedded,
      nextAction: result.alreadyPaid ? "ALREADY_PAID" : "MYFATOORAH_EMBED",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    next(error);
  }
});

router.post("/myfatoorah/verify", optionalAuth, async (req, res, next) => {
  try {
    const localPaymentId = String(
      req.body.localPaymentId ||
        req.body.paymentRecordId ||
        req.body.paymentId ||
        req.query.localPaymentId ||
        req.query.paymentRecordId ||
        "",
    ).trim();

    const gatewayPaymentId = String(
      req.body.gatewayPaymentId ||
        req.body.myfatoorahPaymentId ||
        req.body.PaymentId ||
        req.body.payment_id ||
        "",
    ).trim();

    const invoiceId = String(
      req.body.invoiceId ||
        req.body.InvoiceId ||
        req.body.myfatoorahInvoiceId ||
        "",
    ).trim();

    const bookingId = String(
      req.body.bookingId || req.query.bookingId || "",
    ).trim();

    const sessionId = String(
      req.body.sessionId || req.body.SessionId || "",
    ).trim();

    const paymentData = String(
      req.body.paymentData || req.body.PaymentData || "",
    ).trim();

    if (!localPaymentId && !gatewayPaymentId && !invoiceId && !bookingId) {
      return res.status(400).json({
        success: false,
        message:
          "localPaymentId, gatewayPaymentId, invoiceId, or bookingId is required to verify MyFatoorah payment",
      });
    }

    const access = await findPaymentForVerifyAccess({
      req,
      localPaymentId,
      bookingId,
      paymentId: gatewayPaymentId,
      invoiceId,
    });

    const effectiveLocalPaymentId =
      localPaymentId || String(access.payment._id);

    const result = paymentData
      ? await verifyMyFatoorahEmbeddedResult({
          localPaymentId: effectiveLocalPaymentId,
          sessionId,
          paymentData,
          rawPayload: req.body,
        })
      : await syncMyFatoorahPaymentStatus({
          localPaymentId: effectiveLocalPaymentId,
          paymentId: gatewayPaymentId,
          invoiceId,
          rawPayload: req.body,
        });

    const emailResult = await sendPaymentStatusEmailFromResult(result);

    return res.json({
      success: true,
      paid: Boolean(result.paid),
      status: result.status,
      previousStatus: result.previousStatus,
      payment: normalizePaymentForClient(result.payment),
      booking: result.booking || null,
      myfatoorah: result.myfatoorah || null,
      email: emailResult,
      redirectUrl: result.booking?._id
        ? `/payment/success/${result.booking._id}`
        : "",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    next(error);
  }
});

router.post("/myfatoorah/sync", optionalAuth, async (req, res, next) => {
  try {
    const localPaymentId = String(
      req.body.localPaymentId ||
        req.body.paymentRecordId ||
        req.body.paymentId ||
        req.query.localPaymentId ||
        req.query.paymentRecordId ||
        "",
    ).trim();

    const gatewayPaymentId = String(
      req.body.gatewayPaymentId ||
        req.body.myfatoorahPaymentId ||
        req.body.PaymentId ||
        req.body.payment_id ||
        "",
    ).trim();

    const invoiceId = String(
      req.body.invoiceId ||
        req.body.InvoiceId ||
        req.body.myfatoorahInvoiceId ||
        "",
    ).trim();

    const bookingId = String(
      req.body.bookingId || req.query.bookingId || "",
    ).trim();

    if (!localPaymentId && !gatewayPaymentId && !invoiceId && !bookingId) {
      return res.status(400).json({
        success: false,
        message:
          "localPaymentId, gatewayPaymentId, invoiceId, or bookingId is required to sync MyFatoorah payment",
      });
    }

    const access = await findPaymentForVerifyAccess({
      req,
      localPaymentId,
      bookingId,
      paymentId: gatewayPaymentId,
      invoiceId,
    });

    const effectiveLocalPaymentId =
      localPaymentId || String(access.payment._id);

    const result = await syncMyFatoorahPaymentStatus({
      localPaymentId: effectiveLocalPaymentId,
      paymentId: gatewayPaymentId,
      invoiceId,
      rawPayload: req.body,
    });

    const emailResult = await sendPaymentStatusEmailFromResult(result);

    return res.json({
      success: true,
      paid: Boolean(result.paid),
      status: result.status,
      previousStatus: result.previousStatus,
      payment: normalizePaymentForClient(result.payment),
      booking: result.booking || null,
      myfatoorah: result.myfatoorah || null,
      email: emailResult,
      redirectUrl: result.booking?._id
        ? `/payment/success/${result.booking._id}`
        : "",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PUBLIC / OPTIONAL AUTH: GUEST + PARENT ONLINE PAYMENT INIT                 */
/* -------------------------------------------------------------------------- */

router.post("/myfatoorah/checkout", optionalAuth, async (req, res, next) => {
  try {
    if (!Booking) {
      return res.status(500).json({
        message: "Booking model not available",
      });
    }

    const bookingId = String(req.body.bookingId || "").trim();

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        message: "Valid bookingId is required",
      });
    }

    const guestToken = String(
      req.body.guestToken || req.query.guestToken || req.body.token || "",
    ).trim();

    const result = await initializeMyFatoorahEmbeddedSession({
      req,
      bookingId,
      guestToken,
    });

    if (result.alreadyPaid) {
      return res.json({
        success: true,
        message: "Payment already paid",
        guest: result.guest,
        payment: normalizePaymentForClient(result.payment),
        paymentUrl: null,
        checkoutUrl: null,
        paymentPage: null,
        myfatoorah: null,
        nextAction: "ALREADY_PAID",
      });
    }

    const paymentPage = `/payment/myfatoorah/${result.booking._id}${
      result.guest && guestToken
        ? `?guestToken=${encodeURIComponent(guestToken)}`
        : ""
    }`;

    return res.json({
      success: true,
      message:
        "Online payment initialized. Continue to embedded MyFatoorah payment.",
      guest: result.guest,
      payment: normalizePaymentForClient(result.payment),
      paymentUrl: null,
      checkoutUrl: null,
      paymentPage,
      myfatoorah: result.embedded,
      nextAction: "MYFATOORAH_EMBED",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
        details: error.details || undefined,
      });
    }

    if (String(error?.code) === "11000") {
      const payment = await Payment.findOne({
        bookingId: req.body.bookingId,
      }).lean();

      return res.json({
        success: true,
        message: "Payment already exists for this booking",
        payment: normalizePaymentForClient(payment),
        paymentUrl: null,
        checkoutUrl: null,
        paymentPage: `/payment/myfatoorah/${req.body.bookingId}`,
        nextAction: "MYFATOORAH_EMBED",
      });
    }

    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PROTECTED ROUTES BELOW                                                     */
/* -------------------------------------------------------------------------- */

router.use(auth);

/* -------------------------------------------------------------------------- */
/* CREATE PAYMENT                                                             */
/* -------------------------------------------------------------------------- */

router.post(
  "/create",
  requireRole("PARENT", "ACADEMY_ADMIN", "ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      if (!Booking) {
        return res.status(500).json({
          message: "Booking model not available",
        });
      }

      const bookingId = String(req.body.bookingId || "").trim();

      if (!isValidObjectId(bookingId)) {
        return res.status(400).json({
          message: "Valid bookingId is required",
        });
      }

      const paymentMethod = normalizeUpper(
        req.body.paymentMethod || req.body.method || "CASH",
        "CASH",
      );

      if (!["CASH", "ONLINE"].includes(paymentMethod)) {
        return res.status(400).json({
          message: "paymentMethod must be CASH or ONLINE",
        });
      }

      const booking = await Booking.findById(bookingId)
        .populate("academyId")
        .populate("parentId")
        .populate("childId")
        .populate("activityId")
        .populate("packageId");

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      if (!canAccessBooking(req, booking)) {
        return res.status(403).json({
          message: "You are not allowed to create payment for this booking",
        });
      }

      const guest = isGuestBooking(booking);

      const { payment, alreadyPaid } = await createOrReusePaymentForBooking({
        req,
        booking,
        paymentMethod,
        guest,
      });

      let paymentPage = null;
      let embedded = null;
      let nextAction =
        payment.paymentMethod === "ONLINE"
          ? "MYFATOORAH_EMBED"
          : "CASH_PENDING";

      if (payment.paymentMethod === "ONLINE") {
        if (alreadyPaid || payment.paymentStatus === "PAID") {
          return res.json({
            message: "Payment already paid",
            payment: normalizePaymentForClient(payment),
            paymentUrl: null,
            checkoutUrl: null,
            paymentPage: null,
            myfatoorah: null,
            nextAction: "ALREADY_PAID",
          });
        }

        if (!isMyFatoorahConfigured()) {
          return res.status(500).json({
            message:
              "MyFatoorah is not configured. Please add MYFATOORAH_TOKEN in server/.env.",
          });
        }

        paymentPage = `/payment/myfatoorah/${booking._id}`;

        embedded = await createMyFatoorahEmbeddedSession({
          payment,
          booking,
          parent: guest
            ? getGuestParentAsCustomer(booking)
            : booking.parentId || req.user || {},
          child: guest
            ? getGuestChildAsCustomer(booking)
            : booking.childId || {},
        });
      }

      const context = await loadPaymentEmailContext(payment);
      const emailResult = await sendPaymentEmailSafe({
        payment,
        booking: context.booking || booking,
        parent: guest ? getGuestParentAsCustomer(booking) : req.user,
        type: "CREATED",
      });

      return res.status(201).json({
        message:
          payment.paymentMethod === "ONLINE"
            ? "Online payment created successfully. Continue to embedded MyFatoorah payment."
            : "Cash payment created successfully. Please pay at academy.",
        payment: normalizePaymentForClient(payment),
        paymentUrl: null,
        checkoutUrl: null,
        paymentPage,
        myfatoorah: embedded,
        nextAction,
        email: emailResult,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
          details: error.details || undefined,
        });
      }

      if (String(error?.code) === "11000") {
        const payment = await Payment.findOne({
          bookingId: req.body.bookingId,
        }).lean();

        return res.json({
          message: "Payment already exists for this booking",
          payment: normalizePaymentForClient(payment),
          paymentUrl: null,
          checkoutUrl: null,
          paymentPage: `/payment/myfatoorah/${req.body.bookingId}`,
          nextAction: "MYFATOORAH_EMBED",
        });
      }

      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* CASH CONFIRMATION                                                          */
/* -------------------------------------------------------------------------- */

router.patch(
  "/:id/confirm-cash",
  requireRole("ACADEMY_ADMIN", "ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid payment id",
        });
      }

      let updatedPayment = null;
      let alreadyPaid = false;

      await session.withTransaction(async () => {
        const payment = await Payment.findById(id).session(session);

        if (!payment) {
          throw Object.assign(new Error("Payment not found"), {
            statusCode: 404,
          });
        }

        const role = pickUserRole(req);
        const userAcademyId = String(pickUserAcademyId(req) || "");

        if (
          role !== "SUPER_ADMIN" &&
          String(payment.academyId || "") !== userAcademyId
        ) {
          throw Object.assign(
            new Error("You are not allowed to confirm this payment"),
            { statusCode: 403 },
          );
        }

        if (payment.paymentMethod !== "CASH") {
          throw Object.assign(
            new Error("Only CASH payments can be confirmed manually"),
            { statusCode: 400 },
          );
        }

        if (payment.paymentStatus === "PAID") {
          alreadyPaid = true;
          updatedPayment = payment;
          return;
        }

        payment.status = "PAID";
        payment.paymentStatus = "PAID";
        payment.gatewayStatus = "PAID";
        payment.settlementStatus = "READY";
        payment.paymentGateway = "MANUAL";
        payment.confirmedBy = pickUserId(req);
        payment.confirmedAt = new Date();
        payment.paidAt = payment.paidAt || new Date();
        payment.notes = String(
          req.body.notes || payment.notes || "Cash received",
        );

        payment.meta = {
          ...(payment.meta || {}),
          cashConfirmedByRole: pickUserRole(req),
          cashConfirmedByUserId: pickUserId(req),
          cashConfirmedAt: new Date(),
        };

        await payment.save({ session });

        if (Booking) {
          await Booking.findOneAndUpdate(
            {
              _id: payment.bookingId,
              academyId: payment.academyId,
            },
            {
              $set: {
                bookingStatus: "CONFIRMED",
                status: "CONFIRMED",
                paymentStatus: "PAID",
                paymentMethod: "CASH",
                paymentGateway: "MANUAL",
                paymentReference: getPaymentReference(payment),
                paymentId: payment._id,
                paidAt: payment.paidAt || new Date(),
                expiresAt: null,
              },
            },
            { new: true, session },
          );
        }

        updatedPayment = payment;
      });

      const emailResult = alreadyPaid
        ? null
        : await sendPaymentEmailSafe({
            payment: updatedPayment,
            type: "PAID",
          });

      return res.json({
        message: alreadyPaid
          ? "Cash payment is already confirmed"
          : "Cash payment confirmed successfully",
        payment: normalizePaymentForClient(updatedPayment),
        email: emailResult,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);

/* -------------------------------------------------------------------------- */
/* MARK PAID / FAILED                                                         */
/* -------------------------------------------------------------------------- */

async function markPaymentPaidHandler(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payment id",
      });
    }

    let updatedPayment = null;
    let alreadyPaid = false;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(id).session(session);

      if (!payment) {
        throw Object.assign(new Error("Payment not found"), {
          statusCode: 404,
        });
      }

      if (payment.paymentStatus === "PAID") {
        alreadyPaid = true;
        updatedPayment = payment;
        return;
      }

      payment.status = "PAID";
      payment.paymentStatus = "PAID";
      payment.gatewayStatus = "PAID";
      payment.settlementStatus = "READY";

      payment.gatewayPaymentId = String(
        req.body.gatewayPaymentId || payment.gatewayPaymentId || "",
      ).trim();

      payment.gatewayReference = String(
        req.body.gatewayReference || payment.gatewayReference || "",
      ).trim();

      payment.paidAt = payment.paidAt || new Date();
      payment.failedAt = null;
      payment.cancelledAt = null;
      payment.refundedAt = null;

      if (payment.paymentMethod === "CASH") {
        payment.paymentGateway = "MANUAL";
        payment.confirmedBy = pickUserId(req);
        payment.confirmedAt = payment.confirmedAt || new Date();
      }

      payment.meta = {
        ...(payment.meta || {}),
        manuallyMarkedPaidBy: pickUserId(req),
        manuallyMarkedPaidAt: new Date(),
      };

      await payment.save({ session });

      if (Booking) {
        await Booking.findOneAndUpdate(
          {
            _id: payment.bookingId,
            academyId: payment.academyId,
          },
          {
            $set: {
              bookingStatus: "CONFIRMED",
              status: "CONFIRMED",
              paymentStatus: "PAID",
              paymentMethod: payment.paymentMethod,
              paymentGateway: payment.paymentGateway,
              paymentReference: getPaymentReference(payment),
              paymentId: payment._id,
              paidAt: payment.paidAt,
              expiresAt: null,
            },
          },
          { new: true, session },
        );
      }

      updatedPayment = payment;
    });

    const emailResult = alreadyPaid
      ? null
      : await sendPaymentEmailSafe({
          payment: updatedPayment,
          type: "PAID",
        });

    return res.json({
      message: alreadyPaid
        ? "Payment is already marked as paid"
        : "Payment marked as paid successfully",
      payment: normalizePaymentForClient(updatedPayment),
      email: emailResult,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    next(error);
  } finally {
    await session.endSession();
  }
}

router.post(
  "/:id/mark-paid",
  requireRole("SUPER_ADMIN"),
  markPaymentPaidHandler,
);

router.patch(
  "/:id/mark-paid",
  requireRole("SUPER_ADMIN"),
  markPaymentPaidHandler,
);

router.post(
  "/:id/mark-failed",
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid payment id",
        });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      payment.status = "FAILED";
      payment.paymentStatus = "FAILED";
      payment.gatewayStatus = "FAILED";
      payment.settlementStatus = "CANCELLED";
      payment.gatewayReference = String(
        req.body.gatewayReference || payment.gatewayReference || "",
      );
      payment.failedAt = new Date();
      payment.notes = String(req.body.notes || payment.notes || "");

      payment.meta = {
        ...(payment.meta || {}),
        failedMarkedBy: pickUserId(req),
        failedMarkedAt: new Date(),
      };

      await payment.save();
      await syncBookingPaymentFailed(payment);

      const emailResult = await sendPaymentEmailSafe({
        payment,
        type: "FAILED",
      });

      return res.json({
        message: "Payment marked as failed successfully",
        payment: normalizePaymentForClient(payment),
        email: emailResult,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* PARENT PAYMENTS                                                            */
/* -------------------------------------------------------------------------- */

router.get("/my-payments", requireRole("PARENT"), async (req, res, next) => {
  try {
    const parentId = pickUserId(req);

    const payments = await populatePaymentQuery(
      Payment.find({ parentId }).sort({ createdAt: -1 }),
    ).lean();

    return res.json({
      count: payments.length,
      payments: payments.map(normalizePaymentForClient),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* ACADEMY ADMIN PAYMENTS                                                     */
/* -------------------------------------------------------------------------- */

router.get(
  "/academy/payments",
  requireRole("ACADEMY_ADMIN", "ADMIN"),
  async (req, res, next) => {
    try {
      const academyId = pickUserAcademyId(req);

      if (!academyId || !isValidObjectId(academyId)) {
        return res.status(400).json({
          message: "Invalid academy id",
        });
      }

      const status = normalizeUpper(req.query.status || "");
      const settlementStatus = normalizeUpper(req.query.settlementStatus || "");
      const paymentMethod = normalizeUpper(req.query.paymentMethod || "");

      const filter = { academyId };

      if (status) filter.paymentStatus = status;
      if (settlementStatus) filter.settlementStatus = settlementStatus;
      if (paymentMethod) filter.paymentMethod = paymentMethod;

      const payments = await populatePaymentQuery(
        Payment.find(filter).sort({ createdAt: -1 }),
      ).lean();

      const totals = await Payment.aggregate([
        { $match: { academyId: toObjectId(academyId) } },
        {
          $group: {
            _id: null,
            grossAmount: { $sum: "$amount" },
            kidgageCommissionAmount: { $sum: "$kidgageCommissionAmount" },
            academyPayableAmount: { $sum: "$academyPayableAmount" },
            paidCount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, 1, 0],
              },
            },
            readySettlementAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$settlementStatus", "READY"] },
                  "$academyPayableAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

      return res.json({
        count: payments.length,
        totals: totals[0] || {
          grossAmount: 0,
          kidgageCommissionAmount: 0,
          academyPayableAmount: 0,
          paidCount: 0,
          readySettlementAmount: 0,
        },
        payments: payments.map(normalizePaymentForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* SUPER ADMIN PAYMENT CONTROL                                                */
/* -------------------------------------------------------------------------- */

router.get(
  "/admin/payments",
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const status = normalizeUpper(req.query.status || "");
      const settlementStatus = normalizeUpper(req.query.settlementStatus || "");
      const paymentMethod = normalizeUpper(req.query.paymentMethod || "");
      const academyId = String(req.query.academyId || "").trim();

      const filter = {};

      if (status) filter.paymentStatus = status;
      if (settlementStatus) filter.settlementStatus = settlementStatus;
      if (paymentMethod) filter.paymentMethod = paymentMethod;
      if (academyId && isValidObjectId(academyId)) filter.academyId = academyId;

      const payments = await populatePaymentQuery(
        Payment.find(filter).sort({ createdAt: -1 }).limit(500),
      ).lean();

      const match = {};

      if (filter.academyId) match.academyId = toObjectId(academyId);
      if (status) match.paymentStatus = status;
      if (settlementStatus) match.settlementStatus = settlementStatus;
      if (paymentMethod) match.paymentMethod = paymentMethod;

      const totals = await Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            grossAmount: { $sum: "$amount" },
            kidgageCommissionAmount: { $sum: "$kidgageCommissionAmount" },
            academyPayableAmount: { $sum: "$academyPayableAmount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$amount", 0],
              },
            },
            readySettlementAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$settlementStatus", "READY"] },
                  "$academyPayableAmount",
                  0,
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      return res.json({
        count: payments.length,
        totals: totals[0] || {
          grossAmount: 0,
          kidgageCommissionAmount: 0,
          academyPayableAmount: 0,
          paidAmount: 0,
          readySettlementAmount: 0,
          count: 0,
        },
        payments: payments.map(normalizePaymentForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const filter = buildPaymentFilter(req);

    const payments = await populatePaymentQuery(
      Payment.find(filter).sort({ createdAt: -1 }).limit(500),
    ).lean();

    return res.json({
      count: payments.length,
      payments: payments.map(normalizePaymentForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/settle-academy",
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid payment id",
        });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      if (payment.paymentStatus !== "PAID") {
        return res.status(400).json({
          message: "Only paid payments can be settled to academy",
        });
      }

      if (payment.settlementStatus === "PAID_TO_ACADEMY") {
        return res.json({
          message: "Payment already settled to academy",
          payment: normalizePaymentForClient(payment),
        });
      }

      payment.settlementStatus = "PAID_TO_ACADEMY";
      payment.settlementReference = String(
        req.body.settlementReference || payment.settlementReference || "",
      );
      payment.settledBy = pickUserId(req);
      payment.settledAt = new Date();
      payment.notes = String(req.body.notes || payment.notes || "");

      payment.meta = {
        ...(payment.meta || {}),
        settlementReference: String(req.body.settlementReference || ""),
        settledBy: pickUserId(req),
        settledAt: new Date(),
      };

      await payment.save();

      return res.json({
        message: "Academy settlement marked as paid successfully",
        payment: normalizePaymentForClient(payment),
      });
    } catch (error) {
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* SINGLE PAYMENT                                                             */
/* -------------------------------------------------------------------------- */

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid payment id",
      });
    }

    const filter = buildPaymentFilterForUser(req, { _id: id });

    const payment = await populatePaymentQuery(Payment.findOne(filter)).lean();

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    return res.json({
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

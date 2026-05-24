// server/src/routes/parent.routes.js
import express from "express";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import Payment from "../models/Payment.js";
import AppSetting from "../models/AppSetting.js";

import { sendKidgageEmail } from "../services/email/smtp.service.js";
import { renderEmailTemplate } from "../services/email/emailTemplate.service.js";

import {
  createParentBooking,
  cancelParentBooking,
  getParentProfile,
  updateParentProfile,
  changeParentPassword,
  listChildren,
  createChild,
  updateChild,
  deleteChild,
} from "../controllers/parent.controller.js";

let Booking = null;

try {
  const mod = await import("../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

const router = express.Router();

router.use(auth, requireRole("PARENT"));

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value) {
  return Number(toMoney(value, 0).toFixed(2));
}

function normalizeUpper(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return text || fallback;
}

async function getEmailRuntimeDefaults() {
  const settings =
    (await AppSetting.findOne({ key: "GLOBAL" }).lean()) ||
    (await AppSetting.findOne({}).sort({ createdAt: -1 }).lean()) ||
    {};

  const siteName = settings.siteName || "KidGage";

  const supportEmail =
    settings.contactEmail ||
    process.env.CONTACT_RECEIVER_EMAIL ||
    "support@kidgage.com";

  return {
    settings,
    siteName,
    supportEmail,
  };
}

function pickDisplayName(entity, fallback = "") {
  return (
    entity?.fullName ||
    entity?.name ||
    entity?.title ||
    entity?.academyName ||
    fallback
  );
}

function pickBookingNumber(booking) {
  return (
    booking?.bookingNo ||
    booking?.referenceNo ||
    booking?.invoiceNo ||
    String(booking?._id || "")
  );
}

async function sendCancellationRequestSubmittedEmail({
  booking,
  reason = "",
  fallbackParentEmail = "",
} = {}) {
  try {
    if (!booking) return false;

    const parentEmail =
      booking?.parentId?.email ||
      booking?.guestParent?.email ||
      booking?.guestParentSnapshot?.email ||
      booking?.parentEmail ||
      fallbackParentEmail ||
      "";

    if (!parentEmail) return false;

    const { siteName, supportEmail } = await getEmailRuntimeDefaults();

    const rendered = await renderEmailTemplate(
      "CANCELLATION_REQUEST_SUBMITTED",
      {
        siteName,
        parentName: pickDisplayName(booking.parentId, "Parent"),
        childName:
          pickDisplayName(booking.childId, "") ||
          booking?.guestChild?.fullName ||
          booking?.guestChild?.name ||
          booking?.childSnapshot?.fullName ||
          "Child",
        activityName: pickDisplayName(booking.activityId, "Activity"),
        academyName: pickDisplayName(booking.academyId, "Academy"),
        bookingNo: pickBookingNumber(booking),
        reason:
          String(reason || "").trim() ||
          booking?.cancellationReason ||
          "Cancellation requested by parent.",
        supportEmail,
      },
    );

    await sendKidgageEmail({
      to: parentEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return true;
  } catch (emailError) {
    console.error("Cancellation request submitted email failed:", emailError);
    return false;
  }
}

function pickBookingAmount(booking) {
  return roundMoney(
    booking?.finalAmount ||
      booking?.subtotalAmount ||
      booking?.baseAmount ||
      booking?.amount ||
      booking?.totalAmount ||
      booking?.price ||
      booking?.packageSnapshot?.price ||
      booking?.packageId?.price ||
      booking?.package?.price ||
      booking?.activityId?.price ||
      booking?.activitySnapshot?.price ||
      0,
  );
}

function pickBookingCurrency(booking, payment = null) {
  return String(
    payment?.currency ||
      booking?.currency ||
      booking?.packageSnapshot?.currency ||
      booking?.packageId?.currency ||
      booking?.package?.currency ||
      booking?.activityId?.currency ||
      "QAR",
  ).toUpperCase();
}

function buildParentPaymentPageUrl(booking, payment = null) {
  const bookingId = normalizeId(booking?._id || booking?.id);
  const paymentId = normalizeId(
    payment?._id || payment?.id || booking?.paymentId,
  );

  if (!bookingId) return "";

  const query = new URLSearchParams();

  if (paymentId) {
    query.set("paymentId", paymentId);
  }

  const qs = query.toString();
  return `/payment/myfatoorah/${bookingId}${qs ? `?${qs}` : ""}`;
}

function normalizeSlotItem(slotLike = {}, index = 0) {
  const slot =
    slotLike?.slotId && typeof slotLike.slotId === "object"
      ? slotLike.slotId
      : slotLike;

  const id =
    normalizeId(slot?._id || slot?.id) ||
    normalizeId(slotLike?.slotId) ||
    `session-${index + 1}`;

  return {
    _id: id,
    id,
    slotId: id,
    sessionNo: Number(slotLike?.sessionNo || index + 1),
    sessionLabel:
      slotLike?.sessionLabel || slot?.sessionLabel || `Session ${index + 1}`,
    date:
      slotLike?.date ||
      slotLike?.slotDate ||
      slot?.date ||
      slot?.slotDate ||
      null,
    slotDate:
      slotLike?.slotDate ||
      slotLike?.date ||
      slot?.slotDate ||
      slot?.date ||
      null,
    startTime: slotLike?.startTime || slot?.startTime || "",
    endTime: slotLike?.endTime || slot?.endTime || "",
    status:
      slotLike?.status ||
      slotLike?.sessionStatus ||
      slotLike?.attendanceStatus ||
      "BOOKED",
    attendanceStatus: slotLike?.attendanceStatus || "PENDING",
    branchId: slotLike?.branchId || slot?.branchId || null,
    capacity: slot?.capacity || null,
    bookedCount: slot?.bookedCount || null,
  };
}

function getSelectedSessionsForParent(booking) {
  const fromBookedItems = Array.isArray(booking?.bookedSlotItems)
    ? booking.bookedSlotItems
    : [];

  if (fromBookedItems.length) {
    return fromBookedItems.map(normalizeSlotItem);
  }

  const fromSlotIds = Array.isArray(booking?.slotIds) ? booking.slotIds : [];

  if (fromSlotIds.length) {
    return fromSlotIds.map((slot, index) =>
      normalizeSlotItem(
        typeof slot === "object" ? slot : { slotId: slot },
        index,
      ),
    );
  }

  return [];
}

function getFirstSession(selectedSessions = []) {
  return Array.isArray(selectedSessions) && selectedSessions.length
    ? selectedSessions[0]
    : null;
}

function getLastSession(selectedSessions = []) {
  return Array.isArray(selectedSessions) && selectedSessions.length
    ? selectedSessions[selectedSessions.length - 1]
    : null;
}

function buildParentBookingFilter(req) {
  const userId = normalizeId(req.user?._id || req.user?.id);
  const email = String(req.user?.email || "")
    .trim()
    .toLowerCase();

  const or = [];

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    or.push({ parentId: userId });
    or.push({ userId });
  }

  if (email) {
    or.push({ parentEmail: email });
    or.push({ email });
    or.push({ userEmail: email });
    or.push({ customerEmail: email });
    or.push({ "guestParent.email": email });
    or.push({ "guestParentSnapshot.email": email });
  }

  return or.length ? { $or: or } : { _id: null };
}

function buildParentPaymentFilter(req, bookingIds = []) {
  const userId = normalizeId(req.user?._id || req.user?.id);
  const email = String(req.user?.email || "")
    .trim()
    .toLowerCase();

  const or = [];

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    or.push({ parentId: userId });
    or.push({ userId });
  }

  if (bookingIds.length) {
    or.push({ bookingId: { $in: bookingIds } });
  }

  if (email) {
    or.push({ parentEmail: email });
    or.push({ email });
    or.push({ userEmail: email });
    or.push({ customerEmail: email });
    or.push({ "guestParent.email": email });
    or.push({ "guestParentSnapshot.email": email });
  }

  return or.length ? { $or: or } : { _id: null };
}

function normalizePaymentForParent(payment) {
  if (!payment) return null;

  const academy = payment?.academyId || {};
  const booking = payment?.bookingId || {};
  const parent = payment?.parentId || {};
  const activity = payment?.activityId || {};
  const pkg = payment?.packageId || {};

  return {
    _id: payment._id,
    id: payment._id,

    bookingId: booking?._id || payment.bookingId || null,
    bookingNo:
      payment.bookingNo ||
      booking?.bookingNo ||
      booking?.referenceNo ||
      booking?.invoiceNo ||
      "N/A",

    academyId: academy?._id || payment.academyId || null,
    academyName: academy?.name || payment?.meta?.academyName || "Academy",
    academyCity: academy?.city || "",

    parentId: parent?._id || payment.parentId || null,
    parentName:
      parent?.fullName ||
      parent?.name ||
      payment?.parentName ||
      payment?.guestParent?.fullName ||
      "Parent",

    activityId: activity?._id || payment.activityId || null,
    activityName:
      payment?.activityName ||
      activity?.title ||
      activity?.name ||
      booking?.activityName ||
      "N/A",

    packageId: pkg?._id || payment.packageId || null,
    packageName:
      payment?.packageName || pkg?.title || booking?.packageName || "N/A",

    amount: roundMoney(payment.amount),
    currency: String(payment.currency || "QAR").toUpperCase(),

    paymentMethod: normalizeUpper(payment.paymentMethod, "CASH"),
    paymentGateway: normalizeUpper(payment.paymentGateway, "MANUAL"),
    paymentStatus: normalizeUpper(payment.paymentStatus, "PENDING"),

    gatewayOrderId: payment.gatewayOrderId || "",
    gatewayPaymentId: payment.gatewayPaymentId || "",
    gatewayReference: payment.gatewayReference || "",
    gatewayCheckoutUrl: payment.gatewayCheckoutUrl || "",

    paidAt: payment.paidAt || null,
    failedAt: payment.failedAt || null,
    cancelledAt: payment.cancelledAt || null,
    refundedAt: payment.refundedAt || null,

    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
  };
}

function normalizeBookingForParent(booking, payment = null) {
  const academy = booking?.academyId || {};
  const parent = booking?.parentId || {};
  const child = booking?.childId || {};
  const activity = booking?.activityId || {};
  const pkg = booking?.packageId || {};

  const amount = payment?.amount ?? pickBookingAmount(booking);
  const currency = pickBookingCurrency(booking, payment);

  const selectedSessions = getSelectedSessionsForParent(booking);
  const firstSession = getFirstSession(selectedSessions);
  const lastSession = getLastSession(selectedSessions);
  const paymentPage = buildParentPaymentPageUrl(booking, payment);

  const normalizedPayment = payment ? normalizePaymentForParent(payment) : null;

  return {
    _id: booking._id,
    id: booking._id,

    bookingNo:
      booking.bookingNo ||
      booking.referenceNo ||
      booking.invoiceNo ||
      booking._id ||
      "N/A",

    academyId: academy?._id || booking.academyId || null,
    academyName:
      academy?.name ||
      booking.academyName ||
      booking.academySnapshot?.name ||
      "Academy",
    academyCity: academy?.city || booking.academyCity || "",
    academyLogo: academy?.logo || booking.academySnapshot?.logo || "",

    parentId: parent?._id || booking.parentId || null,
    parentName:
      parent?.fullName ||
      parent?.name ||
      booking.parentName ||
      booking.guestParent?.fullName ||
      booking.guestParentSnapshot?.fullName ||
      "Parent",

    childId: child?._id || booking.childId || null,
    childName:
      child?.fullName ||
      child?.name ||
      booking.childName ||
      booking.guestChild?.fullName ||
      booking.guestChild?.name ||
      booking.childSnapshot?.fullName ||
      "Child",

    activityId: activity?._id || booking.activityId || null,
    activityName:
      activity?.title ||
      activity?.name ||
      booking.activityName ||
      booking.courseName ||
      booking.activitySnapshot?.title ||
      "Activity",

    packageId: pkg?._id || booking.packageId || null,
    packageName:
      pkg?.title ||
      booking.packageName ||
      booking.packageSnapshot?.title ||
      "Package",

    sessions:
      booking.totalSessions ||
      booking.bookedSessions ||
      selectedSessions.length ||
      booking.sessions ||
      booking.noOfSessions ||
      booking.numberOfSessions ||
      booking.packageSnapshot?.sessionCount ||
      pkg?.sessionCount ||
      0,

    bookingMode: booking.bookingMode || "N/A",

    bookingStatus: normalizeUpper(
      booking.bookingStatus || booking.status,
      "PENDING",
    ),

    cancellationRequested: Boolean(booking.cancellationRequested),
    cancellationStatus: normalizeUpper(booking.cancellationStatus, "NONE"),
    cancellationReason: booking.cancellationReason || "",
    cancellationRequestedAt: booking.cancellationRequestedAt || null,
    cancellationRequestedBy: booking.cancellationRequestedBy || null,
    cancellationReviewedAt: booking.cancellationReviewedAt || null,
    cancellationReviewedBy: booking.cancellationReviewedBy || null,
    cancellationAdminNote: booking.cancellationAdminNote || "",
    hasCancellationRequest:
      booking.cancellationRequested === true ||
      normalizeUpper(booking.cancellationStatus, "NONE") === "REQUESTED",

    amount: roundMoney(amount),
    currency,

    payment: normalizedPayment,
    paymentDetails: normalizedPayment,
    paymentId: payment?._id || booking.paymentId || null,

    paymentStatus: normalizeUpper(
      payment?.paymentStatus || booking.paymentStatus,
      "PENDING",
    ),

    paymentMethod: normalizeUpper(
      payment?.paymentMethod || booking.paymentMethod,
      "N/A",
    ),

    paymentGateway: normalizeUpper(
      payment?.paymentGateway || booking.paymentGateway,
      "N/A",
    ),

    paymentReference:
      payment?.gatewayPaymentId ||
      payment?.gatewayOrderId ||
      payment?.gatewayReference ||
      booking.paymentReference ||
      "",

    paymentPage,
    paymentUrl: paymentPage,
    checkoutUrl: payment?.gatewayCheckoutUrl || paymentPage || "",

    selectedSessions,
    sessionsList: selectedSessions,
    sessionItems: selectedSessions,
    bookedSlotItems: booking.bookedSlotItems || [],
    slotIds: booking.slotIds || [],

    slotDate:
      firstSession?.date ||
      firstSession?.slotDate ||
      booking.slotDate ||
      booking.date ||
      booking.startDate ||
      booking.firstSessionDate ||
      booking.firstSlot?.slotDate ||
      null,

    startTime:
      firstSession?.startTime ||
      booking.startTime ||
      booking.firstSlot?.startTime ||
      booking.slot?.startTime ||
      "",

    endTime:
      firstSession?.endTime ||
      booking.endTime ||
      booking.firstSlot?.endTime ||
      booking.slot?.endTime ||
      "",

    firstSessionDate:
      booking.firstSessionDate ||
      firstSession?.date ||
      firstSession?.slotDate ||
      null,

    lastSessionDate:
      booking.lastSessionDate ||
      lastSession?.date ||
      lastSession?.slotDate ||
      null,

    paidAt: payment?.paidAt || booking.paidAt || null,
    createdAt: booking.createdAt || null,
    updatedAt: booking.updatedAt || null,
    notes: booking.notes || "",
  };
}

async function getParentHistory(req, limit = 300) {
  const bookingFilter = buildParentBookingFilter(req);

  const bookings = Booking
    ? await Booking.find(bookingFilter)
        .populate("academyId", "name slug city logo")
        .populate("parentId", "fullName name email phone")
        .populate("childId", "fullName name")
        .populate(
          "activityId",
          "title name category categoryName price basePrice currency",
        )
        .populate("packageId", "title price currency sessionCount")
        .populate("slotIds")
        .populate("bookedSlotItems.slotId")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    : [];

  const bookingIds = bookings.map((item) => item._id).filter(Boolean);
  const paymentFilter = buildParentPaymentFilter(req, bookingIds);

  const payments = await Payment.find(paymentFilter)
    .populate("academyId", "name slug city logo")
    .populate(
      "bookingId",
      "bookingNo referenceNo invoiceNo bookingStatus paymentStatus activityName packageName",
    )
    .populate("parentId", "fullName name email phone")
    .populate("activityId", "title name")
    .populate("packageId", "title")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const paymentByBookingId = new Map();

  payments.forEach((payment) => {
    const bookingId = normalizeId(
      payment?.bookingId?._id || payment?.bookingId,
    );

    if (!bookingId) return;

    const existing = paymentByBookingId.get(bookingId);

    if (!existing) {
      paymentByBookingId.set(bookingId, payment);
      return;
    }

    const existingTime = new Date(existing.createdAt || 0).getTime();
    const nextTime = new Date(payment.createdAt || 0).getTime();

    if (nextTime > existingTime) {
      paymentByBookingId.set(bookingId, payment);
    }
  });

  const rows = bookings.map((booking) => {
    const bookingId = normalizeId(booking._id);
    const payment = paymentByBookingId.get(bookingId) || null;
    return normalizeBookingForParent(booking, payment);
  });

  const bookingIdSet = new Set(rows.map((row) => normalizeId(row.id)));

  const orphanPaymentRows = payments
    .filter((payment) => {
      const bookingId = normalizeId(
        payment?.bookingId?._id || payment?.bookingId,
      );

      return bookingId && !bookingIdSet.has(bookingId);
    })
    .map((payment) => {
      const normalizedPayment = normalizePaymentForParent(payment);
      const paymentPage =
        normalizedPayment.bookingId && normalizeId(normalizedPayment.bookingId)
          ? `/payment/myfatoorah/${normalizeId(
              normalizedPayment.bookingId,
            )}?paymentId=${normalizeId(normalizedPayment.id)}`
          : normalizedPayment.gatewayCheckoutUrl || "";

      return {
        _id: payment.bookingId?._id || payment.bookingId || payment._id,
        id: payment.bookingId?._id || payment.bookingId || payment._id,
        bookingNo: normalizedPayment.bookingNo,
        academyId: normalizedPayment.academyId,
        academyName: normalizedPayment.academyName,
        academyCity: normalizedPayment.academyCity,
        parentName: normalizedPayment.parentName,
        childName: "N/A",
        activityId: normalizedPayment.activityId,
        activityName: normalizedPayment.activityName,
        packageId: normalizedPayment.packageId,
        packageName: normalizedPayment.packageName,
        sessions: 0,
        bookingMode: "N/A",
        bookingStatus: "N/A",
        cancellationRequested: false,
        cancellationStatus: "NONE",
        cancellationReason: "",
        cancellationRequestedAt: null,
        cancellationRequestedBy: null,
        cancellationReviewedAt: null,
        cancellationReviewedBy: null,
        cancellationAdminNote: "",
        hasCancellationRequest: false,
        amount: normalizedPayment.amount,
        currency: normalizedPayment.currency,
        payment: normalizedPayment,
        paymentDetails: normalizedPayment,
        paymentId: normalizedPayment.id,
        paymentStatus: normalizedPayment.paymentStatus,
        paymentMethod: normalizedPayment.paymentMethod,
        paymentGateway: normalizedPayment.paymentGateway,
        paymentReference:
          normalizedPayment.gatewayPaymentId ||
          normalizedPayment.gatewayOrderId ||
          normalizedPayment.gatewayReference ||
          "",
        paymentPage,
        paymentUrl: paymentPage,
        checkoutUrl: normalizedPayment.gatewayCheckoutUrl || paymentPage,
        selectedSessions: [],
        sessionsList: [],
        sessionItems: [],
        bookedSlotItems: [],
        slotIds: [],
        firstSessionDate: null,
        lastSessionDate: null,
        paidAt: normalizedPayment.paidAt,
        createdAt: normalizedPayment.createdAt,
        updatedAt: normalizedPayment.updatedAt,
        notes: "",
      };
    });

  const history = [...rows, ...orphanPaymentRows].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

  const totals = history.reduce(
    (acc, item) => {
      acc.totalBookings += 1;
      acc.totalAmount += Number(item.amount || 0);

      if (item.bookingStatus === "CONFIRMED") acc.confirmedBookings += 1;
      if (item.bookingStatus === "PENDING") acc.pendingBookings += 1;
      if (item.bookingStatus === "CANCELLED") acc.cancelledBookings += 1;
      if (item.bookingStatus === "CANCELED") acc.cancelledBookings += 1;
      if (item.cancellationStatus === "REQUESTED")
        acc.cancellationRequests += 1;

      if (item.paymentStatus === "PAID") {
        acc.paidPayments += 1;
        acc.paidAmount += Number(item.amount || 0);
      }

      if (item.paymentStatus === "PENDING") {
        acc.pendingPayments += 1;
      }

      return acc;
    },
    {
      totalBookings: 0,
      confirmedBookings: 0,
      pendingBookings: 0,
      cancelledBookings: 0,
      cancellationRequests: 0,
      paidPayments: 0,
      pendingPayments: 0,
      totalAmount: 0,
      paidAmount: 0,
      currency: "QAR",
    },
  );

  return {
    history,
    payments,
    totals: {
      ...totals,
      totalAmount: roundMoney(totals.totalAmount),
      paidAmount: roundMoney(totals.paidAmount),
    },
  };
}

async function findParentBookingById(req, bookingId) {
  if (!Booking) {
    throw new Error("Booking model is not available");
  }

  if (!mongoose.Types.ObjectId.isValid(String(bookingId || ""))) {
    const error = new Error("Invalid booking id");
    error.statusCode = 400;
    throw error;
  }

  const parentFilter = buildParentBookingFilter(req);

  const booking = await Booking.findOne({
    _id: bookingId,
    ...parentFilter,
  })
    .populate("academyId", "name slug city logo")
    .populate("parentId", "fullName name email phone")
    .populate("childId", "fullName name")
    .populate(
      "activityId",
      "title name category categoryName price basePrice currency",
    )
    .populate("packageId", "title price currency sessionCount")
    .populate("slotIds")
    .populate("bookedSlotItems.slotId")
    .lean();

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const payment = await Payment.findOne({ bookingId: booking._id })
    .sort({ createdAt: -1 })
    .lean();

  const normalizedBooking = normalizeBookingForParent(booking, payment);
  const sessions = Array.isArray(normalizedBooking.selectedSessions)
    ? normalizedBooking.selectedSessions
    : [];

  return {
    booking: normalizedBooking,
    rawBooking: booking,
    payment: payment ? normalizePaymentForParent(payment) : null,
    rawPayment: payment || null,
    sessions,
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* GET /api/parent/dashboard                                                  */
/* -------------------------------------------------------------------------- */

router.get("/dashboard", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 300), 1), 500);

    const { history, payments, totals } = await getParentHistory(req, limit);

    const childrenMap = new Map();

    history.forEach((item) => {
      const childKey = normalizeId(item.childId) || item.childName;

      if (childKey && childKey !== "N/A" && childKey !== "Child") {
        childrenMap.set(childKey, item.childName || "Child");
      }
    });

    const now = new Date();

    const upcomingBookings = history
      .filter((item) => {
        const sessionDate =
          item.selectedSessions?.[0]?.date ||
          item.selectedSessions?.[0]?.slotDate ||
          item.firstSessionDate ||
          item.slotDate ||
          item.lastSessionDate;

        const date = new Date(sessionDate || "");
        return !Number.isNaN(date.getTime()) && date >= now;
      })
      .slice(0, 6);

    const recentBookings = history.slice(0, 8);

    return res.json({
      childrenCount: childrenMap.size,
      bookingsCount: history.length,
      paymentsCount: payments.length,

      pendingPaymentsCount: totals.pendingPayments,
      paidBookingsCount: totals.paidPayments,
      cancellationRequestsCount: totals.cancellationRequests,

      totalAmount: totals.totalAmount,
      paidAmount: totals.paidAmount,
      currency: totals.currency || "QAR",

      upcomingBookings,
      recentBookings,

      totals,
      bookings: history,
      payments: payments.map(normalizePaymentForParent),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Parent booking + payment history                                           */
/* GET /api/parent/history                                                    */
/* -------------------------------------------------------------------------- */

router.get("/history", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 300), 1), 500);

    const { history, payments, totals } = await getParentHistory(req, limit);

    return res.json({
      count: history.length,
      totals,
      bookings: history,
      payments: payments.map(normalizePaymentForParent),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Parent Profile                                                             */
/* -------------------------------------------------------------------------- */

router.get("/me", getParentProfile);
router.get("/profile", getParentProfile);

router.patch("/me", updateParentProfile);
router.patch("/profile", updateParentProfile);

router.patch("/password", changeParentPassword);
router.patch("/change-password", changeParentPassword);

/* -------------------------------------------------------------------------- */
/* Children                                                                   */
/* -------------------------------------------------------------------------- */

router.get("/children", listChildren);
router.post("/children", createChild);
router.put("/children/:id", updateChild);
router.delete("/children/:id", deleteChild);

/* -------------------------------------------------------------------------- */
/* Booking create/detail/cancel request/cancel                                */
/* -------------------------------------------------------------------------- */

router.post("/bookings", createParentBooking);

router.patch("/bookings/:id/cancel-request", async (req, res, next) => {
  try {
    if (!Booking) {
      return res
        .status(500)
        .json({ message: "Booking model is not available" });
    }

    const { id } = req.params;
    const reason = String(
      req.body?.reason || req.body?.cancellationReason || "",
    ).trim();

    if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    if (!reason || reason.length < 5) {
      return res.status(400).json({
        message: "Cancellation reason must be at least 5 characters",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      parentId: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookingStatus = normalizeUpper(booking.bookingStatus, "PENDING");
    const paymentStatus = normalizeUpper(booking.paymentStatus, "PENDING");
    const cancellationStatus = normalizeUpper(
      booking.cancellationStatus,
      "NONE",
    );

    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(bookingStatus)) {
      return res.status(400).json({
        message: `Cannot request cancellation for ${bookingStatus.toLowerCase()} booking`,
      });
    }

    if (["APPROVED", "REQUESTED"].includes(cancellationStatus)) {
      return res.status(409).json({
        message:
          cancellationStatus === "REQUESTED"
            ? "Cancellation request already submitted"
            : "Cancellation was already approved",
      });
    }

    if (paymentStatus === "REFUNDED") {
      return res.status(400).json({
        message: "This booking is already refunded",
      });
    }

    booking.cancellationRequested = true;
    booking.cancellationStatus = "REQUESTED";
    booking.cancellationReason = reason;
    booking.cancellationRequestedAt = new Date();
    booking.cancellationRequestedBy = req.user._id;
    booking.cancellationReviewedAt = null;
    booking.cancellationReviewedBy = null;
    booking.cancellationAdminNote = "";

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate("academyId", "name slug city logo email phone")
      .populate("parentId", "fullName name email phone")
      .populate("childId", "fullName name")
      .populate(
        "activityId",
        "title name category categoryName price basePrice currency",
      )
      .populate("packageId", "title price currency sessionCount")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId")
      .lean();

    const payment = await Payment.findOne({ bookingId: booking._id })
      .sort({ createdAt: -1 })
      .lean();

    const emailSent = await sendCancellationRequestSubmittedEmail({
      booking: updatedBooking,
      reason,
      fallbackParentEmail: req.user?.email || "",
    });

    return res.json({
      message: emailSent
        ? "Cancellation request submitted successfully and email sent"
        : "Cancellation request submitted successfully, but email was not sent",
      emailSent,
      booking: normalizeBookingForParent(updatedBooking, payment),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/bookings/:id", async (req, res, next) => {
  try {
    const result = await findParentBookingById(req, req.params.id);

    return res.json({
      success: true,
      booking: result.booking,
      payment: result.payment,
      sessions: result.sessions,
      rawBooking: result.rawBooking,
      rawPayment: result.rawPayment,
    });
  } catch (error) {
    if (Number(error?.statusCode || 0) > 0) {
      return res.status(Number(error.statusCode)).json({
        success: false,
        message: error.message || "Request failed",
      });
    }

    return next(error);
  }
});

router.patch("/bookings/:id/cancel", cancelParentBooking);

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* GET /api/parent/bookings                                                   */
/* -------------------------------------------------------------------------- */

router.get("/bookings", async (req, res, next) => {
  try {
    const bookingFilter = buildParentBookingFilter(req);

    const bookings = Booking
      ? await Booking.find(bookingFilter)
          .populate("academyId", "name slug city logo")
          .populate("parentId", "fullName name email phone")
          .populate("childId", "fullName name")
          .populate(
            "activityId",
            "title name category categoryName price basePrice currency",
          )
          .populate("packageId", "title price currency sessionCount")
          .populate("slotIds")
          .populate("bookedSlotItems.slotId")
          .sort({ createdAt: -1 })
          .limit(300)
          .lean()
      : [];

    return res.json({
      count: bookings.length,
      bookings: bookings.map((booking) => normalizeBookingForParent(booking)),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* GET /api/parent/payments                                                   */
/* -------------------------------------------------------------------------- */

router.get("/payments", async (req, res, next) => {
  try {
    const paymentFilter = buildParentPaymentFilter(req);

    const payments = await Payment.find(paymentFilter)
      .populate("academyId", "name slug city logo")
      .populate(
        "bookingId",
        "bookingNo referenceNo invoiceNo bookingStatus paymentStatus activityName packageName",
      )
      .populate("parentId", "fullName name email phone")
      .populate("activityId", "title name")
      .populate("packageId", "title")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return res.json({
      count: payments.length,
      payments: payments.map(normalizePaymentForParent),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

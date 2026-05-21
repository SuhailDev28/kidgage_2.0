// server/src/routes/myfatoorah.routes.js
import express from "express";
import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

import {
  createMyFatoorahEmbeddedSession,
  verifyMyFatoorahEmbeddedResult,
  syncMyFatoorahPaymentStatus,
  normalizeMyFatoorahStatus,
} from "../services/payment/myfatoorah.service.js";

import {
  notifyPaymentSuccessful,
  notifyPaymentFailed,
  notifyBookingConfirmed,
} from "../services/notification.service.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getAppUrl() {
  return String(
    process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173",
  ).replace(/\/$/, "");
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function parseJsonSafe(value) {
  if (!value || typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toMoney(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.round(n * 100) / 100;
}

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

async function expirePendingBookingsSafe() {
  if (typeof Booking.expirePendingBookings !== "function") return null;

  return Booking.expirePendingBookings();
}

function isExpiredBooking(booking) {
  if (!booking) return false;

  return Boolean(
    booking.bookingStatus === "PENDING" &&
      booking.paymentStatus === "PENDING" &&
      booking.expiresAt &&
      new Date(booking.expiresAt).getTime() <= Date.now(),
  );
}

function getBookingAmountForPayment(booking, fallbackAmount = 0) {
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

function calculateKidgageCommission(amount) {
  const safeAmount = toMoney(amount, 0);

  const type = normalizeUpper(
    process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE",
    "PERCENTAGE",
  );

  const value = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);

  let commission = 0;

  if (type === "FIXED") {
    commission = value;
  } else {
    commission = (safeAmount * value) / 100;
  }

  commission = Math.min(safeAmount, Math.max(0, commission));

  return {
    kidgageCommissionType: type === "FIXED" ? "FIXED" : "PERCENTAGE",
    kidgageCommissionValue: Number.isFinite(value) && value >= 0 ? value : 10,
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
      booking?.guestParentSnapshot?.email ||
      booking?.guestChild?.fullName ||
      booking?.guestChildSnapshot?.fullName,
  );
}

function pickGuestParent(booking) {
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

function pickGuestChild(booking) {
  const child =
    booking?.guestChild ||
    booking?.guestChildSnapshot ||
    booking?.childSnapshot ||
    {};

  return {
    _id: null,
    fullName:
      child.fullName || child.name || booking?.childName || "KidGage Child",
    name: child.fullName || child.name || booking?.childName || "KidGage Child",
  };
}

function pickMyFatoorahPayload(req) {
  const body = req.body || {};
  return body.Data || body.data || body;
}

function pickLocalPaymentId(req, data = {}) {
  const queryLocalPaymentId =
    req.query.localPaymentId ||
    req.query.local_payment_id ||
    req.query.kidgagePaymentId ||
    req.query.kgPaymentId ||
    req.query.localPaymentID ||
    "";

  if (isValidObjectId(queryLocalPaymentId)) {
    return String(queryLocalPaymentId);
  }

  /*
    Backward compatibility:
    Older frontend used ?paymentId=<MongoDB Payment _id>.
    If paymentId is a valid MongoDB ObjectId, treat it as localPaymentId,
    not as MyFatoorah PaymentId.
  */
  const queryPaymentId = String(req.query.paymentId || "").trim();

  if (isValidObjectId(queryPaymentId)) {
    return queryPaymentId;
  }

  const bodyLocalPaymentId =
    req.body?.localPaymentId ||
    req.body?.local_payment_id ||
    req.body?.kidgagePaymentId ||
    req.body?.kgPaymentId ||
    "";

  if (isValidObjectId(bodyLocalPaymentId)) {
    return String(bodyLocalPaymentId);
  }

  const bodyPaymentId = String(req.body?.paymentId || "").trim();

  if (isValidObjectId(bodyPaymentId)) {
    return bodyPaymentId;
  }

  const parsedUserDefined = parseJsonSafe(
    data.UserDefinedField || data.userDefinedField,
  );

  const possible =
    data.CustomerReference ||
    data.customerReference ||
    parsedUserDefined?.localPaymentId ||
    parsedUserDefined?.paymentId ||
    req.body?.CustomerReference ||
    req.body?.customerReference ||
    "";

  return isValidObjectId(possible) ? String(possible) : "";
}

function pickGatewayPaymentId(req, data = {}) {
  const queryPaymentId = String(req.query.paymentId || "").trim();
  const bodyPaymentId = String(req.body?.paymentId || "").trim();

  /*
    Important:
    MongoDB ObjectId values are local payment ids, not MyFatoorah PaymentIds.
    Do not pass ObjectId to MyFatoorah as KeyType PaymentId.
  */
  const safeQueryPaymentId = isValidObjectId(queryPaymentId)
    ? ""
    : queryPaymentId;

  const safeBodyPaymentId = isValidObjectId(bodyPaymentId) ? "" : bodyPaymentId;

  return String(
    req.query.PaymentId ||
      req.query.payment_id ||
      req.query.myfatoorahPaymentId ||
      safeQueryPaymentId ||
      req.body?.PaymentId ||
      req.body?.payment_id ||
      req.body?.myfatoorahPaymentId ||
      safeBodyPaymentId ||
      data.PaymentId ||
      data.PaymentID ||
      data.paymentId ||
      data.payment_id ||
      data.MyFatoorahPaymentId ||
      "",
  ).trim();
}

function pickInvoiceId(req, data = {}) {
  const queryId = String(req.query.Id || req.query.id || "").trim();
  const bodyId = String(req.body?.Id || req.body?.id || "").trim();

  const safeQueryId = isValidObjectId(queryId) ? "" : queryId;
  const safeBodyId = isValidObjectId(bodyId) ? "" : bodyId;

  return String(
    req.query.InvoiceId ||
      req.query.invoiceId ||
      req.query.invoice_id ||
      req.query.myfatoorahInvoiceId ||
      safeQueryId ||
      req.body?.InvoiceId ||
      req.body?.invoiceId ||
      req.body?.invoice_id ||
      req.body?.myfatoorahInvoiceId ||
      safeBodyId ||
      data.InvoiceId ||
      data.InvoiceID ||
      data.invoiceId ||
      data.invoice_id ||
      data.Id ||
      data.id ||
      "",
  ).trim();
}

function pickSessionId(req, data = {}) {
  return String(
    req.body?.sessionId ||
      req.body?.SessionId ||
      req.query.sessionId ||
      req.query.SessionId ||
      data.SessionId ||
      data.sessionId ||
      "",
  ).trim();
}

function pickPaymentData(req, data = {}) {
  return String(
    req.body?.paymentData ||
      req.body?.PaymentData ||
      req.body?.data?.paymentData ||
      req.body?.Data?.PaymentData ||
      req.query.paymentData ||
      req.query.PaymentData ||
      data.PaymentData ||
      data.paymentData ||
      "",
  ).trim();
}

function getRedirectUrl(path, params = {}) {
  const appUrl = getAppUrl();
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return `${appUrl}${path}${query ? `?${query}` : ""}`;
}

function getFrontendResultPath(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID") return "/payment/success";
  if (normalized === "PENDING") return "/payment/pending";

  return "/payment/failed";
}

function isGuestPayment(payment) {
  const createdFrom = String(payment?.meta?.createdFrom || "").toUpperCase();
  const retryFrom = String(payment?.meta?.retryFrom || "").toUpperCase();

  return (
    createdFrom === "GUEST_BOOKING" ||
    retryFrom === "GUEST_BOOKING" ||
    Boolean(payment?.meta?.guestParent)
  );
}

async function syncFromRequest(req) {
  const data = pickMyFatoorahPayload(req);

  const localPaymentId = pickLocalPaymentId(req, data);
  const gatewayPaymentId = pickGatewayPaymentId(req, data);
  const invoiceId = pickInvoiceId(req, data);

  const rawPayload = {
    query: req.query || {},
    body: req.body || {},
    data,
  };

  if (localPaymentId) {
    return syncMyFatoorahPaymentStatus({
      localPaymentId,
      paymentId: gatewayPaymentId || undefined,
      invoiceId: invoiceId || undefined,
      rawPayload,
    });
  }

  return syncMyFatoorahPaymentStatus({
    paymentId: gatewayPaymentId || undefined,
    invoiceId: invoiceId || undefined,
    rawPayload,
  });
}

async function verifyEmbeddedFromRequest(req) {
  const data = pickMyFatoorahPayload(req);

  const localPaymentId = pickLocalPaymentId(req, data);
  const sessionId = pickSessionId(req, data);
  const paymentData = pickPaymentData(req, data);

  if (!localPaymentId) {
    const error = new Error("Valid localPaymentId is required");
    error.statusCode = 400;
    throw error;
  }

  return verifyMyFatoorahEmbeddedResult({
    localPaymentId,
    sessionId,
    paymentData,
    rawPayload: req.body || {},
  });
}

function buildResultPayload(result) {
  return {
    success: true,
    paid: Boolean(result?.paid),
    status: result?.status || "PENDING",
    payment: result?.payment || null,
    booking: result?.booking || null,
    myfatoorah: result?.myfatoorah || null,
  };
}

async function dispatchPaymentNotifications(result, reason = "") {
  const paymentId = result?.payment?._id || result?.payment?.id;

  if (!paymentId || !isValidObjectId(paymentId)) {
    return null;
  }

  const payment = await Payment.findById(paymentId);

  if (!payment) {
    return null;
  }

  const status = normalizeUpper(
    result?.status || payment.paymentStatus || payment.status || "",
    "PENDING",
  );

  const bookingId =
    result?.booking?._id ||
    result?.booking?.id ||
    payment.bookingId ||
    payment.meta?.bookingId ||
    null;

  let booking = null;

  if (bookingId && isValidObjectId(bookingId)) {
    booking = await Booking.findById(bookingId)
      .populate("activityId")
      .populate("packageId")
      .populate("academyId")
      .populate("parentId")
      .populate("childId");
  }

  payment.meta = payment.meta || {};
  payment.meta.notificationEvents = payment.meta.notificationEvents || {};

  const events = payment.meta.notificationEvents || {};

  if (status === "PAID") {
    if (events.paymentSuccessSentAt) {
      return null;
    }

    await Promise.allSettled([
      notifyPaymentSuccessful({
        payment,
        booking,
      }),
      booking
        ? notifyBookingConfirmed({
            booking,
            payment,
          })
        : null,
    ]);

    payment.meta.notificationEvents = {
      ...events,
      paymentSuccessSentAt: new Date(),
      bookingConfirmedSentAt: new Date(),
    };

    payment.markModified("meta");
    await payment.save();

    return {
      sent: true,
      type: "PAYMENT_SUCCESS",
    };
  }

  if (["FAILED", "CANCELLED"].includes(status)) {
    if (events.paymentFailedSentAt) {
      return null;
    }

    await Promise.allSettled([
      notifyPaymentFailed({
        payment,
        booking,
        reason: reason || "Payment was not completed.",
      }),
    ]);

    payment.meta.notificationEvents = {
      ...events,
      paymentFailedSentAt: new Date(),
    };

    payment.markModified("meta");
    await payment.save();

    return {
      sent: true,
      type: "PAYMENT_FAILED",
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* EMBEDDED SESSION                                                           */
/* -------------------------------------------------------------------------- */

router.post("/embed-session", async (req, res, next) => {
  try {
    await expirePendingBookingsSafe();

    const bookingId = String(req.body.bookingId || "").trim();
    const guestToken = String(
      req.body.guestToken || req.query.guestToken || "",
    ).trim();

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Valid bookingId is required",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate("activityId")
      .populate("packageId")
      .populate("academyId")
      .populate("parentId")
      .populate("childId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.paymentStatus === "PAID" ||
      booking.bookingStatus === "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message: "This booking is already paid",
      });
    }

    if (
      booking.bookingStatus === "CANCELLED" ||
      booking.paymentStatus === "CANCELLED" ||
      isExpiredBooking(booking)
    ) {
      booking.bookingStatus = "CANCELLED";
      booking.paymentStatus = "CANCELLED";
      booking.cancelledAt = booking.cancelledAt || new Date();
      booking.expiresAt = null;

      await booking.save();

      return res.status(409).json({
        success: false,
        expired: true,
        message: "This booking has expired. Please create a new booking.",
      });
    }

    const guest = isGuestBooking(booking);

    if (guest && booking.guestPaymentToken) {
      if (!guestToken || guestToken !== String(booking.guestPaymentToken)) {
        return res.status(403).json({
          success: false,
          message: "Invalid guest payment token",
        });
      }
    }

    const amount = getBookingAmountForPayment(booking, 0);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    const currency =
      booking.currency || process.env.MYFATOORAH_CURRENCY || "QAR";

    const commission = calculateKidgageCommission(amount);

    let payment = await Payment.findOne({
      bookingId: booking._id,
    });

    if (payment?.paymentStatus === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This payment is already paid",
      });
    }

    if (!payment) {
      payment = await Payment.create({
        academyId: booking.academyId?._id || booking.academyId,
        bookingId: booking._id,

        parentId: guest
          ? null
          : booking.parentId?._id || booking.parentId || booking.userId || null,

        childId: guest ? null : booking.childId?._id || booking.childId || null,

        activityId: booking.activityId?._id || booking.activityId || null,
        packageId: booking.packageId?._id || booking.packageId || null,

        paymentMethod: "ONLINE",
        paymentGateway: "MYFATOORAH",

        amount,
        currency,

        paymentReceiver: "KIDGAGE",

        status: "PENDING",
        paymentStatus: "PENDING",
        gatewayStatus: "PENDING",
        settlementStatus: "PENDING",

        ...commission,

        meta: {
          source: "MYFATOORAH_EMBED_SESSION",
          createdFrom: guest ? "GUEST_BOOKING" : "PARENT_BOOKING",
          guestParent: guest
            ? booking.guestParent || booking.guestParentSnapshot || null
            : null,
          guestChild: guest
            ? booking.guestChild || booking.guestChildSnapshot || null
            : null,
          parentEmail:
            booking.guestParent?.email ||
            booking.guestParentSnapshot?.email ||
            booking.parentEmail ||
            booking.parentId?.email ||
            "",
          parentName:
            booking.guestParent?.fullName ||
            booking.guestParent?.name ||
            booking.guestParentSnapshot?.fullName ||
            booking.parentName ||
            booking.parentId?.fullName ||
            booking.parentId?.name ||
            "",
        },
      });
    } else {
      payment.paymentMethod = "ONLINE";
      payment.paymentGateway = "MYFATOORAH";
      payment.amount = amount;
      payment.currency = currency;
      payment.status = "PENDING";
      payment.paymentStatus = "PENDING";
      payment.gatewayStatus = "PENDING";
      payment.settlementStatus = "PENDING";

      payment.kidgageCommissionType = commission.kidgageCommissionType;
      payment.kidgageCommissionValue = commission.kidgageCommissionValue;
      payment.kidgageCommissionAmount = commission.kidgageCommissionAmount;
      payment.academyPayableAmount = commission.academyPayableAmount;

      payment.meta = {
        ...(payment.meta || {}),
        source: payment.meta?.source || "MYFATOORAH_EMBED_SESSION",
        retryFrom: guest ? "GUEST_BOOKING" : "PARENT_BOOKING",
        retriedAt: new Date(),
      };

      await payment.save();
    }

    booking.paymentId = payment._id;
    booking.paymentMethod = "ONLINE";
    booking.paymentGateway = "MYFATOORAH";
    booking.paymentStatus = "PENDING";

    if (booking.bookingStatus !== "PENDING") {
      booking.bookingStatus = "PENDING";
    }

    await booking.save();

    const parentForCheckout = guest
      ? pickGuestParent(booking)
      : booking.parentId || {};

    const childForCheckout = guest ? pickGuestChild(booking) : booking.childId || {};

    const embedded = await createMyFatoorahEmbeddedSession({
      payment,
      booking,
      parent: parentForCheckout,
      child: childForCheckout,
    });

    return res.json({
      success: true,
      message: "MyFatoorah embedded session created successfully",
      guest,
      payment: {
        _id: payment._id,
        id: payment._id,
        bookingId: booking._id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentGateway: payment.paymentGateway,
        paymentStatus: payment.paymentStatus,
        settlementStatus: payment.settlementStatus,
      },
      embedded: {
        /*
          Backward compatibility:
          paymentId remains local MongoDB Payment _id for existing frontend code.
          New frontend should prefer localPaymentId.
        */
        paymentId: payment._id,
        localPaymentId: payment._id,
        bookingId: booking._id,
        amount: payment.amount,
        currency: payment.currency || "QAR",
        sessionId: embedded.sessionId,
        sessionExpiry: embedded.sessionExpiry || null,
        countryCode: embedded.countryCode,
        currencyCode: embedded.currencyCode,
        scriptUrl: embedded.scriptUrl,
        mode: embedded.mode,
      },
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* EMBEDDED RESULT VERIFY                                                     */
/* -------------------------------------------------------------------------- */

router.post("/embedded-result", async (req, res, next) => {
  try {
    const result = await verifyEmbeddedFromRequest(req);

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* VERIFY / SYNC                                                              */
/* -------------------------------------------------------------------------- */

router.get("/verify", async (req, res, next) => {
  try {
    const result = await syncFromRequest(req);

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const result = await syncFromRequest(req);

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

/*
  Compatibility route.
  Your browser console showed:
  POST /api/payments/myfatoorah/sync 400

  This route first tries embedded verification when paymentData exists.
  Otherwise, it falls back to normal sync using real MyFatoorah PaymentId/InvoiceId.
*/
router.post("/sync", async (req, res, next) => {
  try {
    const data = pickMyFatoorahPayload(req);
    const paymentData = pickPaymentData(req, data);

    let result = null;

    if (paymentData) {
      result = await verifyEmbeddedFromRequest(req);
    } else {
      result = await syncFromRequest(req);
    }

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

router.get("/sync", async (req, res, next) => {
  try {
    const result = await syncFromRequest(req);

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* CALLBACKS                                                                  */
/* -------------------------------------------------------------------------- */

router.get("/callback", async (req, res) => {
  try {
    const result = await syncFromRequest(req);

    await dispatchPaymentNotifications(result);

    const localPaymentId =
      result?.payment?._id || req.query.localPaymentId || req.query.paymentId || "";

    const bookingId = result?.booking?._id || result?.payment?.bookingId || "";
    const guest = isGuestPayment(result?.payment);

    const path = getFrontendResultPath(result.status);

    return res.redirect(
      getRedirectUrl(path, {
        localPaymentId,
        paymentId: localPaymentId,
        bookingId,
        status: result.status,
        guest: guest ? "1" : "",
      }),
    );
  } catch (error) {
    return res.redirect(
      getRedirectUrl("/payment/failed", {
        status: "FAILED",
        message: error?.message || "Payment verification failed",
      }),
    );
  }
});

router.get("/success", async (req, res, next) => {
  try {
    const result = await syncFromRequest(req);

    await dispatchPaymentNotifications(result);

    return res.json(buildResultPayload(result));
  } catch (error) {
    next(error);
  }
});

router.get("/failed", async (req, res, next) => {
  try {
    let result = null;

    try {
      result = await syncFromRequest(req);

      await dispatchPaymentNotifications(
        result,
        "Payment failed or was cancelled by the customer.",
      );
    } catch {
      result = null;
    }

    const localPaymentId =
      result?.payment?._id ||
      req.query.localPaymentId ||
      req.query.paymentId ||
      "";

    const bookingId = result?.booking?._id || result?.payment?.bookingId || "";
    const guest = isGuestPayment(result?.payment);

    if (result?.status) {
      const path = getFrontendResultPath(result.status);

      return res.redirect(
        getRedirectUrl(path, {
          localPaymentId,
          paymentId: localPaymentId,
          bookingId,
          status: result.status,
          guest: guest ? "1" : "",
        }),
      );
    }

    return res.redirect(
      getRedirectUrl("/payment/failed", {
        localPaymentId,
        paymentId: localPaymentId,
        status: "FAILED",
      }),
    );
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* WEBHOOK                                                                    */
/* -------------------------------------------------------------------------- */

router.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const data = pickMyFatoorahPayload(req);

    const localPaymentId = pickLocalPaymentId(req, data);
    const gatewayPaymentId = pickGatewayPaymentId(req, data);
    const invoiceId = pickInvoiceId(req, data);

    let payment = null;

    if (localPaymentId) {
      payment = await Payment.findById(localPaymentId);
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

    if (!payment && gatewayPaymentId) {
      payment = await Payment.findOne({
        $or: [
          { gatewayPaymentId: String(gatewayPaymentId) },
          { gatewayReference: String(gatewayPaymentId) },
          { "meta.myfatoorahPaymentId": String(gatewayPaymentId) },
        ],
      });
    }

    if (!payment) {
      return res.status(200).json({
        success: true,
        received: true,
        ignored: true,
        message: "Payment not found locally",
      });
    }

    payment.meta = {
      ...(payment.meta || {}),
      myfatoorahWebhookRaw: body,
      myfatoorahWebhookData: data,
      myfatoorahWebhookReceivedAt: new Date(),
      myfatoorahWebhookStatus: normalizeMyFatoorahStatus(data),
    };

    payment.markModified("meta");
    await payment.save();

    const result = await syncMyFatoorahPaymentStatus({
      localPaymentId: String(payment._id),
      paymentId: gatewayPaymentId || undefined,
      invoiceId: invoiceId || undefined,
      rawPayload: {
        body,
        data,
      },
    });

    await dispatchPaymentNotifications(result);

    return res.status(200).json({
      success: true,
      received: true,
      paid: Boolean(result.paid),
      status: result.status,
      paymentId: String(result.payment?._id || payment._id),
      localPaymentId: String(result.payment?._id || payment._id),
      bookingId: String(result.booking?._id || result.payment?.bookingId || ""),
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      received: true,
      error: error?.message || "Webhook processing failed",
    });
  }
});

export default router;
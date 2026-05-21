// server/src/services/payment/myfatoorah.service.js
import crypto from "crypto";
import mongoose from "mongoose";

import Payment from "../../models/Payment.js";

let Booking = null;

try {
  const mod = await import("../../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

/* -------------------------------------------------------------------------- */
/* BASIC HELPERS                                                              */
/* -------------------------------------------------------------------------- */

const TEST_API_URL =
  process.env.MYFATOORAH_TEST_API_URL || "https://apitest.myfatoorah.com";

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

function getLiveApiUrlByCountry() {
  const country = normalizeUpper(
    process.env.MYFATOORAH_COUNTRY_CODE || "QAT",
    "QAT",
  );

  if (["KWT", "KW", "KUWAIT"].includes(country)) {
    return "https://api.myfatoorah.com";
  }

  if (["QAT", "QA"].includes(country)) {
    return "https://api-qa.myfatoorah.com";
  }

  if (["ARE", "UAE", "AE"].includes(country)) {
    return "https://api-ae.myfatoorah.com";
  }

  if (["SAU", "KSA", "SA"].includes(country)) {
    return "https://api-sa.myfatoorah.com";
  }

  if (["EGY", "EG"].includes(country)) {
    return "https://api-eg.myfatoorah.com";
  }

  return "https://api.myfatoorah.com";
}

const LIVE_API_URL =
  process.env.MYFATOORAH_LIVE_API_URL || getLiveApiUrlByCountry();

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function toMoney(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.round(n * 100) / 100;
}

function getBaseUrl() {
  const mode = normalizeUpper(process.env.MYFATOORAH_MODE || "TEST", "TEST");
  return mode === "LIVE" ? LIVE_API_URL : TEST_API_URL;
}

function getToken() {
  const token = String(process.env.MYFATOORAH_TOKEN || "").trim();

  if (!token) {
    const error = new Error(
      "MYFATOORAH_TOKEN is missing. Add it in server/.env and restart the backend server.",
    );
    error.statusCode = 500;
    throw error;
  }

  return token;
}

export function isMyFatoorahConfigured() {
  return Boolean(String(process.env.MYFATOORAH_TOKEN || "").trim());
}

function getAppUrl() {
  return String(
    process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:5173",
  ).replace(/\/$/, "");
}

function getLiveScriptUrl() {
  const country = normalizeUpper(
    process.env.MYFATOORAH_COUNTRY_CODE || "QAT",
    "QAT",
  );

  if (["KWT", "KW", "KUWAIT"].includes(country)) {
    return "https://kw.myfatoorah.com/sessions/v1/session.js";
  }

  if (["QAT", "QA"].includes(country)) {
    return "https://qa.myfatoorah.com/sessions/v1/session.js";
  }

  if (["ARE", "UAE", "AE"].includes(country)) {
    return "https://ae.myfatoorah.com/sessions/v1/session.js";
  }

  if (["SAU", "KSA", "SA"].includes(country)) {
    return "https://sa.myfatoorah.com/sessions/v1/session.js";
  }

  if (["EGY", "EG"].includes(country)) {
    return "https://eg.myfatoorah.com/sessions/v1/session.js";
  }

  return "https://portal.myfatoorah.com/sessions/v1/session.js";
}

export function getMyFatoorahClientConfig() {
  const mode = normalizeUpper(process.env.MYFATOORAH_MODE || "TEST", "TEST");
  const isLive = mode === "LIVE";

  return {
    mode: isLive ? "LIVE" : "TEST",
    scriptUrl: isLive
      ? getLiveScriptUrl()
      : "https://demo.myfatoorah.com/sessions/v1/session.js",
    countryCode: process.env.MYFATOORAH_COUNTRY_CODE || "QAT",
    currencyCode: process.env.MYFATOORAH_CURRENCY || "QAR",
  };
}

/* -------------------------------------------------------------------------- */
/* API REQUEST                                                                */
/* -------------------------------------------------------------------------- */

async function myFatoorahRequest(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.IsSuccess === false) {
    const requestBody = (() => {
      try {
        return options?.body ? JSON.parse(options.body) : null;
      } catch {
        return options?.body || null;
      }
    })();

    console.error("MyFatoorah request failed:", {
      url,
      status: response.status,
      requestBody,
      response: data,
      validationErrors: data?.ValidationErrors || null,
    });

    const validationMessage = Array.isArray(data?.ValidationErrors)
      ? data.ValidationErrors.map((item) => {
          return item?.Error || item?.Name || JSON.stringify(item);
        }).join(", ")
      : "";

    const error = new Error(
      validationMessage || data?.Message || "MyFatoorah request failed",
    );

    error.statusCode = response.status || 500;
    error.details = data;
    throw error;
  }

  return data;
}

function getCustomerPayload(parent = {}, payment = {}) {
  const guestParent = payment?.meta?.guestParent || {};

  const name =
    parent?.fullName ||
    parent?.name ||
    payment?.meta?.parentName ||
    guestParent?.fullName ||
    guestParent?.name ||
    "KidGage Customer";

  const email =
    parent?.email || payment?.meta?.parentEmail || guestParent?.email || "";

  const mobile =
    parent?.phone ||
    parent?.mobile ||
    guestParent?.phone ||
    guestParent?.mobile ||
    "";

  return {
    Reference: String(parent?._id || payment?.parentId || payment?._id || ""),
    Name: String(name || "KidGage Customer"),
    Email: String(email || ""),
    Mobile: String(mobile || ""),
  };
}

/* -------------------------------------------------------------------------- */
/* STATUS NORMALIZATION                                                       */
/* -------------------------------------------------------------------------- */

export function normalizeMyFatoorahStatus(payload = {}) {
  const isSuccess =
    payload.isSuccess === true ||
    payload.IsSuccess === true ||
    payload.success === true ||
    payload.Success === true;

  const paymentCompleted =
    payload.paymentCompleted === true ||
    payload.PaymentCompleted === true ||
    payload.completed === true ||
    payload.Completed === true;

  if (isSuccess && paymentCompleted) {
    return "PAID";
  }

  const transactions =
    payload.InvoiceTransactions ||
    payload.invoiceTransactions ||
    payload.Transactions ||
    payload.transactions ||
    [];

  const firstTransaction = Array.isArray(transactions) ? transactions[0] : null;

  const transactionStatuses = Array.isArray(transactions)
    ? transactions
        .map((item) =>
          normalizeUpper(
            item?.TransactionStatus ||
              item?.transactionStatus ||
              item?.PaymentStatus ||
              item?.paymentStatus ||
              item?.AuthorizationStatus ||
              item?.authorizationStatus ||
              item?.Status ||
              item?.status ||
              item?.Error ||
              "",
          ),
        )
        .filter(Boolean)
    : [];

  const rawStatus = normalizeUpper(
    payload.InvoiceStatus ||
      payload.invoiceStatus ||
      payload.PaymentStatus ||
      payload.paymentStatus ||
      payload.TransactionStatus ||
      payload.transactionStatus ||
      payload.Status ||
      payload.status ||
      payload.Order?.Status ||
      payload.order?.status ||
      payload.Payment?.Status ||
      payload.payment?.status ||
      payload.Transaction?.Status ||
      payload.transaction?.status ||
      firstTransaction?.TransactionStatus ||
      firstTransaction?.transactionStatus ||
      firstTransaction?.PaymentStatus ||
      firstTransaction?.paymentStatus ||
      firstTransaction?.AuthorizationStatus ||
      firstTransaction?.authorizationStatus ||
      firstTransaction?.Status ||
      firstTransaction?.status ||
      "",
  );

  const allStatuses = [rawStatus, ...transactionStatuses]
    .map((item) => normalizeUpper(item))
    .filter(Boolean);

  if (
    allStatuses.some((status) =>
      [
        "PAID",
        "SUCCESS",
        "SUCCEEDED",
        "SUCCESSFUL",
        "CAPTURED",
        "COMPLETED",
        "AUTHORIZED",
        "AUTHORIZE",
      ].includes(status),
    )
  ) {
    return "PAID";
  }

  if (
    allStatuses.some((status) =>
      [
        "FAILED",
        "FAILURE",
        "DECLINED",
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "ERROR",
        "VOIDED",
        "UNPAID",
        "NOT CAPTURED",
        "NOT_CAPTURED",
      ].includes(status),
    )
  ) {
    return "FAILED";
  }

  if (
    allStatuses.some((status) =>
      ["PENDING", "INPROGRESS", "IN PROGRESS", "INITIATED", "WAITING"].includes(
        status,
      ),
    )
  ) {
    return "PENDING";
  }

  return rawStatus || "PENDING";
}

/* -------------------------------------------------------------------------- */
/* V3 EMBEDDED SESSION                                                        */
/* -------------------------------------------------------------------------- */

export async function createMyFatoorahEmbeddedSession({
  payment,
  booking = null,
  parent = {},
  child = {},
}) {
  const amount = toMoney(payment?.amount, 0);

  if (amount <= 0) {
    const error = new Error("Invalid MyFatoorah amount");
    error.statusCode = 400;
    throw error;
  }

  const client = getMyFatoorahClientConfig();

  const requestBody = {
    PaymentMode: "COMPLETE_PAYMENT",
    Order: {
      Amount: amount,
      Currency: payment?.currency || client.currencyCode || "QAR",
    },
  };

  const response = await myFatoorahRequest("/v3/sessions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const data = response.Data || {};

  if (!data.SessionId) {
    const error = new Error("MyFatoorah session was not created");
    error.statusCode = 502;
    error.details = response;
    throw error;
  }

  payment.paymentMethod = "ONLINE";
  payment.paymentGateway = "MYFATOORAH";
  payment.status = "PENDING";
  payment.paymentStatus = "PENDING";
  payment.gatewayStatus = "PENDING";
  payment.settlementStatus = "PENDING";

  payment.gatewaySessionId = data.SessionId || "";
  payment.gatewayReference = data.SessionId || "";

  payment.meta = {
    ...(payment.meta || {}),
    myfatoorahSessionId: data.SessionId || "",
    myfatoorahSessionExpiry: data.SessionExpiry || null,
    myfatoorahEncryptionKey: data.EncryptionKey || "",
    myfatoorahOperationType: data.OperationType || "",
    myfatoorahSessionRequest: requestBody,
    myfatoorahSessionResponse: response,
    embeddedCreatedAt: new Date(),
    bookingId: booking?._id || payment.bookingId || null,
    childId: child?._id || payment.childId || null,
    customer: getCustomerPayload(parent, payment),
  };

  await payment.save();

  return {
    raw: response,
    sessionId: data.SessionId || "",
    sessionExpiry: data.SessionExpiry || null,
    encryptionKey: data.EncryptionKey || "",
    mode: client.mode,
    scriptUrl: client.scriptUrl,
    countryCode: client.countryCode,
    currencyCode: client.currencyCode,
  };
}

/* -------------------------------------------------------------------------- */
/* V3 PAYMENT DATA DECRYPTION                                                 */
/* -------------------------------------------------------------------------- */

export function decryptMyFatoorahPaymentData(paymentData, encryptionKey) {
  const encrypted = String(paymentData || "").trim();
  const keyText = String(encryptionKey || "").trim();

  if (!encrypted || !keyText) {
    return null;
  }

  try {
    const encryptedBuffer = Buffer.from(encrypted, "base64");
    const passBytes = Buffer.from(keyText, "utf8");

    const key = Buffer.alloc(16);
    passBytes.copy(key, 0, 0, Math.min(passBytes.length, 16));

    const decipher = crypto.createDecipheriv("aes-128-cbc", key, key);
    decipher.setAutoPadding(true);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    const text = decrypted.toString("utf8");

    try {
      return JSON.parse(text);
    } catch {
      return {
        raw: text,
      };
    }
  } catch (error) {
    console.error("MyFatoorah paymentData decrypt failed:", error?.message);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* DETAIL PICKERS                                                             */
/* -------------------------------------------------------------------------- */

export async function getMyFatoorahPaymentDetails({ paymentId, invoiceId }) {
  const cleanPaymentId = String(paymentId || "").trim();
  const cleanInvoiceId = String(invoiceId || "").trim();
  const key = cleanPaymentId || cleanInvoiceId;

  if (!key) {
    const error = new Error("paymentId or invoiceId is required");
    error.statusCode = 400;
    throw error;
  }

  const response = await myFatoorahRequest("/v2/GetPaymentStatus", {
    method: "POST",
    body: JSON.stringify({
      Key: key,
      KeyType: cleanPaymentId ? "PaymentId" : "InvoiceId",
    }),
  });

  return response.Data || response;
}

function pickInvoiceIdFromDetails(details = {}) {
  return String(
    details.InvoiceId ||
      details.invoiceId ||
      details.Id ||
      details.id ||
      details.InvoiceID ||
      "",
  ).trim();
}

function pickPaymentIdFromDetails(details = {}) {
  const transactions =
    details.InvoiceTransactions ||
    details.invoiceTransactions ||
    details.Transactions ||
    details.transactions ||
    [];

  const firstTransaction = Array.isArray(transactions) ? transactions[0] : null;

  return String(
    details.PaymentId ||
      details.paymentId ||
      details.PaymentID ||
      firstTransaction?.PaymentId ||
      firstTransaction?.paymentId ||
      firstTransaction?.TransactionId ||
      firstTransaction?.transactionId ||
      firstTransaction?.TrackId ||
      firstTransaction?.trackId ||
      "",
  ).trim();
}

async function findLocalPayment({ localPaymentId, paymentId, invoiceId }) {
  if (localPaymentId && isValidObjectId(localPaymentId)) {
    const payment = await Payment.findById(localPaymentId);
    if (payment) return payment;
  }

  const or = [];

  if (paymentId) {
    or.push(
      { gatewayPaymentId: String(paymentId) },
      { gatewayReference: String(paymentId) },
      { "meta.myfatoorahPaymentId": String(paymentId) },
    );
  }

  if (invoiceId) {
    or.push(
      { gatewayOrderId: String(invoiceId) },
      { gatewayInvoiceId: String(invoiceId) },
      { gatewayReference: String(invoiceId) },
      { "meta.myfatoorahInvoiceId": String(invoiceId) },
    );
  }

  if (!or.length) return null;

  return Payment.findOne({ $or: or });
}

/* -------------------------------------------------------------------------- */
/* BOOKING SYNC                                                               */
/* -------------------------------------------------------------------------- */

async function syncBookingPaymentSuccess(payment) {
  if (!Booking || !payment?.bookingId) return null;

  const update = {
    bookingStatus: "CONFIRMED",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    paymentMethod: "ONLINE",
    paymentGateway: "MYFATOORAH",
    paymentReference:
      payment.gatewayPaymentId ||
      payment.gatewayInvoiceId ||
      payment.gatewayReference ||
      "",
    paymentId: payment._id,
    paidAt: payment.paidAt || new Date(),
    confirmedAt: new Date(),
    expiresAt: null,
    cancelledAt: null,
  };

  const booking = await Booking.findOneAndUpdate(
    {
      _id: payment.bookingId,
    },
    {
      $set: update,
    },
    { new: true },
  )
    .populate("academyId activityId packageId parentId childId")
    .lean();

  if (!booking) {
    console.error("Booking payment success sync failed: booking not found", {
      bookingId: String(payment.bookingId || ""),
      paymentId: String(payment._id || ""),
      academyId: String(payment.academyId || ""),
    });
  }

  return booking;
}

async function syncBookingPaymentFailed(payment) {
  if (!Booking || !payment?.bookingId) return null;

  const existingBooking = await Booking.findById(payment.bookingId).lean();

  if (!existingBooking) {
    console.error("Booking payment failed sync failed: booking not found", {
      bookingId: String(payment.bookingId || ""),
      paymentId: String(payment._id || ""),
    });

    return null;
  }

  const existingBookingStatus = normalizeUpper(
    existingBooking.bookingStatus || existingBooking.status,
  );
  const existingPaymentStatus = normalizeUpper(existingBooking.paymentStatus);

  if (
    existingBookingStatus === "CONFIRMED" ||
    existingPaymentStatus === "PAID"
  ) {
    return Booking.findById(payment.bookingId)
      .populate("academyId activityId packageId parentId childId")
      .lean();
  }

  return Booking.findOneAndUpdate(
    {
      _id: payment.bookingId,
    },
    {
      $set: {
        bookingStatus: "CANCELLED",
        status: "CANCELLED",
        paymentStatus: "FAILED",
        paymentMethod: "ONLINE",
        paymentGateway: "MYFATOORAH",
        paymentReference:
          payment.gatewayPaymentId ||
          payment.gatewayInvoiceId ||
          payment.gatewayReference ||
          "",
        paymentId: payment._id,
        failedAt: payment.failedAt || new Date(),
        cancelledAt: new Date(),
        expiresAt: null,
      },
    },
    { new: true },
  )
    .populate("academyId activityId packageId parentId childId")
    .lean();
}

async function loadBooking(payment) {
  if (!Booking || !payment?.bookingId) return null;

  return Booking.findById(payment.bookingId)
    .populate("academyId activityId packageId parentId childId")
    .lean()
    .catch(() => null);
}

/* -------------------------------------------------------------------------- */
/* FINALIZATION                                                               */
/* -------------------------------------------------------------------------- */

async function finalizePaymentStatus({
  payment,
  status,
  details = null,
  rawPayload = null,
  paymentId = "",
  invoiceId = "",
}) {
  const previousPaymentStatus = normalizeUpper(
    payment.paymentStatus || payment.status,
    "PENDING",
  );

  const finalPaymentId =
    paymentId ||
    pickPaymentIdFromDetails(details || {}) ||
    payment.gatewayPaymentId ||
    "";

  const finalInvoiceId =
    invoiceId ||
    pickInvoiceIdFromDetails(details || {}) ||
    payment.gatewayInvoiceId ||
    "";

  const normalizedStatus = normalizeMyFatoorahStatus({
    ...(details || {}),
    status,
  });

  payment.paymentMethod = "ONLINE";
  payment.paymentGateway = "MYFATOORAH";

  payment.gatewayPaymentId = String(finalPaymentId || "");
  payment.gatewayInvoiceId = String(finalInvoiceId || "");
  payment.gatewayOrderId =
    payment.gatewayOrderId || String(finalInvoiceId || "");

  payment.gatewayReference =
    payment.gatewayPaymentId ||
    payment.gatewayInvoiceId ||
    payment.gatewayReference ||
    "";

  payment.gatewayStatus = normalizedStatus;
  payment.gatewayResponse = details || payment.gatewayResponse || {};

  payment.meta = {
    ...(payment.meta || {}),
    myfatoorahStatus: normalizedStatus,
    myfatoorahPaymentId: String(finalPaymentId || ""),
    myfatoorahInvoiceId: String(finalInvoiceId || ""),
    myfatoorahLastSyncAt: new Date(),
    myfatoorahLastRawPayload: rawPayload || undefined,
  };

  let booking = null;

  if (normalizedStatus === "PAID") {
    payment.status = "PAID";
    payment.paymentStatus = "PAID";
    payment.settlementStatus = "READY";
    payment.paidAt = payment.paidAt || new Date();
    payment.failedAt = null;
    payment.cancelledAt = null;

    await payment.save();

    booking = await syncBookingPaymentSuccess(payment);
  } else if (normalizedStatus === "FAILED") {
    if (previousPaymentStatus === "PAID") {
      booking = await loadBooking(payment);

      return {
        paid: true,
        status: "PAID",
        payment: payment.toObject ? payment.toObject() : payment,
        booking,
        myfatoorah: details,
      };
    }

    payment.status = "FAILED";
    payment.paymentStatus = "FAILED";
    payment.settlementStatus = "CANCELLED";
    payment.failedAt = payment.failedAt || new Date();

    await payment.save();

    booking = await syncBookingPaymentFailed(payment);
  } else {
    if (previousPaymentStatus === "PAID") {
      booking = await loadBooking(payment);

      return {
        paid: true,
        status: "PAID",
        payment: payment.toObject ? payment.toObject() : payment,
        booking,
        myfatoorah: details,
      };
    }

    payment.status = "PENDING";
    payment.paymentStatus = "PENDING";
    payment.gatewayStatus = "PENDING";
    payment.settlementStatus = "PENDING";

    await payment.save();

    booking = await loadBooking(payment);
  }

  const nextPaymentStatus = normalizeUpper(
    payment.paymentStatus || payment.status,
    "PENDING",
  );

  return {
    paid: nextPaymentStatus === "PAID",
    status: nextPaymentStatus,
    previousStatus: previousPaymentStatus,
    payment: payment.toObject ? payment.toObject() : payment,
    booking,
    myfatoorah: details,
  };
}

/* -------------------------------------------------------------------------- */
/* EMBEDDED RESULT VERIFY                                                     */
/* -------------------------------------------------------------------------- */

export async function verifyMyFatoorahEmbeddedResult({
  localPaymentId,
  sessionId,
  paymentData,
  rawPayload = null,
}) {
  const cleanLocalPaymentId = String(localPaymentId || "").trim();

  if (!cleanLocalPaymentId || !isValidObjectId(cleanLocalPaymentId)) {
    const error = new Error("Valid localPaymentId is required");
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findById(cleanLocalPaymentId);

  if (!payment) {
    const error = new Error("Local payment not found");
    error.statusCode = 404;
    throw error;
  }

  const encryptionKey = payment?.meta?.myfatoorahEncryptionKey || "";
  const decrypted = decryptMyFatoorahPaymentData(paymentData, encryptionKey);

  payment.meta = {
    ...(payment.meta || {}),
    myfatoorahEmbeddedCallbackRaw: rawPayload || null,
    myfatoorahEmbeddedCallbackAt: new Date(),
    myfatoorahEmbeddedDecrypted: decrypted || null,
    myfatoorahEmbeddedSessionId: sessionId || "",
  };

  const rawStatus = normalizeMyFatoorahStatus(rawPayload || {});
  const decryptedStatus = normalizeMyFatoorahStatus(decrypted || {});

  let status =
    rawStatus === "PAID" || decryptedStatus === "PAID"
      ? "PAID"
      : decryptedStatus !== "PENDING"
        ? decryptedStatus
        : rawStatus;

  let details = decrypted || rawPayload || {};

  const embeddedPaymentId = String(
    decrypted?.PaymentId ||
      decrypted?.paymentId ||
      decrypted?.TransactionId ||
      decrypted?.transactionId ||
      rawPayload?.paymentId ||
      rawPayload?.PaymentId ||
      "",
  ).trim();

  const embeddedInvoiceId = String(
    decrypted?.InvoiceId ||
      decrypted?.invoiceId ||
      rawPayload?.invoiceId ||
      rawPayload?.InvoiceId ||
      "",
  ).trim();

  if (embeddedPaymentId || embeddedInvoiceId) {
    try {
      details = await getMyFatoorahPaymentDetails({
        paymentId: embeddedPaymentId || "",
        invoiceId: embeddedPaymentId ? "" : embeddedInvoiceId,
      });

      const detailsStatus = normalizeMyFatoorahStatus(details);

      if (detailsStatus === "PAID") {
        status = "PAID";
      } else if (status !== "PAID") {
        status = detailsStatus;
      }
    } catch (error) {
      console.error("MyFatoorah embedded status lookup failed:", {
        message: error?.message,
        statusCode: error?.statusCode,
        details: error?.details || null,
      });

      if (rawStatus === "PAID" || decryptedStatus === "PAID") {
        status = "PAID";
      }

      details = decrypted || rawPayload || {};
    }
  }

  return finalizePaymentStatus({
    payment,
    status,
    details,
    rawPayload,
    paymentId: embeddedPaymentId,
    invoiceId: embeddedInvoiceId,
  });
}

/* -------------------------------------------------------------------------- */
/* HOSTED CHECKOUT COMPATIBILITY EXPORT                                       */
/* -------------------------------------------------------------------------- */

export async function createMyFatoorahCheckout({
  payment,
  booking = null,
  parent = {},
  child = {},
}) {
  const appUrl = getAppUrl();

  const embedded = await createMyFatoorahEmbeddedSession({
    payment,
    booking,
    parent,
    child,
  });

  const bookingId = String(booking?._id || payment?.bookingId || "");
  const localPaymentId = String(payment?._id || "");

  /*
    IMPORTANT:
    localPaymentId is your MongoDB Payment _id.
    It is NOT the MyFatoorah PaymentId.

    Do not name this query param paymentId, because the frontend/backend may
    accidentally send it to MyFatoorah as KeyType: "PaymentId", which causes
    MyFatoorah 400 Bad Request.
  */
  const checkoutUrl = `${appUrl}/payment/myfatoorah/${bookingId}?localPaymentId=${localPaymentId}`;

  payment.gatewayCheckoutUrl = checkoutUrl;
  payment.meta = {
    ...(payment.meta || {}),
    embeddedCheckoutUrl: checkoutUrl,
    frontendReturnUrl: appUrl,
    localPaymentId,
  };

  await payment.save();

  return {
    payment,
    checkoutUrl,
    myfatoorah: {
      sessionId: embedded.sessionId,
      sessionExpiry: embedded.sessionExpiry,
      scriptUrl: embedded.scriptUrl,
      mode: embedded.mode,
      countryCode: embedded.countryCode,
      currencyCode: embedded.currencyCode,
      embedded,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* MAIN STATUS SYNC                                                           */
/* -------------------------------------------------------------------------- */

export async function syncMyFatoorahPaymentStatus({
  localPaymentId,
  paymentId,
  invoiceId,
  rawPayload = null,
}) {
  const cleanLocalPaymentId = String(localPaymentId || "").trim();
  const cleanPaymentId = String(paymentId || "").trim();
  const cleanInvoiceId = String(invoiceId || "").trim();

  const localPayment = await findLocalPayment({
    localPaymentId: cleanLocalPaymentId,
    paymentId: cleanPaymentId,
    invoiceId: cleanInvoiceId,
  });

  if (!localPayment) {
    const error = new Error("Local payment not found");
    error.statusCode = 404;
    throw error;
  }

  const lookupPaymentId =
    cleanPaymentId ||
    localPayment.gatewayPaymentId ||
    localPayment.meta?.myfatoorahPaymentId ||
    "";

  const lookupInvoiceId =
    cleanInvoiceId ||
    localPayment.gatewayInvoiceId ||
    localPayment.gatewayOrderId ||
    localPayment.meta?.myfatoorahInvoiceId ||
    "";

  if (!lookupPaymentId && !lookupInvoiceId) {
    const error = new Error(
      "Missing MyFatoorah paymentId or invoiceId. For embedded checkout, call verifyMyFatoorahEmbeddedResult with localPaymentId and paymentData first.",
    );
    error.statusCode = 400;
    throw error;
  }

  const details = await getMyFatoorahPaymentDetails({
    paymentId: lookupPaymentId,
    invoiceId: lookupPaymentId ? "" : lookupInvoiceId,
  });

  const status = normalizeMyFatoorahStatus(details);

  return finalizePaymentStatus({
    payment: localPayment,
    status,
    details,
    rawPayload,
    paymentId:
      lookupPaymentId ||
      pickPaymentIdFromDetails(details) ||
      localPayment.gatewayPaymentId ||
      "",
    invoiceId:
      lookupInvoiceId ||
      pickInvoiceIdFromDetails(details) ||
      localPayment.gatewayInvoiceId ||
      "",
  });
}
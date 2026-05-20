import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";

function getCommissionType() {
  return String(process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE")
    .trim()
    .toUpperCase();
}

function getCommissionValue() {
  const n = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);
  return Number.isFinite(n) ? n : 10;
}

export async function createCashPayment({
  academyId,
  bookingId,
  parentId = null,
  childId = null,
  activityId = null,
  packageId = null,
  amount,
  currency = "QAR",
}) {
  const payment = await Payment.create({
    academyId,
    bookingId,
    parentId,
    childId,
    activityId,
    packageId,
    paymentMethod: "CASH",
    paymentGateway: "MANUAL",
    paymentStatus: "PENDING",
    paymentReceiver: "KIDGAGE",
    amount,
    currency,
    kidgageCommissionType: getCommissionType(),
    kidgageCommissionValue: getCommissionValue(),
  });

  await Booking.findByIdAndUpdate(bookingId, {
    paymentId: payment._id,
    paymentMethod: "CASH",
    paymentStatus: "PENDING",
    bookingStatus: "RESERVED",
  });

  return payment;
}

export async function confirmCashPayment({
  paymentId,
  confirmedBy,
  notes = "",
}) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    const err = new Error("Payment not found");
    err.statusCode = 404;
    throw err;
  }

  if (payment.paymentMethod !== "CASH") {
    const err = new Error("Only CASH payments can be confirmed manually");
    err.statusCode = 400;
    throw err;
  }

  if (payment.paymentStatus === "PAID") {
    return payment;
  }

  payment.paymentStatus = "PAID";
  payment.confirmedBy = confirmedBy || null;
  payment.confirmedAt = new Date();
  payment.notes = notes;

  await payment.save();

  await Booking.findByIdAndUpdate(payment.bookingId, {
    paymentId: payment._id,
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    bookingStatus: "CONFIRMED",
  });

  return payment;
}

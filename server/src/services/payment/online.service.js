import Payment from "../../models/Payment.js";
import Booking from "../../models/Booking.js";
import { createMyFatoorahCheckout } from "./myfatoorah.service.js";

function getCommissionType() {
  return String(process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE")
    .trim()
    .toUpperCase();
}

function getCommissionValue() {
  const n = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);
  return Number.isFinite(n) ? n : 10;
}

export async function createOnlinePayment({
  academyId,
  bookingId,
  parentId = null,
  childId = null,
  activityId = null,
  packageId = null,
  amount,
  currency = "QAR",
  booking = null,
  parent = null,
  child = null,
}) {
  const payment = await Payment.create({
    academyId,
    bookingId,
    parentId,
    childId,
    activityId,
    packageId,
    paymentMethod: "ONLINE",
    paymentGateway: "MYFATOORAH",
    paymentStatus: "PENDING",
    paymentReceiver: "KIDGAGE",
    amount,
    currency,
    kidgageCommissionType: getCommissionType(),
    kidgageCommissionValue: getCommissionValue(),
  });

  await Booking.findByIdAndUpdate(bookingId, {
    paymentId: payment._id,
    paymentMethod: "ONLINE",
    paymentStatus: "PENDING",
    bookingStatus: "RESERVED",
  });

  const checkout = await createMyFatoorahCheckout({
    payment,
    booking,
    parent,
    child,
  });

  return checkout.payment;
}

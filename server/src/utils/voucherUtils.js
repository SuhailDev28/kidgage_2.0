// server/src/utils/voucherUtils.js
import mongoose from "mongoose";
import Voucher from "../models/Voucher.js";
import Booking from "../models/Booking.js";

function sameId(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export function calculateVoucherDiscount(voucher, subtotal) {
  const amount = Number(subtotal || 0);

  if (voucher.discountType === "PERCENTAGE") {
    let discount = (amount * Number(voucher.discountValue || 0)) / 100;

    if (voucher.maxDiscountAmount > 0) {
      discount = Math.min(discount, Number(voucher.maxDiscountAmount));
    }

    return Math.max(0, Math.min(discount, amount));
  }

  if (voucher.discountType === "FIXED") {
    return Math.max(0, Math.min(Number(voucher.discountValue || 0), amount));
  }

  return 0;
}

export async function validateVoucherForBooking({
  code,
  subtotal,
  parentUserId = null,
  academyId = null,
  activityId = null,
  packageId = null,
}) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (!cleanCode) {
    return {
      valid: false,
      message: "Voucher code is required.",
    };
  }

  const voucher = await Voucher.findOne({ code: cleanCode });

  if (!voucher) {
    return {
      valid: false,
      message: "Invalid voucher code.",
    };
  }

  if (!voucher.isActive) {
    return {
      valid: false,
      message: "This voucher is inactive.",
    };
  }

  const now = new Date();

  if (voucher.validFrom && now < voucher.validFrom) {
    return {
      valid: false,
      message: "This voucher is not active yet.",
    };
  }

  if (voucher.validTo && now > voucher.validTo) {
    return {
      valid: false,
      message: "This voucher has expired.",
    };
  }

  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    return {
      valid: false,
      message: "This voucher usage limit has been reached.",
    };
  }

  const amount = Number(subtotal || 0);

  if (voucher.minBookingAmount > 0 && amount < voucher.minBookingAmount) {
    return {
      valid: false,
      message: `Minimum booking amount should be QAR ${voucher.minBookingAmount}.`,
    };
  }

  if (voucher.academyId && !sameId(voucher.academyId, academyId)) {
    return {
      valid: false,
      message: "This voucher is not valid for this academy.",
    };
  }

  if (voucher.activityId && !sameId(voucher.activityId, activityId)) {
    return {
      valid: false,
      message: "This voucher is not valid for this activity.",
    };
  }

  if (voucher.packageId && !sameId(voucher.packageId, packageId)) {
    return {
      valid: false,
      message: "This voucher is not valid for this package.",
    };
  }

  if (parentUserId && voucher.perUserLimit > 0) {
    const userUsedCount = await Booking.countDocuments({
      parentUserId: new mongoose.Types.ObjectId(parentUserId),
      voucherId: voucher._id,
      paymentStatus: "PAID",
    });

    if (userUsedCount >= voucher.perUserLimit) {
      return {
        valid: false,
        message: "You have already used this voucher.",
      };
    }
  }

  const discountAmount = calculateVoucherDiscount(voucher, amount);
  const totalAmount = Math.max(0, amount - discountAmount);

  return {
    valid: true,
    message: "Voucher applied successfully.",
    voucher,
    discountAmount,
    totalAmount,
  };
}
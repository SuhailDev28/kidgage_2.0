// server/src/routes/public.voucher.routes.js
import express from "express";
import ActivityPackage from "../models/ActivityPackage.js";
import { validateVoucherForBooking } from "../utils/voucherUtils.js";

const router = express.Router();

function toMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

router.post("/apply", async (req, res, next) => {
  try {
    const {
      code,
      packageId,
      academyId,
      activityId,
      subtotalAmount,
      parentUserId,
    } = req.body;

    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        message: "Voucher code is required.",
      });
    }

    let subtotal = toMoney(subtotalAmount);

    if (packageId) {
      const pkg = await ActivityPackage.findById(packageId).lean();

      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: "Package not found.",
        });
      }

      subtotal = toMoney(
        pkg.price ||
          pkg.amount ||
          pkg.finalAmount ||
          pkg.baseAmount ||
          subtotal ||
          0,
      );
    }

    if (subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
    }

    const result = await validateVoucherForBooking({
      code: cleanCode,
      subtotal,
      parentUserId: parentUserId || null,
      academyId: academyId || null,
      activityId: activityId || null,
      packageId: packageId || null,
    });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message || "Voucher is not valid.",
      });
    }

    return res.json({
      success: true,
      message: result.message || "Voucher applied successfully.",
      voucher: {
        id: result.voucher._id,
        code: result.voucher.code,
        title: result.voucher.title,
        description: result.voucher.description,
        discountType: result.voucher.discountType,
        discountValue: result.voucher.discountValue,
        maxDiscountAmount: result.voucher.maxDiscountAmount,
        minBookingAmount: result.voucher.minBookingAmount,
      },
      pricing: {
        subtotalAmount: toMoney(subtotal),
        discountAmount: toMoney(result.discountAmount),
        totalAmount: toMoney(result.totalAmount),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
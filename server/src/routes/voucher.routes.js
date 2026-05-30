// server/src/routes/voucher.routes.js
import express from "express";
import Voucher from "../models/Voucher.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

router.get("/", async (req, res, next) => {
  try {
    const vouchers = await Voucher.find()
      .sort({ createdAt: -1 })
      .populate("academyId", "name")
      .populate("activityId", "title name")
      .populate("packageId", "title");

    res.json({ success: true, vouchers });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minBookingAmount,
      usageLimit,
      perUserLimit,
      validFrom,
      validTo,
      academyId,
      activityId,
      packageId,
      isActive,
    } = req.body;

    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanCode) {
      return res.status(400).json({
        success: false,
        message: "Voucher code is required.",
      });
    }

    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount type.",
      });
    }

    const safeDiscountValue = Number(discountValue || 0);

    if (safeDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value should be greater than zero.",
      });
    }

    if (discountType === "PERCENTAGE" && safeDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot be more than 100.",
      });
    }

    const exists = await Voucher.findOne({ code: cleanCode });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Voucher code already exists.",
      });
    }

    const voucher = await Voucher.create({
      code: cleanCode,
      title: String(title || "").trim(),
      description: String(description || "").trim(),
      discountType,
      discountValue: safeDiscountValue,
      maxDiscountAmount: Number(maxDiscountAmount || 0),
      minBookingAmount: Number(minBookingAmount || 0),
      usageLimit: Number(usageLimit || 0),
      perUserLimit: Number(perUserLimit || 0),
      validFrom: validFrom || null,
      validTo: validTo || null,
      academyId: academyId || null,
      activityId: activityId || null,
      packageId: packageId || null,
      isActive: isActive !== false,
      createdByUserId: req.user?._id || req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: "Voucher created successfully.",
      voucher,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found.",
      });
    }

    const {
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minBookingAmount,
      usageLimit,
      perUserLimit,
      validFrom,
      validTo,
      academyId,
      activityId,
      packageId,
      isActive,
    } = req.body;

    if (discountType !== undefined) {
      if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount type.",
        });
      }

      voucher.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const safeDiscountValue = Number(discountValue || 0);

      if (safeDiscountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value should be greater than zero.",
        });
      }

      const nextType = discountType || voucher.discountType;

      if (nextType === "PERCENTAGE" && safeDiscountValue > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount cannot be more than 100.",
        });
      }

      voucher.discountValue = safeDiscountValue;
    }

    if (title !== undefined) {
      voucher.title = String(title || "").trim();
    }

    if (description !== undefined) {
      voucher.description = String(description || "").trim();
    }

    if (maxDiscountAmount !== undefined) {
      voucher.maxDiscountAmount = Number(maxDiscountAmount || 0);
    }

    if (minBookingAmount !== undefined) {
      voucher.minBookingAmount = Number(minBookingAmount || 0);
    }

    if (usageLimit !== undefined) {
      voucher.usageLimit = Number(usageLimit || 0);
    }

    if (perUserLimit !== undefined) {
      voucher.perUserLimit = Number(perUserLimit || 0);
    }

    if (validFrom !== undefined) {
      voucher.validFrom = validFrom || null;
    }

    if (validTo !== undefined) {
      voucher.validTo = validTo || null;
    }

    if (academyId !== undefined) {
      voucher.academyId = academyId || null;
    }

    if (activityId !== undefined) {
      voucher.activityId = activityId || null;
    }

    if (packageId !== undefined) {
      voucher.packageId = packageId || null;
    }

    if (typeof isActive === "boolean") {
      voucher.isActive = isActive;
    }

    await voucher.save();

    const populatedVoucher = await Voucher.findById(voucher._id)
      .populate("academyId", "name")
      .populate("activityId", "title name")
      .populate("packageId", "title");

    res.json({
      success: true,
      message: "Voucher updated successfully.",
      voucher: populatedVoucher || voucher,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found.",
      });
    }

    res.json({
      success: true,
      message: "Voucher deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
import express from "express";
import Voucher from "../../models/Voucher.js";
import { requireAuth, requireSuperAdmin } from "../../middleware/auth.js";

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

    if (Number(discountValue) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value should be greater than zero.",
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
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minBookingAmount,
      usageLimit,
      perUserLimit,
      validFrom: validFrom || null,
      validTo: validTo || null,
      academyId: academyId || null,
      activityId: activityId || null,
      packageId: packageId || null,
      isActive: isActive !== false,
      createdByUserId: req.user?._id || null,
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

    const allowedFields = [
      "title",
      "description",
      "discountType",
      "discountValue",
      "maxDiscountAmount",
      "minBookingAmount",
      "usageLimit",
      "perUserLimit",
      "validFrom",
      "validTo",
      "academyId",
      "activityId",
      "packageId",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        voucher[field] = req.body[field] || null;
      }
    }

    if (typeof req.body.isActive === "boolean") {
      voucher.isActive = req.body.isActive;
    }

    await voucher.save();

    res.json({
      success: true,
      message: "Voucher updated successfully.",
      voucher,
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
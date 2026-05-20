import express from "express";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import Academy from "../models/Academy.js";
import AcademySetting from "../models/AcademySetting.js";

const router = express.Router();

router.use(auth, requireRole("SUPER_ADMIN", "ACADEMY_ADMIN", "ADMIN"));

function normalizeRole(req) {
  return String(req?.user?.role || "")
    .trim()
    .toUpperCase();
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function pickUserId(req) {
  return req?.user?._id || req?.user?.id || null;
}

function pickAcademyIdFromUser(req) {
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

function pickRequestedAcademyId(req) {
  return (
    req.headers["x-academy-id"] ||
    req.query.academyId ||
    req.body?.academyId ||
    req.body?.settings?.academyId ||
    null
  );
}

function resolveAcademyId(req) {
  const role = normalizeRole(req);

  if (role === "SUPER_ADMIN") {
    return pickRequestedAcademyId(req) || pickAcademyIdFromUser(req);
  }

  return pickAcademyIdFromUser(req);
}

async function requireAcademyAccess(req, res, next) {
  try {
    const academyId = resolveAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({
        success: false,
        message: "Valid academyId is required.",
      });
    }

    const academy = await Academy.findById(academyId).select(
      "_id name title status",
    );

    if (!academy) {
      return res.status(404).json({
        success: false,
        message: "Academy not found.",
      });
    }

    req.academyId = String(academy._id);
    req.academy = academy;

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to resolve academy access.",
      error: error.message,
    });
  }
}

function cleanString(value, max = 5000) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function cleanBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanNumber(value, fallback = 0, min = 0, max = 999999) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function cleanColor(value, fallback = "#e11d2e") {
  const v = cleanString(value, 20);
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return v;
  return fallback;
}

function cleanUrl(value) {
  return cleanString(value, 2000);
}

function cleanImage(value) {
  const v = String(value ?? "");
  if (!v) return "";
  if (v.length > 2_500_000) return "";
  return v;
}

function cleanEmailList(value) {
  return cleanString(value, 2000);
}

function sanitizeSettings(input = {}) {
  const settings = input && typeof input === "object" ? input : {};

  const academyProfile = settings.academyProfile || {};
  const branding = settings.branding || {};
  const bookingRules = settings.bookingRules || {};
  const payment = settings.payment || {};
  const notifications = settings.notifications || {};
  const publicProfile = settings.publicProfile || {};
  const staffContacts = settings.staffContacts || {};
  const policies = settings.policies || {};

  const confirmationMode = cleanString(
    bookingRules.bookingConfirmationMode || "AUTO",
    40,
  ).toUpperCase();

  const safeConfirmationMode = [
    "AUTO",
    "PAYMENT_REQUIRED",
    "ADMIN_APPROVAL",
  ].includes(confirmationMode)
    ? confirmationMode
    : "AUTO";

  const branches = Array.isArray(settings.branches)
    ? settings.branches.slice(0, 50).map((branch) => ({
        name: cleanString(branch?.name, 150),
        phone: cleanString(branch?.phone, 80),
        address: cleanString(branch?.address, 1000),
        mapUrl: cleanUrl(branch?.mapUrl),
        active: cleanBool(branch?.active, true),
      }))
    : [];

  const workingHours = Array.isArray(settings.workingHours)
    ? settings.workingHours.slice(0, 7).map((item) => ({
        day: cleanString(item?.day, 20),
        enabled: cleanBool(item?.enabled, true),
        open: cleanString(item?.open || "09:00", 10),
        close: cleanString(item?.close || "21:00", 10),
        breakEnabled: cleanBool(item?.breakEnabled, false),
        breakStart: cleanString(item?.breakStart || "13:00", 10),
        breakEnd: cleanString(item?.breakEnd || "14:00", 10),
      }))
    : [];

  const gallery = Array.isArray(settings.gallery)
    ? settings.gallery.slice(0, 30).map((item) => ({
        image: cleanImage(item?.image),
        title: cleanString(item?.title, 150),
        active: cleanBool(item?.active, true),
      }))
    : [];

  return {
    academyProfile: {
      academyName: cleanString(academyProfile.academyName, 180),
      legalName: cleanString(academyProfile.legalName, 180),
      slug: cleanString(academyProfile.slug, 120)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
      category: cleanString(academyProfile.category, 150),
      description: cleanString(academyProfile.description, 8000),
      email: cleanString(academyProfile.email, 180).toLowerCase(),
      phone: cleanString(academyProfile.phone, 80),
      whatsapp: cleanString(academyProfile.whatsapp, 80),
      website: cleanUrl(academyProfile.website),
      country: cleanString(academyProfile.country || "Qatar", 100),
      city: cleanString(academyProfile.city || "Doha", 100),
      address: cleanString(academyProfile.address, 1000),
      mapUrl: cleanUrl(academyProfile.mapUrl),
      licenseNumber: cleanString(academyProfile.licenseNumber, 150),
      taxNumber: cleanString(academyProfile.taxNumber, 150),
    },

    branding: {
      accentColor: cleanColor(branding.accentColor, "#e11d2e"),
      secondaryColor: cleanColor(branding.secondaryColor, "#111827"),
      fontFamily: cleanString(branding.fontFamily || "Inter", 80),
      logo: cleanImage(branding.logo),
      coverImage: cleanImage(branding.coverImage),
      favicon: cleanImage(branding.favicon),
      publicTagline: cleanString(branding.publicTagline, 300),
      loginTitle: cleanString(branding.loginTitle || "Welcome back", 150),
      loginSubtitle: cleanString(branding.loginSubtitle, 500),
    },

    bookingRules: {
      bookingEnabled: cleanBool(bookingRules.bookingEnabled, true),
      parentCanBook: cleanBool(bookingRules.parentCanBook, true),
      parentCanCancel: cleanBool(bookingRules.parentCanCancel, true),
      allowWaitlist: cleanBool(bookingRules.allowWaitlist, true),
      requireApproval: cleanBool(bookingRules.requireApproval, false),
      requireChildAgeValidation: cleanBool(
        bookingRules.requireChildAgeValidation,
        true,
      ),
      requireMedicalInfo: cleanBool(bookingRules.requireMedicalInfo, false),
      minAdvanceHours: cleanNumber(bookingRules.minAdvanceHours, 2, 0, 720),
      maxAdvanceDays: cleanNumber(bookingRules.maxAdvanceDays, 30, 0, 730),
      cancellationCutoffHours: cleanNumber(
        bookingRules.cancellationCutoffHours,
        12,
        0,
        720,
      ),
      maxBookingsPerChildPerDay: cleanNumber(
        bookingRules.maxBookingsPerChildPerDay,
        2,
        1,
        100,
      ),
      maxActiveBookingsPerChild: cleanNumber(
        bookingRules.maxActiveBookingsPerChild,
        10,
        1,
        500,
      ),
      slotHoldMinutes: cleanNumber(bookingRules.slotHoldMinutes, 10, 1, 180),
      bookingConfirmationMode: safeConfirmationMode,
    },

    payment: {
      currency: cleanString(payment.currency || "QAR", 10).toUpperCase(),
      onlinePaymentEnabled: cleanBool(payment.onlinePaymentEnabled, true),
      cashPaymentEnabled: cleanBool(payment.cashPaymentEnabled, true),
      bankTransferEnabled: cleanBool(payment.bankTransferEnabled, false),
      paymentRequiredToConfirm: cleanBool(
        payment.paymentRequiredToConfirm,
        true,
      ),
      allowPartialPayment: cleanBool(payment.allowPartialPayment, false),
      registrationFeeEnabled: cleanBool(payment.registrationFeeEnabled, false),
      registrationFee: cleanNumber(payment.registrationFee, 0, 0, 999999),
      taxEnabled: cleanBool(payment.taxEnabled, false),
      taxPercent: cleanNumber(payment.taxPercent, 0, 0, 100),
      invoicePrefix: cleanString(payment.invoicePrefix || "INV", 20),
      receiptPrefix: cleanString(payment.receiptPrefix || "RCP", 20),
      paymentInstructions: cleanString(payment.paymentInstructions, 3000),
      bankName: cleanString(payment.bankName, 180),
      bankAccountName: cleanString(payment.bankAccountName, 180),
      iban: cleanString(payment.iban, 80),
    },

    notifications: {
      emailEnabled: cleanBool(notifications.emailEnabled, true),
      smsEnabled: cleanBool(notifications.smsEnabled, false),
      whatsappEnabled: cleanBool(notifications.whatsappEnabled, true),
      notifyOnNewBooking: cleanBool(notifications.notifyOnNewBooking, true),
      notifyOnCancellation: cleanBool(notifications.notifyOnCancellation, true),
      notifyOnPayment: cleanBool(notifications.notifyOnPayment, true),
      notifyOnSlotChange: cleanBool(notifications.notifyOnSlotChange, true),
      notifyBeforeClass: cleanBool(notifications.notifyBeforeClass, true),
      reminderHoursBeforeClass: cleanNumber(
        notifications.reminderHoursBeforeClass,
        24,
        0,
        720,
      ),
      adminEmails: cleanEmailList(notifications.adminEmails),
      notificationFooter: cleanString(
        notifications.notificationFooter ||
          "Thank you for choosing our academy.",
        1000,
      ),
    },

    publicProfile: {
      isPublic: cleanBool(publicProfile.isPublic, true),
      showPrices: cleanBool(publicProfile.showPrices, true),
      showBranches: cleanBool(publicProfile.showBranches, true),
      showGallery: cleanBool(publicProfile.showGallery, true),
      showTrainerNames: cleanBool(publicProfile.showTrainerNames, true),
      seoTitle: cleanString(publicProfile.seoTitle, 180),
      seoDescription: cleanString(publicProfile.seoDescription, 500),
      instagram: cleanUrl(publicProfile.instagram),
      facebook: cleanUrl(publicProfile.facebook),
      tiktok: cleanUrl(publicProfile.tiktok),
      youtube: cleanUrl(publicProfile.youtube),
    },

    branches,

    workingHours,

    gallery,

    staffContacts: {
      managerName: cleanString(staffContacts.managerName, 180),
      managerEmail: cleanString(staffContacts.managerEmail, 180).toLowerCase(),
      managerPhone: cleanString(staffContacts.managerPhone, 80),
      financeEmail: cleanString(staffContacts.financeEmail, 180).toLowerCase(),
      supportEmail: cleanString(staffContacts.supportEmail, 180).toLowerCase(),
      emergencyPhone: cleanString(staffContacts.emergencyPhone, 80),
    },

    policies: {
      termsText: cleanString(policies.termsText, 20000),
      cancellationPolicy: cleanString(policies.cancellationPolicy, 10000),
      refundPolicy: cleanString(policies.refundPolicy, 10000),
      privacyPolicy: cleanString(policies.privacyPolicy, 10000),
      healthAndSafetyPolicy: cleanString(policies.healthAndSafetyPolicy, 10000),
    },
  };
}

/**
 * GET /api/academy/settings?academyId=...
 */
router.get("/settings", requireAcademyAccess, async (req, res) => {
  try {
    let settings = await AcademySetting.findOne({
      academyId: req.academyId,
    }).lean();

    if (!settings) {
      settings = await AcademySetting.create({
        academyId: req.academyId,
        updatedBy: pickUserId(req),
        academyProfile: {
          academyName: req.academy?.name || req.academy?.title || "",
        },
      });

      settings = settings.toObject();
    }

    return res.json({
      success: true,
      academyId: req.academyId,
      settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load academy settings.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/academy/settings
 * body: { academyId, settings }
 */
router.put("/settings", requireAcademyAccess, async (req, res) => {
  try {
    const cleanSettings = sanitizeSettings(
      req.body?.settings || req.body || {},
    );

    const saved = await AcademySetting.findOneAndUpdate(
      { academyId: req.academyId },
      {
        $set: {
          ...cleanSettings,
          academyId: req.academyId,
          updatedBy: pickUserId(req),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.json({
      success: true,
      message: "Academy settings saved successfully.",
      academyId: req.academyId,
      settings: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save academy settings.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/academy/settings
 * Partial update.
 */
router.patch("/settings", requireAcademyAccess, async (req, res) => {
  try {
    const cleanSettings = sanitizeSettings(
      req.body?.settings || req.body || {},
    );

    const saved = await AcademySetting.findOneAndUpdate(
      { academyId: req.academyId },
      {
        $set: {
          ...cleanSettings,
          updatedBy: pickUserId(req),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.json({
      success: true,
      message: "Academy settings updated successfully.",
      academyId: req.academyId,
      settings: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update academy settings.",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/academy/settings
 * Reset settings document.
 */
router.delete("/settings", requireAcademyAccess, async (req, res) => {
  try {
    await AcademySetting.deleteOne({ academyId: req.academyId });

    const created = await AcademySetting.create({
      academyId: req.academyId,
      updatedBy: pickUserId(req),
      academyProfile: {
        academyName: req.academy?.name || req.academy?.title || "",
      },
    });

    return res.json({
      success: true,
      message: "Academy settings reset successfully.",
      academyId: req.academyId,
      settings: created,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reset academy settings.",
      error: error.message,
    });
  }
});

/**
 * Public settings for academy booking page.
 * GET /api/academy/settings/public/:slug
 */
router.get("/settings/public/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required.",
      });
    }

    const settings = await AcademySetting.findOne({
      "academyProfile.slug": slug,
      "publicProfile.isPublic": true,
    })
      .select(
        "academyId academyProfile branding publicProfile branches workingHours gallery policies createdAt updatedAt",
      )
      .lean();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Public academy settings not found.",
      });
    }

    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load public academy settings.",
      error: error.message,
    });
  }
});

export default router;

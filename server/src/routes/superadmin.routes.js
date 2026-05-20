// server/src/routes/superadmin.routes.js
// IMPORTANT:
// This version uses server/src/models/Event.js for /super-admin/events.
// It no longer creates or writes to the temporary EventPoster model/collection.

import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import multer from "multer";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import Academy from "../models/Academy.js";
import Activity from "../models/Activity.js";
import Branch from "../models/Branch.js";
import Banner from "../models/Banner.js";
import User from "../models/User.js";
import AcademyRegistration from "../models/AcademyRegistration.js";
import AppSetting from "../models/AppSetting.js";
import Payment from "../models/Payment.js";
import AcademySettlement from "../models/AcademySettlement.js";
import Event from "../models/Event.js";
import ContentPage from "../models/ContentPage.js";
import Child from "../models/Child.js";

import {
  notifyAcademyRegistrationApproved,
  notifyAcademyRegistrationRejected,
  notifySettlementPaid,
  notifyPaymentSuccessful,
  notifyBookingConfirmed,
} from "../services/notification.service.js";

let Booking = null;
let BookingSession = null;

try {
  const mod = await import("../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

try {
  const mod = await import("../models/BookingSession.js");
  BookingSession = mod?.default || null;
} catch {
  BookingSession = null;
}

const router = express.Router();

/* -----------------------------
 * News model
 * --------------------------- */
const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    date: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const News = mongoose.models.News || mongoose.model("News", newsSchema);

/* -----------------------------
 * Upload directories
 * --------------------------- */
const academyUploadsDir = path.join(process.cwd(), "uploads", "academies");
const bannerUploadsDir = path.join(process.cwd(), "uploads", "banners");
const eventUploadsDir = path.join(process.cwd(), "uploads", "events");
const newsUploadsDir = path.join(process.cwd(), "uploads", "news");
const settingsUploadsDir = path.join(process.cwd(), "uploads", "settings");

fs.mkdirSync(academyUploadsDir, { recursive: true });
fs.mkdirSync(bannerUploadsDir, { recursive: true });
fs.mkdirSync(eventUploadsDir, { recursive: true });
fs.mkdirSync(newsUploadsDir, { recursive: true });
fs.mkdirSync(settingsUploadsDir, { recursive: true });

/* -----------------------------
 * Multer storage
 * --------------------------- */
const academyStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, academyUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `academy-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const bannerStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, bannerUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const eventStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, eventUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `event-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const newsStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, newsUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `news-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const settingsStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, settingsUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    const prefix =
      file.fieldname === "favicon" ? "settings-favicon" : "settings-logo";

    cb(
      null,
      `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`,
    );
  },
});

/* -----------------------------
 * Multer filter
 * --------------------------- */
function imageOnlyFilter(_req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  return cb(new Error("Only image uploads are allowed"));
}

const academyUpload = multer({
  storage: academyStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const eventUpload = multer({
  storage: eventStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const newsUpload = multer({
  storage: newsStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const settingsUpload = multer({
  storage: settingsStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

/* -----------------------------
 * Helpers
 * --------------------------- */
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeBannerType(value) {
  const v = String(value || "home")
    .toLowerCase()
    .trim();
  if (["home", "desktop", "mobile"].includes(v)) return v;
  return "home";
}

function buildAcademyLogoPath(filename) {
  return `/uploads/academies/${filename}`;
}

function buildBannerImagePath(filename) {
  return `/uploads/banners/${filename}`;
}

function buildEventImagePath(filename) {
  return `/uploads/events/${filename}`;
}

function buildNewsImagePath(filename) {
  return `/uploads/news/${filename}`;
}

function buildSettingsImagePath(filename) {
  return `/uploads/settings/${filename}`;
}

function cleanupUploadedFile(dir, storedPath) {
  if (!storedPath) return;

  try {
    const filename = path.basename(String(storedPath || ""));
    if (!filename) return;

    const filePath = path.join(dir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore cleanup errors
  }
}

function slugify(text = "") {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueAcademySlug(name) {
  const base = slugify(name || "academy") || "academy";
  let slug = base;
  let counter = 1;

  while (await Academy.findOne({ slug }).lean()) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

async function generateUniqueEventSlug(title, currentId = null) {
  const base = slugify(title || "event") || "event";
  let slug = base;
  let counter = 1;

  while (
    await Event.findOne(
      currentId ? { slug, _id: { $ne: currentId } } : { slug },
    ).lean()
  ) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

function generateTempPassword(length = 10) {
  return crypto
    .randomBytes(12)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(v)) return true;
    if (["false", "0", "no", "off"].includes(v)) return false;
  }

  if (typeof value === "number") return value === 1;

  return fallback;
}

async function getAppSettingsDoc() {
  let settings = await AppSetting.findOne({ key: "GLOBAL" });

  if (!settings) {
    settings = await AppSetting.create({ key: "GLOBAL" });
  }

  return settings;
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value) {
  return Number(toMoney(value, 0).toFixed(2));
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function isLockedSettlementStatus(value) {
  const status = normalizeStatus(value);
  return ["PAID", "PAID_TO_ACADEMY", "SETTLED"].includes(status);
}

function normalizeDateStart(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeDateEnd(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(23, 59, 59, 999);
  return d;
}

function buildPaymentDateFilter(req) {
  const createdAt = {};

  const from = normalizeDateStart(req.query.from || req.query.dateFrom);
  const to = normalizeDateEnd(req.query.to || req.query.dateTo);

  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  return Object.keys(createdAt).length ? createdAt : null;
}

function buildPaymentFilter(req) {
  const filter = {
    paymentReceiver: "KIDGAGE",
  };

  if (req.query.academyId && isValidObjectId(req.query.academyId)) {
    filter.academyId = req.query.academyId;
  }

  if (req.query.paymentStatus) {
    filter.paymentStatus = normalizeStatus(req.query.paymentStatus);
  }

  if (req.query.settlementStatus) {
    filter.settlementStatus = normalizeStatus(req.query.settlementStatus);
  }

  if (req.query.paymentMethod) {
    filter.paymentMethod = normalizeStatus(req.query.paymentMethod);
  }

  if (req.query.gateway) {
    filter.paymentGateway = normalizeStatus(req.query.gateway);
  }

  if (req.query.paymentGateway) {
    filter.paymentGateway = normalizeStatus(req.query.paymentGateway);
  }

  const createdAt = buildPaymentDateFilter(req);
  if (createdAt) filter.createdAt = createdAt;

  return filter;
}

function normalizeEventForClient(item) {
  if (!item) return null;

  const status = String(item.status || "PUBLISHED").toUpperCase();
  const isActive =
    item.active !== undefined ? Boolean(item.active) : status === "PUBLISHED";
  const startDate = item.startDate || item.eventDate || null;

  return {
    ...item,
    _id: item._id,
    id: item._id,
    title: item.title || "",
    slug: item.slug || "",
    description: item.description || "",
    link: item.link || "",
    url: item.link || "",
    image: item.image || "",
    venue: item.venue || "",
    city: item.city || "",
    startDate,
    endDate: item.endDate || null,
    eventDate: item.eventDate || startDate,
    active: isActive,
    status: status || "PUBLISHED",
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizePaymentForClient(item) {
  const academy = item?.academyId || {};
  const booking = item?.bookingId || {};
  const parent = item?.parentId || {};
  const activity = item?.activityId || {};
  const pkg = item?.packageId || {};

  return {
    _id: item._id,
    id: item._id,

    academyId: academy?._id || item.academyId || null,
    academyName: academy?.name || item?.meta?.academyName || "Academy",
    academyCity: academy?.city || "",
    academyLogo: academy?.logo || "",

    bookingId: booking?._id || item.bookingId || null,
    bookingNo: booking?.bookingNo || booking?.referenceNo || "N/A",
    bookingStatus: booking?.bookingStatus || "",

    parentId: parent?._id || item.parentId || null,
    parentName: parent?.fullName || parent?.name || "Parent",
    parentEmail: parent?.email || "",
    parentPhone: parent?.phone || "",

    activityId: activity?._id || item.activityId || null,
    activityName: activity?.title || activity?.name || "N/A",

    packageId: pkg?._id || item.packageId || null,
    packageName: pkg?.title || "N/A",

    amount: roundMoney(item.amount),
    currency: item.currency || "QAR",

    paymentReceiver: item.paymentReceiver || "KIDGAGE",

    paymentMethod: item.paymentMethod || "CASH",
    paymentGateway: item.paymentGateway || "MANUAL",

    gatewayOrderId: item.gatewayOrderId || "",
    gatewayPaymentId: item.gatewayPaymentId || "",
    gatewayReference: item.gatewayReference || "",
    gatewayCheckoutUrl: item.gatewayCheckoutUrl || "",

    paymentStatus: item.paymentStatus || "PENDING",
    settlementStatus: item.settlementStatus || "PENDING",

    kidgageCommissionType: item.kidgageCommissionType || "PERCENTAGE",
    kidgageCommissionValue: toMoney(item.kidgageCommissionValue, 0),
    kidgageCommissionAmount: roundMoney(item.kidgageCommissionAmount),
    academyPayableAmount: roundMoney(item.academyPayableAmount),

    paidAt: item.paidAt || null,
    failedAt: item.failedAt || null,
    cancelledAt: item.cancelledAt || null,
    refundedAt: item.refundedAt || null,

    confirmedBy: item.confirmedBy || null,
    confirmedAt: item.confirmedAt || null,

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,

    notes: item.notes || "",
    meta: item.meta || {},
  };
}

function normalizeSettlementForClient(item) {
  const academy = item?.academyId || {};
  const settledBy = item?.settledBy || {};

  return {
    _id: item._id,
    id: item._id,

    academyId: academy?._id || item.academyId || null,
    academyName: academy?.name || "Academy",
    academyCity: academy?.city || "",
    academyLogo: academy?.logo || "",

    paymentIds: Array.isArray(item.paymentIds) ? item.paymentIds : [],
    paymentCount: Array.isArray(item.paymentIds) ? item.paymentIds.length : 0,

    totalCollected: roundMoney(item.totalCollected),
    kidgageCommissionTotal: roundMoney(item.kidgageCommissionTotal),
    academyPayableTotal: roundMoney(item.academyPayableTotal),
    currency: item.currency || "QAR",

    status: item.status || "PAID",
    paymentMethod: item.paymentMethod || "MANUAL_BANK_TRANSFER",
    settlementReference: item.settlementReference || "",
    notes: item.notes || "",

    settledAt: item.settledAt || null,
    settledBy: settledBy?._id || item.settledBy || null,
    settledByName: settledBy?.fullName || "",
    settledByEmail: settledBy?.email || "",

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizeAcademyAdminForClient(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user._id,
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "",
    status: user.status || "",
    mustChangePassword: Boolean(user.mustChangePassword),
    tempPassword: user.tempPassword || "",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

async function dispatchManualPaymentPaidNotifications({
  payment,
  createdByUserId = null,
} = {}) {
  const paymentId = payment?._id || payment?.id;

  if (!paymentId || !isValidObjectId(paymentId)) {
    return null;
  }

  const freshPayment = await Payment.findById(paymentId);

  if (!freshPayment) {
    return null;
  }

  let booking = null;

  if (
    Booking &&
    freshPayment.bookingId &&
    isValidObjectId(freshPayment.bookingId)
  ) {
    booking = await Booking.findById(freshPayment.bookingId)
      .populate("activityId")
      .populate("packageId")
      .populate("academyId")
      .populate("parentId")
      .populate("childId");
  }

  await Promise.allSettled([
    notifyPaymentSuccessful({
      payment: freshPayment,
      booking,
      createdByUserId,
    }),
    booking
      ? notifyBookingConfirmed({
          booking,
          payment: freshPayment,
          createdByUserId,
        })
      : null,
  ]);

  return true;
}

/* ---------------------------------
 * Academy Registration Requests
 * -------------------------------- */
router.get(
  "/academy-registrations",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const registrations = await AcademyRegistration.find({})
        .sort({ createdAt: -1 })
        .populate("academyId", "name slug status")
        .populate("adminUserId", "fullName email role tempPassword")
        .populate("approvedBy", "fullName email")
        .lean();

      return res.json({ registrations });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/academy-registrations/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid registration id" });
      }

      const registration = await AcademyRegistration.findById(id)
        .populate("academyId", "name slug status")
        .populate("adminUserId", "fullName email role tempPassword")
        .populate("approvedBy", "fullName email")
        .lean();

      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      return res.json({ registration });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/academy-registrations/:id/approve",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid registration id" });
      }

      let academy = null;
      let adminUser = null;
      let tempPassword = "";

      await session.withTransaction(async () => {
        const registration =
          await AcademyRegistration.findById(id).session(session);

        if (!registration) {
          throw Object.assign(new Error("Registration not found"), {
            statusCode: 404,
          });
        }

        if (registration.status !== "PENDING") {
          throw Object.assign(new Error("Registration already processed"), {
            statusCode: 400,
          });
        }

        const normalizedEmail = String(registration.email || "")
          .trim()
          .toLowerCase();

        if (!normalizedEmail) {
          throw Object.assign(new Error("Registration email is missing"), {
            statusCode: 400,
          });
        }

        const existingUser = await User.findOne({ email: normalizedEmail })
          .session(session)
          .lean();

        if (existingUser) {
          throw Object.assign(
            new Error("A user with this email already exists"),
            { statusCode: 400 },
          );
        }

        const slug = await generateUniqueAcademySlug(registration.academyName);

        const academyDocs = await Academy.create(
          [
            {
              name: registration.academyName,
              slug,
              description: registration.bio || "",
              email: registration.email || "",
              phone: registration.phone || "",
              address: registration.address || "",
              city: registration.location || "",
              website: registration.website || "",
              status: "ACTIVE",
              isFeatured: false,
            },
          ],
          { session },
        );

        academy = academyDocs[0];

        tempPassword = generateTempPassword(10);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const adminDocs = await User.create(
          [
            {
              fullName: registration.fullName || registration.academyName,
              email: normalizedEmail,
              phone: registration.phone || "",
              passwordHash,
              tempPassword,
              mustChangePassword: true,
              role: "ACADEMY_ADMIN",
              academyId: academy._id,
              status: "ACTIVE",
            },
          ],
          { session },
        );

        adminUser = adminDocs[0];

        registration.status = "APPROVED";
        registration.academyId = academy._id;
        registration.adminUserId = adminUser._id;
        registration.approvedAt = new Date();
        registration.approvedBy = req.user?._id || null;

        await registration.save({ session });
      });

      const registration = await AcademyRegistration.findById(id)
        .populate("academyId", "name slug status")
        .populate("adminUserId", "fullName email role tempPassword")
        .populate("approvedBy", "fullName email")
        .lean();

      await Promise.allSettled([
        notifyAcademyRegistrationApproved({
          registration,
          academy,
          academyUserId:
            adminUser?._id || registration?.adminUserId?._id || null,
          createdByUserId: req.user?._id || null,
        }),
      ]);

      return res.json({
        message: "Registration approved successfully",
        registration,
        academy,
        adminUser: normalizeAcademyAdminForClient(adminUser),
        tempPassword,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);

router.patch(
  "/academy-registrations/:id/reject",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const reason = String(req.body.reason || "").trim();

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid registration id" });
      }

      const registration = await AcademyRegistration.findById(id);

      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.status !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Registration already processed" });
      }

      registration.status = "REJECTED";
      registration.rejectedAt = new Date();
      registration.rejectionReason = reason;

      await registration.save();

      await Promise.allSettled([
        notifyAcademyRegistrationRejected({
          registration,
          reason,
          createdByUserId: req.user?._id || null,
        }),
      ]);

      return res.json({
        message: "Registration rejected successfully",
        registration,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/academy-registrations/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid registration id" });
      }

      const registration = await AcademyRegistration.findByIdAndDelete(id);

      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      return res.json({
        message: "Registration deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * Academies
 * -------------------------------- */
router.get(
  "/academies",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const academies = await Academy.find({}).sort({ createdAt: -1 }).lean();
      const academyIds = academies.map((a) => a._id).filter(Boolean);

      const [activityAgg, branchAgg, academyAdmins] = await Promise.all([
        Activity.aggregate([
          { $match: { academyId: { $in: academyIds } } },
          { $group: { _id: "$academyId", count: { $sum: 1 } } },
        ]),
        Branch.aggregate([
          { $match: { academyId: { $in: academyIds } } },
          { $group: { _id: "$academyId", count: { $sum: 1 } } },
        ]),
        User.find({
          academyId: { $in: academyIds },
          role: "ACADEMY_ADMIN",
        })
          .select(
            "fullName email phone role status academyId tempPassword mustChangePassword createdAt updatedAt",
          )
          .lean(),
      ]);

      const activityMap = new Map(
        activityAgg.map((row) => [String(row._id), row.count]),
      );

      const branchMap = new Map(
        branchAgg.map((row) => [String(row._id), row.count]),
      );

      const adminMap = new Map(
        academyAdmins.map((user) => [String(user.academyId), user]),
      );

      return res.json({
        academies: academies.map((academy) => {
          const adminUser = adminMap.get(String(academy._id)) || null;

          return {
            _id: academy._id,
            id: academy._id,
            name: academy.name,
            slug: academy.slug,
            email: academy.email || "",
            phone: academy.phone || "",
            city: academy.city || "",
            address: academy.address || "",
            website: academy.website || "",
            description: academy.description || "",
            logo: academy.logo || "",
            status: academy.status || "INACTIVE",
            featured: Boolean(academy.isFeatured),
            isFeatured: Boolean(academy.isFeatured),
            createdAt: academy.createdAt,
            activitiesCount: activityMap.get(String(academy._id)) || 0,
            branchesCount: branchMap.get(String(academy._id)) || 0,
            adminUser: normalizeAcademyAdminForClient(adminUser),
            tempPassword: adminUser?.tempPassword || "",
          };
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/academies/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid academy id" });
      }

      const academy = await Academy.findById(id).lean();

      if (!academy) {
        return res.status(404).json({ message: "Academy not found" });
      }

      const [activitiesCount, branchesCount, adminUser] = await Promise.all([
        Activity.countDocuments({ academyId: academy._id }),
        Branch.countDocuments({ academyId: academy._id }),
        User.findOne({
          academyId: academy._id,
          role: "ACADEMY_ADMIN",
        })
          .select(
            "fullName email phone role status academyId tempPassword mustChangePassword createdAt updatedAt",
          )
          .lean(),
      ]);

      return res.json({
        academy: {
          ...academy,
          id: academy._id,
          featured: Boolean(academy.isFeatured),
          isFeatured: Boolean(academy.isFeatured),
          activitiesCount,
          branchesCount,
          adminUser: normalizeAcademyAdminForClient(adminUser),
          tempPassword: adminUser?.tempPassword || "",
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/academies/:id/status",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid academy id" });
      }

      const allowedStatuses = ["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"];
      const normalizedStatus = String(status || "").toUpperCase();

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid academy status" });
      }

      const academy = await Academy.findByIdAndUpdate(
        id,
        { status: normalizedStatus },
        { new: true },
      );

      if (!academy) {
        return res.status(404).json({ message: "Academy not found" });
      }

      await User.updateMany(
        { academyId: id, role: "ACADEMY_ADMIN" },
        {
          $set: {
            status:
              normalizedStatus === "ACTIVE"
                ? "ACTIVE"
                : normalizedStatus === "SUSPENDED"
                  ? "SUSPENDED"
                  : "INACTIVE",
          },
        },
      );

      return res.json({
        message: "Academy status updated successfully",
        academy: {
          _id: academy._id,
          id: academy._id,
          status: academy.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/academies/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  academyUpload.single("logo"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid academy id" });
      }

      const academy = await Academy.findById(id);

      if (!academy) {
        return res.status(404).json({ message: "Academy not found" });
      }

      const update = {};

      if (req.body.name !== undefined) {
        update.name = String(req.body.name || "").trim();
      }

      if (req.body.email !== undefined) {
        update.email = String(req.body.email || "").trim();
      }

      if (req.body.phone !== undefined) {
        update.phone = String(req.body.phone || "").trim();
      }

      if (req.body.city !== undefined) {
        update.city = String(req.body.city || "").trim();
      }

      if (req.body.address !== undefined) {
        update.address = String(req.body.address || "").trim();
      }

      if (req.body.website !== undefined) {
        update.website = String(req.body.website || "").trim();
      }

      if (req.body.description !== undefined) {
        update.description = String(req.body.description || "").trim();
      }

      if (req.body.status !== undefined) {
        const allowedStatuses = ["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"];
        const normalizedStatus = String(req.body.status || "").toUpperCase();

        if (!allowedStatuses.includes(normalizedStatus)) {
          return res.status(400).json({ message: "Invalid academy status" });
        }

        update.status = normalizedStatus;
      }

      if (req.body.featured !== undefined) {
        update.isFeatured = toBool(req.body.featured, academy.isFeatured);
      }

      if (req.body.isFeatured !== undefined) {
        update.isFeatured = toBool(req.body.isFeatured, academy.isFeatured);
      }

      if (req.file) {
        update.logo = buildAcademyLogoPath(req.file.filename);

        if (
          academy.logo &&
          String(academy.logo).startsWith("/uploads/academies/")
        ) {
          cleanupUploadedFile(academyUploadsDir, academy.logo);
        }
      }

      const updated = await Academy.findByIdAndUpdate(id, update, {
        new: true,
      });

      return res.json({
        message: "Academy updated successfully",
        academy: {
          ...updated.toObject(),
          id: updated._id,
          featured: Boolean(updated.isFeatured),
          isFeatured: Boolean(updated.isFeatured),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/academies/:id/password",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const password = String(req.body.password || "").trim();

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid academy id" });
      }

      if (!password || password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const academy = await Academy.findById(id);

      if (!academy) {
        return res.status(404).json({ message: "Academy not found" });
      }

      const adminUser = await User.findOne({
        academyId: id,
        role: "ACADEMY_ADMIN",
      });

      if (!adminUser) {
        return res.status(404).json({
          message: "Academy admin user not found",
        });
      }

      adminUser.passwordHash = await bcrypt.hash(password, 10);
      adminUser.status = "ACTIVE";
      adminUser.tempPassword = password;
      adminUser.mustChangePassword = true;

      await adminUser.save();

      return res.json({
        message: "Academy admin password updated successfully",
        academyId: id,
        adminUser: normalizeAcademyAdminForClient(adminUser),
        tempPassword: password,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/academies/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid academy id" });
      }

      let deletedAcademy = null;

      await session.withTransaction(async () => {
        const academy = await Academy.findById(id).session(session);

        if (!academy) {
          throw Object.assign(new Error("Academy not found"), {
            statusCode: 404,
          });
        }

        deletedAcademy = academy.toObject();

        await Promise.all([
          Activity.deleteMany({ academyId: id }).session(session),
          Branch.deleteMany({ academyId: id }).session(session),
          User.deleteMany({ academyId: id }).session(session),
          Payment.deleteMany({ academyId: id }).session(session),
          AcademySettlement.deleteMany({ academyId: id }).session(session),
          AcademyRegistration.updateMany(
            { academyId: id },
            {
              $set: {
                academyId: null,
                adminUserId: null,
                status: "REJECTED",
                rejectionReason: "Linked academy was deleted by super admin.",
              },
            },
          ).session(session),
          Booking
            ? Booking.deleteMany({ academyId: id }).session(session)
            : Promise.resolve(),
        ]);

        await Academy.deleteOne({ _id: id }).session(session);
      });

      if (
        deletedAcademy?.logo &&
        String(deletedAcademy.logo).startsWith("/uploads/academies/")
      ) {
        cleanupUploadedFile(academyUploadsDir, deletedAcademy.logo);
      }

      return res.json({
        message: "Academy and related database records deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);

/* ---------------------------------
 * Platform Settings
 * -------------------------------- */
router.get(
  "/settings",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const settings = await getAppSettingsDoc();
      return res.json({ settings });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/settings",
  auth,
  requireRole("SUPER_ADMIN"),
  settingsUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const settings = await getAppSettingsDoc();

      const logoFile = req.files?.logo?.[0] || null;
      const faviconFile = req.files?.favicon?.[0] || null;

      const update = {
        siteName: String(
          req.body.siteName || settings.siteName || "KidGage",
        ).trim(),
        tagline: String(req.body.tagline || settings.tagline || "").trim(),

        primaryColor: String(
          req.body.primaryColor || settings.primaryColor || "#2563eb",
        ).trim(),
        secondaryColor: String(
          req.body.secondaryColor || settings.secondaryColor || "#6d28d9",
        ).trim(),

        menuLinkColor: String(
          req.body.menuLinkColor || settings.menuLinkColor || "#475569",
        ).trim(),
        menuLinkHoverColor: String(
          req.body.menuLinkHoverColor ||
            settings.menuLinkHoverColor ||
            "#ec7a3b",
        ).trim(),
        menuLinkActiveColor: String(
          req.body.menuLinkActiveColor ||
            settings.menuLinkActiveColor ||
            "#ec7a3b",
        ).trim(),
        menuLinkActiveBg: String(
          req.body.menuLinkActiveBg || settings.menuLinkActiveBg || "#fff4ec",
        ).trim(),

        contactEmail: String(
          req.body.contactEmail || settings.contactEmail || "",
        ).trim(),
        contactPhone: String(
          req.body.contactPhone || settings.contactPhone || "",
        ).trim(),
        whatsapp: String(req.body.whatsapp || settings.whatsapp || "").trim(),
        website: String(req.body.website || settings.website || "").trim(),
        address: String(req.body.address || settings.address || "").trim(),

        footerDescription: String(
          req.body.footerDescription || settings.footerDescription || "",
        ).trim(),
        footerCopyright: String(
          req.body.footerCopyright || settings.footerCopyright || "",
        ).trim(),

        metaTitle: String(
          req.body.metaTitle || settings.metaTitle || "",
        ).trim(),
        metaDescription: String(
          req.body.metaDescription || settings.metaDescription || "",
        ).trim(),

        instagram: String(
          req.body.instagram || settings.instagram || "",
        ).trim(),
        facebook: String(req.body.facebook || settings.facebook || "").trim(),
        youtube: String(req.body.youtube || settings.youtube || "").trim(),
        tiktok: String(req.body.tiktok || settings.tiktok || "").trim(),

        allowProviderRegistration: toBool(
          req.body.allowProviderRegistration,
          settings.allowProviderRegistration,
        ),
        allowParentRegistration: toBool(
          req.body.allowParentRegistration,
          settings.allowParentRegistration,
        ),

        showBlogs: toBool(req.body.showBlogs, settings.showBlogs),
        showEvents: toBool(req.body.showEvents, settings.showEvents),
        showTopBrands: toBool(req.body.showTopBrands, settings.showTopBrands),
        showTopActivities: toBool(
          req.body.showTopActivities,
          settings.showTopActivities,
        ),

        maintenanceMode: toBool(
          req.body.maintenanceMode,
          settings.maintenanceMode,
        ),
        maintenanceMessage: String(
          req.body.maintenanceMessage || settings.maintenanceMessage || "",
        ).trim(),
      };

      if (logoFile) {
        update.logo = buildSettingsImagePath(logoFile.filename);
        update.logoUpdatedAt = new Date();

        if (
          settings.logo &&
          String(settings.logo).startsWith("/uploads/settings/")
        ) {
          cleanupUploadedFile(settingsUploadsDir, settings.logo);
        }
      }

      if (faviconFile) {
        update.favicon = buildSettingsImagePath(faviconFile.filename);

        if (
          settings.favicon &&
          String(settings.favicon).startsWith("/uploads/settings/")
        ) {
          cleanupUploadedFile(settingsUploadsDir, settings.favicon);
        }
      }

      const updated = await AppSetting.findOneAndUpdate(
        { key: "GLOBAL" },
        { $set: update },
        { new: true, upsert: true },
      );

      return res.json({
        message: "Settings updated successfully",
        settings: updated,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * Banners
 * -------------------------------- */
router.get(
  "/banners",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const banners = await Banner.find({}).sort({ createdAt: -1 });
      return res.json({ banners });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/banners",
  auth,
  requireRole("SUPER_ADMIN"),
  bannerUpload.single("image"),
  async (req, res, next) => {
    try {
      const imagePath = req.file ? buildBannerImagePath(req.file.filename) : "";

      if (!req.body.title?.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!imagePath) {
        return res.status(400).json({ message: "Banner image is required" });
      }

      const banner = await Banner.create({
        title: String(req.body.title || "").trim(),
        link: String(req.body.link || "").trim(),
        image: imagePath,
        bannerType: normalizeBannerType(req.body.bannerType),
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        fees: req.body.fees || "",
        active: String(req.body.active || "true") === "true",
      });

      return res.status(201).json({
        message: "Banner created successfully",
        banner,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/banners/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  bannerUpload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid banner id" });
      }

      const existingBanner = await Banner.findById(id);

      if (!existingBanner) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const update = {
        title: String(req.body.title || "").trim(),
        link: String(req.body.link || "").trim(),
        bannerType: normalizeBannerType(req.body.bannerType),
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null,
        fees: req.body.fees || "",
        active: String(req.body.active || "true") === "true",
      };

      if (req.file) {
        update.image = buildBannerImagePath(req.file.filename);

        if (
          existingBanner.image &&
          String(existingBanner.image).startsWith("/uploads/banners/")
        ) {
          cleanupUploadedFile(bannerUploadsDir, existingBanner.image);
        }
      }

      const banner = await Banner.findByIdAndUpdate(id, update, {
        new: true,
      });

      return res.json({
        message: "Banner updated successfully",
        banner,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/banners/:id/toggle",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid banner id" });
      }

      const banner = await Banner.findByIdAndUpdate(
        id,
        { active: Boolean(req.body.active) },
        { new: true },
      );

      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }

      return res.json({
        message: "Banner status updated",
        banner,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/banners/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid banner id" });
      }

      const banner = await Banner.findById(id);

      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const imagePath = banner.image || "";

      await Banner.deleteOne({ _id: id });

      if (imagePath && String(imagePath).startsWith("/uploads/banners/")) {
        cleanupUploadedFile(bannerUploadsDir, imagePath);
      }

      return res.json({
        message: "Banner deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * Events
 * Writes to Event model / events collection
 * -------------------------------- */
router.get(
  "/events",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const events = await Event.find({}).sort({ createdAt: -1 }).lean();

      return res.json({
        count: events.length,
        events: events.map(normalizeEventForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/events",
  auth,
  requireRole("SUPER_ADMIN"),
  eventUpload.single("image"),
  async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const link = String(req.body.link || req.body.url || "").trim();
      const startDate = req.body.startDate || null;
      const endDate = req.body.endDate || null;
      const active = toBool(req.body.active, true);

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const slug = await generateUniqueEventSlug(title);

      const event = await Event.create({
        academyId: null,
        title,
        slug,
        description,
        link,
        image: req.file ? buildEventImagePath(req.file.filename) : "",
        startDate,
        endDate,
        eventDate: startDate,
        active,
        status: active ? "PUBLISHED" : "DRAFT",
      });

      return res.status(201).json({
        message: "Event created successfully",
        event: normalizeEventForClient(event.toObject()),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/events/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  eventUpload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const existingEvent = await Event.findById(id);

      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const link = String(req.body.link || req.body.url || "").trim();
      const startDate = req.body.startDate || null;
      const endDate = req.body.endDate || null;
      const active = toBool(
        req.body.active,
        existingEvent.active !== undefined
          ? existingEvent.active
          : existingEvent.status === "PUBLISHED",
      );

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const update = {
        title,
        description,
        link,
        startDate,
        endDate,
        eventDate: startDate,
        active,
        status: active ? "PUBLISHED" : "DRAFT",
      };

      if (title !== existingEvent.title) {
        update.slug = await generateUniqueEventSlug(title, id);
      }

      if (req.file) {
        update.image = buildEventImagePath(req.file.filename);

        if (
          existingEvent.image &&
          String(existingEvent.image).startsWith("/uploads/events/")
        ) {
          cleanupUploadedFile(eventUploadsDir, existingEvent.image);
        }
      }

      const event = await Event.findByIdAndUpdate(id, update, {
        new: true,
      }).lean();

      return res.json({
        message: "Event updated successfully",
        event: normalizeEventForClient(event),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/events/:id/toggle",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const active = toBool(req.body.active, false);

      const event = await Event.findByIdAndUpdate(
        id,
        {
          active,
          status: active ? "PUBLISHED" : "DRAFT",
        },
        { new: true },
      ).lean();

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.json({
        message: "Event status updated",
        event: normalizeEventForClient(event),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/events/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const event = await Event.findById(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const imagePath = event.image || "";

      await Event.deleteOne({ _id: id });

      if (imagePath && String(imagePath).startsWith("/uploads/events/")) {
        cleanupUploadedFile(eventUploadsDir, imagePath);
      }

      return res.json({
        message: "Event deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * News
 * -------------------------------- */
router.get(
  "/news",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const news = await News.find({}).sort({ createdAt: -1 }).lean();
      return res.json({ news });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/news",
  auth,
  requireRole("SUPER_ADMIN"),
  newsUpload.single("image"),
  async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      const news = await News.create({
        title,
        description,
        image: req.file ? buildNewsImagePath(req.file.filename) : "",
        date: req.body.date || null,
        active: String(req.body.active || "true") === "true",
      });

      return res.status(201).json({
        message: "News created successfully",
        news,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/news/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  newsUpload.single("image"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid news id" });
      }

      const existingNews = await News.findById(id);

      if (!existingNews) {
        return res.status(404).json({ message: "News not found" });
      }

      const update = {
        title: String(req.body.title || "").trim(),
        description: String(req.body.description || "").trim(),
        date: req.body.date || null,
        active: String(req.body.active || "true") === "true",
      };

      if (req.file) {
        update.image = buildNewsImagePath(req.file.filename);

        if (
          existingNews.image &&
          String(existingNews.image).startsWith("/uploads/news/")
        ) {
          cleanupUploadedFile(newsUploadsDir, existingNews.image);
        }
      }

      const news = await News.findByIdAndUpdate(id, update, {
        new: true,
      });

      return res.json({
        message: "News updated successfully",
        news,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/news/:id/toggle",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid news id" });
      }

      const news = await News.findByIdAndUpdate(
        id,
        { active: Boolean(req.body.active) },
        { new: true },
      );

      if (!news) {
        return res.status(404).json({ message: "News not found" });
      }

      return res.json({
        message: "News status updated",
        news,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/news/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid news id" });
      }

      const news = await News.findById(id);

      if (!news) {
        return res.status(404).json({ message: "News not found" });
      }

      const imagePath = news.image || "";

      await News.deleteOne({ _id: id });

      if (imagePath && String(imagePath).startsWith("/uploads/news/")) {
        cleanupUploadedFile(newsUploadsDir, imagePath);
      }

      return res.json({
        message: "News deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * KidGage Central Payments
 * -------------------------------- */
router.get(
  "/payments",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const filter = buildPaymentFilter(req);
      const q = String(req.query.q || "")
        .trim()
        .toLowerCase();
      const limit = Math.min(Math.max(Number(req.query.limit || 300), 1), 500);

      let payments = await Payment.find(filter)
        .populate("academyId", "name city logo")
        .populate(
          "bookingId",
          "bookingNo referenceNo bookingStatus paymentStatus",
        )
        .populate("parentId", "fullName name email phone")
        .populate("activityId", "title name")
        .populate("packageId", "title")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (q) {
        payments = payments.filter((item) => {
          const academy = item?.academyId || {};
          const booking = item?.bookingId || {};
          const parent = item?.parentId || {};
          const activity = item?.activityId || {};
          const pkg = item?.packageId || {};

          return [
            academy?.name,
            academy?.city,
            booking?.bookingNo,
            booking?.referenceNo,
            parent?.fullName,
            parent?.name,
            parent?.email,
            parent?.phone,
            activity?.title,
            activity?.name,
            pkg?.title,
            item?.paymentMethod,
            item?.paymentGateway,
            item?.gatewayOrderId,
            item?.gatewayPaymentId,
            item?.gatewayReference,
            item?.paymentStatus,
            item?.settlementStatus,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
      }

      const totals = payments.reduce(
        (acc, item) => {
          const amount = toMoney(item.amount, 0);
          const commission = toMoney(item.kidgageCommissionAmount, 0);
          const payable = toMoney(item.academyPayableAmount, 0);

          acc.totalCollected += amount;
          acc.kidgageCommission += commission;
          acc.academyPayable += payable;

          if (item.paymentStatus === "PAID") {
            acc.paidCount += 1;
            acc.paidCollected += amount;
            acc.paidCommission += commission;
            acc.paidAcademyPayable += payable;
          }

          if (item.paymentStatus === "PENDING") acc.pendingCount += 1;
          if (item.paymentStatus === "FAILED") acc.failedCount += 1;
          if (item.paymentStatus === "CANCELLED") acc.cancelledCount += 1;
          if (item.paymentStatus === "REFUNDED") acc.refundedCount += 1;

          if (item.paymentMethod === "CASH") acc.cashCount += 1;
          if (item.paymentMethod === "ONLINE") acc.onlineCount += 1;

          if (item.paymentGateway === "MANUAL") acc.manualGatewayCount += 1;
          if (item.paymentGateway === "MYFATOORAH") {
            acc.myfatoorahGatewayCount += 1;
          }

          if (item.settlementStatus === "READY") {
            acc.readyForSettlement += 1;
            acc.readySettlementAmount += payable;
          }

          if (item.settlementStatus === "PAID_TO_ACADEMY") {
            acc.settledCount += 1;
            acc.settledAmount += payable;
          }

          return acc;
        },
        {
          totalCollected: 0,
          kidgageCommission: 0,
          academyPayable: 0,

          paidCollected: 0,
          paidCommission: 0,
          paidAcademyPayable: 0,

          paidCount: 0,
          pendingCount: 0,
          failedCount: 0,
          cancelledCount: 0,
          refundedCount: 0,

          cashCount: 0,
          onlineCount: 0,
          manualGatewayCount: 0,
          myfatoorahGatewayCount: 0,

          readyForSettlement: 0,
          readySettlementAmount: 0,
          settledCount: 0,
          settledAmount: 0,
        },
      );

      return res.json({
        count: payments.length,
        totals: {
          totalCollected: roundMoney(totals.totalCollected),
          kidgageCommission: roundMoney(totals.kidgageCommission),
          academyPayable: roundMoney(totals.academyPayable),

          paidCollected: roundMoney(totals.paidCollected),
          paidCommission: roundMoney(totals.paidCommission),
          paidAcademyPayable: roundMoney(totals.paidAcademyPayable),

          paidCount: totals.paidCount,
          pendingCount: totals.pendingCount,
          failedCount: totals.failedCount,
          cancelledCount: totals.cancelledCount,
          refundedCount: totals.refundedCount,
          cashCount: totals.cashCount,
          onlineCount: totals.onlineCount,
          manualGatewayCount: totals.manualGatewayCount,
          myfatoorahGatewayCount: totals.myfatoorahGatewayCount,

          readyForSettlement: totals.readyForSettlement,
          readySettlementAmount: roundMoney(totals.readySettlementAmount),

          settledCount: totals.settledCount,
          settledAmount: roundMoney(totals.settledAmount),
        },
        payments: payments.map(normalizePaymentForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/payments-dashboard",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const [
        allPayments,
        paidPayments,
        pendingPayments,
        readyPayments,
        settledPayments,
        cashPayments,
        onlinePayments,
        myfatoorahPayments,
        settlements,
      ] = await Promise.all([
        Payment.find({ paymentReceiver: "KIDGAGE" }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentStatus: "PAID",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentStatus: "PENDING",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentStatus: "PAID",
          settlementStatus: "READY",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          settlementStatus: "PAID_TO_ACADEMY",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentMethod: "CASH",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentMethod: "ONLINE",
        }).lean(),

        Payment.find({
          paymentReceiver: "KIDGAGE",
          paymentGateway: "MYFATOORAH",
        }).lean(),

        AcademySettlement.find({ status: "PAID" }).lean(),
      ]);

      const sum = (rows, field) =>
        roundMoney(
          rows.reduce((acc, item) => acc + toMoney(item[field], 0), 0),
        );

      return res.json({
        paymentsCount: allPayments.length,
        paidCount: paidPayments.length,
        pendingCount: pendingPayments.length,

        cashCount: cashPayments.length,
        onlineCount: onlinePayments.length,
        myfatoorahCount: myfatoorahPayments.length,

        readySettlementCount: readyPayments.length,
        settledPaymentsCount: settledPayments.length,
        settlementsCount: settlements.length,

        totalCollected: sum(allPayments, "amount"),
        paidCollected: sum(paidPayments, "amount"),
        pendingAmount: sum(pendingPayments, "amount"),

        cashAmount: sum(cashPayments, "amount"),
        onlineAmount: sum(onlinePayments, "amount"),
        myfatoorahAmount: sum(myfatoorahPayments, "amount"),

        kidgageCommissionTotal: sum(paidPayments, "kidgageCommissionAmount"),
        academyPayableTotal: sum(paidPayments, "academyPayableAmount"),

        readySettlementAmount: sum(readyPayments, "academyPayableAmount"),
        settledAmount: sum(settledPayments, "academyPayableAmount"),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/payments/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid payment id" });
      }

      const payment = await Payment.findById(id)
        .populate("academyId", "name city logo email phone")
        .populate("bookingId")
        .populate("parentId", "fullName name email phone")
        .populate("childId")
        .populate("activityId", "title name")
        .populate("packageId", "title")
        .lean();

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      return res.json({
        payment: normalizePaymentForClient(payment),
        rawPayment: payment,
      });
    } catch (error) {
      next(error);
    }
  },
);
async function markPaymentPaidHandler(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.paymentStatus === "PAID") {
      return res.json({
        message: "Payment is already marked as paid",
        payment: normalizePaymentForClient(payment),
      });
    }

    payment.paymentStatus = "PAID";
    payment.settlementStatus = "READY";
    payment.gatewayPaymentId = String(req.body.gatewayPaymentId || "").trim();
    payment.gatewayReference = String(req.body.gatewayReference || "").trim();
    payment.paidAt = new Date();
    payment.failedAt = null;

    if (payment.paymentMethod === "CASH") {
      payment.paymentGateway = "MANUAL";
      payment.confirmedBy = req.user?._id || null;
      payment.confirmedAt = new Date();
    }

    payment.meta = {
      ...(payment.meta || {}),
      manuallyMarkedPaidBy: req.user?._id || null,
      manuallyMarkedPaidAt: new Date(),
    };

    await payment.save();

    if (Booking && payment.bookingId) {
      await Booking.findOneAndUpdate(
        {
          _id: payment.bookingId,
          academyId: payment.academyId,
        },
        {
          $set: {
            bookingStatus: "CONFIRMED",
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            paymentReference:
              payment.gatewayPaymentId ||
              payment.gatewayOrderId ||
              payment.gatewayReference ||
              "",
            paymentId: payment._id,
            paidAt: payment.paidAt,
          },
        },
        { new: true },
      );
    }

    await Promise.allSettled([
      dispatchManualPaymentPaidNotifications({
        payment,
        createdByUserId: req.user?._id || null,
      }),
    ]);

    return res.json({
      message: "Payment marked as paid successfully",
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
}

router.patch(
  "/payments/:id/mark-paid",
  auth,
  requireRole("SUPER_ADMIN"),
  markPaymentPaidHandler,
);

router.post(
  "/payments/:id/mark-paid",
  auth,
  requireRole("SUPER_ADMIN"),
  markPaymentPaidHandler,
);
router.patch(
  "/payments/:id/confirm-cash",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid payment id" });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.paymentMethod !== "CASH") {
        return res.status(400).json({
          message: "Only cash payments can be confirmed manually",
        });
      }

      if (payment.paymentStatus === "PAID") {
        return res.json({
          message: "Cash payment already confirmed",
          payment: normalizePaymentForClient(payment),
        });
      }

      payment.paymentStatus = "PAID";
      payment.paymentGateway = "MANUAL";
      payment.settlementStatus = "READY";
      payment.paidAt = new Date();
      payment.failedAt = null;
      payment.confirmedBy = req.user?._id || null;
      payment.confirmedAt = new Date();
      payment.notes = String(
        req.body.notes || payment.notes || "Cash received",
      );

      payment.meta = {
        ...(payment.meta || {}),
        cashConfirmedBy: req.user?._id || null,
        cashConfirmedAt: new Date(),
      };

      await payment.save();

      if (Booking && payment.bookingId) {
        await Booking.findOneAndUpdate(
          {
            _id: payment.bookingId,
            academyId: payment.academyId,
          },
          {
            $set: {
              bookingStatus: "CONFIRMED",
              status: "CONFIRMED",
              paymentStatus: "PAID",
              paymentMethod: "CASH",
              paymentGateway: "MANUAL",
              paymentReference:
                payment.gatewayPaymentId ||
                payment.gatewayOrderId ||
                payment.gatewayReference ||
                "",
              paymentId: payment._id,
              paidAt: payment.paidAt,
            },
          },
          { new: true },
        );
      }

      await Promise.allSettled([
        dispatchManualPaymentPaidNotifications({
          payment,
          createdByUserId: req.user?._id || null,
        }),
      ]);

      return res.json({
        message: "Cash payment confirmed successfully",
        payment: normalizePaymentForClient(payment),
      });
    } catch (error) {
      next(error);
    }
  },
);
router.patch(
  "/payments/:id/hold",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid payment id" });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.paymentStatus !== "PAID") {
        return res.status(400).json({
          message: "Only paid payments can be put on hold",
        });
      }

      if (payment.settlementStatus === "PAID_TO_ACADEMY") {
        return res.status(400).json({
          message: "Settled payments cannot be put on hold",
        });
      }

      payment.settlementStatus = "HOLD";
      payment.notes = String(req.body.notes || payment.notes || "").trim();

      await payment.save();

      return res.json({
        message: "Payment settlement placed on hold",
        payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/payments/:id/release-hold",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid payment id" });
      }

      const payment = await Payment.findById(id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.paymentStatus !== "PAID") {
        return res.status(400).json({
          message: "Only paid payments can be released for settlement",
        });
      }

      if (payment.settlementStatus === "PAID_TO_ACADEMY") {
        return res.status(400).json({
          message: "Payment is already settled",
        });
      }

      payment.settlementStatus = "READY";

      await payment.save();

      return res.json({
        message: "Payment released for settlement",
        payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * KidGage Academy Settlements
 * -------------------------------- */
router.get(
  "/settlement-summary",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const match = {
        paymentReceiver: "KIDGAGE",
        paymentStatus: "PAID",
        settlementStatus: "READY",
      };

      if (req.query.academyId && isValidObjectId(req.query.academyId)) {
        match.academyId = new mongoose.Types.ObjectId(req.query.academyId);
      }

      const createdAt = buildPaymentDateFilter(req);
      if (createdAt) match.createdAt = createdAt;

      const rows = await Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$academyId",
            totalCollected: { $sum: "$amount" },
            kidgageCommissionTotal: { $sum: "$kidgageCommissionAmount" },
            academyPayableTotal: { $sum: "$academyPayableAmount" },
            paymentCount: { $sum: 1 },
            paymentIds: { $push: "$_id" },
            firstPaymentAt: { $min: "$createdAt" },
            lastPaymentAt: { $max: "$createdAt" },
          },
        },
        {
          $lookup: {
            from: "academies",
            localField: "_id",
            foreignField: "_id",
            as: "academy",
          },
        },
        {
          $unwind: {
            path: "$academy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            academyPayableTotal: -1,
          },
        },
      ]);

      return res.json({
        count: rows.length,
        settlements: rows.map((row) => ({
          academyId: row._id,
          academyName: row.academy?.name || "Academy",
          academyCity: row.academy?.city || "",
          academyLogo: row.academy?.logo || "",
          totalCollected: roundMoney(row.totalCollected),
          kidgageCommissionTotal: roundMoney(row.kidgageCommissionTotal),
          academyPayableTotal: roundMoney(row.academyPayableTotal),
          paymentCount: row.paymentCount || 0,
          paymentIds: row.paymentIds || [],
          currency: "QAR",
          firstPaymentAt: row.firstPaymentAt || null,
          lastPaymentAt: row.lastPaymentAt || null,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/settlements",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const academyId = String(req.body.academyId || "").trim();

      const paymentIds = Array.isArray(req.body.paymentIds)
        ? req.body.paymentIds.map(String).filter(isValidObjectId)
        : [];

      const settlementReference = String(
        req.body.settlementReference || "",
      ).trim();

      const paymentMethod = String(
        req.body.paymentMethod || "MANUAL_BANK_TRANSFER",
      )
        .trim()
        .toUpperCase();

      const notes = String(req.body.notes || "").trim();

      if (!academyId || !isValidObjectId(academyId)) {
        return res.status(400).json({
          message: "Valid academyId is required",
        });
      }

      if (!paymentIds.length) {
        return res.status(400).json({
          message: "paymentIds are required",
        });
      }

      if (!settlementReference) {
        return res.status(400).json({
          message: "Settlement reference / bank transfer reference is required",
        });
      }

      let settlement = null;

      await session.withTransaction(async () => {
        const payments = await Payment.find({
          _id: { $in: paymentIds },
          academyId,
          paymentReceiver: "KIDGAGE",
          paymentStatus: "PAID",
          settlementStatus: "READY",
        }).session(session);

        if (!payments.length) {
          throw Object.assign(new Error("No payable payments found"), {
            statusCode: 400,
          });
        }

        if (payments.length !== paymentIds.length) {
          throw Object.assign(
            new Error(
              "Some selected payments are not payable, already settled, or do not belong to this academy",
            ),
            { statusCode: 400 },
          );
        }

        const totalCollected = roundMoney(
          payments.reduce((sum, item) => sum + toMoney(item.amount, 0), 0),
        );

        const kidgageCommissionTotal = roundMoney(
          payments.reduce(
            (sum, item) => sum + toMoney(item.kidgageCommissionAmount, 0),
            0,
          ),
        );

        const academyPayableTotal = roundMoney(
          payments.reduce(
            (sum, item) => sum + toMoney(item.academyPayableAmount, 0),
            0,
          ),
        );

        const settledAt = new Date();

        const docs = await AcademySettlement.create(
          [
            {
              academyId,
              paymentIds: payments.map((item) => item._id),

              totalCollected,
              kidgageCommissionTotal,
              academyPayableTotal,
              currency: payments[0]?.currency || "QAR",

              status: "PAID",
              paymentMethod,
              settlementReference,
              notes,

              settledAt,
              settledBy: req.user?._id || null,

              meta: {
                source: "SUPER_ADMIN_SETTLEMENT",
                paymentCount: payments.length,
                createdByUserId: req.user?._id || null,
              },
            },
          ],
          { session },
        );

        settlement = docs[0];

        await Payment.updateMany(
          {
            _id: { $in: payments.map((item) => item._id) },
            academyId,
            paymentReceiver: "KIDGAGE",
            paymentStatus: "PAID",
            settlementStatus: "READY",
          },
          {
            $set: {
              settlementStatus: "PAID_TO_ACADEMY",
              settlementId: settlement._id,
              settlementReference,
              settledAt,
              settledBy: req.user?._id || null,
            },
          },
          { session },
        );
      });

      const populatedSettlement = await AcademySettlement.findById(
        settlement._id,
      )
        .populate("academyId", "name city logo")
        .populate("settledBy", "fullName email")
        .lean();

      await Promise.allSettled([
        notifySettlementPaid({
          settlement: populatedSettlement || settlement,
          createdByUserId: req.user?._id || null,
        }),
      ]);

      return res.status(201).json({
        message: "Academy settlement recorded successfully",
        settlement: normalizeSettlementForClient(populatedSettlement),
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);

router.get(
  "/settlements",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const filter = {};

      if (req.query.academyId && isValidObjectId(req.query.academyId)) {
        filter.academyId = req.query.academyId;
      }

      if (req.query.status) {
        filter.status = normalizeStatus(req.query.status);
      }

      const createdAt = buildPaymentDateFilter(req);
      if (createdAt) filter.createdAt = createdAt;

      const settlements = await AcademySettlement.find(filter)
        .populate("academyId", "name city logo")
        .populate("settledBy", "fullName email")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      const totals = settlements.reduce(
        (acc, item) => {
          acc.totalCollected += toMoney(item.totalCollected, 0);
          acc.kidgageCommissionTotal += toMoney(item.kidgageCommissionTotal, 0);
          acc.academyPayableTotal += toMoney(item.academyPayableTotal, 0);
          acc.settlementCount += 1;
          return acc;
        },
        {
          totalCollected: 0,
          kidgageCommissionTotal: 0,
          academyPayableTotal: 0,
          settlementCount: 0,
        },
      );

      return res.json({
        count: settlements.length,
        totals: {
          totalCollected: roundMoney(totals.totalCollected),
          kidgageCommissionTotal: roundMoney(totals.kidgageCommissionTotal),
          academyPayableTotal: roundMoney(totals.academyPayableTotal),
          settlementCount: totals.settlementCount,
        },
        settlements: settlements.map(normalizeSettlementForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/settlements/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid settlement id" });
      }

      const settlement = await AcademySettlement.findById(id)
        .populate("academyId", "name city logo email phone")
        .populate("settledBy", "fullName email")
        .populate({
          path: "paymentIds",
          populate: [
            { path: "bookingId", select: "bookingNo referenceNo" },
            { path: "parentId", select: "fullName name email phone" },
            { path: "activityId", select: "title name" },
            { path: "packageId", select: "title" },
          ],
        })
        .lean();

      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      return res.json({
        settlement: normalizeSettlementForClient(settlement),
        payments: Array.isArray(settlement.paymentIds)
          ? settlement.paymentIds.map(normalizePaymentForClient)
          : [],
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/settlements/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          message: "Invalid settlement id",
        });
      }

      let deletedSettlement = null;
      let restoredPaymentsCount = 0;

      await session.withTransaction(async () => {
        const settlement =
          await AcademySettlement.findById(id).session(session);

        if (!settlement) {
          throw Object.assign(new Error("Settlement not found"), {
            statusCode: 404,
          });
        }

        if (isLockedSettlementStatus(settlement.status)) {
          throw Object.assign(
            new Error(
              "Paid settlements are locked and cannot be deleted. Create an adjustment entry instead.",
            ),
            { statusCode: 400 },
          );
        }

        deletedSettlement = settlement.toObject();

        const paymentIds = Array.isArray(settlement.paymentIds)
          ? settlement.paymentIds.filter(Boolean)
          : [];

        if (paymentIds.length) {
          const updateResult = await Payment.updateMany(
            {
              _id: { $in: paymentIds },
              paymentReceiver: "KIDGAGE",
              settlementId: settlement._id,
            },
            {
              $set: {
                settlementStatus: "READY",
              },
              $unset: {
                settlementId: "",
                settlementReference: "",
                settledAt: "",
                settledBy: "",
              },
            },
            { session },
          );

          restoredPaymentsCount =
            updateResult.modifiedCount || updateResult.nModified || 0;
        }

        await AcademySettlement.deleteOne({ _id: settlement._id }).session(
          session,
        );
      });

      return res.json({
        message: "Settlement deleted successfully",
        deletedId: String(deletedSettlement?._id || id),
        restoredPaymentsCount,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({
          message: error.message,
        });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);
/* ---------------------------------
 * Super Admin Bookings
 * -------------------------------- */
function pickSuperAdminBookingAmount(booking) {
  return roundMoney(
    booking?.finalAmount ??
      booking?.subtotalAmount ??
      booking?.baseAmount ??
      booking?.amount ??
      booking?.totalAmount ??
      booking?.packageSnapshot?.price ??
      booking?.packageId?.price ??
      booking?.activityId?.price ??
      booking?.activityId?.basePrice ??
      0,
  );
}

function pickSuperAdminBookingCurrency(booking) {
  return String(
    booking?.currency ||
      booking?.packageSnapshot?.currency ||
      booking?.packageId?.currency ||
      booking?.activityId?.currency ||
      "QAR",
  ).toUpperCase();
}

function getSuperAdminCommissionConfig() {
  const type = String(process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE")
    .trim()
    .toUpperCase();

  const value = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);

  return {
    type: type === "FIXED" ? "FIXED" : "PERCENTAGE",
    value: Number.isFinite(value) && value >= 0 ? value : 10,
  };
}

function calculateSuperAdminCommission(amount) {
  const safeAmount = roundMoney(amount);
  const config = getSuperAdminCommissionConfig();

  const rawCommission =
    config.type === "FIXED" ? config.value : (safeAmount * config.value) / 100;

  const kidgageCommissionAmount = roundMoney(
    Math.min(safeAmount, Math.max(0, rawCommission)),
  );

  return {
    kidgageCommissionType: config.type,
    kidgageCommissionValue: config.value,
    kidgageCommissionAmount,
    academyPayableAmount: roundMoney(safeAmount - kidgageCommissionAmount),
  };
}

function normalizeSuperAdminSlotItem(item, index = 0) {
  const slot =
    item?.slotId && typeof item.slotId === "object" ? item.slotId : {};

  return {
    _id: item?._id || slot?._id || item?.slotId || `session-${index + 1}`,
    id: item?._id || slot?._id || item?.slotId || `session-${index + 1}`,
    slotId: slot?._id || item?.slotId || null,
    sessionNo: item?.sessionNo || index + 1,
    sessionLabel:
      item?.sessionLabel || slot?.sessionLabel || `Session ${index + 1}`,
    date: item?.date || item?.slotDate || slot?.date || null,
    slotDate: item?.slotDate || item?.date || slot?.date || null,
    startTime: item?.startTime || slot?.startTime || "",
    endTime: item?.endTime || slot?.endTime || "",
    status:
      item?.sessionStatus || item?.status || item?.attendanceStatus || "BOOKED",
    attendanceStatus: item?.attendanceStatus || "PENDING",
    raw: item,
  };
}

function normalizeSuperAdminBookingForClient(
  booking,
  { sessions = [], payment = null } = {},
) {
  const bookedSlotItems = Array.isArray(booking?.bookedSlotItems)
    ? booking.bookedSlotItems.map(normalizeSuperAdminSlotItem)
    : [];

  const bookingSessions = Array.isArray(sessions)
    ? sessions.map(normalizeSuperAdminSlotItem)
    : [];

  const selectedSessions = bookingSessions.length
    ? bookingSessions
    : bookedSlotItems;

  return {
    ...booking,
    id: booking?._id,
    payment,
    paymentDetails: payment,
    selectedSessions,
    sessionsList: selectedSessions,
    sessionItems: selectedSessions,
    bookedSlotItems,
  };
}

async function populateSuperAdminBookingById(id) {
  const booking = await Booking.findById(id)
    .populate("academyId", "name slug logo city")
    .populate("parentId", "fullName name email phone status createdAt")
    .populate("childId", "fullName name")
    .populate(
      "activityId",
      "title name category categoryName price basePrice currency",
    )
    .populate("packageId", "title price currency sessionCount durationValue")
    .populate("slotIds")
    .populate("bookedSlotItems.slotId")
    .populate("paymentId")
    .lean();

  if (!booking) return null;

  const [sessions, payment] = await Promise.all([
    BookingSession
      ? BookingSession.find({ bookingId: booking._id })
          .populate("slotId")
          .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
          .lean()
      : [],
    Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }).lean(),
  ]);

  return normalizeSuperAdminBookingForClient(booking, { sessions, payment });
}

async function syncSuperAdminPaymentFromBooking({ booking, req }) {
  const amount = pickSuperAdminBookingAmount(booking);

  if (amount <= 0) {
    throw Object.assign(
      new Error("Cannot mark payment as paid because booking amount is zero"),
      { statusCode: 400 },
    );
  }

  const currency = pickSuperAdminBookingCurrency(booking);
  const paymentMethod = normalizeStatus(booking?.paymentMethod) || "CASH";
  const paymentGateway =
    paymentMethod === "ONLINE"
      ? normalizeStatus(booking?.paymentGateway) || "MYFATOORAH"
      : "MANUAL";

  const commission = calculateSuperAdminCommission(amount);
  const paidAt = booking?.paidAt || new Date();

  const payment = await Payment.findOneAndUpdate(
    { bookingId: booking._id },
    {
      $set: {
        academyId: booking.academyId,
        bookingId: booking._id,

        parentId: booking.parentId || null,
        childId: booking.childId || null,
        activityId: booking.activityId || null,
        packageId: booking.packageId || null,

        amount,
        currency,

        paymentReceiver: "KIDGAGE",
        paymentMethod,
        paymentGateway,

        paymentStatus: "PAID",
        settlementStatus: "READY",

        ...commission,

        paidAt,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,

        confirmedBy: req?.user?._id || null,
        confirmedAt: new Date(),

        notes: booking.notes || "",

        meta: {
          source: "SUPER_ADMIN_BOOKING_MARKED_PAID",
          syncedFromBooking: true,
          syncedByRole: req?.user?.role || "",
          syncedByUserId: req?.user?._id || null,
          syncedAt: new Date(),
          guestParent: booking.guestParent || null,
          guestChild: booking.guestChild || null,
        },
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  booking.paymentId = payment._id;
  booking.paymentStatus = "PAID";
  booking.bookingStatus = "CONFIRMED";
  booking.status = "CONFIRMED";
  booking.paymentMethod = paymentMethod;
  booking.paymentGateway = paymentGateway;
  booking.paidAt = paidAt;

  return payment;
}

router.get(
  "/bookings",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const bookings = Booking
        ? await Booking.find({})
            .populate("academyId", "name slug logo city")
            .populate("parentId", "fullName name email phone status createdAt")
            .populate("childId", "fullName name")
            .populate(
              "activityId",
              "title name category categoryName price basePrice currency",
            )
            .populate(
              "packageId",
              "title price currency sessionCount durationValue",
            )
            .populate("slotIds")
            .populate("bookedSlotItems.slotId")
            .populate("paymentId")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean()
        : [];

      const bookingIds = bookings.map((item) => item._id).filter(Boolean);

      const [sessionRows, paymentRows] = await Promise.all([
        BookingSession && bookingIds.length
          ? BookingSession.find({ bookingId: { $in: bookingIds } })
              .populate("slotId")
              .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
              .lean()
          : [],
        bookingIds.length
          ? Payment.find({ bookingId: { $in: bookingIds } })
              .sort({ createdAt: -1 })
              .lean()
          : [],
      ]);

      const sessionMap = new Map();
      for (const row of sessionRows) {
        const key = String(row.bookingId || "");
        if (!sessionMap.has(key)) sessionMap.set(key, []);
        sessionMap.get(key).push(row);
      }

      const paymentMap = new Map();
      for (const row of paymentRows) {
        const key = String(row.bookingId || "");
        if (!paymentMap.has(key)) paymentMap.set(key, row);
      }

      const enrichedBookings = bookings.map((booking) =>
        normalizeSuperAdminBookingForClient(booking, {
          sessions: sessionMap.get(String(booking._id)) || [],
          payment: paymentMap.get(String(booking._id)) || null,
        }),
      );

      return res.json({
        count: enrichedBookings.length,
        bookings: enrichedBookings,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/bookings/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid booking id" });
      }

      const booking = await populateSuperAdminBookingById(id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      return res.json({ booking });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/bookings/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid booking id" });
      }

      if (!Booking) {
        return res.status(500).json({ message: "Booking model unavailable" });
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const allowedBookingStatuses = [
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
      ];

      const allowedPaymentStatuses = [
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
      ];

      const allowedAttendanceStatuses = [
        "PENDING",
        "PRESENT",
        "ABSENT",
        "COMPLETED",
      ];

      if (req.body.bookingStatus !== undefined) {
        const value = normalizeStatus(req.body.bookingStatus);

        if (!allowedBookingStatuses.includes(value)) {
          return res.status(400).json({ message: "Invalid bookingStatus" });
        }

        booking.bookingStatus = value;
        booking.status = value;
      }

      if (req.body.paymentStatus !== undefined) {
        const value = normalizeStatus(req.body.paymentStatus);

        if (!allowedPaymentStatuses.includes(value)) {
          return res.status(400).json({ message: "Invalid paymentStatus" });
        }

        booking.paymentStatus = value;
      }

      if (req.body.attendanceStatus !== undefined) {
        const value = normalizeStatus(req.body.attendanceStatus);

        if (!allowedAttendanceStatuses.includes(value)) {
          return res.status(400).json({ message: "Invalid attendanceStatus" });
        }

        booking.attendanceStatus = value;
      }

      if (req.body.notes !== undefined) {
        booking.notes = String(req.body.notes || "").trim();
      }

      let syncedPayment = null;

      if (normalizeStatus(booking.paymentStatus) === "PAID") {
        syncedPayment = await syncSuperAdminPaymentFromBooking({
          booking,
          req,
        });
      }

      if (normalizeStatus(booking.bookingStatus) === "CANCELLED") {
        if (normalizeStatus(booking.paymentStatus) === "PENDING") {
          booking.paymentStatus = "CANCELLED";
        }

        if (booking.paymentId || syncedPayment?._id) {
          await Payment.updateMany(
            {
              $or: [
                { _id: booking.paymentId || syncedPayment?._id },
                { bookingId: booking._id },
              ],
              paymentStatus: { $ne: "PAID" },
            },
            {
              $set: {
                paymentStatus: "CANCELLED",
                cancelledAt: new Date(),
              },
            },
          );
        }
      }

      await booking.save();

      if (syncedPayment) {
        await Promise.allSettled([
          dispatchManualPaymentPaidNotifications({
            payment: syncedPayment,
            createdByUserId: req.user?._id || null,
          }),
        ]);
      }

      const populatedBooking = await populateSuperAdminBookingById(booking._id);

      return res.json({
        message:
          normalizeStatus(booking.paymentStatus) === "PAID"
            ? "Booking updated and payment synced successfully"
            : "Booking updated successfully",
        booking: populatedBooking,
        payment: syncedPayment || populatedBooking?.payment || null,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      next(error);
    }
  },
);
/* ---------------------------------
 * Super Admin Activities
 * -------------------------------- */
router.get(
  "/activities",
  auth,
  requireRole("SUPER_ADMIN"),
  async (_req, res, next) => {
    try {
      const activities = await Activity.find({})
        .populate("academyId", "name slug logo city")
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        count: activities.length,
        activities,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * Super Admin Parents CRM
 * -------------------------------- */
function normalizeParentForClient(parent, bookingRows = []) {
  const parentId = String(parent?._id || parent?.id || "");

  const relatedBookings = bookingRows.filter((booking) => {
    const bookingParentId = String(
      booking?.parentId?._id || booking?.parentId || "",
    );

    const bookingUserId = String(booking?.userId?._id || booking?.userId || "");

    const bookingEmail = String(
      booking?.parentId?.email ||
        booking?.email ||
        booking?.userEmail ||
        booking?.parentEmail ||
        booking?.customerEmail ||
        booking?.guestParent?.email ||
        booking?.guestParentSnapshot?.email ||
        "",
    )
      .trim()
      .toLowerCase();

    const parentEmail = String(parent?.email || "")
      .trim()
      .toLowerCase();

    return (
      bookingParentId === parentId ||
      bookingUserId === parentId ||
      (parentEmail && bookingEmail && bookingEmail === parentEmail)
    );
  });

  const academyMap = new Map();
  const childMap = new Map();
  const activityMap = new Map();

  let totalAmount = 0;
  let paidBookings = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let cancelledBookings = 0;

  relatedBookings.forEach((booking) => {
    const academy = booking?.academyId || {};
    const academyId = String(academy?._id || booking?.academyId || "");
    const academyName = academy?.name || booking?.academyName || "";

    if (academyId || academyName) {
      academyMap.set(academyId || academyName, {
        id: academyId,
        name: academyName || "Academy",
        city: academy?.city || "",
        logo: academy?.logo || "",
      });
    }

    const child = booking?.childId || {};
    const childId = String(child?._id || booking?.childId || "");
    const childName =
      child?.fullName ||
      child?.name ||
      booking?.childName ||
      booking?.guestChild?.fullName ||
      booking?.guestChild?.name ||
      booking?.childSnapshot?.fullName ||
      "";

    if (childId || childName) {
      childMap.set(childId || childName, {
        id: childId,
        name: childName || "Child",
      });
    }

    const activity = booking?.activityId || {};
    const activityId = String(activity?._id || booking?.activityId || "");
    const activityName =
      activity?.title ||
      activity?.name ||
      booking?.activityName ||
      booking?.courseName ||
      booking?.activitySnapshot?.title ||
      "";

    if (activityId || activityName) {
      activityMap.set(activityId || activityName, {
        id: activityId,
        name: activityName || "Activity",
      });
    }

    const amount = Number(
      booking?.finalAmount ||
        booking?.subtotalAmount ||
        booking?.baseAmount ||
        booking?.amount ||
        booking?.totalAmount ||
        booking?.price ||
        booking?.packageSnapshot?.price ||
        booking?.packageId?.price ||
        0,
    );

    if (Number.isFinite(amount)) {
      totalAmount += amount;
    }

    const bookingStatus = String(
      booking?.bookingStatus || booking?.status || "PENDING",
    ).toUpperCase();

    const paymentStatus = String(
      booking?.paymentStatus || "PENDING",
    ).toUpperCase();

    if (paymentStatus === "PAID") paidBookings += 1;
    if (bookingStatus === "PENDING") pendingBookings += 1;
    if (bookingStatus === "CONFIRMED") confirmedBookings += 1;
    if (bookingStatus === "CANCELLED") cancelledBookings += 1;
  });

  const lastBooking = relatedBookings
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

  return {
    _id: parent._id,
    id: parent._id,

    fullName: parent.fullName || parent.name || "Parent",
    name: parent.fullName || parent.name || "Parent",
    email: parent.email || "",
    phone: parent.phone || "",
    role: parent.role || "PARENT",
    status: parent.status || "ACTIVE",

    academyId: parent.academyId?._id || parent.academyId || null,
    academyName: parent.academyId?.name || "",

    academies: Array.from(academyMap.values()),
    children: Array.from(childMap.values()),
    activities: Array.from(activityMap.values()),

    bookingsCount: relatedBookings.length,
    paidBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,

    totalAmount: Number(totalAmount.toFixed(2)),
    currency: "QAR",

    lastBookingAt: lastBooking?.createdAt || null,
    lastActivityName:
      lastBooking?.activityId?.title ||
      lastBooking?.activityId?.name ||
      lastBooking?.activityName ||
      lastBooking?.courseName ||
      "",

    createdAt: parent.createdAt || null,
    updatedAt: parent.updatedAt || null,
  };
}

router.get(
  "/parents",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const q = String(req.query.q || "")
        .trim()
        .toLowerCase();
      const academyId = String(req.query.academyId || "").trim();
      const status = String(req.query.status || "")
        .trim()
        .toUpperCase();
      const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 1000);

      const parentFilter = {
        role: "PARENT",
      };

      if (status) {
        parentFilter.status = status;
      }

      if (academyId && isValidObjectId(academyId)) {
        parentFilter.academyId = academyId;
      }

      const [parents, bookings] = await Promise.all([
        User.find(parentFilter)
          .select(
            "fullName name email phone role status academyId createdAt updatedAt",
          )
          .populate("academyId", "name slug logo city")
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),

        Booking
          ? Booking.find(
              academyId && isValidObjectId(academyId) ? { academyId } : {},
            )
              .populate("academyId", "name slug logo city")
              .populate("parentId", "fullName name email phone status")
              .populate("childId", "fullName name")
              .populate(
                "activityId",
                "title name category categoryName price basePrice currency",
              )
              .populate(
                "packageId",
                "title price currency sessionCount durationValue",
              )
              .sort({ createdAt: -1 })
              .limit(3000)
              .lean()
          : [],
      ]);

      let normalizedParents = parents.map((parent) =>
        normalizeParentForClient(parent, bookings),
      );

      if (q) {
        normalizedParents = normalizedParents.filter((parent) => {
          return [
            parent.fullName,
            parent.email,
            parent.phone,
            parent.status,
            parent.academyName,
            parent.lastActivityName,
            ...parent.academies.map((item) => item.name),
            ...parent.children.map((item) => item.name),
            ...parent.activities.map((item) => item.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
      }

      const totals = normalizedParents.reduce(
        (acc, parent) => {
          acc.parentsCount += 1;
          acc.bookingsCount += Number(parent.bookingsCount || 0);
          acc.childrenCount += Number(parent.children?.length || 0);
          acc.totalAmount += Number(parent.totalAmount || 0);

          if (String(parent.status).toUpperCase() === "ACTIVE") {
            acc.activeCount += 1;
          }

          if (Number(parent.bookingsCount || 0) > 0) {
            acc.parentsWithBookings += 1;
          }

          return acc;
        },
        {
          parentsCount: 0,
          activeCount: 0,
          parentsWithBookings: 0,
          bookingsCount: 0,
          childrenCount: 0,
          totalAmount: 0,
        },
      );

      return res.json({
        count: normalizedParents.length,
        totals: {
          ...totals,
          totalAmount: Number(totals.totalAmount.toFixed(2)),
          currency: "QAR",
        },
        parents: normalizedParents,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/parents/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid parent id" });
      }

      const parent = await User.findOne({
        _id: id,
        role: "PARENT",
      })
        .select(
          "fullName name email phone role status academyId createdAt updatedAt",
        )
        .populate("academyId", "name slug logo city")
        .lean();

      if (!parent) {
        return res.status(404).json({ message: "Parent not found" });
      }

      const bookings = Booking
        ? await Booking.find({
            $or: [{ parentId: id }, { userId: id }],
          })
            .populate("academyId", "name slug logo city")
            .populate("parentId", "fullName name email phone status")
            .populate("childId", "fullName name")
            .populate(
              "activityId",
              "title name category categoryName price basePrice currency",
            )
            .populate(
              "packageId",
              "title price currency sessionCount durationValue",
            )
            .sort({ createdAt: -1 })
            .lean()
        : [];

      return res.json({
        parent: normalizeParentForClient(parent, bookings),
        bookings,
      });
    } catch (error) {
      next(error);
    }
  },
);
/* ---------------------------------
 * Content Pages Manager
 * Privacy Policy / Terms
 * -------------------------------- */

function normalizeContentSlug(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeContentType(value) {
  const type = String(value || "CUSTOM")
    .trim()
    .toUpperCase();

  if (["PRIVACY_POLICY", "TERMS_CONDITIONS", "CUSTOM"].includes(type)) {
    return type;
  }

  return "CUSTOM";
}

function normalizeContentStatus(value) {
  const status = String(value || "PUBLISHED")
    .trim()
    .toUpperCase();

  if (["DRAFT", "PUBLISHED"].includes(status)) return status;

  return "PUBLISHED";
}

function normalizeContentPageForClient(item) {
  if (!item) return null;

  return {
    _id: item._id,
    id: item._id,
    title: item.title || "",
    slug: item.slug || "",
    type: item.type || "CUSTOM",
    excerpt: item.excerpt || "",
    content: item.content || "",
    status: item.status || "PUBLISHED",
    active: Boolean(item.active),
    sortOrder: Number(item.sortOrder || 0),
    metaTitle: item.metaTitle || "",
    metaDescription: item.metaDescription || "",
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

router.get(
  "/content-pages",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const q = String(req.query.q || "")
        .trim()
        .toLowerCase();
      const type = String(req.query.type || "")
        .trim()
        .toUpperCase();
      const status = String(req.query.status || "")
        .trim()
        .toUpperCase();

      const filter = {};

      if (
        type &&
        ["PRIVACY_POLICY", "TERMS_CONDITIONS", "CUSTOM"].includes(type)
      ) {
        filter.type = type;
      }

      if (status && ["DRAFT", "PUBLISHED"].includes(status)) {
        filter.status = status;
      }

      let pages = await ContentPage.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

      if (q) {
        pages = pages.filter((item) =>
          [
            item.title,
            item.slug,
            item.type,
            item.excerpt,
            item.content,
            item.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
      }

      return res.json({
        count: pages.length,
        pages: pages.map(normalizeContentPageForClient),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/content-pages/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid content page id" });
      }

      const page = await ContentPage.findById(id).lean();

      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }

      return res.json({
        page: normalizeContentPageForClient(page),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/content-pages",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const title = String(req.body.title || "").trim();
      const slug = normalizeContentSlug(req.body.slug || title);
      const type = normalizeContentType(req.body.type);
      const content = String(req.body.content || "").trim();

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!slug) {
        return res.status(400).json({ message: "Slug is required" });
      }

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const existing = await ContentPage.findOne({ slug }).lean();

      if (existing) {
        return res.status(400).json({
          message: "A content page with this slug already exists",
        });
      }

      const page = await ContentPage.create({
        title,
        slug,
        type,
        excerpt: String(req.body.excerpt || "").trim(),
        content,
        status: normalizeContentStatus(req.body.status),
        active: req.body.active === undefined ? true : Boolean(req.body.active),
        sortOrder: Number(req.body.sortOrder || 0),
        metaTitle: String(req.body.metaTitle || "").trim(),
        metaDescription: String(req.body.metaDescription || "").trim(),
        createdBy: req.user?._id || null,
        updatedBy: req.user?._id || null,
      });

      return res.status(201).json({
        message: "Content page created successfully",
        page: normalizeContentPageForClient(page),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/content-pages/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid content page id" });
      }

      const existingPage = await ContentPage.findById(id);

      if (!existingPage) {
        return res.status(404).json({ message: "Content page not found" });
      }

      const title = String(req.body.title || "").trim();
      const slug = normalizeContentSlug(req.body.slug || title);
      const content = String(req.body.content || "").trim();

      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!slug) {
        return res.status(400).json({ message: "Slug is required" });
      }

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const duplicate = await ContentPage.findOne({
        slug,
        _id: { $ne: id },
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          message: "A content page with this slug already exists",
        });
      }

      existingPage.title = title;
      existingPage.slug = slug;
      existingPage.type = normalizeContentType(req.body.type);
      existingPage.excerpt = String(req.body.excerpt || "").trim();
      existingPage.content = content;
      existingPage.status = normalizeContentStatus(req.body.status);
      existingPage.active =
        req.body.active === undefined
          ? existingPage.active
          : Boolean(req.body.active);
      existingPage.sortOrder = Number(req.body.sortOrder || 0);
      existingPage.metaTitle = String(req.body.metaTitle || "").trim();
      existingPage.metaDescription = String(
        req.body.metaDescription || "",
      ).trim();
      existingPage.updatedBy = req.user?._id || null;

      await existingPage.save();

      return res.json({
        message: "Content page updated successfully",
        page: normalizeContentPageForClient(existingPage),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/content-pages/:id/toggle",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid content page id" });
      }

      const page = await ContentPage.findByIdAndUpdate(
        id,
        {
          active: Boolean(req.body.active),
          updatedBy: req.user?._id || null,
        },
        { new: true },
      );

      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }

      return res.json({
        message: "Content page status updated",
        page: normalizeContentPageForClient(page),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/content-pages/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid content page id" });
      }

      const page = await ContentPage.findByIdAndDelete(id);

      if (!page) {
        return res.status(404).json({ message: "Content page not found" });
      }

      return res.json({
        message: "Content page deleted successfully",
        deletedId: id,
      });
    } catch (error) {
      next(error);
    }
  },
);
export default router;

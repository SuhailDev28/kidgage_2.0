// server/src/routes/academy.routes.js
import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import multer from "multer";
import bcrypt from "bcryptjs";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendTemplateEmail } from "../services/email.service.js";

import Academy from "../models/Academy.js";
import Activity from "../models/Activity.js";
import ActivityPackage from "../models/ActivityPackage.js";
import ActivitySlot from "../models/ActivitySlot.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import AcademySettlement from "../models/AcademySettlement.js";
import {
  notifyParent,
  notifySuperAdmins,
} from "../services/notification.service.js";

let Category = null;
let Booking = null;
let Enquiry = null;
let Branch = null;
let BookingSession = null;
let Notification = null;

try {
  const mod = await import("../models/Category.js");
  Category = mod?.default || null;
} catch {
  Category = null;
}

try {
  const mod = await import("../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

try {
  const mod = await import("../models/Enquiry.js");
  Enquiry = mod?.default || null;
} catch {
  Enquiry = null;
}

try {
  const mod = await import("../models/Branch.js");
  Branch = mod?.default || null;
} catch {
  Branch = null;
}

try {
  const mod = await import("../models/BookingSession.js");
  BookingSession = mod?.default || null;
} catch {
  BookingSession = null;
}

try {
  const mod = await import("../models/Notification.js");
  Notification = mod?.default || null;
} catch {
  Notification = null;
}

const router = express.Router();

router.use(auth, requireRole("ACADEMY_ADMIN"));

const academyUploadsDir = path.join(process.cwd(), "uploads", "academies");
const activityUploadsDir = path.join(process.cwd(), "uploads", "activities");

fs.mkdirSync(academyUploadsDir, { recursive: true });
fs.mkdirSync(activityUploadsDir, { recursive: true });

const academyStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, academyUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `academy-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const activityStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, activityUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `activity-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function imageOnlyFilter(_req, file, cb) {
  if (file?.mimetype?.startsWith("image/")) return cb(null, true);
  return cb(new Error("Only image uploads are allowed"));
}

const academyUpload = multer({
  storage: academyStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const academyUploadFields = academyUpload.fields([
  { name: "logo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "bannerImage", maxCount: 1 },
]);

const activityUpload = multer({
  storage: activityStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageOnlyFilter,
});

const activityUploadFields = activityUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "bannerImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeId(value) {
  return String(value || "").trim();
}

function buildAcademyLogoPath(filename) {
  return `/uploads/academies/${filename}`;
}

function buildActivityImagePath(filename) {
  return `/uploads/activities/${filename}`;
}

function cleanupUploadedFile(dir, storedPath) {
  if (!storedPath) return;

  const filename = path.basename(String(storedPath || ""));
  if (!filename) return;

  const filePath = path.join(dir, filename);

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore cleanup failure
  }
}

function cleanupRequestUploads(req, dir) {
  const files = [];

  if (req?.file) files.push(req.file);

  if (req?.files && typeof req.files === "object") {
    for (const value of Object.values(req.files)) {
      if (Array.isArray(value)) files.push(...value);
    }
  }

  for (const file of files) {
    if (file?.filename) cleanupUploadedFile(dir, file.filename);
    else if (file?.path) {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch {
        // ignore
      }
    }
  }
}

function cleanupActivityImages(activityLike) {
  const candidates = [
    activityLike?.image,
    activityLike?.bannerImage,
    activityLike?.coverImage,
    ...(Array.isArray(activityLike?.images) ? activityLike.images : []),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => item.startsWith("/uploads/activities/"));

  for (const storedPath of [...new Set(candidates)]) {
    cleanupUploadedFile(activityUploadsDir, storedPath);
  }
}

function getUploadedActivityFile(req) {
  if (req?.files?.image?.[0]) return req.files.image[0];
  if (req?.files?.bannerImage?.[0]) return req.files.bannerImage[0];
  if (req?.files?.coverImage?.[0]) return req.files.coverImage[0];
  return null;
}

function toCount(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toMoney(value, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
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

function safeJsonParse(value, fallback = null) {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const parsed = safeJsonParse(value, null);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeNumberArray(value, { min = null, max = null } = {}) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          const parsed = safeJsonParse(value, null);
          if (Array.isArray(parsed)) return parsed;
          return value.split(",");
        })()
      : [];

  return raw
    .map((item) => Number(item))
    .filter((n) => Number.isFinite(n))
    .filter((n) => (min === null ? true : n >= min))
    .filter((n) => (max === null ? true : n <= max));
}

function normalizeObjectIdArray(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          const parsed = safeJsonParse(value, null);
          if (Array.isArray(parsed)) return parsed;
          return value.split(",");
        })()
      : [];

  return raw
    .map((item) => String(item || "").trim())
    .filter((item) => isValidObjectId(item));
}

function normalizeBookingMode(value, fallback = "BOTH") {
  const input = String(value || fallback)
    .trim()
    .toUpperCase();
  if (input === "SEQUENTIAL") return "STRAIGHT";
  if (["FLEXIBLE", "STRAIGHT", "BOTH"].includes(input)) return input;
  return fallback;
}

function normalizePackageBookingPattern(value, fallback = "BOTH") {
  const input = String(value || fallback)
    .trim()
    .toUpperCase();
  if (input === "SEQUENTIAL") return "STRAIGHT";
  if (["FLEXIBLE", "STRAIGHT", "BOTH"].includes(input)) return input;
  return fallback;
}

function slugify(text = "") {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueActivitySlug(title, excludeId = null) {
  const base = slugify(title || "activity") || "activity";
  let slug = base;
  let counter = 1;

  while (true) {
    const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const existing = await Activity.findOne(filter).select("_id").lean();
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function generateUniquePackageSlug(activityId, title, excludeId = null) {
  const base = slugify(title || "package") || "package";
  let slug = base;
  let counter = 1;

  while (true) {
    const filter = excludeId
      ? { activityId, slug, _id: { $ne: excludeId } }
      : { activityId, slug };

    const existing = await ActivityPackage.findOne(filter).select("_id").lean();
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

function pickAcademyId(req) {
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

async function getAcademyDoc(req) {
  const academyId = pickAcademyId(req);
  if (!academyId || !isValidObjectId(academyId)) return null;
  return Academy.findById(academyId);
}

async function getScopedActivity(req, activityId) {
  const academyId = pickAcademyId(req);

  if (
    !academyId ||
    !isValidObjectId(academyId) ||
    !activityId ||
    !isValidObjectId(activityId)
  ) {
    return null;
  }

  return Activity.findOne({ _id: activityId, academyId });
}

async function getScopedPackage(req, packageId) {
  const academyId = pickAcademyId(req);

  if (
    !academyId ||
    !isValidObjectId(academyId) ||
    !packageId ||
    !isValidObjectId(packageId)
  ) {
    return null;
  }

  return ActivityPackage.findOne({ _id: packageId, academyId });
}

async function getScopedSlot(req, slotId) {
  const academyId = pickAcademyId(req);

  if (
    !academyId ||
    !isValidObjectId(academyId) ||
    !slotId ||
    !isValidObjectId(slotId)
  ) {
    return null;
  }

  return ActivitySlot.findOne({ _id: slotId, academyId });
}

async function countCategoriesForAcademy(academyId) {
  if (Category) {
    try {
      return await Category.countDocuments({ status: { $ne: "INACTIVE" } });
    } catch {
      // ignore
    }
  }

  if (!academyId || !isValidObjectId(academyId)) return 0;

  try {
    const rows = await Activity.aggregate([
      { $match: { academyId: new mongoose.Types.ObjectId(academyId) } },
      {
        $group: {
          _id: {
            $ifNull: ["$categoryId", "$categoryName"],
          },
        },
      },
      { $match: { _id: { $nin: [null, ""] } } },
      { $count: "count" },
    ]);

    return rows?.[0]?.count || 0;
  } catch {
    return 0;
  }
}

async function countBookingsForAcademy(academyId) {
  if (!academyId || !isValidObjectId(academyId)) return 0;

  if (Booking) {
    try {
      return await Booking.countDocuments({ academyId });
    } catch {
      // ignore
    }
  }

  if (Enquiry) {
    try {
      return await Enquiry.countDocuments({ academyId });
    } catch {
      // ignore
    }
  }

  return 0;
}

async function getEnquiriesForAcademy(academyId, limit = 20) {
  if (!academyId || !isValidObjectId(academyId)) return [];

  if (Enquiry) {
    try {
      const rows = await Enquiry.find({ academyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return rows.map((item) => ({
        _id: item?._id,
        id: item?._id,
        email:
          item?.email ||
          item?.userEmail ||
          item?.parentEmail ||
          item?.customerEmail ||
          "",
        courseName:
          item?.courseName ||
          item?.activityName ||
          item?.course?.name ||
          item?.activity?.name ||
          "N/A",
        activityName:
          item?.activityName ||
          item?.courseName ||
          item?.activity?.name ||
          item?.course?.name ||
          "N/A",
        sessions:
          item?.sessions || item?.noOfSessions || item?.numberOfSessions || 0,
        status: item?.status || "PENDING",
        createdAt: item?.createdAt || null,
      }));
    } catch {
      // ignore
    }
  }

  if (Booking) {
    try {
      const rows = await Booking.find({ academyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return rows.map((item) => ({
        _id: item?._id,
        id: item?._id,
        email:
          item?.email ||
          item?.userEmail ||
          item?.parentEmail ||
          item?.customerEmail ||
          item?.guestParent?.email ||
          "",
        courseName:
          item?.courseName ||
          item?.activityName ||
          item?.course?.name ||
          item?.activity?.name ||
          item?.activitySnapshot?.title ||
          "N/A",
        activityName:
          item?.activityName ||
          item?.courseName ||
          item?.activity?.name ||
          item?.course?.name ||
          item?.activitySnapshot?.title ||
          "N/A",
        sessions:
          item?.sessions ||
          item?.noOfSessions ||
          item?.numberOfSessions ||
          item?.totalSessions ||
          item?.packageSnapshot?.sessionCount ||
          item?.packageSnapshot?.durationValue ||
          0,
        status:
          item?.status ||
          item?.bookingStatus ||
          item?.paymentStatus ||
          "PENDING",
        createdAt: item?.createdAt || null,
      }));
    } catch {
      // ignore
    }
  }

  return [];
}

function resolveCategoryName(body = {}, categoryDoc = null) {
  if (categoryDoc?.name) return String(categoryDoc.name).trim();
  if (body.categoryName !== undefined)
    return String(body.categoryName || "").trim();
  if (body.category !== undefined) return String(body.category || "").trim();
  return "";
}

async function resolveCategoryForAcademy(_academyId, rawCategoryValue) {
  if (!Category || !rawCategoryValue) return null;

  const value = String(rawCategoryValue || "").trim();
  if (!value) return null;

  if (isValidObjectId(value)) {
    const byId = await Category.findOne({
      _id: value,
      status: { $ne: "INACTIVE" },
    }).lean();

    if (byId) return byId;
  }

  return (
    (await Category.findOne({
      status: { $ne: "INACTIVE" },
      $or: [{ name: value }, { slug: value }],
    }).lean()) || null
  );
}

function addDays(dateValue, days) {
  const d = new Date(dateValue);
  d.setDate(d.getDate() + days);
  return d;
}

function formatYmd(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function uniqueDateTimeRows(rows = []) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = [
      normalizeId(row.activityId),
      normalizeId(row.packageId),
      normalizeId(row.branchId),
      formatYmd(row.date),
      String(row.startTime || "").trim(),
      String(row.endTime || "").trim(),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeGenerationMode(value) {
  const mode = String(value || "WEEKLY")
    .trim()
    .toUpperCase();

  if (["DAILY", "WEEKLY", "MONTHLY"].includes(mode)) return mode;
  return "WEEKLY";
}

function normalizeDaysOfWeek(value) {
  return normalizeNumberArray(value, { min: 0, max: 6 });
}

function normalizeDaysOfMonth(value) {
  return normalizeNumberArray(value, { min: 1, max: 31 });
}

function shouldGenerateSlotForDate(
  date,
  generationMode,
  daysOfWeek,
  daysOfMonth,
) {
  if (generationMode === "DAILY") return true;

  if (generationMode === "WEEKLY") {
    return daysOfWeek.includes(date.getDay());
  }

  if (generationMode === "MONTHLY") {
    return daysOfMonth.includes(date.getDate());
  }

  return false;
}

function normalizeActivityForClient(item) {
  const bookingConfig = item?.bookingConfig || {};
  const categoryName =
    item?.categoryId?.name || item?.categoryName || item?.category || "";

  const categoryId = item?.categoryId?._id || item?.categoryId || null;

  return {
    _id: item._id,
    id: item._id,
    academyId: item.academyId || null,
    categoryId,
    branchIds: Array.isArray(item.branchIds) ? item.branchIds : [],

    name: item.name || item.title || "",
    title: item.title || item.name || "",
    slug: item.slug || "",
    shortDescription: item.shortDescription || "",
    description: item.description || "",

    image:
      item.image ||
      item.bannerImage ||
      item.coverImage ||
      item.images?.[0] ||
      "",
    bannerImage:
      item.bannerImage ||
      item.image ||
      item.coverImage ||
      item.images?.[0] ||
      "",
    coverImage:
      item.coverImage ||
      item.bannerImage ||
      item.image ||
      item.images?.[0] ||
      "",
    images: Array.isArray(item.images) ? item.images : [],

    category: categoryName,
    categoryName,
    startDate: item.startDate || item.dateFrom || item.bookingStartDate || null,
    endDate: item.endDate || item.dateTo || item.bookingEndDate || null,
    durationLabel: item.durationLabel || item.duration || "",

    fees: item.fees || item.price || item.basePrice || "",
    price: item.price || item.basePrice || 0,
    basePrice: item.basePrice || item.price || 0,
    currency: item.currency || "QAR",

    minAge: item.minAge ?? 3,
    maxAge: item.maxAge ?? 16,
    gender: item.gender || "ALL",
    skillLevel: item.skillLevel || "ALL",

    modes: normalizeStringArray(
      item.modes || item.classModes || item.modeOfClasses || [],
    ),
    classModes: normalizeStringArray(
      item.classModes || item.modes || item.modeOfClasses || [],
    ),
    modeOfClasses: normalizeStringArray(
      item.modeOfClasses || item.classModes || item.modes || [],
    ),

    venueName: item.venueName || "",
    venueAddress: item.venueAddress || "",
    city: item.city || "",
    country: item.country || "Qatar",
    organizerName: item.organizerName || "",

    status: item.status || "PUBLISHED",
    featured: Boolean(item.featured || item.isFeatured),
    shareEnabled: item.shareEnabled !== false,
    trialClassEnabled: Boolean(item.trialClassEnabled),

    packageType: item.packageType || bookingConfig.packageType || "SESSIONS",
    totalSessions: toCount(
      item.totalSessions ??
        item.sessionCount ??
        bookingConfig.totalSessions ??
        0,
      0,
    ),
    sessionCount: toCount(
      item.sessionCount ??
        item.totalSessions ??
        bookingConfig.totalSessions ??
        0,
      0,
    ),
    totalWeeks: toCount(
      item.totalWeeks ?? item.weekCount ?? bookingConfig.totalWeeks ?? 0,
      0,
    ),
    weekCount: toCount(
      item.weekCount ?? item.totalWeeks ?? bookingConfig.totalWeeks ?? 0,
      0,
    ),
    sessionsPerWeek: toCount(
      item.sessionsPerWeek ?? bookingConfig.sessionsPerWeek ?? 0,
      0,
    ),
    bookingMode: item.bookingMode || bookingConfig.bookingMode || "BOTH",
    slotDurationMinutes: toCount(
      item.slotDurationMinutes ?? bookingConfig.slotDurationMinutes ?? 60,
      60,
    ),
    defaultCapacity: toCount(
      item.defaultCapacity ??
        item.capacity ??
        item.seatCapacityDefault ??
        bookingConfig.defaultCapacity ??
        1,
      1,
    ),
    capacity: toCount(
      item.capacity ??
        item.defaultCapacity ??
        item.seatCapacityDefault ??
        bookingConfig.defaultCapacity ??
        1,
      1,
    ),
    seatCapacityDefault: toCount(
      item.seatCapacityDefault ??
        item.defaultCapacity ??
        item.capacity ??
        bookingConfig.defaultCapacity ??
        1,
      1,
    ),
    allowWaitlist: toBool(
      item.allowWaitlist ?? bookingConfig.allowWaitlist,
      false,
    ),

    availabilityType: item.availabilityType || "DATE_RANGE",
    bookingStartDate: item.bookingStartDate || item.startDate || null,
    bookingEndDate: item.bookingEndDate || item.endDate || null,
    specificDates: Array.isArray(item.specificDates) ? item.specificDates : [],
    daysOfWeek: Array.isArray(item.daysOfWeek) ? item.daysOfWeek : [],

    bookingConfig: {
      packageType: item.packageType || bookingConfig.packageType || "SESSIONS",
      totalSessions: toCount(
        item.totalSessions ??
          item.sessionCount ??
          bookingConfig.totalSessions ??
          0,
        0,
      ),
      totalWeeks: toCount(
        item.totalWeeks ?? item.weekCount ?? bookingConfig.totalWeeks ?? 0,
        0,
      ),
      sessionsPerWeek: toCount(
        item.sessionsPerWeek ?? bookingConfig.sessionsPerWeek ?? 0,
        0,
      ),
      bookingMode: item.bookingMode || bookingConfig.bookingMode || "BOTH",
      slotDurationMinutes: toCount(
        item.slotDurationMinutes ?? bookingConfig.slotDurationMinutes ?? 60,
        60,
      ),
      defaultCapacity: toCount(
        item.defaultCapacity ??
          item.capacity ??
          item.seatCapacityDefault ??
          bookingConfig.defaultCapacity ??
          1,
        1,
      ),
      allowWaitlist: toBool(
        item.allowWaitlist ?? bookingConfig.allowWaitlist,
        false,
      ),
    },

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizePackageForClient(item) {
  const bookingPattern = item.bookingPattern || "BOTH";

  return {
    _id: item._id,
    id: item._id,
    academyId: item.academyId || null,
    activityId: item.activityId || null,
    branchId: item.branchId || null,
    title: item.title || "",
    slug: item.slug || "",
    packageType: item.packageType || "MONTHLY",
    durationValue: toCount(item.durationValue, 0),
    durationUnit: item.durationUnit || "MONTH",
    sessionCount: toCount(item.sessionCount, 0),
    validityDays: toCount(item.validityDays, 0),
    minSelectableSessions: toCount(item.minSelectableSessions, 0),
    maxSelectableSessions: toCount(item.maxSelectableSessions, 0),
    bookingPattern,
    bookingMode: bookingPattern,
    description: item.description || "",
    price: Number(item.price || 0),
    currency: item.currency || "QAR",
    isDefault: Boolean(item.isDefault),
    active: Boolean(item.active),
    displayOrder: toCount(item.displayOrder, 0),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizeSlotForClient(item) {
  const capacity = toCount(item.capacity, 0);
  const bookedCount = toCount(item.bookedCount, 0);

  return {
    _id: item._id,
    id: item._id,
    academyId: item.academyId || null,
    activityId: item.activityId || null,
    packageId: item.packageId || null,
    branchId: item.branchId || null,
    date: item.date || null,
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    sessionLabel: item.sessionLabel || "",
    capacity,
    bookedCount,
    waitlistCount: toCount(item.waitlistCount, 0),
    availableCount: Math.max(0, capacity - bookedCount),
    priceOverride:
      item.priceOverride === null || item.priceOverride === undefined
        ? null
        : Number(item.priceOverride),
    bookingOpenAt: item.bookingOpenAt || null,
    bookingCloseAt: item.bookingCloseAt || null,
    notes: item.notes || "",
    status: item.status || "OPEN",
    active: Boolean(item.active),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}
function normalizeAcademyForClient(academy, extras = {}) {
  const raw =
    academy && typeof academy.toObject === "function"
      ? academy.toObject()
      : academy || {};

  return {
    _id: raw._id,
    id: raw._id,
    academyId: raw._id,

    name: raw.name || "",
    academyName: raw.name || "",
    slug: raw.slug || "",

    email: raw.email || "",
    phone: raw.phone || "",
    whatsapp: raw.whatsapp || "",
    website: raw.website || "",

    city: raw.city || "",
    country: raw.country || "Qatar",
    address: raw.address || "",

    description: raw.description || "",
    shortBio: raw.shortBio || "",
    mission: raw.mission || "",
    vision: raw.vision || "",

    logo: raw.logo || "",
    academyLogo: raw.logo || "",
    coverImage: raw.coverImage || raw.bannerImage || "",
    bannerImage: raw.bannerImage || raw.coverImage || "",
    gallery: Array.isArray(raw.gallery) ? raw.gallery : [],

    establishedYear: raw.establishedYear || "",
    ownerName: raw.ownerName || "",
    contactPerson: raw.contactPerson || "",

    facilities: Array.isArray(raw.facilities) ? raw.facilities : [],
    programsOffered: Array.isArray(raw.programsOffered)
      ? raw.programsOffered
      : [],
    ageGroups: Array.isArray(raw.ageGroups) ? raw.ageGroups : [],
    languages: Array.isArray(raw.languages) ? raw.languages : [],

    instagram: raw.instagram || "",
    facebook: raw.facebook || "",
    youtube: raw.youtube || "",
    tiktok: raw.tiktok || "",

    awards: Array.isArray(raw.awards) ? raw.awards : [],
    recognitions: Array.isArray(raw.recognitions) ? raw.recognitions : [],

    status: raw.status || "ACTIVE",
    isFeatured: Boolean(raw.isFeatured),
    featured: Boolean(raw.isFeatured),

    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,

    ...extras,
  };
}

function normalizeAwards(value) {
  let rows = [];

  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === "string" && value.trim()) {
    const parsed = safeJsonParse(value, null);
    if (Array.isArray(parsed)) rows = parsed;
  }

  return rows
    .map((item) => ({
      title: String(item?.title || "").trim(),
      year: String(item?.year || "").trim(),
      issuer: String(item?.issuer || "").trim(),
      description: String(item?.description || "").trim(),
    }))
    .filter(
      (item) => item.title || item.year || item.issuer || item.description,
    );
}

function normalizeRecognitions(value) {
  let rows = [];

  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === "string" && value.trim()) {
    const parsed = safeJsonParse(value, null);
    if (Array.isArray(parsed)) rows = parsed;
  }

  return rows
    .map((item) => ({
      title: String(item?.title || "").trim(),
      organization: String(item?.organization || "").trim(),
      date: String(item?.date || "").trim(),
      description: String(item?.description || "").trim(),
    }))
    .filter(
      (item) =>
        item.title || item.organization || item.date || item.description,
    );
}

function getUploadedAcademyFile(req, fieldName) {
  return req?.files?.[fieldName]?.[0] || null;
}

function applyAcademyProfileBody(academy, body = {}) {
  const stringFields = [
    "name",
    "email",
    "phone",
    "whatsapp",
    "city",
    "country",
    "address",
    "website",
    "description",
    "shortBio",
    "mission",
    "vision",
    "establishedYear",
    "ownerName",
    "contactPerson",
    "instagram",
    "facebook",
    "youtube",
    "tiktok",
  ];

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      academy[field] = String(body[field] || "").trim();
    }
  }

  const arrayFields = [
    "facilities",
    "programsOffered",
    "ageGroups",
    "languages",
    "gallery",
  ];

  for (const field of arrayFields) {
    if (body[field] !== undefined) {
      academy[field] = normalizeStringArray(body[field]);
    }
  }

  if (body.awards !== undefined) {
    academy.awards = normalizeAwards(body.awards);
  }

  if (body.recognitions !== undefined) {
    academy.recognitions = normalizeRecognitions(body.recognitions);
  }
}

function applyAcademyProfileUploads(req, academy) {
  const logoFile = getUploadedAcademyFile(req, "logo");
  const coverFile =
    getUploadedAcademyFile(req, "coverImage") ||
    getUploadedAcademyFile(req, "bannerImage");

  if (logoFile) {
    const previousLogo = academy.logo || "";
    academy.logo = buildAcademyLogoPath(logoFile.filename);

    if (
      previousLogo &&
      String(previousLogo).startsWith("/uploads/academies/")
    ) {
      cleanupUploadedFile(academyUploadsDir, previousLogo);
    }
  }

  if (coverFile) {
    const previousCover = academy.coverImage || academy.bannerImage || "";
    const coverPath = buildAcademyLogoPath(coverFile.filename);

    academy.coverImage = coverPath;
    academy.bannerImage = coverPath;

    if (
      previousCover &&
      String(previousCover).startsWith("/uploads/academies/")
    ) {
      cleanupUploadedFile(academyUploadsDir, previousCover);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* PROFILE / DASHBOARD                                                        */
/* -------------------------------------------------------------------------- */

router.get("/profile", async (req, res, next) => {
  try {
    const academy = await getAcademyDoc(req);

    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }

    const academyId = academy._id;

    const [activitiesCount, categoriesCount, bookingsCount, branchesCount] =
      await Promise.all([
        Activity.countDocuments({ academyId }),
        countCategoriesForAcademy(academyId),
        countBookingsForAcademy(academyId),
        Branch ? Branch.countDocuments({ academyId }).catch(() => 0) : 0,
      ]);

    const payload = normalizeAcademyForClient(academy, {
      activitiesCount,
      categoriesCount,
      bookingsCount,
      branchesCount,
    });

    return res.json({
      profile: payload,
      academy: payload,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/profile", academyUploadFields, async (req, res, next) => {
  try {
    const academy = await getAcademyDoc(req);

    if (!academy) {
      cleanupRequestUploads(req, academyUploadsDir);
      return res.status(404).json({ message: "Academy not found" });
    }

    applyAcademyProfileBody(academy, req.body);
    applyAcademyProfileUploads(req, academy);

    await academy.save();

    const payload = normalizeAcademyForClient(academy);

    return res.json({
      message: "Academy profile updated successfully",
      academy: payload,
      profile: payload,
    });
  } catch (error) {
    cleanupRequestUploads(req, academyUploadsDir);
    next(error);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    const academy = await getAcademyDoc(req);

    if (!academy) {
      return res.status(404).json({ message: "Academy not found" });
    }

    const payload = normalizeAcademyForClient(academy);

    return res.json({
      settings: payload,
      academy: payload,
      profile: payload,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/settings", academyUploadFields, async (req, res, next) => {
  try {
    const academy = await getAcademyDoc(req);

    if (!academy) {
      cleanupRequestUploads(req, academyUploadsDir);
      return res.status(404).json({ message: "Academy not found" });
    }

    applyAcademyProfileBody(academy, req.body);
    applyAcademyProfileUploads(req, academy);

    await academy.save();

    const payload = normalizeAcademyForClient(academy);

    return res.json({
      message: "Academy settings updated successfully",
      settings: payload,
      academy: payload,
      profile: payload,
    });
  } catch (error) {
    cleanupRequestUploads(req, academyUploadsDir);
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* ACTIVITIES                                                                 */
/* -------------------------------------------------------------------------- */

router.get("/activities", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const activities = await Activity.find({ academyId })
      .populate("categoryId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: activities.length,
      activities: activities.map(normalizeActivityForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/activities/:id", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid activity id" });
    }

    const activity = await Activity.findOne({ _id: id, academyId })
      .populate("categoryId")
      .lean();

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    return res.json({
      activity: normalizeActivityForClient(activity),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/activities", activityUploadFields, async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      cleanupRequestUploads(req, activityUploadsDir);
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const title = String(req.body.title || req.body.name || "").trim();

    if (!title) {
      cleanupRequestUploads(req, activityUploadsDir);
      return res.status(400).json({ message: "Course name is required" });
    }

    const categoryDoc = await resolveCategoryForAcademy(
      academyId,
      req.body.categoryId || req.body.category || req.body.categoryName,
    );

    const categoryId = categoryDoc?._id || null;
    const categoryName = resolveCategoryName(req.body, categoryDoc);

    const slug =
      req.body.slug && String(req.body.slug).trim()
        ? await generateUniqueActivitySlug(String(req.body.slug).trim())
        : await generateUniqueActivitySlug(title);

    const modes = normalizeStringArray(
      req.body.modes || req.body["modes[]"] || req.body.classModes,
    );

    const bookingConfigInput = safeJsonParse(req.body.bookingConfig, {}) || {};
    const uploadedFile = getUploadedActivityFile(req);
    const imagePath = uploadedFile
      ? buildActivityImagePath(uploadedFile.filename)
      : "";

    const startDateValue = req.body.startDate || req.body.bookingStartDate;
    const endDateValue = req.body.endDate || req.body.bookingEndDate;

    const bookingMode = normalizeBookingMode(
      req.body.bookingMode || bookingConfigInput.bookingMode,
      "BOTH",
    );

    const packageType = String(
      req.body.packageType || bookingConfigInput.packageType || "SESSIONS",
    )
      .trim()
      .toUpperCase();

    const defaultCapacity = toCount(
      req.body.defaultCapacity ||
        req.body.capacity ||
        req.body.seatCapacityDefault ||
        bookingConfigInput.defaultCapacity,
      1,
    );

    const totalSessions = toCount(
      req.body.totalSessions ||
        req.body.sessionCount ||
        bookingConfigInput.totalSessions,
      0,
    );

    const totalWeeks = toCount(
      req.body.totalWeeks ||
        req.body.weekCount ||
        bookingConfigInput.totalWeeks,
      0,
    );

    const doc = await Activity.create({
      academyId,
      branchIds: normalizeObjectIdArray(req.body.branchIds),
      categoryId,
      category: categoryName,
      categoryName,

      title,
      name: title,
      slug,

      shortDescription: String(req.body.shortDescription || "").trim(),
      description: String(req.body.description || "").trim(),

      image: imagePath,
      bannerImage: imagePath,
      coverImage: imagePath,
      images: imagePath ? [imagePath] : [],

      startDate: startDateValue || null,
      endDate: endDateValue || null,
      durationLabel: String(req.body.durationLabel || "").trim(),
      fees: String(req.body.fees || "").trim(),

      venueName: String(req.body.venueName || "").trim(),
      venueAddress: String(req.body.venueAddress || "").trim(),
      city: String(req.body.city || "").trim(),
      country: String(req.body.country || "Qatar").trim(),
      organizerName: String(req.body.organizerName || "").trim(),

      price: toMoney(req.body.price ?? req.body.fees, 0),
      basePrice: toMoney(
        req.body.basePrice ?? req.body.price ?? req.body.fees,
        0,
      ),
      currency: String(req.body.currency || "QAR").trim(),

      minAge: Number(req.body.minAge || 3) || 3,
      maxAge: Number(req.body.maxAge || 16) || 16,
      gender: String(req.body.gender || "ALL")
        .trim()
        .toUpperCase(),
      skillLevel: String(req.body.skillLevel || "ALL")
        .trim()
        .toUpperCase(),

      modes,
      classModes: modes,
      modeOfClasses: modes,

      trialClassEnabled: toBool(req.body.trialClassEnabled, false),
      shareEnabled: toBool(req.body.shareEnabled, true),
      featured: toBool(req.body.featured, false),

      status: String(req.body.status || "PUBLISHED")
        .trim()
        .toUpperCase(),

      packageType,
      totalSessions,
      sessionCount: totalSessions,
      totalWeeks,
      weekCount: totalWeeks,
      sessionsPerWeek: toCount(
        req.body.sessionsPerWeek || bookingConfigInput.sessionsPerWeek,
        0,
      ),
      slotDurationMinutes: toCount(
        req.body.slotDurationMinutes || bookingConfigInput.slotDurationMinutes,
        60,
      ),
      defaultCapacity,
      capacity: defaultCapacity,
      seatCapacityDefault: defaultCapacity,
      allowWaitlist: toBool(
        req.body.allowWaitlist ?? bookingConfigInput.allowWaitlist,
        false,
      ),

      bookingMode,
      availabilityType: String(
        req.body.availabilityType || "DATE_RANGE",
      ).toUpperCase(),
      bookingStartDate: startDateValue || null,
      bookingEndDate: endDateValue || null,
      specificDates: normalizeStringArray(req.body.specificDates)
        .map((value) => new Date(value))
        .filter((d) => !Number.isNaN(d.getTime())),
      daysOfWeek: normalizeNumberArray(req.body.daysOfWeek, {
        min: 0,
        max: 6,
      }),

      bookingConfig: {
        packageType,
        totalSessions,
        totalWeeks,
        sessionsPerWeek: toCount(
          req.body.sessionsPerWeek || bookingConfigInput.sessionsPerWeek,
          0,
        ),
        bookingMode,
        slotDurationMinutes: toCount(
          req.body.slotDurationMinutes ||
            bookingConfigInput.slotDurationMinutes,
          60,
        ),
        defaultCapacity,
        allowWaitlist: toBool(
          req.body.allowWaitlist ?? bookingConfigInput.allowWaitlist,
          false,
        ),
      },
    });

    const created = await Activity.findById(doc._id).populate("categoryId");

    return res.status(201).json({
      message: "Activity created successfully",
      activity: normalizeActivityForClient(created.toObject()),
    });
  } catch (error) {
    cleanupRequestUploads(req, activityUploadsDir);
    next(error);
  }
});

router.put("/activities/:id", activityUploadFields, async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      cleanupRequestUploads(req, activityUploadsDir);
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      cleanupRequestUploads(req, activityUploadsDir);
      return res.status(400).json({ message: "Invalid activity id" });
    }

    const activity = await Activity.findOne({ _id: id, academyId });

    if (!activity) {
      cleanupRequestUploads(req, activityUploadsDir);
      return res.status(404).json({ message: "Activity not found" });
    }

    const categoryDoc = await resolveCategoryForAcademy(
      academyId,
      req.body.categoryId || req.body.category || req.body.categoryName,
    );

    const bookingConfigInput = safeJsonParse(req.body.bookingConfig, {}) || {};

    if (req.body.title !== undefined || req.body.name !== undefined) {
      const nextTitle = String(req.body.title || req.body.name || "").trim();

      if (!nextTitle) {
        cleanupRequestUploads(req, activityUploadsDir);
        return res.status(400).json({ message: "Course name is required" });
      }

      activity.title = nextTitle;
      activity.name = nextTitle;
    }

    if (req.body.slug !== undefined) {
      const rawSlug = String(req.body.slug || "").trim();
      if (rawSlug) {
        activity.slug = await generateUniqueActivitySlug(rawSlug, activity._id);
      }
    } else if (req.body.title !== undefined || req.body.name !== undefined) {
      activity.slug = await generateUniqueActivitySlug(
        activity.title || activity.name || "activity",
        activity._id,
      );
    }

    if (req.body.shortDescription !== undefined) {
      activity.shortDescription = String(
        req.body.shortDescription || "",
      ).trim();
    }

    if (req.body.description !== undefined) {
      activity.description = String(req.body.description || "").trim();
    }

    if (
      req.body.startDate !== undefined ||
      req.body.bookingStartDate !== undefined
    ) {
      const value = req.body.startDate || req.body.bookingStartDate || null;
      activity.startDate = value;
      activity.bookingStartDate = value;
    }

    if (
      req.body.endDate !== undefined ||
      req.body.bookingEndDate !== undefined
    ) {
      const value = req.body.endDate || req.body.bookingEndDate || null;
      activity.endDate = value;
      activity.bookingEndDate = value;
    }

    if (req.body.durationLabel !== undefined) {
      activity.durationLabel = String(req.body.durationLabel || "").trim();
    }

    if (req.body.fees !== undefined) {
      activity.fees = String(req.body.fees || "").trim();
    }

    if (req.body.price !== undefined) {
      activity.price = toMoney(req.body.price, 0);
    } else if (req.body.fees !== undefined) {
      activity.price = toMoney(req.body.fees, activity.price || 0);
    }

    if (req.body.basePrice !== undefined) {
      activity.basePrice = toMoney(req.body.basePrice, 0);
    } else if (req.body.price !== undefined) {
      activity.basePrice = toMoney(req.body.price, activity.basePrice || 0);
    } else if (req.body.fees !== undefined) {
      activity.basePrice = toMoney(req.body.fees, activity.basePrice || 0);
    }

    if (req.body.currency !== undefined) {
      activity.currency = String(req.body.currency || "QAR").trim();
    }

    if (req.body.venueName !== undefined) {
      activity.venueName = String(req.body.venueName || "").trim();
    }

    if (req.body.venueAddress !== undefined) {
      activity.venueAddress = String(req.body.venueAddress || "").trim();
    }

    if (req.body.city !== undefined) {
      activity.city = String(req.body.city || "").trim();
    }

    if (req.body.country !== undefined) {
      activity.country = String(req.body.country || "Qatar").trim();
    }

    if (req.body.organizerName !== undefined) {
      activity.organizerName = String(req.body.organizerName || "").trim();
    }

    if (req.body.minAge !== undefined) {
      activity.minAge = Number(req.body.minAge || 0) || 0;
    }

    if (req.body.maxAge !== undefined) {
      activity.maxAge = Number(req.body.maxAge || 0) || 0;
    }

    if (req.body.gender !== undefined) {
      activity.gender = String(req.body.gender || "ALL")
        .trim()
        .toUpperCase();
    }

    if (req.body.skillLevel !== undefined) {
      activity.skillLevel = String(req.body.skillLevel || "ALL")
        .trim()
        .toUpperCase();
    }

    if (
      req.body.modes !== undefined ||
      req.body["modes[]"] !== undefined ||
      req.body.classModes !== undefined
    ) {
      const modes = normalizeStringArray(
        req.body.modes || req.body["modes[]"] || req.body.classModes,
      );
      activity.modes = modes;
      activity.classModes = modes;
      activity.modeOfClasses = modes;
    }

    if (req.body.branchIds !== undefined) {
      activity.branchIds = normalizeObjectIdArray(req.body.branchIds);
    }

    if (req.body.status !== undefined) {
      activity.status = String(req.body.status || "PUBLISHED")
        .trim()
        .toUpperCase();
    }

    if (req.body.featured !== undefined) {
      activity.featured = toBool(req.body.featured, false);
    }

    if (req.body.trialClassEnabled !== undefined) {
      activity.trialClassEnabled = toBool(req.body.trialClassEnabled, false);
    }

    if (req.body.shareEnabled !== undefined) {
      activity.shareEnabled = toBool(req.body.shareEnabled, true);
    }

    if (categoryDoc?._id) {
      activity.categoryId = categoryDoc._id;
      activity.category = categoryDoc.name || "";
      activity.categoryName = categoryDoc.name || "";
    } else if (
      req.body.category !== undefined ||
      req.body.categoryName !== undefined
    ) {
      const categoryName = resolveCategoryName(req.body, null);
      activity.category = categoryName;
      activity.categoryName = categoryName;
    }

    if (
      req.body.packageType !== undefined ||
      bookingConfigInput.packageType !== undefined
    ) {
      activity.packageType = String(
        req.body.packageType || bookingConfigInput.packageType || "SESSIONS",
      )
        .trim()
        .toUpperCase();
    }

    if (
      req.body.totalSessions !== undefined ||
      req.body.sessionCount !== undefined ||
      bookingConfigInput.totalSessions !== undefined
    ) {
      const totalSessions = toCount(
        req.body.totalSessions ||
          req.body.sessionCount ||
          bookingConfigInput.totalSessions,
        0,
      );

      activity.totalSessions = totalSessions;
      activity.sessionCount = totalSessions;
    }

    if (
      req.body.totalWeeks !== undefined ||
      req.body.weekCount !== undefined ||
      bookingConfigInput.totalWeeks !== undefined
    ) {
      const totalWeeks = toCount(
        req.body.totalWeeks ||
          req.body.weekCount ||
          bookingConfigInput.totalWeeks,
        0,
      );

      activity.totalWeeks = totalWeeks;
      activity.weekCount = totalWeeks;
    }

    if (
      req.body.sessionsPerWeek !== undefined ||
      bookingConfigInput.sessionsPerWeek !== undefined
    ) {
      activity.sessionsPerWeek = toCount(
        req.body.sessionsPerWeek || bookingConfigInput.sessionsPerWeek,
        0,
      );
    }

    if (
      req.body.bookingMode !== undefined ||
      bookingConfigInput.bookingMode !== undefined
    ) {
      activity.bookingMode = normalizeBookingMode(
        req.body.bookingMode || bookingConfigInput.bookingMode,
        "BOTH",
      );
    }

    if (req.body.availabilityType !== undefined) {
      activity.availabilityType = String(
        req.body.availabilityType || "DATE_RANGE",
      )
        .trim()
        .toUpperCase();
    }

    if (req.body.specificDates !== undefined) {
      activity.specificDates = normalizeStringArray(req.body.specificDates)
        .map((value) => new Date(value))
        .filter((d) => !Number.isNaN(d.getTime()));
    }

    if (req.body.daysOfWeek !== undefined) {
      activity.daysOfWeek = normalizeNumberArray(req.body.daysOfWeek, {
        min: 0,
        max: 6,
      });
    }

    if (
      req.body.slotDurationMinutes !== undefined ||
      bookingConfigInput.slotDurationMinutes !== undefined
    ) {
      activity.slotDurationMinutes = toCount(
        req.body.slotDurationMinutes || bookingConfigInput.slotDurationMinutes,
        60,
      );
    }

    if (
      req.body.defaultCapacity !== undefined ||
      req.body.capacity !== undefined ||
      req.body.seatCapacityDefault !== undefined ||
      bookingConfigInput.defaultCapacity !== undefined
    ) {
      const defaultCapacity = toCount(
        req.body.defaultCapacity ||
          req.body.capacity ||
          req.body.seatCapacityDefault ||
          bookingConfigInput.defaultCapacity,
        1,
      );

      activity.defaultCapacity = defaultCapacity;
      activity.capacity = defaultCapacity;
      activity.seatCapacityDefault = defaultCapacity;
    }

    if (
      req.body.allowWaitlist !== undefined ||
      bookingConfigInput.allowWaitlist !== undefined
    ) {
      activity.allowWaitlist = toBool(
        req.body.allowWaitlist ?? bookingConfigInput.allowWaitlist,
        false,
      );
    }

    activity.bookingConfig = {
      packageType: activity.packageType || "SESSIONS",
      totalSessions: toCount(
        activity.totalSessions ?? activity.sessionCount,
        0,
      ),
      totalWeeks: toCount(activity.totalWeeks ?? activity.weekCount, 0),
      sessionsPerWeek: toCount(activity.sessionsPerWeek, 0),
      bookingMode: normalizeBookingMode(
        req.body.bookingMode ||
          bookingConfigInput.bookingMode ||
          activity.bookingMode,
        "BOTH",
      ),
      slotDurationMinutes: toCount(activity.slotDurationMinutes, 60),
      defaultCapacity: toCount(
        activity.defaultCapacity ??
          activity.capacity ??
          activity.seatCapacityDefault,
        1,
      ),
      allowWaitlist: toBool(activity.allowWaitlist, false),
    };

    const uploadedFile = getUploadedActivityFile(req);

    if (uploadedFile) {
      const previousSnapshot = {
        image: activity.image,
        bannerImage: activity.bannerImage,
        coverImage: activity.coverImage,
        images: Array.isArray(activity.images) ? activity.images : [],
      };

      const imagePath = buildActivityImagePath(uploadedFile.filename);
      activity.image = imagePath;
      activity.bannerImage = imagePath;
      activity.coverImage = imagePath;
      activity.images = [imagePath];

      cleanupActivityImages(previousSnapshot);
    }

    await activity.save();

    const updated = await Activity.findById(activity._id).populate(
      "categoryId",
    );

    return res.json({
      message: "Activity updated successfully",
      activity: normalizeActivityForClient(updated.toObject()),
    });
  } catch (error) {
    cleanupRequestUploads(req, activityUploadsDir);
    next(error);
  }
});

router.delete("/activities/:id", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid activity id" });
    }

    let deletedActivity = null;

    await session.withTransaction(async () => {
      const activity = await Activity.findOne({
        _id: id,
        academyId,
      }).session(session);

      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");

      deletedActivity = activity.toObject();

      const packageIds = await ActivityPackage.find({
        academyId,
        activityId: activity._id,
      })
        .session(session)
        .distinct("_id");

      await ActivitySlot.deleteMany({
        academyId,
        activityId: activity._id,
      }).session(session);

      await ActivityPackage.deleteMany({
        academyId,
        activityId: activity._id,
      }).session(session);

      if (BookingSession) {
        const bookingSessionFilter = {
          academyId,
          $or: [
            { activityId: activity._id },
            ...(packageIds.length ? [{ packageId: { $in: packageIds } }] : []),
          ],
        };

        await BookingSession.deleteMany(bookingSessionFilter).session(session);
      }

      if (Booking) {
        await Booking.deleteMany({
          academyId,
          activityId: activity._id,
        }).session(session);
      }

      if (Notification) {
        await Notification.deleteMany({
          $or: [
            { academyId, "meta.activityId": activity._id },
            { academyId, activityId: activity._id },
          ],
        }).session(session);
      }

      await Activity.deleteOne({
        _id: activity._id,
        academyId,
      }).session(session);
    });

    if (!deletedActivity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    cleanupActivityImages(deletedActivity);

    return res.json({
      message: "Activity and related data deleted successfully",
    });
  } catch (error) {
    if (error?.message === "ACTIVITY_NOT_FOUND") {
      return res.status(404).json({ message: "Activity not found" });
    }

    next(error);
  } finally {
    await session.endSession();
  }
});

/* -------------------------------------------------------------------------- */
/* PACKAGES                                                                   */
/* -------------------------------------------------------------------------- */

router.get("/activities/:id/packages", async (req, res, next) => {
  try {
    const activity = await getScopedActivity(req, req.params.id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const packages = await ActivityPackage.find({
      academyId: activity.academyId,
      activityId: activity._id,
    })
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    return res.json({
      count: packages.length,
      packages: packages.map(normalizePackageForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/activities/:id/packages", async (req, res, next) => {
  try {
    const activity = await getScopedActivity(req, req.params.id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const academyId = normalizeId(activity.academyId);
    const title = String(req.body.title || "").trim();

    if (!title) {
      return res.status(400).json({ message: "Package title is required" });
    }

    const slug =
      req.body.slug && String(req.body.slug).trim()
        ? await generateUniquePackageSlug(
            activity._id,
            String(req.body.slug || "").trim(),
          )
        : await generateUniquePackageSlug(activity._id, title);

    const packageType = String(req.body.packageType || "SESSIONS")
      .trim()
      .toUpperCase();

    const durationUnit = String(req.body.durationUnit || "SESSION")
      .trim()
      .toUpperCase();

    const bookingPattern = normalizePackageBookingPattern(
      req.body.bookingPattern ||
        req.body.bookingMode ||
        activity.bookingConfig?.bookingMode,
      "BOTH",
    );

    const isDefault = toBool(req.body.isDefault, false);

    if (isDefault) {
      await ActivityPackage.updateMany(
        { academyId, activityId: activity._id },
        { $set: { isDefault: false } },
      );
    }

    const doc = await ActivityPackage.create({
      academyId,
      activityId: activity._id,
      branchId:
        req.body.branchId && isValidObjectId(req.body.branchId)
          ? req.body.branchId
          : null,
      title,
      slug,
      packageType,
      durationValue: toCount(req.body.durationValue, 0),
      durationUnit,
      sessionCount: toCount(req.body.sessionCount, 0),
      validityDays: toCount(req.body.validityDays, 0),
      minSelectableSessions: toCount(req.body.minSelectableSessions, 0),
      maxSelectableSessions: toCount(req.body.maxSelectableSessions, 0),
      bookingPattern,
      description: String(req.body.description || "").trim(),
      price: toMoney(req.body.price, 0),
      currency: String(req.body.currency || activity.currency || "QAR").trim(),
      isDefault,
      active: toBool(req.body.active, true),
      displayOrder: toCount(req.body.displayOrder, 0),
    });

    return res.status(201).json({
      message: "Package created successfully",
      package: normalizePackageForClient(doc.toObject()),
    });
  } catch (error) {
    if (String(error?.code) === "11000") {
      return res.status(400).json({
        message:
          "A package with the same title already exists for this activity",
      });
    }

    next(error);
  }
});

router.put("/packages/:id", async (req, res, next) => {
  try {
    const pkg = await getScopedPackage(req, req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    const activity = await Activity.findOne({
      _id: pkg.activityId,
      academyId: pkg.academyId,
    });

    if (!activity) {
      return res.status(404).json({ message: "Parent activity not found" });
    }

    if (req.body.title !== undefined) {
      const title = String(req.body.title || "").trim();

      if (!title) {
        return res.status(400).json({ message: "Package title is required" });
      }

      pkg.title = title;
    }

    if (req.body.slug !== undefined) {
      const raw = String(req.body.slug || "").trim();

      if (raw) {
        pkg.slug = await generateUniquePackageSlug(
          pkg.activityId,
          raw,
          pkg._id,
        );
      }
    } else if (req.body.title !== undefined) {
      pkg.slug = await generateUniquePackageSlug(
        pkg.activityId,
        pkg.title,
        pkg._id,
      );
    }

    if (req.body.packageType !== undefined) {
      pkg.packageType = String(req.body.packageType || "SESSIONS")
        .trim()
        .toUpperCase();
    }

    if (req.body.durationValue !== undefined) {
      pkg.durationValue = toCount(req.body.durationValue, 0);
    }

    if (req.body.durationUnit !== undefined) {
      pkg.durationUnit = String(req.body.durationUnit || "SESSION")
        .trim()
        .toUpperCase();
    }

    if (req.body.sessionCount !== undefined) {
      pkg.sessionCount = toCount(req.body.sessionCount, 0);
    }

    if (req.body.validityDays !== undefined) {
      pkg.validityDays = toCount(req.body.validityDays, 0);
    }

    if (req.body.minSelectableSessions !== undefined) {
      pkg.minSelectableSessions = toCount(req.body.minSelectableSessions, 0);
    }

    if (req.body.maxSelectableSessions !== undefined) {
      pkg.maxSelectableSessions = toCount(req.body.maxSelectableSessions, 0);
    }

    if (
      req.body.bookingPattern !== undefined ||
      req.body.bookingMode !== undefined
    ) {
      pkg.bookingPattern = normalizePackageBookingPattern(
        req.body.bookingPattern ||
          req.body.bookingMode ||
          activity.bookingConfig?.bookingMode,
        "BOTH",
      );
    }

    if (req.body.description !== undefined) {
      pkg.description = String(req.body.description || "").trim();
    }

    if (req.body.price !== undefined) {
      pkg.price = toMoney(req.body.price, 0);
    }

    if (req.body.currency !== undefined) {
      pkg.currency = String(req.body.currency || "QAR").trim();
    }

    if (req.body.branchId !== undefined) {
      pkg.branchId =
        req.body.branchId && isValidObjectId(req.body.branchId)
          ? req.body.branchId
          : null;
    }

    if (req.body.active !== undefined) {
      pkg.active = toBool(req.body.active, true);
    }

    if (req.body.displayOrder !== undefined) {
      pkg.displayOrder = toCount(req.body.displayOrder, 0);
    }

    if (req.body.isDefault !== undefined) {
      const isDefault = toBool(req.body.isDefault, false);
      pkg.isDefault = isDefault;

      if (isDefault) {
        await ActivityPackage.updateMany(
          {
            academyId: pkg.academyId,
            activityId: pkg.activityId,
            _id: { $ne: pkg._id },
          },
          { $set: { isDefault: false } },
        );
      }
    }

    await pkg.save();

    return res.json({
      message: "Package updated successfully",
      package: normalizePackageForClient(pkg.toObject()),
    });
  } catch (error) {
    if (String(error?.code) === "11000") {
      return res.status(400).json({
        message:
          "A package with the same title already exists for this activity",
      });
    }

    next(error);
  }
});

router.delete("/packages/:id", async (req, res, next) => {
  try {
    const pkg = await getScopedPackage(req, req.params.id);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    const hasSlots = await ActivitySlot.exists({
      academyId: pkg.academyId,
      packageId: pkg._id,
    });

    if (hasSlots) {
      return res.status(400).json({
        message: "Delete package slots before deleting this package",
      });
    }

    if (BookingSession) {
      const hasBookingSessions = await BookingSession.exists({
        academyId: pkg.academyId,
        packageId: pkg._id,
      });

      if (hasBookingSessions) {
        return res.status(400).json({
          message: "Cannot delete a package that already has booking sessions",
        });
      }
    }

    await ActivityPackage.deleteOne({ _id: pkg._id });

    return res.json({
      message: "Package deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* SLOTS                                                                      */
/* -------------------------------------------------------------------------- */

router.get("/activities/:id/slots", async (req, res, next) => {
  try {
    const activity = await getScopedActivity(req, req.params.id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const filter = {
      academyId: activity.academyId,
      activityId: activity._id,
    };

    if (req.query.packageId && isValidObjectId(req.query.packageId)) {
      filter.packageId = req.query.packageId;
    }

    if (req.query.branchId && isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }

    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};

      if (req.query.dateFrom) {
        const from = new Date(req.query.dateFrom);

        if (!Number.isNaN(from.getTime())) {
          from.setHours(0, 0, 0, 0);
          filter.date.$gte = from;
        }
      }

      if (req.query.dateTo) {
        const to = new Date(req.query.dateTo);

        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          filter.date.$lte = to;
        }
      }

      if (!Object.keys(filter.date).length) {
        delete filter.date;
      }
    }

    const slots = await ActivitySlot.find(filter)
      .sort({ date: 1, startTime: 1 })
      .lean();

    return res.json({
      count: slots.length,
      slots: slots.map(normalizeSlotForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/activities/:id/slots", async (req, res, next) => {
  try {
    const activity = await getScopedActivity(req, req.params.id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const academyId = normalizeId(activity.academyId);
    const packageId = String(req.body.packageId || "").trim();

    if (!packageId || !isValidObjectId(packageId)) {
      return res.status(400).json({ message: "Valid packageId is required" });
    }

    const pkg = await ActivityPackage.findOne({
      _id: packageId,
      academyId,
      activityId: activity._id,
    });

    if (!pkg) {
      return res
        .status(404)
        .json({ message: "Package not found for this activity" });
    }

    const date = new Date(req.body.date);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    const startTime = String(req.body.startTime || "").trim();
    const endTime = String(req.body.endTime || "").trim();

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "startTime and endTime are required" });
    }

    const capacity = toCount(
      req.body.capacity,
      toCount(
        activity.defaultCapacity ||
          activity.capacity ||
          activity.seatCapacityDefault,
        1,
      ),
    );

    const doc = await ActivitySlot.create({
      academyId,
      activityId: activity._id,
      packageId: pkg._id,
      branchId:
        req.body.branchId && isValidObjectId(req.body.branchId)
          ? req.body.branchId
          : pkg.branchId || activity.branchIds?.[0] || null,
      date,
      startTime,
      endTime,
      sessionLabel: String(req.body.sessionLabel || "").trim(),
      capacity,
      bookedCount: toCount(req.body.bookedCount, 0),
      waitlistCount: toCount(req.body.waitlistCount, 0),
      priceOverride:
        req.body.priceOverride === "" ||
        req.body.priceOverride === undefined ||
        req.body.priceOverride === null
          ? null
          : Number(req.body.priceOverride),
      bookingOpenAt: req.body.bookingOpenAt
        ? new Date(req.body.bookingOpenAt)
        : null,
      bookingCloseAt: req.body.bookingCloseAt
        ? new Date(req.body.bookingCloseAt)
        : null,
      notes: String(req.body.notes || "").trim(),
      status: String(req.body.status || "OPEN")
        .trim()
        .toUpperCase(),
      active: toBool(req.body.active, true),
    });

    return res.status(201).json({
      message: "Slot created successfully",
      slot: normalizeSlotForClient(doc.toObject()),
    });
  } catch (error) {
    if (String(error?.code) === "11000") {
      return res.status(400).json({
        message:
          "A slot with the same date and time already exists for this package",
      });
    }

    next(error);
  }
});

router.post("/activities/:id/slots/bulk-generate", async (req, res, next) => {
  try {
    const activity = await getScopedActivity(req, req.params.id);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const academyId = normalizeId(activity.academyId);
    const packageId = String(req.body.packageId || "").trim();

    if (!packageId || !isValidObjectId(packageId)) {
      return res.status(400).json({ message: "Valid packageId is required" });
    }

    const pkg = await ActivityPackage.findOne({
      _id: packageId,
      academyId,
      activityId: activity._id,
    });

    if (!pkg) {
      return res
        .status(404)
        .json({ message: "Package not found for this activity" });
    }

    const generationMode = normalizeGenerationMode(
      req.body.generationMode || req.body.frequency || req.body.generatorType,
    );

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({
        message: "Valid startDate and endDate are required",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        message: "startDate cannot be after endDate",
      });
    }

    const daysOfWeek = normalizeDaysOfWeek(req.body.daysOfWeek);
    const daysOfMonth = normalizeDaysOfMonth(
      req.body.daysOfMonth || req.body.monthDays,
    );

    if (generationMode === "WEEKLY" && !daysOfWeek.length) {
      return res.status(400).json({
        message: "At least one dayOfWeek is required for weekly generation",
      });
    }

    if (generationMode === "MONTHLY" && !daysOfMonth.length) {
      return res.status(400).json({
        message:
          "At least one daysOfMonth value is required for monthly generation",
      });
    }

    const timeSlotsInput = Array.isArray(req.body.timeSlots)
      ? req.body.timeSlots
      : safeJsonParse(req.body.timeSlots, []);

    if (!Array.isArray(timeSlotsInput) || !timeSlotsInput.length) {
      return res.status(400).json({
        message:
          "timeSlots array is required, e.g. [{ startTime, endTime, sessionLabel, capacity }]",
      });
    }

    const rows = [];

    let cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (cursor <= end) {
      if (
        shouldGenerateSlotForDate(
          cursor,
          generationMode,
          daysOfWeek,
          daysOfMonth,
        )
      ) {
        for (const slotItem of timeSlotsInput) {
          const startTime = String(slotItem?.startTime || "").trim();
          const endTime = String(slotItem?.endTime || "").trim();

          if (!startTime || !endTime) continue;

          rows.push({
            academyId,
            activityId: activity._id,
            packageId: pkg._id,
            branchId:
              slotItem?.branchId && isValidObjectId(slotItem.branchId)
                ? slotItem.branchId
                : req.body.branchId && isValidObjectId(req.body.branchId)
                  ? req.body.branchId
                  : pkg.branchId || activity.branchIds?.[0] || null,
            date: new Date(cursor),
            startTime,
            endTime,
            sessionLabel: String(
              slotItem?.sessionLabel ||
                slotItem?.label ||
                req.body.sessionLabel ||
                "",
            ).trim(),
            capacity: toCount(
              slotItem?.capacity,
              toCount(
                req.body.capacity,
                toCount(
                  activity.defaultCapacity ||
                    activity.capacity ||
                    activity.seatCapacityDefault,
                  1,
                ),
              ),
            ),
            bookedCount: 0,
            waitlistCount: 0,
            priceOverride:
              slotItem?.priceOverride === "" ||
              slotItem?.priceOverride === undefined ||
              slotItem?.priceOverride === null
                ? null
                : Number(slotItem.priceOverride),
            bookingOpenAt: slotItem?.bookingOpenAt
              ? new Date(slotItem.bookingOpenAt)
              : req.body.bookingOpenAt
                ? new Date(req.body.bookingOpenAt)
                : null,
            bookingCloseAt: slotItem?.bookingCloseAt
              ? new Date(slotItem.bookingCloseAt)
              : req.body.bookingCloseAt
                ? new Date(req.body.bookingCloseAt)
                : null,
            notes: String(slotItem?.notes || req.body.notes || "").trim(),
            status: String(slotItem?.status || req.body.status || "OPEN")
              .trim()
              .toUpperCase(),
            active: toBool(slotItem?.active ?? req.body.active, true),
          });
        }
      }

      cursor = addDays(cursor, 1);
    }

    const dedupedRows = uniqueDateTimeRows(rows);

    if (!dedupedRows.length) {
      return res.status(400).json({
        message: "No valid slots were generated",
      });
    }

    const existingSlots = await ActivitySlot.find({
      academyId,
      activityId: activity._id,
      packageId: pkg._id,
      date: {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      },
    })
      .select("branchId date startTime endTime")
      .lean();

    const existingKeySet = new Set(
      existingSlots.map((item) =>
        [
          normalizeId(activity._id),
          normalizeId(pkg._id),
          normalizeId(item.branchId),
          formatYmd(item.date),
          String(item.startTime || "").trim(),
          String(item.endTime || "").trim(),
        ].join("|"),
      ),
    );

    const rowsToInsert = dedupedRows.filter((row) => {
      const key = [
        normalizeId(row.activityId),
        normalizeId(row.packageId),
        normalizeId(row.branchId),
        formatYmd(row.date),
        String(row.startTime || "").trim(),
        String(row.endTime || "").trim(),
      ].join("|");

      return !existingKeySet.has(key);
    });

    if (!rowsToInsert.length) {
      return res.status(400).json({
        message: "All generated slots already exist",
      });
    }

    const docs = await ActivitySlot.insertMany(rowsToInsert, {
      ordered: false,
    });

    return res.status(201).json({
      message: `${generationMode.toLowerCase()} slots generated successfully`,
      generationMode,
      requestedCount: dedupedRows.length,
      skippedExistingCount: dedupedRows.length - rowsToInsert.length,
      createdCount: docs.length,
      slots: docs.map((item) => normalizeSlotForClient(item.toObject())),
    });
  } catch (error) {
    if (String(error?.code) === "11000") {
      return res.status(400).json({
        message: "Some generated slots already exist",
      });
    }

    next(error);
  }
});

router.put("/slots/:id", async (req, res, next) => {
  try {
    const slot = await getScopedSlot(req, req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (req.body.packageId !== undefined) {
      if (!isValidObjectId(req.body.packageId)) {
        return res.status(400).json({ message: "Invalid packageId" });
      }

      const pkg = await ActivityPackage.findOne({
        _id: req.body.packageId,
        academyId: slot.academyId,
        activityId: slot.activityId,
      });

      if (!pkg) {
        return res
          .status(404)
          .json({ message: "Package not found for this activity" });
      }

      slot.packageId = pkg._id;
    }

    if (req.body.branchId !== undefined) {
      slot.branchId =
        req.body.branchId && isValidObjectId(req.body.branchId)
          ? req.body.branchId
          : null;
    }

    if (req.body.date !== undefined) {
      const date = new Date(req.body.date);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      slot.date = date;
    }

    if (req.body.startTime !== undefined) {
      slot.startTime = String(req.body.startTime || "").trim();
    }

    if (req.body.endTime !== undefined) {
      slot.endTime = String(req.body.endTime || "").trim();
    }

    if (req.body.sessionLabel !== undefined) {
      slot.sessionLabel = String(req.body.sessionLabel || "").trim();
    }

    if (req.body.capacity !== undefined) {
      const nextCapacity = toCount(req.body.capacity, 0);

      if (nextCapacity < toCount(slot.bookedCount, 0)) {
        return res.status(400).json({
          message: "Capacity cannot be less than current bookedCount",
        });
      }

      slot.capacity = nextCapacity;
    }

    if (req.body.waitlistCount !== undefined) {
      slot.waitlistCount = toCount(req.body.waitlistCount, 0);
    }

    if (req.body.priceOverride !== undefined) {
      slot.priceOverride =
        req.body.priceOverride === "" || req.body.priceOverride === null
          ? null
          : Number(req.body.priceOverride);
    }

    if (req.body.bookingOpenAt !== undefined) {
      slot.bookingOpenAt = req.body.bookingOpenAt
        ? new Date(req.body.bookingOpenAt)
        : null;
    }

    if (req.body.bookingCloseAt !== undefined) {
      slot.bookingCloseAt = req.body.bookingCloseAt
        ? new Date(req.body.bookingCloseAt)
        : null;
    }

    if (req.body.notes !== undefined) {
      slot.notes = String(req.body.notes || "").trim();
    }

    if (req.body.status !== undefined) {
      slot.status = String(req.body.status || "OPEN")
        .trim()
        .toUpperCase();
    } else {
      slot.status =
        toCount(slot.bookedCount, 0) >= toCount(slot.capacity, 0) &&
        toCount(slot.capacity, 0) > 0
          ? "FULL"
          : "OPEN";
    }

    if (req.body.active !== undefined) {
      slot.active = toBool(req.body.active, true);
    }

    await slot.save();

    return res.json({
      message: "Slot updated successfully",
      slot: normalizeSlotForClient(slot.toObject()),
    });
  } catch (error) {
    if (String(error?.code) === "11000") {
      return res.status(400).json({
        message:
          "A slot with the same date and time already exists for this package",
      });
    }

    next(error);
  }
});

router.delete("/slots/:id", async (req, res, next) => {
  try {
    const slot = await getScopedSlot(req, req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (toCount(slot.bookedCount, 0) > 0) {
      return res.status(400).json({
        message: "Cannot delete a slot that already has bookings",
      });
    }

    if (BookingSession) {
      const hasBookingSessions = await BookingSession.exists({
        academyId: slot.academyId,
        slotId: slot._id,
      });

      if (hasBookingSessions) {
        return res.status(400).json({
          message: "Cannot delete a slot that already has booking sessions",
        });
      }
    }

    await ActivitySlot.deleteOne({ _id: slot._id });

    return res.json({
      message: "Slot deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* BOOKINGS / ENQUIRIES                                                       */
/* -------------------------------------------------------------------------- */
function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function pickBookingNo(item) {
  return (
    item?.bookingNo ||
    item?.referenceNo ||
    item?.invoiceNo ||
    item?.enquiryNo ||
    item?._id ||
    item?.id ||
    "N/A"
  );
}

function pickBookingParentName(item) {
  return (
    item?.parentId?.fullName ||
    item?.parentId?.name ||
    item?.parentName ||
    item?.guestParent?.fullName ||
    item?.guestParent?.name ||
    item?.guestParentSnapshot?.fullName ||
    item?.name ||
    "Guest Parent"
  );
}

function pickBookingParentEmail(item) {
  return (
    item?.parentId?.email ||
    item?.email ||
    item?.userEmail ||
    item?.parentEmail ||
    item?.customerEmail ||
    item?.guestParent?.email ||
    item?.guestParentSnapshot?.email ||
    ""
  );
}

function pickBookingParentPhone(item) {
  return (
    item?.parentId?.phone ||
    item?.phone ||
    item?.parentPhone ||
    item?.guestParent?.phone ||
    item?.guestParentSnapshot?.phone ||
    ""
  );
}

function pickBookingChildName(item) {
  return (
    item?.childId?.fullName ||
    item?.childId?.name ||
    item?.childName ||
    item?.guestChild?.fullName ||
    item?.guestChild?.name ||
    item?.childSnapshot?.fullName ||
    "N/A"
  );
}

function pickBookingActivityName(item) {
  return (
    item?.activityId?.title ||
    item?.activityId?.name ||
    item?.activityName ||
    item?.courseName ||
    item?.course?.name ||
    item?.activity?.name ||
    item?.activitySnapshot?.title ||
    "N/A"
  );
}

function pickBookingCategoryName(item) {
  return (
    item?.activityId?.categoryName ||
    item?.activityId?.category ||
    item?.categoryName ||
    item?.category ||
    "N/A"
  );
}

function pickBookingPackageName(item) {
  return (
    item?.packageId?.title ||
    item?.packageName ||
    item?.packageSnapshot?.title ||
    "N/A"
  );
}

function pickBookingSessions(item) {
  return (
    item?.totalSessions ||
    item?.bookedSessions ||
    item?.sessions ||
    item?.noOfSessions ||
    item?.numberOfSessions ||
    item?.packageSnapshot?.sessionCount ||
    item?.packageId?.sessionCount ||
    item?.packageSnapshot?.durationValue ||
    0
  );
}

function pickBookingAmount(item) {
  return toMoney(
    item?.finalAmount ??
      item?.subtotalAmount ??
      item?.baseAmount ??
      item?.amount ??
      item?.totalAmount ??
      item?.price ??
      item?.packageSnapshot?.price ??
      item?.packageId?.price ??
      item?.package?.price ??
      item?.activityId?.price ??
      item?.activityId?.basePrice ??
      item?.activitySnapshot?.price ??
      item?.activitySnapshot?.basePrice,
    0,
  );
}

function pickBookingCurrency(item) {
  return (
    item?.currency ||
    item?.packageSnapshot?.currency ||
    item?.packageId?.currency ||
    item?.package?.currency ||
    item?.activityId?.currency ||
    "QAR"
  );
}

function normalizeBookingForClient(item) {
  const cancellationFields = getCancellationFields(item);

  return {
    ...item,

    _id: item?._id,
    id: item?._id || item?.id,

    bookingNo: pickBookingNo(item),

    parentName: pickBookingParentName(item),
    parentEmail: pickBookingParentEmail(item),
    parentPhone: pickBookingParentPhone(item),

    childName: pickBookingChildName(item),

    activityName: pickBookingActivityName(item),
    courseName: pickBookingActivityName(item),
    categoryName: pickBookingCategoryName(item),

    packageName: pickBookingPackageName(item),

    sessions: pickBookingSessions(item),

    bookingMode: item?.bookingMode || "N/A",

    bookingStatus: item?.bookingStatus || item?.status || "PENDING",
    status: item?.status || item?.bookingStatus || "PENDING",
    paymentStatus: item?.paymentStatus || "PENDING",
    attendanceStatus: item?.attendanceStatus || "PENDING",

    finalAmount: pickBookingAmount(item),
    amount: pickBookingAmount(item),
    totalAmount: pickBookingAmount(item),
    currency: pickBookingCurrency(item),

    source: item?.bookingSource || (item?.isGuestBooking ? "GUEST" : "WEB"),
    bookingSource:
      item?.bookingSource || (item?.isGuestBooking ? "GUEST" : "WEB"),

    notes: item?.notes || "",

    ...cancellationFields,

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    firstSessionDate: item?.firstSessionDate || null,
    lastSessionDate: item?.lastSessionDate || null,
  };
}

function getKidgageCommissionConfig() {
  const type = String(process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE")
    .trim()
    .toUpperCase();

  const value = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);

  return {
    type: type === "FIXED" ? "FIXED" : "PERCENTAGE",
    value: Number.isFinite(value) && value >= 0 ? value : 10,
  };
}

function calculateKidgageCommission(amount) {
  const safeAmount = toMoney(amount, 0);
  const config = getKidgageCommissionConfig();

  let commissionAmount = 0;

  if (config.type === "FIXED") {
    commissionAmount = config.value;
  } else {
    commissionAmount = (safeAmount * config.value) / 100;
  }

  commissionAmount = Math.min(safeAmount, Math.max(0, commissionAmount));

  return {
    kidgageCommissionType: config.type,
    kidgageCommissionValue: config.value,
    kidgageCommissionAmount: toMoney(commissionAmount, 0),
    academyPayableAmount: toMoney(safeAmount - commissionAmount, 0),
  };
}

function pickPaymentMethodFromBooking(booking) {
  const value = String(booking?.paymentMethod || booking?.method || "CASH")
    .trim()
    .toUpperCase();

  return value === "ONLINE" ? "ONLINE" : "CASH";
}

function pickPaymentGatewayFromBooking(booking, paymentMethod) {
  if (paymentMethod === "ONLINE") {
    return String(booking?.paymentGateway || "MYFATOORAH")
      .trim()
      .toUpperCase();
  }

  return "MANUAL";
}

async function syncPaymentFromPaidBooking({ booking, req }) {
  if (!booking?._id || !booking?.academyId) return null;

  const amount = pickBookingAmount(booking);

  if (amount <= 0) {
    throw Object.assign(
      new Error("Cannot mark booking as paid because amount is zero"),
      { statusCode: 400 },
    );
  }

  const paymentMethod = pickPaymentMethodFromBooking(booking);
  const paymentGateway = pickPaymentGatewayFromBooking(booking, paymentMethod);
  const currency = String(pickBookingCurrency(booking) || "QAR")
    .trim()
    .toUpperCase();

  const commission = calculateKidgageCommission(amount);

  const paidAt = booking.paidAt || new Date();

  const update = {
    academyId: booking.academyId,
    bookingId: booking._id,

    parentId: booking.parentId || null,
    childId: booking.childId || null,
    activityId: booking.activityId || null,
    packageId: booking.packageId || null,

    paymentMethod,
    amount,
    currency,

    paymentReceiver: "KIDGAGE",
    paymentGateway,

    paymentStatus: "PAID",
    settlementStatus: "READY",

    ...commission,

    paidAt,
    failedAt: null,
    cancelledAt: null,
    refundedAt: null,

    confirmedBy: req?.user?._id || req?.user?.id || null,
    confirmedAt: new Date(),

    notes: booking.notes || "",

    meta: {
      source: "ACADEMY_BOOKING_MARKED_PAID",
      syncedFromBooking: true,
      syncedByRole: req?.user?.role || "",
      syncedByUserId: req?.user?._id || req?.user?.id || null,
      syncedAt: new Date(),
    },
  };

  const payment = await Payment.findOneAndUpdate(
    { bookingId: booking._id },
    {
      $set: update,
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

function collectObjectIdsFromValues(...values) {
  const output = new Set();

  function walk(value) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (typeof value === "object") {
      const raw =
        value?._id ||
        value?.id ||
        value?.slotId ||
        value?.activitySlotId ||
        value?.bookingSlotId ||
        value?.selectedSlotId;

      if (raw && isValidObjectId(raw)) {
        output.add(String(raw));
      }

      return;
    }

    if (isValidObjectId(value)) {
      output.add(String(value));
    }
  }

  values.forEach(walk);

  return [...output];
}

function parsePositiveInt(value, fallback = 1, max = 500) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), max);
}

function normalizeStatus(value, fallback = "") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return text || fallback;
}

const ALLOWED_CANCELLATION_STATUSES = [
  "NONE",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
];

function normalizeCancellationStatus(value, fallback = "NONE") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return ALLOWED_CANCELLATION_STATUSES.includes(text) ? text : fallback;
}

function getRequestUserId(req) {
  const userId = req?.user?._id || req?.user?.id || null;
  return userId && isValidObjectId(userId) ? userId : null;
}

function getCancellationFields(item = {}) {
  const cancellationStatus = normalizeCancellationStatus(
    item?.cancellationStatus,
    "NONE",
  );

  return {
    cancellationRequested: Boolean(
      item?.cancellationRequested || cancellationStatus === "REQUESTED",
    ),
    cancellationStatus,
    cancellationReason: item?.cancellationReason || "",
    cancellationRequestedAt: item?.cancellationRequestedAt || null,
    cancellationRequestedBy: item?.cancellationRequestedBy || null,
    cancellationReviewedAt: item?.cancellationReviewedAt || null,
    cancellationReviewedBy: item?.cancellationReviewedBy || null,
    cancellationAdminNote: item?.cancellationAdminNote || "",
    hasCancellationRequest: Boolean(
      item?.cancellationRequested || cancellationStatus === "REQUESTED",
    ),
  };
}

function buildDateRangeFilter(query = {}) {
  const createdAt = {};

  const fromRaw = query.from || query.dateFrom || query.startDate || "";
  const toRaw = query.to || query.dateTo || query.endDate || "";

  if (fromRaw) {
    const from = new Date(fromRaw);
    if (!Number.isNaN(from.getTime())) {
      from.setHours(0, 0, 0, 0);
      createdAt.$gte = from;
    }
  }

  if (toRaw) {
    const to = new Date(toRaw);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
  }

  return Object.keys(createdAt).length ? createdAt : null;
}

function normalizePaymentForAcademy(payment) {
  if (!payment) return null;

  const academy = payment?.academyId || {};
  const booking = payment?.bookingId || {};
  const parent = payment?.parentId || {};
  const child = payment?.childId || {};
  const activity = payment?.activityId || {};
  const pkg = payment?.packageId || {};

  return {
    _id: payment._id,
    id: payment._id,

    academyId: academy?._id || payment.academyId || null,
    academyName: academy?.name || payment?.meta?.academyName || "Academy",

    bookingId: booking?._id || payment.bookingId || null,
    bookingNo:
      payment.bookingNo ||
      booking?.bookingNo ||
      booking?.referenceNo ||
      booking?.invoiceNo ||
      "N/A",
    bookingStatus: booking?.bookingStatus || booking?.status || "N/A",

    parentId: parent?._id || payment.parentId || null,
    parentName:
      parent?.fullName ||
      parent?.name ||
      payment?.parentName ||
      payment?.meta?.parentName ||
      payment?.meta?.guestParent?.fullName ||
      payment?.meta?.guestParent?.name ||
      "Parent",
    parentEmail:
      parent?.email ||
      payment?.parentEmail ||
      payment?.meta?.parentEmail ||
      payment?.meta?.guestParent?.email ||
      "",

    childId: child?._id || payment.childId || null,
    childName:
      child?.fullName ||
      child?.name ||
      payment?.childName ||
      payment?.meta?.childName ||
      payment?.meta?.guestChild?.fullName ||
      payment?.meta?.guestChild?.name ||
      "Child",

    activityId: activity?._id || payment.activityId || null,
    activityName:
      payment?.activityName ||
      activity?.title ||
      activity?.name ||
      booking?.activityName ||
      booking?.activitySnapshot?.title ||
      "Activity",

    packageId: pkg?._id || payment.packageId || null,
    packageName:
      payment?.packageName ||
      pkg?.title ||
      booking?.packageName ||
      booking?.packageSnapshot?.title ||
      "Package",

    amount: toMoney(payment.amount, 0),
    currency: String(payment.currency || "QAR").toUpperCase(),

    paymentReceiver: payment.paymentReceiver || "KIDGAGE",
    paymentMethod: normalizeStatus(payment.paymentMethod, "CASH"),
    paymentGateway: normalizeStatus(payment.paymentGateway, "MANUAL"),
    paymentStatus: normalizeStatus(payment.paymentStatus, "PENDING"),
    settlementStatus: normalizeStatus(payment.settlementStatus, "PENDING"),

    kidgageCommissionType: payment.kidgageCommissionType || "PERCENTAGE",
    kidgageCommissionValue: toMoney(payment.kidgageCommissionValue, 0),
    kidgageCommissionAmount: toMoney(payment.kidgageCommissionAmount, 0),
    academyPayableAmount: toMoney(payment.academyPayableAmount, 0),

    gatewayOrderId: payment.gatewayOrderId || "",
    gatewayPaymentId: payment.gatewayPaymentId || "",
    gatewayReference: payment.gatewayReference || "",
    gatewayCheckoutUrl: payment.gatewayCheckoutUrl || "",

    paidAt: payment.paidAt || null,
    failedAt: payment.failedAt || null,
    cancelledAt: payment.cancelledAt || null,
    refundedAt: payment.refundedAt || null,

    createdAt: payment.createdAt || null,
    updatedAt: payment.updatedAt || null,
    notes: payment.notes || "",
  };
}

function normalizeSettlementForAcademy(settlement) {
  if (!settlement) return null;

  const academy = settlement?.academyId || {};
  const settledBy = settlement?.settledBy || {};

  return {
    _id: settlement._id,
    id: settlement._id,

    academyId: academy?._id || settlement.academyId || null,
    academyName: academy?.name || "Academy",
    academyCity: academy?.city || "",
    academyLogo: academy?.logo || "",

    paymentIds: Array.isArray(settlement.paymentIds)
      ? settlement.paymentIds.map((item) => item?._id || item)
      : [],
    paymentCount: Array.isArray(settlement.paymentIds)
      ? settlement.paymentIds.length
      : 0,

    totalCollected: toMoney(settlement.totalCollected, 0),
    kidgageCommissionTotal: toMoney(settlement.kidgageCommissionTotal, 0),
    academyPayableTotal: toMoney(settlement.academyPayableTotal, 0),
    currency: settlement.currency || "QAR",

    status: normalizeStatus(settlement.status, "PAID"),
    paymentMethod: normalizeStatus(
      settlement.paymentMethod,
      "MANUAL_BANK_TRANSFER",
    ),
    settlementReference: settlement.settlementReference || "",
    notes: settlement.notes || "",

    settledAt: settlement.settledAt || null,
    settledBy: settledBy?._id || settlement.settledBy || null,
    settledByName: settledBy?.fullName || settledBy?.name || "",
    settledByEmail: settledBy?.email || "",

    createdAt: settlement.createdAt || null,
    updatedAt: settlement.updatedAt || null,
  };
}

async function findScopedBookingOrEnquiry(academyId, id) {
  if (Booking) {
    const booking = await Booking.findOne({ _id: id, academyId });
    if (booking) {
      return {
        type: "booking",
        doc: booking,
      };
    }
  }

  if (Enquiry) {
    const enquiry = await Enquiry.findOne({ _id: id, academyId });
    if (enquiry) {
      return {
        type: "enquiry",
        doc: enquiry,
      };
    }
  }

  return null;
}

router.get("/bookings", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!Booking) {
      const enquiries = await getEnquiriesForAcademy(academyId, 100);

      return res.json({
        count: enquiries.length,
        bookings: enquiries.map(normalizeBookingForClient),
      });
    }

    let bookings = [];

    try {
      bookings = await Booking.find({ academyId })
        .populate("parentId", "fullName name email phone")
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
        .limit(100)
        .lean();
    } catch {
      bookings = await Booking.find({ academyId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    return res.json({
      count: bookings.length,
      bookings: bookings.map(normalizeBookingForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/bookings/:id", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const found = await findScopedBookingOrEnquiry(academyId, id);

    if (!found?.doc) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = found.doc;

    const previousBookingStatus = String(
      booking.bookingStatus || booking.status || "PENDING",
    ).toUpperCase();

    const previousPaymentStatus = String(
      booking.paymentStatus || "PENDING",
    ).toUpperCase();

    const previousAttendanceStatus = String(
      booking.attendanceStatus || "PENDING",
    ).toUpperCase();

    const previousCancellationStatus = normalizeCancellationStatus(
      booking.cancellationStatus,
      "NONE",
    );

    const allowedBookingStatus = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
    ];

    const allowedPaymentStatus = [
      "PENDING",
      "PAID",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
    ];

    const allowedAttendanceStatus = [
      "PENDING",
      "PRESENT",
      "ABSENT",
      "COMPLETED",
    ];

    if (req.body.bookingStatus !== undefined) {
      const value = String(req.body.bookingStatus || "")
        .trim()
        .toUpperCase();

      if (!allowedBookingStatus.includes(value)) {
        return res.status(400).json({ message: "Invalid bookingStatus" });
      }

      booking.bookingStatus = value;
      booking.status = value;
    }

    if (req.body.paymentStatus !== undefined) {
      const value = String(req.body.paymentStatus || "")
        .trim()
        .toUpperCase();

      if (!allowedPaymentStatus.includes(value)) {
        return res.status(400).json({ message: "Invalid paymentStatus" });
      }

      booking.paymentStatus = value;
    }

    if (req.body.attendanceStatus !== undefined) {
      const value = String(req.body.attendanceStatus || "")
        .trim()
        .toUpperCase();

      if (!allowedAttendanceStatus.includes(value)) {
        return res.status(400).json({ message: "Invalid attendanceStatus" });
      }

      booking.attendanceStatus = value;
    }

    if (req.body.notes !== undefined) {
      booking.notes = String(req.body.notes || "").trim();
    }

    if (
      req.body.cancellationStatus !== undefined ||
      req.body.cancellationRequested !== undefined ||
      req.body.cancellationAdminNote !== undefined ||
      req.body.cancellationReason !== undefined
    ) {
      if (found.type !== "booking") {
        return res.status(400).json({
          message: "Cancellation review is only available for Booking records.",
        });
      }

      const nextCancellationStatus = normalizeCancellationStatus(
        req.body.cancellationStatus,
        previousCancellationStatus,
      );

      if (!ALLOWED_CANCELLATION_STATUSES.includes(nextCancellationStatus)) {
        return res.status(400).json({ message: "Invalid cancellationStatus" });
      }

      const now = new Date();
      const reviewerId = getRequestUserId(req);

      booking.cancellationStatus = nextCancellationStatus;

      if (req.body.cancellationReason !== undefined) {
        booking.cancellationReason = String(
          req.body.cancellationReason || "",
        ).trim();
      }

      if (req.body.cancellationAdminNote !== undefined) {
        booking.cancellationAdminNote = String(
          req.body.cancellationAdminNote || "",
        ).trim();
      }

      if (nextCancellationStatus === "REQUESTED") {
        booking.cancellationRequested = true;

        if (!booking.cancellationRequestedAt) {
          booking.cancellationRequestedAt = now;
        }

        if (!booking.cancellationRequestedBy && booking.parentId) {
          booking.cancellationRequestedBy = booking.parentId;
        }

        booking.cancellationReviewedAt = null;
        booking.cancellationReviewedBy = null;
      }

      if (nextCancellationStatus === "APPROVED") {
        booking.cancellationRequested = false;
        booking.cancellationReviewedAt = now;
        booking.cancellationReviewedBy = reviewerId;

        booking.bookingStatus = "CANCELLED";
        booking.status = "CANCELLED";
        booking.cancelledAt = booking.cancelledAt || now;

        if (String(booking.paymentStatus || "").toUpperCase() !== "PAID") {
          booking.paymentStatus = "CANCELLED";
        }
      }

      if (nextCancellationStatus === "REJECTED") {
        booking.cancellationRequested = false;
        booking.cancellationReviewedAt = now;
        booking.cancellationReviewedBy = reviewerId;
      }

      if (nextCancellationStatus === "NONE") {
        booking.cancellationRequested = false;
        booking.cancellationReason = "";
        booking.cancellationRequestedAt = null;
        booking.cancellationRequestedBy = null;
        booking.cancellationReviewedAt = null;
        booking.cancellationReviewedBy = null;
        booking.cancellationAdminNote = "";
      }

      if (req.body.cancellationRequested !== undefined) {
        booking.cancellationRequested = toBool(
          req.body.cancellationRequested,
          booking.cancellationRequested,
        );
      }
    }

    let syncedPayment = null;

    const currentPaymentStatus = String(
      booking.paymentStatus || "",
    ).toUpperCase();
    const currentBookingStatus = String(
      booking.bookingStatus || booking.status || "",
    ).toUpperCase();
    const currentCancellationStatus = normalizeCancellationStatus(
      booking.cancellationStatus,
      "NONE",
    );

    if (
      currentPaymentStatus === "PAID" &&
      currentBookingStatus !== "CANCELLED" &&
      currentCancellationStatus !== "APPROVED"
    ) {
      if (found.type !== "booking") {
        return res.status(400).json({
          message:
            "Only confirmed Booking records can be synced to payments. This record is an enquiry.",
        });
      }

      syncedPayment = await syncPaymentFromPaidBooking({
        booking,
        req,
      });
    }

    await booking.save();

    const nextBookingStatus = String(
      booking.bookingStatus || booking.status || "PENDING",
    ).toUpperCase();

    const nextPaymentStatus = String(
      booking.paymentStatus || "PENDING",
    ).toUpperCase();

    const nextAttendanceStatus = String(
      booking.attendanceStatus || "PENDING",
    ).toUpperCase();

    const nextCancellationStatus = normalizeCancellationStatus(
      booking.cancellationStatus,
      "NONE",
    );

    const bookingNo = pickBookingNo(booking);
    const parentName = pickBookingParentName(booking);
    const childName = pickBookingChildName(booking);
    const activityName = pickBookingActivityName(booking);
    const amount = pickBookingAmount(booking);
    const currency = pickBookingCurrency(booking);

    const parentUserId =
      booking?.parentId?._id ||
      booking?.parentId?.id ||
      booking?.parentId ||
      null;

    const notificationTasks = [];

    if (
      previousPaymentStatus !== nextPaymentStatus &&
      nextPaymentStatus === "PAID"
    ) {
      notificationTasks.push(
        notifySuperAdmins({
          title: "Booking payment marked paid",
          message: `Academy marked booking ${bookingNo} as paid.`,
          category: "PAYMENT",
          priority: "HIGH",
          actionUrl: "/super-admin/payments",
          entityType: "PAYMENT",
          entityId: syncedPayment?._id || booking.paymentId || booking._id,
          createdByUserId: req.user?._id || req.user?.id,
          meta: {
            bookingId: String(booking._id || ""),
            bookingNo,
            academyId: String(academyId || ""),
            parentName,
            childName,
            activityName,
            amount,
            currency,
            paymentStatus: nextPaymentStatus,
            paymentId: String(syncedPayment?._id || booking.paymentId || ""),
            source: "ACADEMY_BOOKING_UPDATE",
          },
        }),
      );

      if (parentUserId && isValidObjectId(parentUserId)) {
        notificationTasks.push(
          notifyParent({
            academyId,
            recipientUserId: parentUserId,
            title: "Payment confirmed",
            message: `Your payment for booking ${bookingNo} has been confirmed.`,
            category: "PAYMENT",
            priority: "HIGH",
            actionUrl: "/parent/payments",
            entityType: "PAYMENT",
            entityId: syncedPayment?._id || booking.paymentId || booking._id,
            createdByUserId: req.user?._id || req.user?.id,
            meta: {
              bookingId: String(booking._id || ""),
              bookingNo,
              childName,
              activityName,
              amount,
              currency,
              paymentStatus: nextPaymentStatus,
              paymentId: String(syncedPayment?._id || booking.paymentId || ""),
              source: "ACADEMY_BOOKING_UPDATE",
            },
          }),
        );
      }
    }

    if (
      previousBookingStatus !== nextBookingStatus &&
      ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(nextBookingStatus)
    ) {
      if (parentUserId && isValidObjectId(parentUserId)) {
        notificationTasks.push(
          notifyParent({
            academyId,
            recipientUserId: parentUserId,
            title: `Booking ${nextBookingStatus.toLowerCase()}`,
            message: `Your booking ${bookingNo} for ${activityName} is now ${nextBookingStatus.toLowerCase()}.`,
            category: "BOOKING",
            priority: nextBookingStatus === "CANCELLED" ? "HIGH" : "NORMAL",
            actionUrl: "/parent/bookings",
            entityType: "BOOKING",
            entityId: booking._id,
            createdByUserId: req.user?._id || req.user?.id,
            meta: {
              bookingId: String(booking._id || ""),
              bookingNo,
              childName,
              activityName,
              bookingStatus: nextBookingStatus,
              previousBookingStatus,
              source: "ACADEMY_BOOKING_UPDATE",
            },
          }),
        );
      }

      notificationTasks.push(
        notifySuperAdmins({
          title: `Booking ${nextBookingStatus.toLowerCase()}`,
          message: `Academy updated booking ${bookingNo} to ${nextBookingStatus}.`,
          category: "BOOKING",
          priority: nextBookingStatus === "CANCELLED" ? "HIGH" : "NORMAL",
          actionUrl: "/super-admin/bookings",
          entityType: "BOOKING",
          entityId: booking._id,
          createdByUserId: req.user?._id || req.user?.id,
          meta: {
            bookingId: String(booking._id || ""),
            bookingNo,
            academyId: String(academyId || ""),
            parentName,
            childName,
            activityName,
            bookingStatus: nextBookingStatus,
            previousBookingStatus,
            source: "ACADEMY_BOOKING_UPDATE",
          },
        }),
      );
    }

    if (
      previousAttendanceStatus !== nextAttendanceStatus &&
      ["PRESENT", "ABSENT", "COMPLETED"].includes(nextAttendanceStatus)
    ) {
      if (parentUserId && isValidObjectId(parentUserId)) {
        notificationTasks.push(
          notifyParent({
            academyId,
            recipientUserId: parentUserId,
            title: "Attendance updated",
            message: `${childName}'s attendance for booking ${bookingNo} is now ${nextAttendanceStatus.toLowerCase()}.`,
            category: "BOOKING",
            priority: "NORMAL",
            actionUrl: "/parent/bookings",
            entityType: "BOOKING",
            entityId: booking._id,
            createdByUserId: req.user?._id || req.user?.id,
            meta: {
              bookingId: String(booking._id || ""),
              bookingNo,
              childName,
              activityName,
              attendanceStatus: nextAttendanceStatus,
              previousAttendanceStatus,
              source: "ACADEMY_BOOKING_UPDATE",
            },
          }),
        );
      }
    }

    if (previousCancellationStatus !== nextCancellationStatus) {
      if (parentUserId && isValidObjectId(parentUserId)) {
        const titleMap = {
          APPROVED: "Cancellation approved",
          REJECTED: "Cancellation rejected",
          REQUESTED: "Cancellation request received",
          NONE: "Cancellation request updated",
        };

        const messageMap = {
          APPROVED: `Your cancellation request for booking ${bookingNo} has been approved.`,
          REJECTED: `Your cancellation request for booking ${bookingNo} has been rejected.`,
          REQUESTED: `Your cancellation request for booking ${bookingNo} is under review.`,
          NONE: `Your cancellation request for booking ${bookingNo} has been updated.`,
        };

        notificationTasks.push(
          notifyParent({
            academyId,
            recipientUserId: parentUserId,
            title: titleMap[nextCancellationStatus] || "Cancellation updated",
            message:
              messageMap[nextCancellationStatus] ||
              `Cancellation status for booking ${bookingNo} is ${nextCancellationStatus}.`,
            category: "BOOKING",
            priority: ["APPROVED", "REJECTED"].includes(nextCancellationStatus)
              ? "HIGH"
              : "NORMAL",
            actionUrl: "/parent/bookings",
            entityType: "BOOKING",
            entityId: booking._id,
            createdByUserId: req.user?._id || req.user?.id,
            meta: {
              bookingId: String(booking._id || ""),
              bookingNo,
              childName,
              activityName,
              cancellationStatus: nextCancellationStatus,
              previousCancellationStatus,
              cancellationAdminNote: booking.cancellationAdminNote || "",
              source: "ACADEMY_CANCELLATION_REVIEW",
            },
          }),
        );
      }

      notificationTasks.push(
        notifySuperAdmins({
          title: `Cancellation ${nextCancellationStatus.toLowerCase()}`,
          message: `Academy updated cancellation request for booking ${bookingNo} to ${nextCancellationStatus}.`,
          category: "BOOKING",
          priority: ["APPROVED", "REJECTED"].includes(nextCancellationStatus)
            ? "HIGH"
            : "NORMAL",
          actionUrl: "/super-admin/bookings",
          entityType: "BOOKING",
          entityId: booking._id,
          createdByUserId: req.user?._id || req.user?.id,
          meta: {
            bookingId: String(booking._id || ""),
            bookingNo,
            academyId: String(academyId || ""),
            parentName,
            childName,
            activityName,
            cancellationStatus: nextCancellationStatus,
            previousCancellationStatus,
            source: "ACADEMY_CANCELLATION_REVIEW",
          },
        }),
      );
    }

    if (notificationTasks.length) {
      await Promise.allSettled(notificationTasks);
    }

    const isCancellationReview =
      req.body.cancellationStatus !== undefined ||
      req.body.cancellationRequested !== undefined ||
      req.body.cancellationAdminNote !== undefined;

    return res.json({
      message:
        isCancellationReview && nextCancellationStatus === "APPROVED"
          ? "Cancellation request approved successfully"
          : isCancellationReview && nextCancellationStatus === "REJECTED"
            ? "Cancellation request rejected successfully"
            : String(booking.paymentStatus || "").toUpperCase() === "PAID" &&
                syncedPayment
              ? "Booking updated and payment synced successfully"
              : "Booking updated successfully",
      booking: normalizeBookingForClient(booking.toObject()),
      payment: syncedPayment || null,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    next(error);
  }
});

router.delete("/bookings/:id", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const found = await findScopedBookingOrEnquiry(academyId, id);

    if (!found?.doc) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = found.doc;

    let bookingSessions = [];

    if (BookingSession) {
      bookingSessions = await BookingSession.find({
        academyId,
        bookingId: booking._id,
      }).lean();
    }

    const slotIds = collectObjectIdsFromValues(
      booking?.slotId,
      booking?.activitySlotId,
      booking?.bookingSlotId,
      booking?.selectedSlotId,
      booking?.slotIds,
      booking?.selectedSlotIds,
      booking?.slots,
      booking?.sessions,
      bookingSessions.map((item) => item?.slotId || item?.activitySlotId),
    );

    if (BookingSession) {
      await BookingSession.deleteMany({
        academyId,
        bookingId: booking._id,
      });
    }
    if (found.type === "booking") {
      await Payment.deleteMany({
        academyId,
        bookingId: booking._id,
      });
    }

    if (slotIds.length) {
      await ActivitySlot.updateMany(
        {
          academyId,
          _id: { $in: slotIds },
          bookedCount: { $gt: 0 },
        },
        {
          $inc: { bookedCount: -1 },
        },
      );
    }

    if (Notification) {
      await Notification.deleteMany({
        academyId,
        $or: [
          { bookingId: booking._id },
          { "meta.bookingId": booking._id },
          { "meta.bookingId": String(booking._id) },
        ],
      });
    }

    if (found.type === "booking" && Booking) {
      await Booking.deleteOne({ _id: booking._id, academyId });
    }

    if (found.type === "enquiry" && Enquiry) {
      await Enquiry.deleteOne({ _id: booking._id, academyId });
    }

    return res.json({
      message: "Booking deleted successfully",
      deletedId: String(booking._id),
      deletedType: found.type,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/bookings/:id/send-email", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const to = normalizeEmail(req.body?.to);
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required.",
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: "Email subject is required.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Email message is required.",
      });
    }

    const found = await findScopedBookingOrEnquiry(academyId, id);

    if (!found?.doc) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const booking = found.doc;

    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const result = await sendTemplateEmail({
      to,
      subject,
      title: safeSubject,
      preview: safeSubject,
      greeting: "Hello,",
      message: `
        <p style="white-space:pre-line;margin:0;">${safeMessage}</p>
      `,
      buttonText: "Open KidGage",
      buttonUrl: process.env.CLIENT_URL || "http://localhost:5173",
      footer: "Thank you for using KidGage.",
    });

    return res.json({
      success: true,
      message: "Email sent successfully.",
      bookingId: String(booking._id),
      bookingType: found.type,
      result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/enquiries", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const enquiries = await getEnquiriesForAcademy(academyId, 100);

    return res.json({
      count: enquiries.length,
      enquiries: enquiries.map(normalizeBookingForClient),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PAYMENTS                                                                   */
/* -------------------------------------------------------------------------- */

router.get("/payments", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 100, 300);
    const skip = (page - 1) * limit;

    const filter = { academyId };

    const paymentStatus = normalizeStatus(
      req.query.paymentStatus || req.query.status,
    );
    if (paymentStatus && paymentStatus !== "ALL") {
      filter.paymentStatus = paymentStatus;
    }

    const settlementStatus = normalizeStatus(req.query.settlementStatus);
    if (settlementStatus && settlementStatus !== "ALL") {
      filter.settlementStatus = settlementStatus;
    }

    const method = normalizeStatus(req.query.paymentMethod || req.query.method);
    if (method && method !== "ALL") {
      filter.paymentMethod = method;
    }

    const createdAt = buildDateRangeFilter(req.query);
    if (createdAt) filter.createdAt = createdAt;

    const search = String(req.query.search || req.query.q || "").trim();

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filter.$or = [
        { bookingNo: regex },
        { parentName: regex },
        { activityName: regex },
        { packageName: regex },
        { gatewayPaymentId: regex },
        { gatewayOrderId: regex },
        { gatewayReference: regex },
        { "meta.parentName": regex },
        { "meta.parentEmail": regex },
      ];
    }

    const [payments, total, totalsRaw] = await Promise.all([
      Payment.find(filter)
        .populate("academyId", "name slug city logo")
        .populate(
          "bookingId",
          "bookingNo referenceNo invoiceNo bookingStatus status paymentStatus activityName packageName activitySnapshot packageSnapshot",
        )
        .populate("parentId", "fullName name email phone")
        .populate("childId", "fullName name")
        .populate("activityId", "title name")
        .populate("packageId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$amount", 0],
              },
            },
            readySettlementAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$settlementStatus", "READY"] },
                  "$academyPayableAmount",
                  0,
                ],
              },
            },
            settledAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$settlementStatus", "PAID_TO_ACADEMY"] },
                  "$academyPayableAmount",
                  0,
                ],
              },
            },
            commissionAmount: { $sum: "$kidgageCommissionAmount" },
            academyPayableAmount: { $sum: "$academyPayableAmount" },
            count: { $sum: 1 },
            paidCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "PAID"] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "PENDING"] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "FAILED"] }, 1, 0] },
            },
            readySettlementCount: {
              $sum: { $cond: [{ $eq: ["$settlementStatus", "READY"] }, 1, 0] },
            },
            settledCount: {
              $sum: {
                $cond: [
                  { $eq: ["$settlementStatus", "PAID_TO_ACADEMY"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totals = totalsRaw?.[0] || {};

    return res.json({
      count: payments.length,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      totals: {
        totalAmount: toMoney(totals.totalAmount, 0),
        paidAmount: toMoney(totals.paidAmount, 0),
        readySettlementAmount: toMoney(totals.readySettlementAmount, 0),
        settledAmount: toMoney(totals.settledAmount, 0),
        commissionAmount: toMoney(totals.commissionAmount, 0),
        academyPayableAmount: toMoney(totals.academyPayableAmount, 0),
        count: totals.count || 0,
        paidCount: totals.paidCount || 0,
        pendingCount: totals.pendingCount || 0,
        failedCount: totals.failedCount || 0,
        readySettlementCount: totals.readySettlementCount || 0,
        settledCount: totals.settledCount || 0,
        currency: "QAR",
      },
      payments: payments.map(normalizePaymentForAcademy),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/payments/:id", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findOne({ _id: id, academyId })
      .populate("academyId", "name slug city logo")
      .populate(
        "bookingId",
        "bookingNo referenceNo invoiceNo bookingStatus status paymentStatus activityName packageName activitySnapshot packageSnapshot",
      )
      .populate("parentId", "fullName name email phone")
      .populate("childId", "fullName name")
      .populate("activityId", "title name")
      .populate("packageId", "title")
      .lean();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json({
      payment: normalizePaymentForAcademy(payment),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* SETTLEMENTS                                                                */
/* -------------------------------------------------------------------------- */

router.get("/settlement-summary", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const match = {
      academyId: new mongoose.Types.ObjectId(String(academyId)),
      paymentReceiver: "KIDGAGE",
      paymentStatus: "PAID",
      settlementStatus: "READY",
    };

    const createdAt = buildDateRangeFilter(req.query);
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
    ]);

    const row = rows?.[0] || null;

    return res.json({
      count: row ? 1 : 0,
      summary: row
        ? {
            academyId: row._id,
            totalCollected: toMoney(row.totalCollected, 0),
            kidgageCommissionTotal: toMoney(row.kidgageCommissionTotal, 0),
            academyPayableTotal: toMoney(row.academyPayableTotal, 0),
            paymentCount: row.paymentCount || 0,
            paymentIds: row.paymentIds || [],
            currency: "QAR",
            firstPaymentAt: row.firstPaymentAt || null,
            lastPaymentAt: row.lastPaymentAt || null,
          }
        : {
            academyId,
            totalCollected: 0,
            kidgageCommissionTotal: 0,
            academyPayableTotal: 0,
            paymentCount: 0,
            paymentIds: [],
            currency: "QAR",
            firstPaymentAt: null,
            lastPaymentAt: null,
          },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/settlements", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 50, 200);
    const skip = (page - 1) * limit;

    const filter = { academyId };

    const status = normalizeStatus(req.query.status);
    if (status && status !== "ALL") {
      filter.status = status;
    }

    const createdAt = buildDateRangeFilter(req.query);
    if (createdAt) filter.createdAt = createdAt;

    const [settlements, total, totalsRaw] = await Promise.all([
      AcademySettlement.find(filter)
        .populate("academyId", "name city logo")
        .populate("settledBy", "fullName name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AcademySettlement.countDocuments(filter),
      AcademySettlement.aggregate([
        {
          $match: { academyId: new mongoose.Types.ObjectId(String(academyId)) },
        },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: "$totalCollected" },
            kidgageCommissionTotal: { $sum: "$kidgageCommissionTotal" },
            academyPayableTotal: { $sum: "$academyPayableTotal" },
            settlementCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totals = totalsRaw?.[0] || {};

    return res.json({
      count: settlements.length,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      totals: {
        totalCollected: toMoney(totals.totalCollected, 0),
        kidgageCommissionTotal: toMoney(totals.kidgageCommissionTotal, 0),
        academyPayableTotal: toMoney(totals.academyPayableTotal, 0),
        settlementCount: totals.settlementCount || 0,
        currency: "QAR",
      },
      settlements: settlements.map(normalizeSettlementForAcademy),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/settlements/:id", async (req, res, next) => {
  try {
    const academyId = pickAcademyId(req);
    const { id } = req.params;

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Invalid academy id" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid settlement id" });
    }

    const settlement = await AcademySettlement.findOne({ _id: id, academyId })
      .populate("academyId", "name city logo email phone")
      .populate("settledBy", "fullName name email")
      .populate({
        path: "paymentIds",
        populate: [
          {
            path: "bookingId",
            select: "bookingNo referenceNo invoiceNo bookingStatus status",
          },
          { path: "parentId", select: "fullName name email phone" },
          { path: "childId", select: "fullName name" },
          { path: "activityId", select: "title name" },
          { path: "packageId", select: "title" },
        ],
      })
      .lean();

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    return res.json({
      settlement: normalizeSettlementForAcademy(settlement),
      payments: Array.isArray(settlement.paymentIds)
        ? settlement.paymentIds.map(normalizePaymentForAcademy)
        : [],
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* CATEGORIES                                                                 */
/* -------------------------------------------------------------------------- */

router.get("/categories", async (_req, res, next) => {
  try {
    if (Category) {
      const categories = await Category.find({
        status: { $ne: "INACTIVE" },
      })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

      return res.json({
        count: categories.length,
        categories: categories.map((item) => ({
          _id: item._id,
          id: item._id,
          name: item.name || "",
          title: item.name || "",
          slug: item.slug || "",
          status: item.status || "ACTIVE",
          createdAt: item.createdAt || null,
        })),
      });
    }

    return res.json({
      count: 0,
      categories: [],
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PASSWORD                                                                   */
/* -------------------------------------------------------------------------- */

router.put("/change-password", async (req, res, next) => {
  try {
    const userId = req?.user?._id || req?.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmPassword = String(req.body.confirmPassword || newPassword);

    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "ACADEMY_ADMIN") {
      return res.status(403).json({
        message: "Only academy admins can change password here",
      });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash || "");

    if (!ok) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash || "",
    );

    if (samePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as current password",
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.tempPassword = "";

    await user.save();

    return res.json({
      message: "Password updated successfully",
      mustChangePassword: false,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

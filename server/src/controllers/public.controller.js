// server/src/controllers/public.controller.js
import mongoose from "mongoose";
import crypto from "crypto";
import { z } from "zod";

import Academy from "../models/Academy.js";
import Activity from "../models/Activity.js";
import ActivitySlot from "../models/ActivitySlot.js";
import ActivityPackage from "../models/ActivityPackage.js";
import Category from "../models/Category.js";
import Booking from "../models/Booking.js";
import Counter from "../models/Counter.js";
import Payment from "../models/Payment.js";

import { notifyBookingCreated } from "../services/notification.service.js";
import { sendGuestBookingCreatedEmail } from "../services/emailTrigger.service.js";

const eventPosterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

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

const EventPoster =
  mongoose.models.EventPoster ||
  mongoose.model("EventPoster", eventPosterSchema);

const News = mongoose.models.News || mongoose.model("News", newsSchema);

const guestBookingSchema = z
  .object({
    packageId: z.string().min(1),
    bookingMode: z.enum(["STRAIGHT", "FLEXIBLE"]),
    paymentMethod: z.enum(["CASH", "ONLINE"]).optional().default("ONLINE"),
    slotId: z.string().optional(),
    slotIds: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),
    guestParent: z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
    }),
    guestChild: z.object({
      fullName: z.string().min(2),
      dob: z.string().min(1),
      gender: z.enum(["BOY", "GIRL"]),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.bookingMode === "STRAIGHT" && !data.slotId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slotId"],
        message: "slotId is required for STRAIGHT booking",
      });
    }

    if (
      data.bookingMode === "FLEXIBLE" &&
      (!Array.isArray(data.slotIds) || data.slotIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slotIds"],
        message: "slotIds are required for FLEXIBLE booking",
      });
    }
  });

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeId(value) {
  return String(value || "").trim();
}

function formatYmd(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function calcAge(dob) {
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age < 0 ? 0 : age;
}

function formatZodError(error) {
  if (!error?.issues?.length) return "Validation failed";

  return error.issues
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "field";
      return `${path}: ${issue.message}`;
    })
    .join(", ");
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100) / 100;
}

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function badRequest(message) {
  return new ApiError(400, message);
}

function notFound(message) {
  return new ApiError(404, message);
}

function conflict(message) {
  return new ApiError(409, message);
}

function handlePublicControllerError(error, res, next) {
  if (error?.issues) {
    return res.status(400).json({
      success: false,
      message: formatZodError(error),
      errors: error.issues,
    });
  }

  if (error instanceof ApiError || Number(error?.statusCode || 0) > 0) {
    return res.status(Number(error.statusCode || 400)).json({
      success: false,
      message: error.message || "Request failed",
    });
  }

  if (error instanceof Error && error.message) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
}

function uniqueIds(ids = []) {
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

async function assertSlotStillAvailable(slot, session = null) {
  if (!slot) {
    throw conflict("Selected slot is no longer available");
  }

  if (slot.active === false) {
    throw conflict("Selected slot is inactive");
  }

  const status = normalizeUpper(slot.status || "OPEN", "OPEN");

  if (["CLOSED", "CANCELLED", "FULL"].includes(status)) {
    throw conflict("Selected slot is not available");
  }

  const capacity = Number(slot.capacity || 0);

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw conflict("Selected slot has no available capacity");
  }

  const bookedCount = await getSlotBookedCount(slot, session);

  if (bookedCount >= capacity) {
    throw conflict(
      `Slot ${slot.startTime || ""}${slot.endTime ? ` - ${slot.endTime}` : ""} is already full`,
    );
  }

  return true;
}

async function resolveGuestSelectedSlots({
  session,
  activity,
  activityPackage,
  bookingModeUi,
  slotId,
  slotIds,
}) {
  const requiredSessions = getRequiredSessionCount(activityPackage, activity);

  if (bookingModeUi === "STRAIGHT") {
    const firstSlot = await ActivitySlot.findById(slotId).session(session);

    if (!firstSlot) {
      throw notFound("Selected starting slot not found");
    }

    if (normalizeId(firstSlot.activityId) !== normalizeId(activity._id)) {
      throw badRequest("Selected slot does not belong to this activity");
    }

    if (normalizeId(firstSlot.packageId) !== normalizeId(activityPackage._id)) {
      throw badRequest("Selected slot does not belong to this package");
    }

    await assertSlotStillAvailable(firstSlot, session);

    const candidateSlots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: true,
      status: { $in: ["OPEN", "FULL"] },
      date: { $gte: firstSlot.date },
    })
      .sort({ date: 1, startTime: 1 })
      .session(session);

    const orderedCandidates = sortSlotsChronologically(candidateSlots);

    const startIndex = orderedCandidates.findIndex(
      (slot) => normalizeId(slot._id) === normalizeId(firstSlot._id),
    );

    if (startIndex === -1) {
      throw conflict("Unable to locate selected slot in sequence");
    }

    const sequence = [];

    for (let i = startIndex; i < orderedCandidates.length; i += 1) {
      const slot = orderedCandidates[i];

      if (
        normalizeId(slot.activityId) === normalizeId(activity._id) &&
        normalizeId(slot.packageId) === normalizeId(activityPackage._id) &&
        (await isSlotBookable(slot, session))
      ) {
        sequence.push(slot);
      }

      if (sequence.length === requiredSessions) break;
    }

    if (sequence.length !== requiredSessions) {
      throw conflict(
        "Not enough available sessions for this straight booking package",
      );
    }

    for (const slot of sequence) {
      await assertSlotStillAvailable(slot, session);
    }

    return {
      selectedSlots: sequence,
      requiredSessions,
    };
  }

  const originalSlotIds = (slotIds || []).map((id) => String(id || "").trim());
  const uniqueSlotIds = uniqueIds(originalSlotIds);

  if (uniqueSlotIds.length === 0) {
    throw badRequest("Please select at least one slot");
  }

  if (uniqueSlotIds.length !== originalSlotIds.length) {
    throw badRequest("Duplicate slots are not allowed");
  }

  if (uniqueSlotIds.length !== requiredSessions) {
    throw badRequest(
      `Please select exactly ${requiredSessions} sessions for this package`,
    );
  }

  const fetchedSlots = await ActivitySlot.find({
    _id: { $in: uniqueSlotIds.map((id) => toObjectId(id)) },
    activityId: activity._id,
    packageId: activityPackage._id,
  }).session(session);

  if (fetchedSlots.length !== uniqueSlotIds.length) {
    throw badRequest("One or more selected slots are invalid");
  }

  const orderedSlots = sortSlotsChronologically(fetchedSlots);

  for (const slot of orderedSlots) {
    await assertSlotStillAvailable(slot, session);
  }

  return {
    selectedSlots: orderedSlots,
    requiredSessions,
  };
}

function calculateKidgageCommission(amount) {
  const safeAmount = toMoney(amount, 0);

  const type = normalizeUpper(
    process.env.KIDGAGE_COMMISSION_TYPE || "PERCENTAGE",
    "PERCENTAGE",
  );

  const value = Number(process.env.KIDGAGE_COMMISSION_VALUE || 10);

  let commission = 0;

  if (type === "FIXED") {
    commission = value;
  } else {
    commission = (safeAmount * value) / 100;
  }

  commission = Math.min(safeAmount, Math.max(0, commission));

  return {
    kidgageCommissionType: type === "FIXED" ? "FIXED" : "PERCENTAGE",
    kidgageCommissionValue: Number.isFinite(value) && value >= 0 ? value : 10,
    kidgageCommissionAmount: toMoney(commission, 0),
    academyPayableAmount: toMoney(safeAmount - commission, 0),
  };
}

function getBookingAmountForPayment(booking, fallbackAmount = 0) {
  return toMoney(
    booking?.finalAmount ||
      booking?.totalAmount ||
      booking?.payableAmount ||
      booking?.amount ||
      booking?.price ||
      booking?.packageSnapshot?.price ||
      booking?.activitySnapshot?.price ||
      fallbackAmount,
    0,
  );
}

function getGuestParentCustomer(booking) {
  const guest = booking?.guestParent || booking?.guestParentSnapshot || {};

  return {
    _id: null,
    fullName:
      guest.fullName || guest.name || booking?.parentName || "KidGage Guest",
    name:
      guest.fullName || guest.name || booking?.parentName || "KidGage Guest",
    email: guest.email || booking?.parentEmail || "",
    phone: guest.phone || guest.mobile || booking?.parentPhone || "",
    mobile: guest.mobile || guest.phone || booking?.parentPhone || "",
  };
}

function getGuestChildCustomer(booking) {
  const child = booking?.guestChild || booking?.guestChildSnapshot || {};

  return {
    _id: null,
    fullName:
      child.fullName || child.name || booking?.childName || "KidGage Child",
    name: child.fullName || child.name || booking?.childName || "KidGage Child",
  };
}

function buildGuestPaymentPageUrl(booking) {
  const bookingId = String(booking?._id || "");
  const guestToken = String(booking?.guestPaymentToken || "");

  if (!bookingId) return "";

  const params = new URLSearchParams();

  if (guestToken) {
    params.set("guestToken", guestToken);
  }

  const query = params.toString();

  return `/payment/myfatoorah/${bookingId}${query ? `?${query}` : ""}`;
}

async function generateBookingNo() {
  const prefix = "KG";
  const date = new Date();

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const dayPrefix = `${prefix}-${y}${m}${d}`;
  const counterKey = `booking:${dayPrefix}`;

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    const bookingNo = `${dayPrefix}-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Booking.exists({ bookingNo });

    if (!exists) {
      return bookingNo;
    }
  }

  const randomSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${dayPrefix}-${randomSuffix}`;
}

function sortSlotsChronologically(slots) {
  return [...slots].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

async function expirePendingBookingsSafe(session = null) {
  if (typeof Booking.expirePendingBookings !== "function") return null;

  return Booking.expirePendingBookings({
    session,
  });
}

async function getSlotBookedCount(slot, session = null) {
  if (!slot?._id || !slot?.date) return 0;

  if (typeof Booking.countSlotBookings === "function") {
    return Booking.countSlotBookings({
      slotId: slot._id,
      date: slot.date,
      session,
    });
  }

  const slotId = new mongoose.Types.ObjectId(String(slot._id));
  const slotDate = startOfDay(slot.date);

  const query = Booking.countDocuments({
    $and: [
      {
        paymentStatus: { $nin: ["FAILED", "CANCELLED", "REFUNDED"] },
      },
      {
        $or: [
          { bookingStatus: { $in: ["CONFIRMED", "PARTIALLY_BOOKED"] } },
          {
            bookingStatus: "PENDING",
            expiresAt: { $gt: new Date() },
          },
        ],
      },
      {
        $or: [
          {
            initialSlotId: slotId,
            firstSessionDate: slotDate,
          },
          {
            bookedSlotItems: {
              $elemMatch: {
                slotId,
                date: slotDate,
                status: { $ne: "CANCELLED" },
              },
            },
          },
        ],
      },
    ],
  });

  if (session) query.session(session);

  return query;
}

async function isSlotBookable(slot, session = null) {
  if (!slot) return false;
  if (slot.active === false) return false;

  const status = String(slot.status || "OPEN").toUpperCase();

  if (["CLOSED", "CANCELLED"].includes(status)) {
    return false;
  }

  const capacity = Number(slot.capacity || 0);

  if (capacity <= 0) {
    return false;
  }

  const bookedCount = await getSlotBookedCount(slot, session);

  return bookedCount < capacity;
}

function normalizeSlot(item, availability = {}) {
  const capacity = Number(item.capacity || 0);

  const bookedCount =
    availability.bookedCount === undefined
      ? Number(item.bookedCount || 0)
      : Number(availability.bookedCount || 0);

  const availableCount = Math.max(0, capacity - bookedCount);
  const rawStatus = String(item.status || "OPEN").toUpperCase();

  const status =
    rawStatus === "CANCELLED" || rawStatus === "CLOSED"
      ? rawStatus
      : availableCount <= 0
        ? "FULL"
        : "OPEN";

  return {
    _id: item._id,
    id: item._id,
    academyId: item.academyId || null,
    activityId: item.activityId || null,
    packageId: item.packageId || null,
    branchId: item.branchId || null,

    date: item.date || null,
    slotDate: item.date || null,

    startTime: item.startTime || "",
    endTime: item.endTime || "",
    sessionLabel: item.sessionLabel || "",

    capacity,
    bookedCount,
    waitlistCount: Number(item.waitlistCount || 0),

    status,
    rawStatus,
    active: item.active !== false,

    availableCount,
    isAvailable:
      item.active !== false &&
      status === "OPEN" &&
      capacity > 0 &&
      availableCount > 0,

    isFull:
      availableCount <= 0 ||
      status === "FULL" ||
      status === "CLOSED" ||
      status === "CANCELLED",

    priceOverride:
      item.priceOverride === null || item.priceOverride === undefined
        ? null
        : Number(item.priceOverride),

    notes: item.notes || "",
  };
}

async function normalizeSlotWithLiveAvailability(slot, session = null) {
  const bookedCount = await getSlotBookedCount(slot, session);

  return normalizeSlot(slot, {
    bookedCount,
  });
}

async function incrementSlotInventory(_slot, _session) {
  // Deprecated intentionally.
  // Availability is calculated from active Booking documents instead of
  // permanently increasing ActivitySlot.bookedCount for unpaid pending bookings.
  return null;
}

function getRequiredSessionCount(activityPackage, activity = null) {
  const sessionCount = Number(activityPackage?.sessionCount || 0);
  if (sessionCount > 0) return sessionCount;

  const maxSelectable = Number(activityPackage?.maxSelectableSessions || 0);
  if (maxSelectable > 0) return maxSelectable;

  const durationUnit = String(
    activityPackage?.durationUnit || "",
  ).toUpperCase();

  const durationValue = Number(activityPackage?.durationValue || 0);

  if (durationUnit === "SESSION" && durationValue > 0) {
    return durationValue;
  }

  if (durationUnit === "MONTH" && durationValue > 0) {
    const activitySessions = Number(
      activity?.totalSessions || activity?.sessionCount || 0,
    );

    if (activitySessions > 0) return activitySessions;

    return 1;
  }

  const fallbackFromActivity = Number(
    activity?.totalSessions || activity?.sessionCount || 0,
  );

  if (fallbackFromActivity > 0) return fallbackFromActivity;

  return 1;
}

function ensureChildFitsActivity(childAge, activity) {
  const minAge = Number(activity?.minAge || 0);
  const maxAge = Number(activity?.maxAge || 0);

  if (Number.isFinite(minAge) && minAge > 0 && childAge < minAge) {
    throw badRequest("Child does not meet the minimum age requirement");
  }

  if (Number.isFinite(maxAge) && maxAge > 0 && childAge > maxAge) {
    throw badRequest("Child exceeds the maximum age limit");
  }
}

function normalizeAllowedBookingMode(activity, requestedMode) {
  const allowed = String(activity?.bookingMode || "BOTH").toUpperCase();
  const requested = String(requestedMode || "").toUpperCase();

  if (!["STRAIGHT", "FLEXIBLE"].includes(requested)) {
    throw badRequest("Invalid booking mode");
  }

  if (allowed === "BOTH") return requested;
  if (allowed === requested) return requested;

  throw badRequest(`This activity only allows ${allowed} booking`);
}

function normalizePosterEvent(item) {
  return {
    _id: item._id,
    id: item._id,
    slug: String(item._id),
    title: item.title || "",
    name: item.title || "",
    description: item.description || "",
    image: item.image || "",
    poster: item.image || "",
    eventDate: item.startDate || "",
    date: item.startDate || "",
    startDate: item.startDate || "",
    endDate: item.endDate || "",
    venue: "Doha",
    city: "Doha",
    location: "Doha",
    active: Boolean(item.active),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeNews(item) {
  return {
    _id: item._id,
    id: item._id,
    slug: String(item._id),
    title: item.title || "",
    excerpt: item.description || "",
    description: item.description || "",
    image: item.image || "",
    thumbnail: item.image || "",
    coverImage: item.image || "",
    date: item.date || item.createdAt || "",
    active: Boolean(item.active),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function normalizeModes(item) {
  if (Array.isArray(item?.modes) && item.modes.length) return item.modes;
  if (Array.isArray(item?.classModes) && item.classModes.length) {
    return item.classModes;
  }
  if (Array.isArray(item?.modeOfClasses) && item.modeOfClasses.length) {
    return item.modeOfClasses;
  }
  return [];
}

function normalizeActivityCard(item) {
  const raw = typeof item.toObject === "function" ? item.toObject() : item;
  const bookingConfig = raw?.bookingConfig || {};

  return {
    ...raw,
    academy: raw.academyId
      ? {
          _id: raw.academyId._id,
          name: raw.academyId.name,
          slug: raw.academyId.slug,
          logo: raw.academyId.logo || "",
          address: raw.academyId.address || "",
          city: raw.academyId.city || "",
        }
      : null,
    academyName: raw.academyId?.name || "",
    category: raw.categoryId
      ? {
          _id: raw.categoryId._id,
          name: raw.categoryId.name,
          slug: raw.categoryId.slug,
          emoji: raw.categoryId.emoji || raw.categoryId.icon || "🎯",
          image: raw.categoryId.image || "",
          bg: raw.categoryId.bg || "#ece8dc",
        }
      : null,
    categoryName:
      raw.categoryId?.name || raw.categoryName || raw.category || "",
    categorySlug: raw.categoryId?.slug || "",
    image:
      raw.image || raw.bannerImage || raw.coverImage || raw.images?.[0] || "",
    bannerImage:
      raw.bannerImage || raw.image || raw.coverImage || raw.images?.[0] || "",
    coverImage:
      raw.coverImage || raw.bannerImage || raw.image || raw.images?.[0] || "",
    modes: normalizeModes(raw),
    fees: raw.fees || raw.price || raw.basePrice || "",
    basePrice: Number(raw.basePrice || raw.price || 0),
    bookingMode: raw.bookingMode || bookingConfig.bookingMode || "BOTH",
    packageType: raw.packageType || bookingConfig.packageType || "SESSIONS",
    totalSessions: Number(
      raw.totalSessions || raw.sessionCount || bookingConfig.totalSessions || 0,
    ),
    totalWeeks: Number(
      raw.totalWeeks || raw.weekCount || bookingConfig.totalWeeks || 0,
    ),
    sessionsPerWeek: Number(
      raw.sessionsPerWeek || bookingConfig.sessionsPerWeek || 0,
    ),
    slotDurationMinutes: Number(
      raw.slotDurationMinutes || bookingConfig.slotDurationMinutes || 60,
    ),
    defaultCapacity: Number(
      raw.defaultCapacity || raw.capacity || bookingConfig.defaultCapacity || 1,
    ),
    allowWaitlist:
      typeof raw.allowWaitlist === "boolean"
        ? raw.allowWaitlist
        : Boolean(bookingConfig.allowWaitlist),
  };
}

function normalizePackage(item) {
  const bookingPattern = item.bookingPattern || item.bookingMode || "BOTH";

  return {
    _id: item._id,
    id: item._id,
    title: item.title || "",
    packageType: item.packageType || "MONTHLY",
    durationValue: Number(item.durationValue || 0),
    durationUnit: item.durationUnit || "MONTH",
    sessionCount: Number(item.sessionCount || 0),
    validityDays: Number(item.validityDays || 0),
    minSelectableSessions: Number(item.minSelectableSessions || 0),
    maxSelectableSessions: Number(item.maxSelectableSessions || 0),
    bookingPattern,
    bookingMode: bookingPattern,
    description: item.description || "",
    price: Number(item.price || 0),
    currency: item.currency || "QAR",
    isDefault: Boolean(item.isDefault),
    active: item.active !== false,
    displayOrder: Number(item.displayOrder || 0),
  };
}

function getMonthRange(month) {
  const raw = String(month || "").trim();

  if (!/^\d{4}-\d{2}$/.test(raw)) {
    return null;
  }

  const [year, mon] = raw.split("-").map(Number);

  if (!year || !mon || mon < 1 || mon > 12) {
    return null;
  }

  return {
    from: new Date(year, mon - 1, 1, 0, 0, 0, 0),
    to: new Date(year, mon, 0, 23, 59, 59, 999),
  };
}

function getAllowedDateWindow(activity) {
  const today = startOfDay(new Date());

  let from =
    activity?.bookingStartDate ||
    activity?.startDate ||
    activity?.dateFrom ||
    today;

  let to =
    activity?.bookingEndDate ||
    activity?.endDate ||
    activity?.dateTo ||
    addDays(today, 120);

  from = startOfDay(from);
  to = endOfDay(to);

  if (to < from) {
    to = endOfDay(from);
  }

  return { from, to };
}

async function getPublishedActivityBySlug(slug, withPopulate = false) {
  const query = Activity.findOne({
    slug,
    status: "PUBLISHED",
  });

  if (withPopulate) {
    query.populate("academyId categoryId");
  }

  return query;
}

async function getActivePackagesForActivity(activityId) {
  return ActivityPackage.find({
    activityId,
    active: true,
  }).sort({ isDefault: -1, displayOrder: 1, createdAt: 1 });
}

export async function home(_req, res, next) {
  try {
    const [featuredAcademies, topActivities, newsItems, events] =
      await Promise.all([
        Academy.find({ status: "ACTIVE" })
          .sort({ isFeatured: -1, featured: -1, createdAt: -1 })
          .limit(8),

        Activity.find({ status: "PUBLISHED" })
          .sort({ featured: -1, createdAt: -1 })
          .limit(8)
          .populate("academyId categoryId"),

        News.find({ active: true })
          .sort({ date: -1, createdAt: -1 })
          .limit(6)
          .lean(),

        EventPoster.find({ active: true })
          .sort({ startDate: 1, createdAt: -1 })
          .limit(6)
          .lean(),
      ]);

    return res.json({
      featuredAcademies,
      topActivities: topActivities.map(normalizeActivityCard),
      blogs: newsItems.map(normalizeNews),
      events: events.map(normalizePosterEvent),
    });
  } catch (error) {
    next(error);
  }
}

export async function listAcademies(req, res, next) {
  try {
    const { q = "" } = req.query;

    const filter = {
      status: "ACTIVE",
      ...(q
        ? {
            name: { $regex: escapeRegex(q), $options: "i" },
          }
        : {}),
    };

    const academies = await Academy.find(filter).sort({
      isFeatured: -1,
      featured: -1,
      createdAt: -1,
    });

    return res.json({ academies });
  } catch (error) {
    next(error);
  }
}

export async function academyDetails(req, res, next) {
  try {
    const academy = await Academy.findOne({
      slug: req.params.slug,
      status: "ACTIVE",
    });

    return res.json({ academy });
  } catch (error) {
    next(error);
  }
}

export async function listActivities(req, res, next) {
  try {
    const { academyId, age, q = "", category = "" } = req.query;

    const filter = {
      status: "PUBLISHED",
      ...(academyId ? { academyId } : {}),
    };

    if (age) {
      filter.minAge = { $lte: Number(age) };
      filter.maxAge = { $gte: Number(age) };
    }

    if (category) {
      const categoryDoc = await Category.findOne({
        slug: String(category).trim(),
        status: "ACTIVE",
      }).select("_id");

      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      } else {
        return res.json({ activities: [] });
      }
    }

    let activities = await Activity.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .populate("academyId categoryId");

    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");

      activities = activities.filter((item) => {
        const title = item?.title || "";
        const academyName = item?.academyId?.name || "";
        const categoryName =
          item?.categoryId?.name || item?.categoryName || item?.category || "";

        return (
          regex.test(title) ||
          regex.test(academyName) ||
          regex.test(categoryName)
        );
      });
    }

    return res.json({ activities: activities.map(normalizeActivityCard) });
  } catch (error) {
    next(error);
  }
}

export async function activityDetails(req, res, next) {
  try {
    const activity = await getPublishedActivityBySlug(req.params.slug, true);

    if (!activity) {
      return res
        .status(404)
        .json({ activity: null, message: "Activity not found" });
    }

    const packages = await getActivePackagesForActivity(activity._id);

    return res.json({
      activity: normalizeActivityCard(activity),
      packages: packages.map(normalizePackage),
    });
  } catch (error) {
    next(error);
  }
}

export async function getActivityBookingData(req, res, next) {
  try {
    await expirePendingBookingsSafe();

    const activity = await getPublishedActivityBySlug(req.params.slug, true);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const packages = await getActivePackagesForActivity(activity._id);

    return res.json({
      activity: normalizeActivityCard(activity),
      academy: activity.academyId
        ? {
            _id: activity.academyId._id,
            name: activity.academyId.name,
            slug: activity.academyId.slug,
            logo: activity.academyId.logo || "",
            address: activity.academyId.address || "",
            city: activity.academyId.city || "",
          }
        : null,
      category: activity.categoryId
        ? {
            _id: activity.categoryId._id,
            name: activity.categoryId.name,
            slug: activity.categoryId.slug,
            emoji:
              activity.categoryId.emoji || activity.categoryId.icon || "🎯",
            image: activity.categoryId.image || "",
            bg: activity.categoryId.bg || "#ece8dc",
          }
        : null,
      packages: packages.map(normalizePackage),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAvailableDates(req, res, next) {
  try {
    const { slug } = req.params;
    const { packageId, month } = req.query;

    if (!packageId || !isValidObjectId(packageId)) {
      return res.status(400).json({ message: "Valid packageId is required" });
    }

    const requestedMonthRange = getMonthRange(month);

    if (!requestedMonthRange) {
      return res.status(400).json({
        message: "Valid month is required in YYYY-MM format",
      });
    }

    await expirePendingBookingsSafe();

    const activity = await getPublishedActivityBySlug(slug, false);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const activityPackage = await ActivityPackage.findOne({
      _id: packageId,
      activityId: activity._id,
      active: true,
    }).lean();

    if (!activityPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    const slots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: true,
      status: { $in: ["OPEN", "FULL", "CLOSED", "CANCELLED"] },
      date: {
        $gte: requestedMonthRange.from,
        $lte: requestedMonthRange.to,
      },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    const grouped = new Map();

    for (const slot of slots) {
      const key = formatYmd(slot.date);
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          slotCount: 0,
          availableCount: 0,
          isAvailable: false,
        });
      }

      const row = grouped.get(key);
      const normalized = await normalizeSlotWithLiveAvailability(slot);

      row.slotCount += 1;
      row.availableCount += normalized.availableCount;

      if (normalized.isAvailable) {
        row.isAvailable = true;
      }
    }

    return res.json({
      activityId: activity._id,
      packageId: activityPackage._id,
      bookingMode: activity.bookingMode || "BOTH",
      package: normalizePackage(activityPackage),
      dates: Array.from(grouped.values()).sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getSlotsByDate(req, res, next) {
  try {
    const { slug } = req.params;
    const { packageId, date } = req.query;

    if (!packageId || !isValidObjectId(packageId) || !date) {
      return res.status(400).json({
        message: "Valid packageId and date are required",
      });
    }

    await expirePendingBookingsSafe();

    const activity = await getPublishedActivityBySlug(slug, false);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const activityPackage = await ActivityPackage.findOne({
      _id: packageId,
      activityId: activity._id,
      active: true,
    }).lean();

    if (!activityPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    const from = startOfDay(date);
    const to = endOfDay(date);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    const slots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: true,
      status: { $in: ["OPEN", "FULL", "CLOSED", "CANCELLED"] },
      date: {
        $gte: from,
        $lte: to,
      },
    })
      .sort({ startTime: 1, endTime: 1 })
      .lean();

    const normalizedSlots = [];

    for (const slot of slots) {
      normalizedSlots.push(await normalizeSlotWithLiveAvailability(slot));
    }

    return res.json({
      activityId: activity._id,
      packageId: activityPackage._id,
      date: formatYmd(from),
      slots: normalizedSlots,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFlexibleDateRange(req, res, next) {
  try {
    const { slug } = req.params;
    const { packageId, fromDate, toDate } = req.query;

    if (!packageId || !fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "packageId, fromDate and toDate are required" });
    }

    await expirePendingBookingsSafe();

    const activity = await getPublishedActivityBySlug(slug, false);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const activityPackage = await ActivityPackage.findOne({
      _id: packageId,
      activityId: activity._id,
      active: true,
    }).lean();

    if (!activityPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    let from = startOfDay(fromDate);
    let to = endOfDay(toDate);

    const allowedWindow = getAllowedDateWindow(activity);

    if (from < allowedWindow.from) from = allowedWindow.from;
    if (to > allowedWindow.to) to = allowedWindow.to;

    const slots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: true,
      status: { $in: ["OPEN", "FULL", "CLOSED", "CANCELLED"] },
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    const grouped = new Map();

    for (const slot of slots) {
      const key = formatYmd(slot.date);
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          slotCount: 0,
          availableCount: 0,
          isAvailable: false,
          slots: [],
        });
      }

      const row = grouped.get(key);
      const normalized = await normalizeSlotWithLiveAvailability(slot);

      row.slotCount += 1;
      row.availableCount += normalized.availableCount;

      if (normalized.isAvailable) {
        row.isAvailable = true;
      }

      row.slots.push(normalized);
    }

    return res.json({
      activityId: activity._id,
      packageId: activityPackage._id,
      bookingMode: activity.bookingMode || "BOTH",
      package: normalizePackage(activityPackage),
      dates: Array.from(grouped.values()).sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function getStraightSchedulePreview(req, res, next) {
  try {
    const { slug } = req.params;
    const { packageId, fromDate, toDate, daysOfWeek } = req.query;

    if (!packageId || !fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "packageId, fromDate and toDate are required" });
    }

    await expirePendingBookingsSafe();

    const activity = await getPublishedActivityBySlug(slug, false);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const activityPackage = await ActivityPackage.findOne({
      _id: packageId,
      activityId: activity._id,
      active: true,
    }).lean();

    if (!activityPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    let from = startOfDay(fromDate);
    let to = endOfDay(toDate);

    const allowedWindow = getAllowedDateWindow(activity);

    if (from < allowedWindow.from) from = allowedWindow.from;
    if (to > allowedWindow.to) to = allowedWindow.to;

    const normalizedDays = String(daysOfWeek || "")
      .split(",")
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6);

    const slots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: true,
      status: { $in: ["OPEN", "FULL", "CLOSED", "CANCELLED"] },
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    const filtered =
      normalizedDays.length > 0
        ? slots.filter((slot) =>
            normalizedDays.includes(new Date(slot.date).getDay()),
          )
        : slots;

    const grouped = new Map();

    for (const slot of filtered) {
      const key = formatYmd(slot.date);
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          weekday: new Date(slot.date).getDay(),
          slots: [],
        });
      }

      grouped
        .get(key)
        .slots.push(await normalizeSlotWithLiveAvailability(slot));
    }

    return res.json({
      activityId: activity._id,
      packageId: activityPackage._id,
      bookingMode: activity.bookingMode || "BOTH",
      package: normalizePackage(activityPackage),
      schedule: Array.from(grouped.values()).sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function createGuestBooking(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { slug } = req.params;
    const body = guestBookingSchema.parse(req.body);

    if (!isValidObjectId(body.packageId)) {
      throw badRequest("Invalid packageId");
    }

    if (body.slotId && !isValidObjectId(body.slotId)) {
      throw badRequest("Invalid slotId");
    }

    if (
      Array.isArray(body.slotIds) &&
      body.slotIds.some((id) => !isValidObjectId(id))
    ) {
      throw badRequest("Invalid slotIds");
    }

    const activity = await getPublishedActivityBySlug(slug, false);

    if (!activity) {
      throw notFound("Activity not found");
    }

    let bookingDoc = null;
    let paymentDoc = null;

    await session.withTransaction(async () => {
      await expirePendingBookingsSafe(session);

      const activityPackage = await ActivityPackage.findOne({
        _id: body.packageId,
        activityId: activity._id,
        active: true,
      }).session(session);

      if (!activityPackage) {
        throw notFound("Selected package not found");
      }

      const academyDoc = await Academy.findById(activity.academyId)
        .session(session)
        .lean();

      const bookingModeUi = normalizeAllowedBookingMode(
        activity,
        body.bookingMode,
      );

      const childAge = calcAge(body.guestChild.dob);
      ensureChildFitsActivity(childAge, activity);

      const { selectedSlots, requiredSessions } =
        await resolveGuestSelectedSlots({
          session,
          activity,
          activityPackage,
          bookingModeUi,
          slotId: body.slotId,
          slotIds: body.slotIds,
        });

      const baseAmount = Number(activityPackage.price || activity.price || 0);
      const subtotalAmount = toMoney(baseAmount, 0);
      const discount = 0;
      const taxAmount = 0;
      const finalAmount = toMoney(
        Math.max(0, subtotalAmount - discount + taxAmount),
        0,
      );

      if (finalAmount <= 0) {
        throw badRequest("Booking amount is missing or invalid");
      }

      const firstSessionDate = selectedSlots[0]?.date || null;
      const lastSessionDate =
        selectedSlots[selectedSlots.length - 1]?.date || null;

      const slotIds = selectedSlots.map((slot) => slot._id);

      const bookedSlotItems = selectedSlots.map((slot) => ({
        slotId: slot._id,
        date: slot.date || null,
        startTime: slot.startTime || "",
        endTime: slot.endTime || "",
        sessionLabel: slot.sessionLabel || "",
        attendanceStatus: "PENDING",
        status: "BOOKED",
      }));

      const requestedPaymentMethod = normalizeUpper(
        body.paymentMethod || "ONLINE",
        "ONLINE",
      );

      const paymentGateway =
        requestedPaymentMethod === "ONLINE" ? "MYFATOORAH" : "MANUAL";

      let booking = null;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const bookingNo = await generateBookingNo();

        try {
          const bookingRows = await Booking.create(
            [
              {
                bookingNo,
                academyId: activity.academyId,
                branchId:
                  selectedSlots[0]?.branchId || activity.branchIds?.[0] || null,
                activityId: activity._id,
                packageId: activityPackage._id,

                parentId: null,
                childId: null,

                isGuestBooking: true,
                guestPaymentToken: crypto.randomBytes(24).toString("hex"),

                guestParent: {
                  fullName: body.guestParent.fullName || "",
                  name: body.guestParent.fullName || "",
                  email: body.guestParent.email || "",
                  phone: body.guestParent.phone || "",
                },

                guestChild: {
                  fullName: body.guestChild.fullName || "",
                  name: body.guestChild.fullName || "",
                  dob: new Date(body.guestChild.dob),
                  age: childAge,
                  gender: body.guestChild.gender || "",
                },

                bookingMode: bookingModeUi,
                totalSessions: requiredSessions,
                bookedSessions: selectedSlots.length,
                remainingSessions: Math.max(
                  0,
                  requiredSessions - selectedSlots.length,
                ),

                quantity: 1,
                currency:
                  activityPackage.currency || activity.currency || "QAR",
                subtotalAmount,
                baseAmount: subtotalAmount,
                discount,
                taxAmount,
                finalAmount,

                paymentStatus: "PENDING",
                paymentMethod: requestedPaymentMethod,
                paymentGateway,
                bookingStatus: "PENDING",
                attendanceStatus: "PENDING",
                bookingSource: "GUEST",

                initialSlotId:
                  bookingModeUi === "STRAIGHT"
                    ? selectedSlots[0]?._id || null
                    : null,

                slotIds,
                bookedSlotItems,
                firstSessionDate,
                lastSessionDate,
                expiresAt:
                  requestedPaymentMethod === "ONLINE"
                    ? addDays(new Date(), 1)
                    : undefined,

                packageSnapshot: {
                  title: activityPackage.title || "",
                  slug: activityPackage.slug || "",
                  packageType: activityPackage.packageType || "",
                  durationValue: Number(activityPackage.durationValue || 0),
                  durationUnit: activityPackage.durationUnit || "",
                  sessionCount: Number(activityPackage.sessionCount || 0),
                  validityDays: Number(activityPackage.validityDays || 0),
                  bookingPattern: activityPackage.bookingPattern || "",
                  price: Number(activityPackage.price || 0),
                  currency: activityPackage.currency || "QAR",
                },

                activitySnapshot: {
                  title: activity.title || "",
                  slug: activity.slug || "",
                  coverImage:
                    activity.coverImage ||
                    activity.bannerImage ||
                    activity.image ||
                    activity.images?.[0] ||
                    "",
                  venueName: activity.venueName || "",
                  venueAddress: activity.venueAddress || "",
                  organizerName: activity.organizerName || "",
                  minAge: Number(activity.minAge || 0),
                  maxAge: Number(activity.maxAge || 0),
                },

                academySnapshot: {
                  name: academyDoc?.name || "",
                  logo: academyDoc?.logo || "",
                  address: academyDoc?.address || "",
                  city: academyDoc?.city || "",
                },

                childSnapshot: {
                  fullName: body.guestChild.fullName || "",
                  age: childAge,
                  gender: body.guestChild.gender || "",
                },

                notes: body.notes || "",
              },
            ],
            { session },
          );

          booking = bookingRows[0];
          break;
        } catch (error) {
          if (String(error?.code) === "11000" && attempt < 5) {
            continue;
          }

          throw error;
        }
      }

      if (!booking) {
        throw new Error("Failed to create booking");
      }

      const amount = getBookingAmountForPayment(booking, finalAmount);
      const commission = calculateKidgageCommission(amount);

      const paymentRows = await Payment.create(
        [
          {
            academyId: booking.academyId,
            bookingId: booking._id,

            parentId: null,
            childId: null,

            activityId: booking.activityId || null,
            packageId: booking.packageId || null,

            paymentMethod: requestedPaymentMethod,
            paymentGateway,

            amount,
            currency: booking.currency || "QAR",

            paymentReceiver: "KIDGAGE",

            paymentStatus: "PENDING",
            settlementStatus: "PENDING",

            ...commission,

            meta: {
              source: "PUBLIC_GUEST_BOOKING",
              createdFrom: "GUEST_BOOKING",
              parentEmail: body.guestParent.email || "",
              parentName: body.guestParent.fullName || "Guest",
              guestParent: booking.guestParent || null,
              guestChild: booking.guestChild || null,
              guestParentCustomer: getGuestParentCustomer(booking),
              guestChildCustomer: getGuestChildCustomer(booking),
            },
          },
        ],
        { session },
      );

      paymentDoc = paymentRows[0];

      booking.paymentId = paymentDoc._id;
      booking.paymentMethod = requestedPaymentMethod;
      booking.paymentGateway = paymentGateway;
      booking.paymentStatus = "PENDING";
      booking.bookingStatus = "PENDING";

      await booking.save({ session });

      bookingDoc = booking;
    });

    const booking = await Booking.findById(bookingDoc._id)
      .populate("activityId packageId academyId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking created but could not be loaded",
      });
    }

    const payment = paymentDoc
      ? await Payment.findById(paymentDoc._id).lean()
      : await Payment.findOne({ bookingId: booking._id }).lean();

    await Promise.allSettled([
      notifyBookingCreated({
        booking,
      }),
      sendGuestBookingCreatedEmail({
        booking,
        payment,
      }),
    ]);

    const requestedPaymentMethod = normalizeUpper(
      body.paymentMethod || "ONLINE",
      "ONLINE",
    );

    const paymentPage =
      requestedPaymentMethod === "ONLINE"
        ? buildGuestPaymentPageUrl(booking)
        : "";

    return res.status(201).json({
      success: true,
      message:
        requestedPaymentMethod === "ONLINE"
          ? "Guest booking created. Continue to secure online payment."
          : "Guest booking created successfully. Cash payment is pending confirmation.",
      booking,
      bookingId: booking._id,
      guestToken: booking.guestPaymentToken || "",
      payment,
      checkoutUrl: "",
      paymentUrl: "",
      paymentPage,
      nextAction:
        requestedPaymentMethod === "ONLINE"
          ? "MYFATOORAH_EMBED"
          : "CASH_PENDING",
    });
  } catch (error) {
    return handlePublicControllerError(error, res, next);
  } finally {
    await session.endSession();
  }
}

export async function getPublicBookingById(req, res, next) {
  try {
    const { bookingId } = req.params;

    const guestToken = String(
      req.query?.guestToken ||
        req.query?.guestPaymentToken ||
        req.query?.token ||
        "",
    ).trim();

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    if (!guestToken) {
      return res.status(403).json({
        success: false,
        message: "Guest token is required to view this booking",
      });
    }

    await expirePendingBookingsSafe();

    const booking = await Booking.findOne({
      _id: bookingId,
      isGuestBooking: true,
      guestPaymentToken: guestToken,
    })
      .populate("activityId packageId academyId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or guest token is invalid",
      });
    }

    const payment = await Payment.findOne({
      bookingId: booking._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const bookedSlotItems = Array.isArray(booking.bookedSlotItems)
      ? booking.bookedSlotItems
      : [];

    const slotIds = bookedSlotItems
      .map((item) => item?.slotId)
      .filter((id) => isValidObjectId(id));

    const liveSlots = slotIds.length
      ? await ActivitySlot.find({
          _id: { $in: slotIds.map((id) => toObjectId(id)) },
        })
          .select(
            "_id date startTime endTime sessionLabel capacity status active branchId activityId packageId",
          )
          .lean()
      : [];

    const liveSlotMap = new Map(
      liveSlots.map((slot) => [String(slot._id), slot]),
    );

    const sessions = bookedSlotItems.map((item, index) => {
      const liveSlot = liveSlotMap.get(String(item?.slotId || "")) || null;

      const date = item?.date || item?.slotDate || liveSlot?.date || null;
      const startTime = item?.startTime || liveSlot?.startTime || "";
      const endTime = item?.endTime || liveSlot?.endTime || "";
      const sessionLabel =
        item?.sessionLabel || liveSlot?.sessionLabel || `Session ${index + 1}`;

      return {
        _id: `${String(item?.slotId || liveSlot?._id || index)}-${index}`,
        slotId: item?.slotId || liveSlot?._id || null,
        date,
        slotDate: date,
        startTime,
        endTime,
        sessionLabel,
        status: item?.status || "BOOKED",
        attendanceStatus: item?.attendanceStatus || "PENDING",
        sessionStatus: item?.status || "BOOKED",
        slot: liveSlot,
      };
    });

    return res.json({
      success: true,
      booking,
      payment,
      sessions,
    });
  } catch (error) {
    next(error);
  }
}

export async function listBlogs(_req, res, next) {
  try {
    const blogs = await News.find({ active: true })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      blogs: blogs.map(normalizeNews),
    });
  } catch (error) {
    next(error);
  }
}

export async function blogDetails(req, res, next) {
  try {
    const { slug } = req.params;

    let blog = null;

    if (mongoose.Types.ObjectId.isValid(slug)) {
      blog = await News.findOne({
        _id: slug,
        active: true,
      }).lean();
    }

    if (!blog) {
      blog = await News.findOne({
        slug,
        active: true,
      }).lean();
    }

    if (!blog) {
      return res.status(404).json({
        blog: null,
        message: "Blog not found",
      });
    }

    return res.json({
      blog: normalizeNews(blog),
    });
  } catch (error) {
    next(error);
  }
}

export async function listEvents(_req, res, next) {
  try {
    const events = await EventPoster.find({
      $or: [{ active: true }, { status: "PUBLISHED" }],
    })
      .sort({ startDate: 1, createdAt: -1 })
      .lean();

    return res.json({
      events: events.map(normalizePosterEvent),
    });
  } catch (error) {
    next(error);
  }
}

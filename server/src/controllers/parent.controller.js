import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { z } from "zod";

import Child from "../models/Child.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import BookingSession from "../models/BookingSession.js";
import Activity from "../models/Activity.js";
import ActivityPackage from "../models/ActivityPackage.js";
import ActivitySlot from "../models/ActivitySlot.js";
import Academy from "../models/Academy.js";

import {
  notifyBookingCreated,
  notifyBookingCancelled,
} from "../services/notification.service.js";

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const childSchema = z
  .object({
    fullName: z.string().optional().default(""),
    name: z.string().optional().default(""),
    dob: z.string().optional().default(""),
    dateOfBirth: z.string().optional().default(""),
    gender: z
      .enum(["BOY", "GIRL", "MALE", "FEMALE", "OTHER", ""])
      .optional()
      .default(""),
    schoolName: z.string().optional().default(""),
    school: z.string().optional().default(""),
    notes: z.string().optional().default(""),
    medicalNotes: z.string().optional().default(""),
    allergies: z.string().optional().default(""),
    emergencyContactName: z.string().optional().default(""),
    emergencyContactPhone: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const fullName = String(data.fullName || data.name || "").trim();
    const dob = String(data.dob || data.dateOfBirth || "").trim();

    if (fullName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Child full name is required",
      });
    }

    if (!dob) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dob"],
        message: "Date of birth is required",
      });
    }
  });

const parentProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required").optional(),
  name: z.string().min(2, "Full name is required").optional(),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
});

const parentPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const parentBookingSchema = z
  .object({
    activityId: z.string().min(1),
    packageId: z.string().min(1),
    childId: z.string().min(1),
    bookingMode: z.enum(["STRAIGHT", "FLEXIBLE"]),
    slotId: z.string().optional(),
    slotIds: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),
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

const guestBookingSchema = z
  .object({
    packageId: z.string().min(1),
    bookingMode: z.enum(["STRAIGHT", "FLEXIBLE"]),
    slotId: z.string().optional(),
    slotIds: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(""),

    guestParent: z.object({
      name: z.string().optional(),
      fullName: z.string().optional(),
      email: z.string().email("Valid parent email is required"),
      phone: z.string().min(6, "Valid parent phone is required"),
    }),

    guestChild: z.object({
      name: z.string().optional(),
      fullName: z.string().optional(),
      age: z.coerce.number().optional(),
      dob: z.string().optional(),
      gender: z.enum(["BOY", "GIRL"]),
    }),
  })
  .superRefine((data, ctx) => {
    const parentName = String(
      data?.guestParent?.name || data?.guestParent?.fullName || "",
    ).trim();

    const childName = String(
      data?.guestChild?.name || data?.guestChild?.fullName || "",
    ).trim();

    const childAge =
      data?.guestChild?.age !== undefined && data?.guestChild?.age !== null
        ? Number(data.guestChild.age)
        : null;

    const childDob = String(data?.guestChild?.dob || "").trim();

    if (!parentName || parentName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guestParent", "name"],
        message: "Parent full name is required",
      });
    }

    if (!childName || childName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guestChild", "name"],
        message: "Child full name is required",
      });
    }

    if ((!Number.isFinite(childAge) || childAge <= 0) && !childDob) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guestChild", "age"],
        message: "Child age or dob is required",
      });
    }

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

/* -------------------------------------------------------------------------- */
/* Generic helpers                                                            */
/* -------------------------------------------------------------------------- */

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

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
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

function safeUpper(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .toUpperCase();
}

function normalizeChildGender(value) {
  const gender = safeUpper(value);

  if (gender === "MALE") return "BOY";
  if (gender === "FEMALE") return "GIRL";
  if (["BOY", "GIRL", "OTHER"].includes(gender)) return gender;

  return "";
}

function normalizeParentForClient(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user._id,
    fullName: user.fullName || user.name || "",
    name: user.fullName || user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    role: user.role || "PARENT",
    status: user.status || "ACTIVE",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function normalizeChildForClient(child) {
  if (!child) return null;

  return {
    _id: child._id,
    id: child._id,
    fullName: child.fullName || child.name || "",
    name: child.fullName || child.name || "",
    dob: child.dob || child.dateOfBirth || null,
    dateOfBirth: child.dob || child.dateOfBirth || null,
    age: child.age || calcAge(child.dob || child.dateOfBirth),
    gender: child.gender || "",
    schoolName: child.schoolName || child.school || "",
    school: child.schoolName || child.school || "",
    notes: child.notes || child.medicalNotes || child.allergies || "",
    medicalNotes: child.medicalNotes || child.notes || "",
    allergies: child.allergies || "",
    emergencyContactName: child.emergencyContactName || "",
    emergencyContactPhone: child.emergencyContactPhone || "",
    status: child.status || "ACTIVE",
    parentId: child.parentId || null,
    createdAt: child.createdAt || null,
    updatedAt: child.updatedAt || null,
  };
}

function getGuestParentName(guestParent = {}) {
  return String(guestParent.fullName || guestParent.name || "").trim();
}

function getGuestChildName(guestChild = {}) {
  return String(guestChild.fullName || guestChild.name || "").trim();
}

function getGuestChildAge(guestChild = {}) {
  if (guestChild.age !== undefined && guestChild.age !== null) {
    const n = Number(guestChild.age);
    if (Number.isFinite(n) && n > 0) return n;
  }

  if (guestChild.dob) {
    return calcAge(guestChild.dob);
  }

  return 0;
}

async function getPublishedActivityBySlug(slug) {
  return Activity.findOne({
    slug,
    status: "PUBLISHED",
  });
}

async function generateBookingNo(session = null) {
  const prefix = "KG";
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dayPrefix = `${prefix}-${y}${m}${d}`;

  const countQuery = Booking.countDocuments({
    bookingNo: { $regex: `^${dayPrefix}-` },
  });

  if (session) countQuery.session(session);

  const count = await countQuery;
  const seq = String(count + 1).padStart(4, "0");
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `${dayPrefix}-${seq}${random}`;
}

function sortSlotsChronologically(slots) {
  return [...slots].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

function getRequiredSessionCount(activityPackage, activity = null) {
  const direct = Number(activityPackage?.sessionCount || 0);
  if (direct > 0) return direct;

  const maxSelectable = Number(activityPackage?.maxSelectableSessions || 0);
  if (maxSelectable > 0) return maxSelectable;

  const totalSessions = Number(activityPackage?.totalSessions || 0);
  if (totalSessions > 0) return totalSessions;

  const durationUnit = safeUpper(activityPackage?.durationUnit);
  const durationValue = Number(activityPackage?.durationValue || 0);

  if (durationUnit === "SESSION" && durationValue > 0) return durationValue;

  if (durationUnit === "MONTH" && durationValue > 0) {
    const sessionsPerMonth = Number(activityPackage?.sessionsPerMonth || 0);
    if (sessionsPerMonth > 0) return sessionsPerMonth * durationValue;
    return durationValue;
  }

  const fallbackFromActivity = Number(
    activity?.totalSessions || activity?.sessionCount || 0,
  );
  if (fallbackFromActivity > 0) return fallbackFromActivity;

  return 1;
}

function isSlotBookable(slot) {
  if (!slot || slot.active === false) return false;

  const status = safeUpper(slot.status, "OPEN");
  if (status !== "OPEN") return false;

  const capacity = Number(slot.capacity || 0);
  const bookedCount = Number(slot.bookedCount || 0);

  if (!Number.isFinite(capacity) || capacity <= 0) return false;
  if (!Number.isFinite(bookedCount) || bookedCount < 0) return false;

  return bookedCount < capacity;
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
  const allowed = safeUpper(activity?.bookingMode, "BOTH");
  const requested = safeUpper(requestedMode);

  if (!["STRAIGHT", "FLEXIBLE"].includes(requested)) {
    throw badRequest("Invalid booking mode");
  }

  if (allowed === "BOTH") return requested;
  if (allowed === requested) return requested;

  throw badRequest(`This activity only allows ${allowed} booking`);
}

function toStoredBookingMode(uiMode) {
  return safeUpper(uiMode) === "STRAIGHT" ? "SEQUENTIAL" : "FLEXIBLE";
}

function handleZodError(error, res, next) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: error.issues?.[0]?.message || "Validation failed",
      issues: error.issues,
    });
  }

  return next(error);
}

function handleControllerError(error, res, next) {
  if (error instanceof z.ZodError) {
    return handleZodError(error, res, next);
  }

  if (error instanceof ApiError || Number(error?.statusCode || 0) > 0) {
    return res.status(Number(error.statusCode || 400)).json({
      message: error.message || "Request failed",
    });
  }

  return next(error);
}

function validateObjectIdsOrThrow(payload = {}) {
  for (const [key, value] of Object.entries(payload)) {
    if (!isValidObjectId(value)) {
      throw badRequest(`Invalid ${key}`);
    }
  }
}

function uniqueIds(ids = []) {
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

/* -------------------------------------------------------------------------- */
/* Slot inventory locking                                                     */
/* -------------------------------------------------------------------------- */

async function reserveSlotInventory(slotId, session) {
  const objectId = toObjectId(slotId);
  if (!objectId) throw badRequest("Invalid slot id");

  const slot = await ActivitySlot.findOneAndUpdate(
    {
      _id: objectId,
      active: { $ne: false },
      status: "OPEN",
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    [
      {
        $set: {
          bookedCount: { $add: [{ $ifNull: ["$bookedCount", 0] }, 1] },
        },
      },
      {
        $set: {
          status: {
            $cond: [{ $gte: ["$bookedCount", "$capacity"] }, "FULL", "OPEN"],
          },
        },
      },
    ],
    {
      new: true,
      session,
      runValidators: false,
    },
  );

  if (!slot) {
    throw conflict("One or more selected slots are no longer available");
  }

  return slot;
}

async function releaseSlotInventory(slotId, session) {
  const objectId = toObjectId(slotId);
  if (!objectId) return null;

  return ActivitySlot.findOneAndUpdate(
    {
      _id: objectId,
    },
    [
      {
        $set: {
          bookedCount: {
            $max: [{ $subtract: [{ $ifNull: ["$bookedCount", 0] }, 1] }, 0],
          },
        },
      },
      {
        $set: {
          status: {
            $cond: [{ $gte: ["$bookedCount", "$capacity"] }, "FULL", "OPEN"],
          },
        },
      },
    ],
    {
      new: true,
      session,
      runValidators: false,
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Slot resolution                                                            */
/* -------------------------------------------------------------------------- */

async function resolveSelectedSlots({
  session,
  activity,
  activityPackage,
  bookingMode,
  slotId,
  slotIds,
}) {
  const requiredSessions = getRequiredSessionCount(activityPackage, activity);
  let selectedSlots = [];

  if (bookingMode === "STRAIGHT") {
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

    if (!isSlotBookable(firstSlot)) {
      throw conflict("Selected starting slot is not available");
    }

    const candidateSlots = await ActivitySlot.find({
      activityId: activity._id,
      packageId: activityPackage._id,
      active: { $ne: false },
      status: "OPEN",
      date: { $gte: firstSlot.date },
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    })
      .sort({ date: 1, startTime: 1 })
      .session(session);

    const orderedCandidates = sortSlotsChronologically(candidateSlots);
    const startIndex = orderedCandidates.findIndex(
      (slot) => normalizeId(slot._id) === normalizeId(firstSlot._id),
    );

    if (startIndex === -1) {
      throw conflict("Unable to locate selected slot in available sequence");
    }

    const sequence = [];

    for (let i = startIndex; i < orderedCandidates.length; i += 1) {
      const slot = orderedCandidates[i];

      if (
        normalizeId(slot.activityId) === normalizeId(activity._id) &&
        normalizeId(slot.packageId) === normalizeId(activityPackage._id) &&
        isSlotBookable(slot)
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

    selectedSlots = sequence;
  } else {
    const uniqueSlotIds = uniqueIds(slotIds || []);

    if (uniqueSlotIds.length === 0) {
      throw badRequest("Please select at least one slot");
    }

    if (uniqueSlotIds.length !== Number(slotIds || []).length) {
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
      if (!isSlotBookable(slot)) {
        throw conflict("One or more selected slots are fully booked");
      }
    }

    selectedSlots = orderedSlots;
  }

  return {
    selectedSlots,
    requiredSessions,
    storedBookingMode: toStoredBookingMode(bookingMode),
  };
}

/* -------------------------------------------------------------------------- */
/* Booking creation core                                                      */
/* -------------------------------------------------------------------------- */

async function createBookingCore({
  session,
  activity,
  activityPackage,
  academyDoc,
  bookingMode,
  notes = "",
  selectedSlots,
  requiredSessions,
  parentId = null,
  childId = null,
  childData,
  guestParent = null,
  bookingSource = "WEB",
}) {
  const childAge =
    childData?.age && Number.isFinite(Number(childData.age))
      ? Number(childData.age)
      : calcAge(childData?.dob);

  const bookingNo = await generateBookingNo(session);

  const baseAmount = Number(activityPackage.price || activity.price || 0);
  const subtotalAmount = baseAmount;
  const discount = 0;
  const taxAmount = 0;
  const finalAmount = Math.max(0, subtotalAmount - discount + taxAmount);

  const firstSessionDate = selectedSlots[0]?.date || null;
  const lastSessionDate = selectedSlots[selectedSlots.length - 1]?.date || null;
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

  const bookingRows = await Booking.create(
    [
      {
        bookingNo,
        academyId: activity.academyId,
        branchId: selectedSlots[0]?.branchId || activity.branchIds?.[0] || null,
        activityId: activity._id,
        packageId: activityPackage._id,

        parentId: parentId || null,
        childId: childId || null,

        isGuestBooking: !parentId,

        guestParent: guestParent
          ? {
              name: guestParent.fullName || "",
              fullName: guestParent.fullName || "",
              email: guestParent.email || "",
              phone: guestParent.phone || "",
            }
          : {
              name: "",
              fullName: "",
              email: "",
              phone: "",
            },

        guestChild: !parentId
          ? {
              name: childData?.fullName || "",
              fullName: childData?.fullName || "",
              age: childAge,
              gender: childData?.gender || "",
            }
          : {
              name: "",
              fullName: "",
              age: 0,
              gender: "",
            },

        bookingMode,
        totalSessions: requiredSessions,
        bookedSessions: selectedSlots.length,
        remainingSessions: Math.max(0, requiredSessions - selectedSlots.length),

        quantity: 1,
        currency: activityPackage.currency || activity.currency || "QAR",
        subtotalAmount,
        baseAmount,
        discount,
        taxAmount,
        finalAmount,

        paymentStatus: "PENDING",
        bookingStatus: "PENDING",
        attendanceStatus: "PENDING",
        bookingSource,

        initialSlotId:
          bookingMode === "SEQUENTIAL" ? selectedSlots[0]?._id || null : null,
        slotIds,
        bookedSlotItems,
        firstSessionDate,
        lastSessionDate,

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
          fullName: childData?.fullName || "",
          age: childAge,
          gender: childData?.gender || "",
        },

        guestParentSnapshot: guestParent
          ? {
              fullName: guestParent.fullName || "",
              email: guestParent.email || "",
              phone: guestParent.phone || "",
            }
          : undefined,

        notes: notes || "",
      },
    ],
    { session },
  );

  const booking = bookingRows[0];

  const reservedSlots = [];

  try {
    for (const slot of selectedSlots) {
      const reservedSlot = await reserveSlotInventory(slot._id, session);
      reservedSlots.push(reservedSlot);
    }

    const sessionRows = selectedSlots.map((slot, index) => ({
      bookingId: booking._id,
      academyId: activity.academyId,
      branchId: slot.branchId || activity.branchIds?.[0] || null,
      activityId: activity._id,
      packageId: activityPackage._id,
      slotId: slot._id,
      parentId: parentId || null,
      childId: childId || null,
      sessionNo: index + 1,
      bookingMode,
      slotDate: slot.date,
      startTime: slot.startTime || "",
      endTime: slot.endTime || "",
      sessionLabel: slot.sessionLabel || "",
      sessionStatus: "BOOKED",
      notes: notes || "",
    }));

    await BookingSession.create(sessionRows, { session });
  } catch (error) {
    for (const slot of reservedSlots.reverse()) {
      await releaseSlotInventory(slot._id, session);
    }

    throw error;
  }

  return booking;
}

/* -------------------------------------------------------------------------- */
/* Parent profile                                                             */
/* -------------------------------------------------------------------------- */

export async function getParentProfile(req, res, next) {
  try {
    const parent = await User.findOne({
      _id: req.user._id,
      role: "PARENT",
    })
      .select(
        "fullName name email phone address city role status createdAt updatedAt",
      )
      .lean();

    if (!parent) {
      return res.status(404).json({ message: "Parent profile not found" });
    }

    return res.json({
      user: normalizeParentForClient(parent),
      parent: normalizeParentForClient(parent),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateParentProfile(req, res, next) {
  try {
    const body = parentProfileSchema.parse(req.body);

    const fullName = String(body.fullName || body.name || "").trim();

    const update = {
      fullName,
      name: fullName,
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
    };

    const parent = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        role: "PARENT",
      },
      { $set: update },
      { new: true, runValidators: true },
    )
      .select(
        "fullName name email phone address city role status createdAt updatedAt",
      )
      .lean();

    if (!parent) {
      return res.status(404).json({ message: "Parent profile not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      user: normalizeParentForClient(parent),
      parent: normalizeParentForClient(parent),
    });
  } catch (error) {
    return handleZodError(error, res, next);
  }
}

export async function changeParentPassword(req, res, next) {
  try {
    const body = parentPasswordSchema.parse(req.body);

    const parent = await User.findOne({
      _id: req.user._id,
      role: "PARENT",
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent profile not found" });
    }

    const storedHash = parent.passwordHash || parent.password || "";

    if (!storedHash) {
      return res.status(400).json({
        message: "Password login is not enabled for this account",
      });
    }

    const validPassword = await bcrypt.compare(
      body.currentPassword,
      storedHash,
    );

    if (!validPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    parent.passwordHash = await bcrypt.hash(body.newPassword, 10);

    if (parent.password !== undefined) {
      parent.password = undefined;
    }

    parent.mustChangePassword = false;
    parent.tempPassword = "";

    await parent.save();

    return res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return handleZodError(error, res, next);
  }
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export async function dashboard(req, res, next) {
  try {
    const parentId = req.user._id;

    const [childrenCount, bookingsCount, upcomingBookings] = await Promise.all([
      Child.countDocuments({ parentId, status: "ACTIVE" }),
      Booking.countDocuments({ parentId }),
      Booking.find({
        parentId,
        bookingStatus: { $in: ["CONFIRMED", "PENDING"] },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("activityId packageId childId academyId"),
    ]);

    return res.json({
      childrenCount,
      bookingsCount,
      upcomingBookings,
    });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Children                                                                   */
/* -------------------------------------------------------------------------- */

export async function listChildren(req, res, next) {
  try {
    const children = await Child.find({ parentId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: children.length,
      children: children.map(normalizeChildForClient),
    });
  } catch (error) {
    next(error);
  }
}

export async function createChild(req, res, next) {
  try {
    const body = childSchema.parse(req.body);

    const fullName = String(body.fullName || body.name || "").trim();
    const dob = String(body.dob || body.dateOfBirth || "").trim();

    const child = await Child.create({
      fullName,
      name: fullName,
      dob: new Date(dob),
      dateOfBirth: new Date(dob),
      age: calcAge(dob),
      gender: normalizeChildGender(body.gender),
      schoolName: String(body.schoolName || body.school || "").trim(),
      school: String(body.schoolName || body.school || "").trim(),
      notes: String(
        body.notes || body.medicalNotes || body.allergies || "",
      ).trim(),
      medicalNotes: String(body.medicalNotes || body.notes || "").trim(),
      allergies: String(body.allergies || "").trim(),
      emergencyContactName: String(body.emergencyContactName || "").trim(),
      emergencyContactPhone: String(body.emergencyContactPhone || "").trim(),
      parentId: req.user._id,
      status: "ACTIVE",
    });

    return res.status(201).json({
      message: "Child profile created successfully",
      child: normalizeChildForClient(child),
    });
  } catch (error) {
    return handleZodError(error, res, next);
  }
}

export async function updateChild(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid child id" });
    }

    const body = childSchema.parse(req.body);

    const fullName = String(body.fullName || body.name || "").trim();
    const dob = String(body.dob || body.dateOfBirth || "").trim();

    const update = {
      fullName,
      name: fullName,
      dob: new Date(dob),
      dateOfBirth: new Date(dob),
      age: calcAge(dob),
      gender: normalizeChildGender(body.gender),
      schoolName: String(body.schoolName || body.school || "").trim(),
      school: String(body.schoolName || body.school || "").trim(),
      notes: String(
        body.notes || body.medicalNotes || body.allergies || "",
      ).trim(),
      medicalNotes: String(body.medicalNotes || body.notes || "").trim(),
      allergies: String(body.allergies || "").trim(),
      emergencyContactName: String(body.emergencyContactName || "").trim(),
      emergencyContactPhone: String(body.emergencyContactPhone || "").trim(),
    };

    const child = await Child.findOneAndUpdate(
      {
        _id: id,
        parentId: req.user._id,
      },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!child) {
      return res.status(404).json({ message: "Child profile not found" });
    }

    return res.json({
      message: "Child profile updated successfully",
      child: normalizeChildForClient(child),
    });
  } catch (error) {
    return handleZodError(error, res, next);
  }
}

export async function deleteChild(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid child id" });
    }

    const activeBooking = await Booking.findOne({
      parentId: req.user._id,
      childId: id,
      bookingStatus: { $nin: ["CANCELLED", "CANCELED", "COMPLETED"] },
    }).lean();

    if (activeBooking) {
      return res.status(400).json({
        message:
          "This child has active bookings. Cancel or complete those bookings before deleting the child profile.",
      });
    }

    const child = await Child.findOneAndDelete({
      _id: id,
      parentId: req.user._id,
    }).lean();

    if (!child) {
      return res.status(404).json({ message: "Child profile not found" });
    }

    return res.json({
      message: "Child profile deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

export async function listBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ parentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("activityId packageId childId academyId")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId");

    return res.json({ bookings });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const booking = await Booking.findOne({
      _id: id,
      parentId: req.user._id,
    })
      .populate("activityId packageId childId academyId")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId")
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const sessions = await BookingSession.find({
      bookingId: booking._id,
      parentId: req.user._id,
    })
      .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
      .populate("slotId");

    return res.json({ booking, sessions });
  } catch (error) {
    next(error);
  }
}

export async function createParentBooking(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const body = parentBookingSchema.parse(req.body);

    validateObjectIdsOrThrow({
      activityId: body.activityId,
      packageId: body.packageId,
      childId: body.childId,
    });

    if (body.slotId && !isValidObjectId(body.slotId)) {
      throw badRequest("Invalid slotId");
    }

    if (
      Array.isArray(body.slotIds) &&
      body.slotIds.some((id) => !isValidObjectId(id))
    ) {
      throw badRequest("Invalid slotIds");
    }

    let bookingDoc = null;

    await session.withTransaction(async () => {
      const [activity, activityPackage, child] = await Promise.all([
        Activity.findById(body.activityId).session(session),
        ActivityPackage.findById(body.packageId).session(session),
        Child.findOne({
          _id: body.childId,
          parentId: req.user._id,
        }).session(session),
      ]);

      if (!activity) throw notFound("Activity not found");

      if (safeUpper(activity.status) !== "PUBLISHED") {
        throw badRequest("Activity is not available for booking");
      }

      if (!activityPackage) throw notFound("Selected package not found");
      if (!child) throw notFound("Child not found for this parent");

      if (activityPackage.active === false) {
        throw badRequest("Selected package is not active");
      }

      if (
        normalizeId(activityPackage.activityId) !== normalizeId(activity._id)
      ) {
        throw badRequest("Package does not belong to this activity");
      }

      const academyDoc = await Academy.findById(activity.academyId)
        .session(session)
        .lean();

      const bookingModeUi = normalizeAllowedBookingMode(
        activity,
        body.bookingMode,
      );

      const childAge = calcAge(child.dob);
      ensureChildFitsActivity(childAge, activity);

      const { selectedSlots, requiredSessions, storedBookingMode } =
        await resolveSelectedSlots({
          session,
          activity,
          activityPackage,
          bookingMode: bookingModeUi,
          slotId: body.slotId,
          slotIds: body.slotIds,
        });

      bookingDoc = await createBookingCore({
        session,
        activity,
        activityPackage,
        academyDoc,
        bookingMode: storedBookingMode,
        notes: body.notes || "",
        selectedSlots,
        requiredSessions,
        parentId: req.user._id,
        childId: child._id,
        childData: {
          fullName: child.fullName,
          dob: child.dob,
          gender: child.gender,
          age: childAge,
        },
        bookingSource: "PARENT_ACCOUNT",
      });
    });

    const booking = await Booking.findById(bookingDoc._id)
      .populate("activityId packageId childId academyId")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId")
      .lean();

    const sessions = await BookingSession.find({
      bookingId: bookingDoc._id,
    })
      .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
      .populate("slotId");

    await Promise.allSettled([
      notifyBookingCreated({
        booking,
        createdByUserId: req.user._id,
      }),
    ]);

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
      sessions,
    });
  } catch (error) {
    return handleControllerError(error, res, next);
  } finally {
    await session.endSession();
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

    const activity = await getPublishedActivityBySlug(slug);

    if (!activity) {
      throw notFound("Activity not found");
    }

    let bookingDoc = null;

    await session.withTransaction(async () => {
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

      const guestChildAge = getGuestChildAge(body.guestChild);
      ensureChildFitsActivity(guestChildAge, activity);

      const { selectedSlots, requiredSessions, storedBookingMode } =
        await resolveSelectedSlots({
          session,
          activity,
          activityPackage,
          bookingMode: bookingModeUi,
          slotId: body.slotId,
          slotIds: body.slotIds,
        });

      bookingDoc = await createBookingCore({
        session,
        activity,
        activityPackage,
        academyDoc,
        bookingMode: storedBookingMode,
        notes: body.notes || "",
        selectedSlots,
        requiredSessions,
        parentId: null,
        childId: null,
        childData: {
          fullName: getGuestChildName(body.guestChild),
          age: guestChildAge,
          dob: body.guestChild.dob || "",
          gender: body.guestChild.gender,
        },
        guestParent: {
          fullName: getGuestParentName(body.guestParent),
          email: body.guestParent.email,
          phone: body.guestParent.phone,
        },
        bookingSource: "GUEST",
      });
    });

    const booking = await Booking.findById(bookingDoc._id)
      .populate("activityId packageId academyId")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId")
      .lean();

    const sessions = await BookingSession.find({
      bookingId: bookingDoc._id,
    })
      .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
      .populate("slotId");

    await Promise.allSettled([
      notifyBookingCreated({
        booking,
      }),
    ]);

    return res.status(201).json({
      message: "Guest booking created successfully",
      booking,
      sessions,
    });
  } catch (error) {
    return handleControllerError(error, res, next);
  } finally {
    await session.endSession();
  }
}

export async function cancelParentBooking(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: id,
        parentId: req.user._id,
      }).session(session);

      if (!booking) {
        throw notFound("Booking not found");
      }

      if (safeUpper(booking.bookingStatus) === "CANCELLED") {
        throw badRequest("Booking is already cancelled");
      }

      const bookedSessions = await BookingSession.find({
        bookingId: booking._id,
        parentId: req.user._id,
        sessionStatus: { $ne: "CANCELLED" },
      }).session(session);

      for (const bookingSession of bookedSessions) {
        bookingSession.sessionStatus = "CANCELLED";
        await bookingSession.save({ session });
        await releaseSlotInventory(bookingSession.slotId, session);
      }

      booking.bookingStatus = "CANCELLED";
      booking.attendanceStatus = "ABSENT";
      booking.remainingSessions = 0;
      booking.bookedSessions = 0;

      if (safeUpper(booking.paymentStatus) === "PENDING") {
        booking.paymentStatus = "CANCELLED";
      }

      await booking.save({ session });
    });

    const booking = await Booking.findById(id)
      .populate("activityId packageId childId academyId")
      .populate("slotIds")
      .populate("bookedSlotItems.slotId")
      .lean();

    const sessions = await BookingSession.find({
      bookingId: id,
      parentId: req.user._id,
    })
      .sort({ sessionNo: 1, slotDate: 1, startTime: 1 })
      .populate("slotId");

    await Promise.allSettled([
      notifyBookingCancelled({
        booking,
        reason: "Booking was cancelled by the parent.",
        createdByUserId: req.user._id,
      }),
    ]);

    return res.json({
      message: "Booking cancelled successfully",
      booking,
      sessions,
    });
  } catch (error) {
    return handleControllerError(error, res, next);
  } finally {
    await session.endSession();
  }
}

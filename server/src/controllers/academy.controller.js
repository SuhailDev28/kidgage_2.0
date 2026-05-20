import { z } from "zod";

import Academy from "../models/Academy.js";
import Activity from "../models/Activity.js";
import Branch from "../models/Branch.js";
import Booking from "../models/Booking.js";
import Schedule from "../models/Schedule.js";
import Slot from "../models/Slot.js";

const branchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  mapLink: z.string().optional().default(""),
  contactNumber: z.string().optional().default(""),
});

const activitySchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().optional().default(""),
  description: z.string().optional().default(""),
  minAge: z.coerce.number().min(1),
  maxAge: z.coerce.number().min(1),
  price: z.coerce.number().min(0).default(0),
});

const bookingUpdateSchema = z.object({
  bookingStatus: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PARTIALLY_BOOKED",
      "CANCELLED",
      "COMPLETED",
      "WAITLISTED",
      "NO_SHOW",
    ])
    .optional(),

  paymentStatus: z
    .enum(["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"])
    .optional(),

  attendanceStatus: z
    .enum(["PENDING", "PARTIAL", "PRESENT", "ABSENT"])
    .optional(),

  notes: z.string().optional().default(""),
});

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function populateBooking(query) {
  return query.populate([
    { path: "parentId", select: "name fullName email phone" },
    { path: "childId", select: "name fullName dob gender" },
    {
      path: "activityId",
      select: "title name category categoryName price basePrice currency",
    },
    {
      path: "packageId",
      select: "title price currency sessionCount durationValue durationUnit",
    },
    { path: "slotIds" },
    { path: "bookedSlotItems.slotId" },
    { path: "academyId", select: "name slug logo" },
  ]);
}

async function restoreSlotInventory(booking) {
  const slotIds = [
    ...(Array.isArray(booking.slotIds) ? booking.slotIds : []),
    ...(Array.isArray(booking.bookedSlotItems)
      ? booking.bookedSlotItems.map((item) => item.slotId)
      : []),
  ]
    .filter(Boolean)
    .map(String);

  const uniqueSlotIds = [...new Set(slotIds)];

  for (const slotId of uniqueSlotIds) {
    const slot = await Slot.findById(slotId);
    if (!slot) continue;

    slot.bookedCount = Math.max(0, Number(slot.bookedCount || 0) - 1);

    if (Number(slot.bookedCount || 0) < Number(slot.capacity || 0)) {
      slot.status = "OPEN";
    }

    await slot.save();
  }
}

export async function dashboard(req, res, next) {
  try {
    const academyId = req.academyId;
    const { start, end } = getTodayRange();

    const [activities, branches, bookings, slotsToday] = await Promise.all([
      Activity.countDocuments({ academyId }),
      Branch.countDocuments({ academyId }),
      Booking.countDocuments({ academyId }),
      Slot.countDocuments({
        academyId,
        date: { $gte: start, $lte: end },
      }),
    ]);

    return res.json({
      activities,
      branches,
      bookings,
      slotsToday,
    });
  } catch (error) {
    next(error);
  }
}

export async function profile(req, res, next) {
  try {
    const academy = await Academy.findById(req.academyId);
    return res.json({ academy });
  } catch (error) {
    next(error);
  }
}

export async function listBranches(req, res, next) {
  try {
    const branches = await Branch.find({ academyId: req.academyId }).sort({
      createdAt: -1,
    });

    return res.json({ branches });
  } catch (error) {
    next(error);
  }
}

export async function createBranch(req, res, next) {
  try {
    const body = branchSchema.parse(req.body);

    const branch = await Branch.create({
      ...body,
      academyId: req.academyId,
    });

    return res.status(201).json({ branch });
  } catch (error) {
    next(error);
  }
}

export async function listActivities(req, res, next) {
  try {
    const activities = await Activity.find({ academyId: req.academyId }).sort({
      createdAt: -1,
    });

    return res.json({ activities });
  } catch (error) {
    next(error);
  }
}

export async function createActivity(req, res, next) {
  try {
    const body = activitySchema.parse(req.body);

    const activity = await Activity.create({
      ...body,
      academyId: req.academyId,
      status: "PUBLISHED",
      basePrice: body.price,
    });

    return res.status(201).json({ activity });
  } catch (error) {
    next(error);
  }
}

export async function listSchedules(req, res, next) {
  try {
    const schedules = await Schedule.find({ academyId: req.academyId }).sort({
      createdAt: -1,
    });

    return res.json({ schedules });
  } catch (error) {
    next(error);
  }
}

export async function listBookings(req, res, next) {
  try {
    const bookings = await populateBooking(
      Booking.find({ academyId: req.academyId }).sort({ createdAt: -1 }),
    );

    return res.json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await populateBooking(
      Booking.findOne({
        _id: req.params.id,
        academyId: req.academyId,
      }),
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({ booking });
  } catch (error) {
    next(error);
  }
}

export async function updateBooking(req, res, next) {
  try {
    const body = bookingUpdateSchema.parse(req.body);

    const booking = await Booking.findOne({
      _id: req.params.id,
      academyId: req.academyId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (body.bookingStatus) booking.bookingStatus = body.bookingStatus;
    if (body.paymentStatus) booking.paymentStatus = body.paymentStatus;
    if (body.attendanceStatus) booking.attendanceStatus = body.attendanceStatus;

    if (typeof body.notes === "string") {
      booking.notes = body.notes;
    }

    if (
      body.bookingStatus === "CANCELLED" &&
      booking.paymentStatus === "PENDING"
    ) {
      booking.paymentStatus = "CANCELLED";
    }

    await booking.save();

    const updated = await populateBooking(
      Booking.findOne({
        _id: booking._id,
        academyId: req.academyId,
      }),
    );

    return res.json({
      message: "Booking updated successfully",
      booking: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBooking(req, res, next) {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      academyId: req.academyId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await restoreSlotInventory(booking);
    await booking.deleteOne();

    return res.json({
      message: "Booking deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

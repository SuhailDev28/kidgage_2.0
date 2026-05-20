import Booking from "../models/Booking.js";
import Child from "../models/Child.js";
import Activity from "../models/Activity.js";
import Slot from "../models/ActivitySlot.js";
import Notification from "../models/Notification.js";
import { AppError } from "../utils/AppError.js";

function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const passed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  if (!passed) age -= 1;
  return age;
}

function bookingNo() {
  return `KG-${Date.now().toString().slice(-8)}`;
}

export async function createBooking({ parentId, childId, slotId }) {
  const child = await Child.findOne({ _id: childId, parentId });
  if (!child) throw new AppError("Child not found for this parent", 404);

  const slot = await Slot.findById(slotId);
  if (!slot) throw new AppError("Slot not found", 404);

  const activity = await Activity.findById(slot.activityId);
  if (!activity) throw new AppError("Activity not found", 404);

  const age = calculateAge(child.dob);
  if (age < activity.minAge || age > activity.maxAge)
    throw new AppError("Child age is not eligible for this activity", 400);

  const existing = await Booking.findOne({
    parentId,
    childId,
    slotId,
    bookingStatus: { $in: ["PENDING", "CONFIRMED"] },
  });
  if (existing) throw new AppError("Duplicate booking detected", 400);

  const updatedSlot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      status: "AVAILABLE",
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 } },
    { new: true },
  );
  if (!updatedSlot) throw new AppError("Slot is full or unavailable", 409);

  if (
    updatedSlot.bookedCount >= updatedSlot.capacity &&
    updatedSlot.status === "AVAILABLE"
  ) {
    updatedSlot.status = "FULL";
    await updatedSlot.save();
  }

  const amount = Number(activity.price || 0);
  const booking = await Booking.create({
    bookingNo: bookingNo(),
    academyId: updatedSlot.academyId,
    branchId: updatedSlot.branchId,
    activityId: updatedSlot.activityId,
    slotId: updatedSlot._id,
    parentId,
    childId,
    amount,
    finalAmount: amount,
    paymentStatus: amount > 0 ? "PENDING" : "PAID",
    bookingStatus: "CONFIRMED",
  });

  await Notification.create({
    userId: parentId,
    title: "Booking confirmed",
    message: `${child.fullName} is booked for ${activity.title}`,
    type: "BOOKING",
    meta: { bookingId: booking._id },
  });

  return booking;
}

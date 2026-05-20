// server/src/models/BookingSession.js
import mongoose from "mongoose";

const bookingSessionSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      required: true,
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivitySlot",
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },

    sessionNo: {
      type: Number,
      required: true,
      min: 1,
    },

    bookingMode: {
      type: String,
      enum: ["STRAIGHT", "FLEXIBLE"],
      default: "FLEXIBLE",
    },

    slotDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      required: true,
      trim: true,
    },

    sessionLabel: {
      type: String,
      default: "",
      trim: true,
    },

    sessionStatus: {
      type: String,
      enum: ["BOOKED", "ATTENDED", "MISSED", "CANCELLED"],
      default: "BOOKED",
    },

    attendanceMarkedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Unique rules
 */

// One child cannot hold the exact same slot twice.
bookingSessionSchema.index({ childId: 1, slotId: 1 }, { unique: true });

// Session numbering must be unique inside one booking.
bookingSessionSchema.index({ bookingId: 1, sessionNo: 1 }, { unique: true });

/**
 * Query indexes
 */

bookingSessionSchema.index({ bookingId: 1 });
bookingSessionSchema.index({ academyId: 1 });
bookingSessionSchema.index({ parentId: 1 });
bookingSessionSchema.index({ childId: 1 });
bookingSessionSchema.index({ slotId: 1 });
bookingSessionSchema.index({ slotDate: 1 });
bookingSessionSchema.index({ sessionStatus: 1 });

bookingSessionSchema.index({ bookingId: 1, slotDate: 1, startTime: 1 });
bookingSessionSchema.index({ slotId: 1, sessionStatus: 1 });
bookingSessionSchema.index({ parentId: 1, createdAt: -1 });
bookingSessionSchema.index({ academyId: 1, activityId: 1, slotDate: 1 });
bookingSessionSchema.index({ academyId: 1, slotDate: 1, sessionStatus: 1 });
bookingSessionSchema.index({ activityId: 1, slotDate: 1 });
bookingSessionSchema.index({ packageId: 1, slotDate: 1 });
bookingSessionSchema.index({ bookingMode: 1, slotDate: 1 });

export default mongoose.models.BookingSession ||
  mongoose.model("BookingSession", bookingSessionSchema);

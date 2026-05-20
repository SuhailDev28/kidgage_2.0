import mongoose from "mongoose";

const activitySlotSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
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

    capacity: {
      type: Number,
      default: 1,
      min: 0,
    },

    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    waitlistCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    priceOverride: {
      type: Number,
      default: null,
      min: 0,
    },

    bookingOpenAt: {
      type: Date,
      default: null,
    },

    bookingCloseAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "FULL", "CLOSED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

activitySlotSchema.virtual("availableCount").get(function () {
  return Math.max(
    0,
    Number(this.capacity || 0) - Number(this.bookedCount || 0),
  );
});

activitySlotSchema.index({ activityId: 1, packageId: 1, date: 1 });
activitySlotSchema.index({ academyId: 1, date: 1, status: 1 });
activitySlotSchema.index({ packageId: 1, date: 1, startTime: 1 });
activitySlotSchema.index({ activityId: 1, active: 1, date: 1 });

activitySlotSchema.index(
  {
    activityId: 1,
    packageId: 1,
    branchId: 1,
    date: 1,
    startTime: 1,
    endTime: 1,
  },
  { unique: true },
);

export default mongoose.models.ActivitySlot ||
  mongoose.model("ActivitySlot", activitySlotSchema);

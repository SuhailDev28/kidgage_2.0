import mongoose from "mongoose";

const activityPackageSchema = new mongoose.Schema(
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

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      default: "",
      trim: true,
    },

    packageType: {
      type: String,
      enum: ["MONTHLY", "SESSIONS", "CUSTOM"],
      default: "MONTHLY",
      index: true,
    },

    durationValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    durationUnit: {
      type: String,
      enum: ["MONTH", "SESSION", "CUSTOM"],
      default: "MONTH",
    },

    sessionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    validityDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    minSelectableSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxSelectableSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookingMode: {
      type: String,
      enum: ["STRAIGHT", "FLEXIBLE", "BOTH"],
      default: "BOTH",
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "QAR",
      trim: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

activityPackageSchema.index({ activityId: 1, active: 1, displayOrder: 1 });
activityPackageSchema.index({ academyId: 1, activityId: 1 });
activityPackageSchema.index({ activityId: 1, title: 1 }, { unique: true });

export default mongoose.models.ActivityPackage ||
  mongoose.model("ActivityPackage", activityPackageSchema);

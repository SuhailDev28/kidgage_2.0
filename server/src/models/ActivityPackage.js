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

    /**
     * Child age eligibility
     * Example:
     * minAge: 3
     * maxAge: 8
     * Means only children aged 3 to 8 can book this package.
     */
    minAge: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxAge: {
      type: Number,
      default: 18,
      min: 0,
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

/**
 * Validations
 */
activityPackageSchema.pre("validate", function validateActivityPackage(next) {
  const minAge = Number(this.minAge ?? 0);
  const maxAge = Number(this.maxAge ?? 18);

  if (Number.isFinite(minAge) && Number.isFinite(maxAge) && minAge > maxAge) {
    this.invalidate(
      "maxAge",
      "Maximum age must be greater than or equal to minimum age",
    );
  }

  const minSelectableSessions = Number(this.minSelectableSessions ?? 0);
  const maxSelectableSessions = Number(this.maxSelectableSessions ?? 0);

  if (
    Number.isFinite(minSelectableSessions) &&
    Number.isFinite(maxSelectableSessions) &&
    maxSelectableSessions > 0 &&
    minSelectableSessions > maxSelectableSessions
  ) {
    this.invalidate(
      "maxSelectableSessions",
      "Maximum selectable sessions must be greater than or equal to minimum selectable sessions",
    );
  }

  next();
});

activityPackageSchema.index({ activityId: 1, active: 1, displayOrder: 1 });
activityPackageSchema.index({ academyId: 1, activityId: 1 });
activityPackageSchema.index({ activityId: 1, title: 1 }, { unique: true });
activityPackageSchema.index({ activityId: 1, minAge: 1, maxAge: 1 });

export default mongoose.models.ActivityPackage ||
  mongoose.model("ActivityPackage", activityPackageSchema);
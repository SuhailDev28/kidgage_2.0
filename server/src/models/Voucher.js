// server/src/models/Voucher.js
import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    minBookingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    perUserLimit: {
      type: Number,
      default: 1,
      min: 0,
    },

    validFrom: {
      type: Date,
      default: null,
    },

    validTo: {
      type: Date,
      default: null,
    },

    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      default: null,
      index: true,
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      default: null,
      index: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Voucher", voucherSchema);
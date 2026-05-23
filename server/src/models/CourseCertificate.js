// server/src/models/CourseCertificate.js
import mongoose from "mongoose";

const courseCertificateSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      required: true,
      index: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      default: null,
      index: true,
    },

    certificateNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      default: "Course Completion Certificate",
      trim: true,
    },

    studentName: {
      type: String,
      default: "",
      trim: true,
    },

    courseTitle: {
      type: String,
      default: "",
      trim: true,
    },

    completedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    requiredSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["ISSUED", "REVOKED"],
      default: "ISSUED",
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revokeReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

/**
 * One course completion certificate per booking.
 * This supports both registered children and guest bookings.
 */
courseCertificateSchema.index(
  { academyId: 1, courseId: 1, bookingId: 1 },
  { unique: true },
);

courseCertificateSchema.index({ academyId: 1, createdAt: -1 });
courseCertificateSchema.index({ academyId: 1, childId: 1, createdAt: -1 });
courseCertificateSchema.index({ academyId: 1, status: 1, createdAt: -1 });

export default mongoose.models.CourseCertificate ||
  mongoose.model("CourseCertificate", courseCertificateSchema);
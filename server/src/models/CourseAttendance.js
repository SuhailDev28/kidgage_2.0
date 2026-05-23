// server/src/models/CourseAttendance.js
import mongoose from "mongoose";

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const courseAttendanceSchema = new mongoose.Schema(
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

    attendanceDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: "PRESENT",
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

/**
 * One attendance record per booking per date.
 * This supports both registered child bookings and guest bookings.
 */
courseAttendanceSchema.index(
  { academyId: 1, courseId: 1, bookingId: 1, attendanceDate: 1 },
  { unique: true },
);

courseAttendanceSchema.index({ academyId: 1, courseId: 1, createdAt: -1 });
courseAttendanceSchema.index({ academyId: 1, childId: 1, createdAt: -1 });
courseAttendanceSchema.index({ academyId: 1, status: 1, attendanceDate: -1 });

export { ATTENDANCE_STATUSES };

export default mongoose.models.CourseAttendance ||
  mongoose.model("CourseAttendance", courseAttendanceSchema);
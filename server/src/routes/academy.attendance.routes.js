// server/src/routes/academy.attendance.routes.js
import express from "express";
import mongoose from "mongoose";

import ActivityPackage from "../models/ActivityPackage.js";
import Booking from "../models/Booking.js";
import CourseAttendance from "../models/CourseAttendance.js";
import CourseCertificate from "../models/CourseCertificate.js";

import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function startOfDay(value) {
  const d = value ? new Date(value) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = value ? new Date(value) : new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function getAcademyId(req) {
  return req.user?.academyId || req.headers["x-academy-id"];
}

function makeCertificateNo() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KG-COURSE-${year}-${random}`;
}

function getBookingStudentKey(booking) {
  if (booking.childId?._id) return String(booking.childId._id);
  if (booking.childId) return String(booking.childId);

  return `guest:${booking._id}`;
}

function getBookingStudentName(booking) {
  return (
    booking.childId?.fullName ||
    booking.childId?.name ||
    booking.childSnapshot?.fullName ||
    booking.guestChild?.name ||
    "Child"
  );
}

function getBookingStudentAge(booking) {
  return (
    booking.childId?.age ||
    booking.childSnapshot?.age ||
    booking.guestChild?.age ||
    ""
  );
}

function getBookingStudentGender(booking) {
  return (
    booking.childId?.gender ||
    booking.childSnapshot?.gender ||
    booking.guestChild?.gender ||
    ""
  );
}

function getParentName(booking) {
  return booking.parentId?.name || booking.guestParent?.name || "";
}

function getParentPhone(booking) {
  return booking.parentId?.phone || booking.guestParent?.phone || "";
}

function getParentEmail(booking) {
  return booking.parentId?.email || booking.guestParent?.email || "";
}

function getRequiredSessionsFromBookingOrPackage(booking, course) {
  return (
    Number(booking?.totalSessions || 0) ||
    Number(booking?.packageSnapshot?.sessionCount || 0) ||
    Number(course?.sessionCount || 0) ||
    Number(course?.totalSessions || 0) ||
    Number(course?.durationValue || 0) ||
    Number(booking?.bookedSlotItems?.length || 0) ||
    Number(booking?.slotIds?.length || 0) ||
    0
  );
}

/**
 * GET /api/academy/attendance/courses
 * List academy courses/packages.
 */
router.get("/courses", requireAuth, async (req, res) => {
  try {
    const academyId = getAcademyId(req);

    if (!isValidObjectId(academyId)) {
      return res.status(400).json({
        success: false,
        message: "Academy is required.",
      });
    }

    const courses = await ActivityPackage.find({ academyId })
      .populate("activityId", "name title")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      courses: courses.map((course) => ({
        _id: course._id,
        title: course.title,
        slug: course.slug,
        packageType: course.packageType,
        durationValue: course.durationValue,
        durationUnit: course.durationUnit,
        totalSessions:
          Number(
            course.totalSessions ||
              course.sessionCount ||
              course.durationValue ||
              0,
          ) || 0,
        sessionCount:
          Number(
            course.sessionCount ||
              course.totalSessions ||
              course.durationValue ||
              0,
          ) || 0,
        activityId: course.activityId?._id || course.activityId || null,
        activityName:
          course.activityId?.name || course.activityId?.title || "Activity",
      })),
    });
  } catch (error) {
    console.error("Attendance courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load courses.",
    });
  }
});

/**
 * GET /api/academy/attendance/course/:courseId/students?date=2026-05-23
 * Load enrolled children/guest children and current date attendance.
 */
router.get("/course/:courseId/students", requireAuth, async (req, res) => {
  try {
    const academyId = getAcademyId(req);
    const { courseId } = req.params;
    const date = req.query.date || new Date();

    if (!isValidObjectId(academyId) || !isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid academy or course.",
      });
    }

    const course = await ActivityPackage.findOne({
      _id: courseId,
      academyId,
    })
      .populate("activityId", "name title")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const from = startOfDay(date);
    const to = endOfDay(date);

    const bookings = await Booking.find({
      academyId,
      packageId: courseId,
      bookingStatus: {
        $in: [
          "PENDING",
          "CONFIRMED",
          "PARTIALLY_BOOKED",
          "WAITLISTED",
          "COMPLETED",
        ],
      },
      paymentStatus: {
        $nin: ["FAILED", "CANCELLED", "REFUNDED"],
      },
    })
      .populate("childId", "name fullName age gender")
      .populate("parentId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map((booking) => booking._id);

    const attendanceRows = await CourseAttendance.find({
      academyId,
      courseId,
      bookingId: { $in: bookingIds },
      attendanceDate: { $gte: from, $lte: to },
    }).lean();

    const attendanceMap = new Map(
      attendanceRows.map((row) => [String(row.bookingId), row]),
    );

    const completedCounts = await CourseAttendance.aggregate([
      {
        $match: {
          academyId: toObjectId(academyId),
          courseId: toObjectId(courseId),
          bookingId: {
            $in: bookingIds.map((id) => toObjectId(id)).filter(Boolean),
          },
          status: "PRESENT",
        },
      },
      {
        $group: {
          _id: "$bookingId",
          presentCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      completedCounts.map((item) => [String(item._id), item.presentCount]),
    );

    const certificates = await CourseCertificate.find({
      academyId,
      courseId,
      bookingId: { $in: bookingIds },
    }).lean();

    const certMap = new Map(
      certificates.map((cert) => [String(cert.bookingId), cert]),
    );

    const students = bookings.map((booking) => {
      const bookingId = String(booking._id);
      const attendance = attendanceMap.get(bookingId);
      const completedSessions = Number(countMap.get(bookingId) || 0);
      const requiredSessions = getRequiredSessionsFromBookingOrPackage(
        booking,
        course,
      );
      const certificate = certMap.get(bookingId);

      return {
        bookingId,
        childId: booking.childId?._id || booking.childId || null,
        studentKey: getBookingStudentKey(booking),

        childName: getBookingStudentName(booking),
        age: getBookingStudentAge(booking),
        gender: getBookingStudentGender(booking),

        parentName: getParentName(booking),
        parentPhone: getParentPhone(booking),
        parentEmail: getParentEmail(booking),

        isGuestBooking: Boolean(booking.isGuestBooking),
        bookingNo: booking.bookingNo,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,

        status: attendance?.status || "",
        notes: attendance?.notes || "",
        attendanceId: attendance?._id || null,

        completedSessions,
        requiredSessions,
        isCompleted:
          requiredSessions > 0 && completedSessions >= requiredSessions,

        certificate: certificate
          ? {
              _id: certificate._id,
              certificateNo: certificate.certificateNo,
              issuedAt: certificate.issuedAt,
            }
          : null,
      };
    });

    res.json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        packageType: course.packageType,
        requiredSessions:
          Number(
            course.totalSessions ||
              course.sessionCount ||
              course.durationValue ||
              0,
          ) || 0,
        activityName:
          course.activityId?.name || course.activityId?.title || "Activity",
      },
      date: from,
      students,
    });
  } catch (error) {
    console.error("Load attendance students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load attendance students.",
    });
  }
});

/**
 * POST /api/academy/attendance/mark
 */
router.post("/mark", requireAuth, async (req, res) => {
  try {
    const academyId = getAcademyId(req);
    const userId = req.user?._id;

    const {
      courseId,
      bookingId,
      childId = null,
      attendanceDate,
      status,
      notes = "",
    } = req.body || {};

    if (!isValidObjectId(academyId)) {
      return res.status(400).json({
        success: false,
        message: "Academy is required.",
      });
    }

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required.",
      });
    }

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    if (!ATTENDANCE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status.",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      academyId,
      packageId: courseId,
    }).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found for this course.",
      });
    }

    const date = startOfDay(attendanceDate || new Date());

    const attendance = await CourseAttendance.findOneAndUpdate(
      {
        academyId,
        courseId,
        bookingId,
        attendanceDate: date,
      },
      {
        academyId,
        courseId,
        bookingId,
        childId: isValidObjectId(childId) ? childId : booking.childId || null,
        attendanceDate: date,
        status,
        notes: String(notes || "").trim(),
        markedBy: userId || null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const presentCount = await CourseAttendance.countDocuments({
      academyId,
      courseId,
      bookingId,
      status: "PRESENT",
    });

    const requiredSessions = getRequiredSessionsFromBookingOrPackage(
      booking,
      null,
    );

    let bookingAttendanceStatus = "PENDING";

    if (presentCount <= 0) {
      bookingAttendanceStatus = "PENDING";
    } else if (requiredSessions > 0 && presentCount >= requiredSessions) {
      bookingAttendanceStatus = "PRESENT";
    } else {
      bookingAttendanceStatus = "PARTIAL";
    }

    const bookingUpdate = {
      attendanceStatus: bookingAttendanceStatus,
    };

    if (requiredSessions > 0 && presentCount >= requiredSessions) {
      bookingUpdate.bookingStatus = "COMPLETED";
    }

    await Booking.updateOne(
      {
        _id: bookingId,
        academyId,
      },
      {
        $set: bookingUpdate,
      },
    );

    res.json({
      success: true,
      attendance,
      completedSessions: presentCount,
      requiredSessions,
      isCompleted: requiredSessions > 0 && presentCount >= requiredSessions,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this booking and date.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to mark attendance.",
    });
  }
});

/**
 * POST /api/academy/attendance/course/:courseId/certificate/:bookingId
 * Issue certificate after course completion.
 *
 * Uses bookingId instead of childId so guest bookings also work.
 */
router.post(
  "/course/:courseId/certificate/:bookingId",
  requireAuth,
  async (req, res) => {
    try {
      const academyId = getAcademyId(req);
      const userId = req.user?._id;
      const { courseId, bookingId } = req.params;

      if (
        !isValidObjectId(academyId) ||
        !isValidObjectId(courseId) ||
        !isValidObjectId(bookingId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid certificate request.",
        });
      }

      const course = await ActivityPackage.findOne({
        _id: courseId,
        academyId,
      }).lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      const booking = await Booking.findOne({
        _id: bookingId,
        academyId,
        packageId: courseId,
      }).lean();

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found for this course.",
        });
      }

      const requiredSessions = getRequiredSessionsFromBookingOrPackage(
        booking,
        course,
      );

      const completedSessions = await CourseAttendance.countDocuments({
        academyId,
        courseId,
        bookingId,
        status: "PRESENT",
      });

      if (requiredSessions > 0 && completedSessions < requiredSessions) {
        return res.status(400).json({
          success: false,
          message: `Course not completed. ${completedSessions}/${requiredSessions} sessions completed.`,
        });
      }

      const certificate = await CourseCertificate.findOneAndUpdate(
        {
          academyId,
          courseId,
          bookingId,
        },
        {
          $setOnInsert: {
            academyId,
            courseId,
            bookingId,
            childId: booking.childId || null,
            certificateNo: makeCertificateNo(),
            title: "Course Completion Certificate",
            studentName: getBookingStudentName(booking),
            courseTitle: course.title || booking.packageSnapshot?.title || "",
            completedSessions,
            requiredSessions,
            issuedAt: new Date(),
            issuedBy: userId || null,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

      await Booking.updateOne(
        {
          _id: bookingId,
          academyId,
        },
        {
          $set: {
            bookingStatus: "COMPLETED",
            attendanceStatus: "PRESENT",
          },
        },
      );

      res.json({
        success: true,
        certificate,
      });
    } catch (error) {
      console.error("Issue course certificate error:", error);

      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Certificate already issued.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to issue certificate.",
      });
    }
  },
);

export default router;
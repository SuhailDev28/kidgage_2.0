// server/src/routes/email.routes.js
import express from "express";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { sendTemplateEmail } from "../services/email.service.js";

import Booking from "../models/Booking.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function pickUserAcademyId(user) {
  return (
    user?.academyId?._id ||
    user?.academyId?.id ||
    user?.academyId ||
    user?.academy?._id ||
    user?.academy?.id ||
    user?.academy ||
    ""
  );
}

function getBookingParentEmail(booking) {
  return normalizeEmail(
    booking?.parentId?.email ||
      booking?.guestParent?.email ||
      booking?.guestParentSnapshot?.email ||
      booking?.parentEmail ||
      booking?.email ||
      booking?.customerEmail ||
      "",
  );
}

function getBookingParentName(booking) {
  return (
    booking?.parentId?.fullName ||
    booking?.parentId?.name ||
    booking?.guestParent?.fullName ||
    booking?.guestParent?.name ||
    booking?.guestParentSnapshot?.fullName ||
    booking?.parentName ||
    "Parent"
  );
}

/* -------------------------------------------------------------------------- */
/* TEST EMAIL                                                                 */
/* -------------------------------------------------------------------------- */

router.post(
  "/test",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const to = normalizeEmail(req.body?.to);

      if (!to) {
        return res.status(400).json({
          success: false,
          message: "Recipient email is required",
        });
      }

      const result = await sendTemplateEmail({
        to,
        subject: "KidGage test email",
        title: "KidGage Email Integration Works",
        preview: "This is a test email from KidGage.",
        greeting: "Hello,",
        message: `
          <p style="margin:0 0 12px;">This is a test email from your KidGage backend.</p>
          <p style="margin:0;">If you received this, SMTP is configured correctly.</p>
        `,
        buttonText: "Open KidGage",
        buttonUrl: process.env.CLIENT_URL || "http://localhost:5173",
        footer: "Email system is now connected.",
      });

      return res.json({
        success: true,
        message: "Test email processed",
        result,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* BOOKING EMAIL                                                              */
/* -------------------------------------------------------------------------- */

router.post(
  "/booking/:id/send-email",
  auth,
  requireRole("ACADEMY_ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking id.",
        });
      }

      const subject = String(req.body?.subject || "").trim();
      const message = String(req.body?.message || "").trim();

      if (!subject) {
        return res.status(400).json({
          success: false,
          message: "Email subject is required.",
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Email message is required.",
        });
      }

      const booking = await Booking.findById(id)
        .populate("parentId", "fullName name email phone")
        .lean();

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      const userRole = String(req.user?.role || "").toUpperCase();
      const userAcademyId = String(pickUserAcademyId(req.user) || "");
      const bookingAcademyId = String(booking.academyId || "");

      if (userRole !== "SUPER_ADMIN") {
        if (!userAcademyId || !bookingAcademyId) {
          return res.status(403).json({
            success: false,
            message: "Academy scope is missing.",
          });
        }

        if (userAcademyId !== bookingAcademyId) {
          return res.status(403).json({
            success: false,
            message: "You are not allowed to email this booking.",
          });
        }
      }

      const to = normalizeEmail(req.body?.to) || getBookingParentEmail(booking);

      if (!to) {
        return res.status(400).json({
          success: false,
          message: "Recipient email is required.",
        });
      }

      const parentName = escapeHtml(getBookingParentName(booking));
      const safeSubject = escapeHtml(subject);
      const safeMessage = escapeHtml(message);

      const result = await sendTemplateEmail({
        to,
        subject,
        title: safeSubject,
        preview: safeSubject,
        greeting: `Hello ${parentName},`,
        message: `
          <p style="white-space:pre-line;margin:0;">${safeMessage}</p>
        `,
        buttonText: "Open KidGage",
        buttonUrl: process.env.CLIENT_URL || "http://localhost:5173",
        footer: "Thank you for using KidGage.",
      });

      return res.json({
        success: true,
        message: "Email sent successfully.",
        bookingId: String(booking._id),
        to,
        result,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

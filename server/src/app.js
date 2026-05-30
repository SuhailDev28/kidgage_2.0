// server/src/app.js

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";

import { UPLOAD_ROOT } from "./utils/upload.js";

import { errorHandler } from "./middleware/errorHandler.js";

import {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  publicBookingLimiter,
} from "./middleware/rateLimit.js";

import authRoutes from "./routes/auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import publicVoucherRoutes from "./routes/public.voucher.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import academyRoutes from "./routes/academy.routes.js";

import superAdminRoutes from "./routes/superadmin.routes.js";
import superAdminCategoriesRoutes from "./routes/superadmin.categories.routes.js";
import superAdminCertificateTemplatesRoutes from "./routes/superadmin.certificateTemplates.routes.js";
import superAdminPaymentsRoutes from "./routes/superadmin.payments.routes.js";
import superAdminSmtpRoutes from "./routes/superadmin.smtp.routes.js";
import superAdminEmailTemplatesRoutes from "./routes/superadmin.emailTemplates.routes.js";
import superAdminVoucherRoutes from "./routes/voucher.routes.js";

import paymentRoutes from "./routes/payment.routes.js";
import myfatoorahRoutes from "./routes/myfatoorah.routes.js";
import academySettingsRoutes from "./routes/academy.settings.routes.js";
import emailRoutes from "./routes/email.routes.js";
import socialAuthRoutes from "./routes/socialAuth.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import academyAttendanceRoutes from "./routes/academy.attendance.routes.js";

export const app = express();

/* ---------------------------------
 * CORS
 * -------------------------------- */
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ---------------------------------
 * Security + logging
 * -------------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* ---------------------------------
 * Body parsers
 * -------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ---------------------------------
 * Static uploads
 *
 * Render Pro Disk:
 * Disk mount path should be /var/data
 * Uploaded files should be saved in /var/data/uploads
 * -------------------------------- */
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=604800");
    },
  }),
);

/* ---------------------------------
 * Health check
 * No rate limit needed
 * -------------------------------- */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "KidGage API",
    env: process.env.NODE_ENV || "development",
    uploads: {
      root: UPLOAD_ROOT,
      exists: fs.existsSync(UPLOAD_ROOT),
      persistentDisk:
        process.env.NODE_ENV === "production" &&
        UPLOAD_ROOT.startsWith("/var/data"),
    },
  });
});

/* ---------------------------------
 * Upload debug check
 * Useful after Render redeploy
 * -------------------------------- */
app.get("/api/uploads/status", (_req, res) => {
  let files = [];

  try {
    files = fs
      .readdirSync(UPLOAD_ROOT, { withFileTypes: true })
      .slice(0, 50)
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
      }));
  } catch {
    files = [];
  }

  res.json({
    success: true,
    root: UPLOAD_ROOT,
    exists: fs.existsSync(UPLOAD_ROOT),
    files,
  });
});

/* ---------------------------------
 * Rate limits
 *
 * Important:
 * Keep this after health checks and before routes.
 * -------------------------------- */

// General API protection
app.use("/api", apiLimiter);

// Strict auth protection
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

// Social auth can also be abused
app.use("/api/auth/social", authLimiter);

// Booking creation / enquiry protection
app.use("/api/public/bookings", publicBookingLimiter);
app.use("/api/public/booking", publicBookingLimiter);
app.use("/api/public/enquiries", publicBookingLimiter);
app.use("/api/public/enquiry", publicBookingLimiter);

// Payment protection
app.use("/api/payments", paymentLimiter);

/* ---------------------------------
 * API routes
 * -------------------------------- */
app.use("/api/auth", authRoutes);

/*
 * Public routes
 *
 * Mount voucher routes BEFORE main publicRoutes only if publicRoutes has
 * generic catch-all handlers. This keeps /api/public/vouchers/apply safe.
 */
app.use("/api/public/vouchers", publicVoucherRoutes);
app.use("/api/public", publicRoutes);

app.use("/api/parent", parentRoutes);
app.use("/api/academy", academyRoutes);

/*
 * Specific Super Admin modules must be mounted BEFORE main superAdminRoutes.
 * This prevents generic /api/super-admin handlers from catching these routes first.
 */
app.use("/api/super-admin/categories", superAdminCategoriesRoutes);
app.use("/api/super-admin/vouchers", superAdminVoucherRoutes);
app.use("/api/super-admin", superAdminCertificateTemplatesRoutes);
app.use("/api/super-admin", superAdminSmtpRoutes);
app.use("/api/super-admin", superAdminEmailTemplatesRoutes);
app.use("/api/super-admin", superAdminPaymentsRoutes);

/*
 * Main Super Admin routes should come after the specific modules.
 */
app.use("/api/super-admin", superAdminRoutes);

app.use("/api/academy", academySettingsRoutes);
app.use("/api/auth/social", socialAuthRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/academy/attendance", academyAttendanceRoutes);

/* ---------------------------------
 * Payment routes
 *
 * IMPORTANT:
 * MyFatoorah must be mounted before /api/payments
 * because callback URL is /api/payments/myfatoorah/callback
 * -------------------------------- */
app.use("/api/payments/myfatoorah", myfatoorahRoutes);
app.use("/api/payments", paymentRoutes);

/* ---------------------------------
 * Email routes
 * Must stay before /api 404 fallback
 * -------------------------------- */
app.use("/api/emails", emailRoutes);

/* ---------------------------------
 * API 404 fallback
 * -------------------------------- */
app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

/* ---------------------------------
 * Global error handler
 * -------------------------------- */
app.use(errorHandler);
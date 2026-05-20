import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import { errorHandler } from "./middleware/errorHandler.js";

import {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  publicBookingLimiter,
} from "./middleware/rateLimit.js";

import authRoutes from "./routes/auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import academyRoutes from "./routes/academy.routes.js";
import superAdminRoutes from "./routes/superadmin.routes.js";
import superAdminCategoriesRoutes from "./routes/superadmin.categories.routes.js";

import paymentRoutes from "./routes/payment.routes.js";
import myfatoorahRoutes from "./routes/myfatoorah.routes.js";
import superAdminPaymentsRoutes from "./routes/superadmin.payments.routes.js";
import academySettingsRoutes from "./routes/academy.settings.routes.js";
import emailRoutes from "./routes/email.routes.js";
import socialAuthRoutes from "./routes/socialAuth.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

export const app = express();

/* ---------------------------------
 * CORS
 * -------------------------------- */
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173"
) //,"http://192.168.18.11:5173"
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
  }),
);

app.use(morgan("dev"));

/* ---------------------------------
 * Body parsers
 * -------------------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ---------------------------------
 * Static uploads
 * -------------------------------- */
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
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
  });
});

/* ---------------------------------
 * Rate limits
 * ---------------------------------
 * Important:
 * Keep this after health check and before routes.
 */

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
// This protects public booking-related requests.
// If your exact booking create route is different,
// this still safely protects public booking URLs.
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
app.use("/api/public", publicRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/academy", academyRoutes);

app.use("/api/super-admin/categories", superAdminCategoriesRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/academy", academySettingsRoutes);
app.use("/api/auth/social", socialAuthRoutes);
app.use("/api/notifications", notificationRoutes);

/* ---------------------------------
 * Payment routes
 * IMPORTANT:
 * MyFatoorah must be mounted before /api/payments
 * because callback URL is /api/payments/myfatoorah/callback
 * -------------------------------- */
app.use("/api/payments/myfatoorah", myfatoorahRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/super-admin", superAdminPaymentsRoutes);

/* ---------------------------------
 * Email routes
 * Must stay before /api 404 fallback
 * -------------------------------- */
app.use("/api/emails", emailRoutes);

/* ---------------------------------
 * 404 fallback for API routes
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

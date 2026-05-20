// server/src/middleware/rateLimit.js
import rateLimit from "express-rate-limit";

function normalizeBool(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
}

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const RATE_LIMIT_ENABLED = normalizeBool(process.env.RATE_LIMIT_ENABLED, true);

function isSafeDashboardGet(req) {
  if (req.method !== "GET") return false;

  const path = String(req.originalUrl || req.url || "");

  return (
    path.includes("/api/notifications") ||
    path.includes("/api/public/settings") ||
    path.includes("/api/public/home") ||
    path.includes("/api/public/banners") ||
    path.includes("/api/public/categories") ||
    path.includes("/api/public/events") ||
    path.includes("/api/public/blogs") ||
    path.includes("/api/public/legal") ||
    path.includes("/api/public/content-pages")
  );
}

export const apiLimiter = rateLimit({
  windowMs: normalizeNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: normalizeNumber(process.env.RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    if (!RATE_LIMIT_ENABLED) return true;

    // Avoid blocking normal dashboard/public read requests.
    if (isSafeDashboardGet(req)) return true;

    return false;
  },

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: normalizeNumber(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  max: normalizeNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => !RATE_LIMIT_ENABLED,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

export const paymentLimiter = rateLimit({
  windowMs: normalizeNumber(
    process.env.PAYMENT_RATE_LIMIT_WINDOW_MS,
    10 * 60 * 1000,
  ),
  max: normalizeNumber(process.env.PAYMENT_RATE_LIMIT_MAX, 40),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMIT_ENABLED,
  message: {
    success: false,
    message: "Too many payment requests. Please try again later.",
  },
});

export const publicBookingLimiter = rateLimit({
  windowMs: normalizeNumber(
    process.env.BOOKING_RATE_LIMIT_WINDOW_MS,
    10 * 60 * 1000,
  ),
  max: normalizeNumber(process.env.BOOKING_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMIT_ENABLED,
  message: {
    success: false,
    message: "Too many booking requests. Please try again later.",
  },
});

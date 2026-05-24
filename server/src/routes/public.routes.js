// server/src/routes/public.routes.js

import { Router } from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import multer from "multer";

import Banner from "../models/Banner.js";
import Category from "../models/Category.js";
import AcademyRegistration from "../models/AcademyRegistration.js";
import AppSetting from "../models/AppSetting.js";
import Event from "../models/Event.js";
import ContentPage from "../models/ContentPage.js";
import Booking from "../models/Booking.js";
import Activity from "../models/Activity.js";
import ContactMessage from "../models/ContactMessage.js";

import { notifyAcademyRegistrationSubmitted } from "../services/notification.service.js";
import { sendKidgageEmail } from "../services/email/smtp.service.js";

import {
  academyDetails,
  activityDetails,
  blogDetails,
  createGuestBooking,
  getActivityBookingData,
  getAvailableDates,
  getFlexibleDateRange,
  getPublicBookingById,
  getSlotsByDate,
  getStraightSchedulePreview,
  home,
  listAcademies,
  listActivities,
  listBlogs,
} from "../controllers/public.controller.js";

const router = Router();

/* ---------------------------------
 * Provider joining upload
 * -------------------------------- */
const registrationUploadsDir = path.join(
  process.cwd(),
  "uploads",
  "academy-registrations",
);

fs.mkdirSync(registrationUploadsDir, { recursive: true });

const registrationStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, registrationUploadsDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const filename = `registration-${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${ext}`;
    cb(null, filename);
  },
});

const registrationUpload = multer({
  storage: registrationStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const isPdf =
      file.mimetype === "application/pdf" ||
      String(file.originalname || "")
        .toLowerCase()
        .endsWith(".pdf");

    if (isPdf) return cb(null, true);

    return cb(new Error("Only PDF files are allowed"));
  },
});

/* ---------------------------------
 * Helpers
 * -------------------------------- */
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const PUBLIC_ACTIVITY_FILTER = {
  status: "PUBLISHED",
  approvalStatus: "APPROVED",
};

async function ensurePublicActivityApproved(req, res, next) {
  try {
    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        message: "Activity slug is required",
      });
    }

    const activity = await Activity.findOne({
      slug,
      ...PUBLIC_ACTIVITY_FILTER,
    })
      .select("_id slug status approvalStatus")
      .lean();

    if (!activity) {
      return res.status(404).json({
        message: "Activity not found or not approved yet",
        activity: null,
      });
    }

    req.publicActivity = activity;
    req.publicActivityFilter = PUBLIC_ACTIVITY_FILTER;

    return next();
  } catch (error) {
    return next(error);
  }
}

async function getPublicSettings() {
  const settings = await AppSetting.findOne({ key: "GLOBAL" }).lean();
  return settings || null;
}

async function expirePendingPublicBookings(_req, _res, next) {
  try {
    if (typeof Booking.expirePendingBookings === "function") {
      await Booking.expirePendingBookings();
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function buildDefaultSettings() {
  return {
    siteName: "KidGage",
    tagline: "Discover the best kids activities in Qatar",
    logo: "",
    favicon: "",
    logoUpdatedAt: null,
    primaryColor: "#2563eb",
    secondaryColor: "#6d28d9",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    website: "",
    address: "",
    footerDescription:
      "Book activities for kids across trusted academies and help parents discover enriching experiences with confidence, clarity, and joy.",
    footerCopyright: "© KidGage. All rights reserved.",
    metaTitle: "KidGage | Kids Activities Booking Platform",
    metaDescription:
      "Book activities, programs, and events for children across trusted academies.",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
    allowProviderRegistration: true,
    allowParentRegistration: true,
    showBlogs: true,
    showEvents: true,
    showTopBrands: true,
    showTopActivities: true,
    maintenanceMode: false,
    maintenanceMessage: "We are updating KidGage. Please check back shortly.",
    updatedAt: null,
  };
}

function normalizePublicSettings(settings) {
  const defaults = buildDefaultSettings();

  if (!settings) {
    return defaults;
  }

  return {
    _id: settings._id,
    key: settings.key,

    siteName: settings.siteName || defaults.siteName,
    tagline: settings.tagline || defaults.tagline,
    logo: settings.logo || "",
    favicon: settings.favicon || "",
    logoUpdatedAt: settings.logoUpdatedAt || settings.updatedAt || null,

    primaryColor: settings.primaryColor || defaults.primaryColor,
    secondaryColor: settings.secondaryColor || defaults.secondaryColor,

    menuLinkColor: settings.menuLinkColor || "#475569",
    menuLinkHoverColor: settings.menuLinkHoverColor || "#ec7a3b",
    menuLinkActiveColor: settings.menuLinkActiveColor || "#ec7a3b",
    menuLinkActiveBg: settings.menuLinkActiveBg || "#fff4ec",

    contactEmail: settings.contactEmail || "",
    contactPhone: settings.contactPhone || "",
    whatsapp: settings.whatsapp || "",
    website: settings.website || "",
    address: settings.address || "",

    footerDescription: settings.footerDescription || defaults.footerDescription,
    footerCopyright: settings.footerCopyright || defaults.footerCopyright,

    metaTitle: settings.metaTitle || defaults.metaTitle,
    metaDescription: settings.metaDescription || defaults.metaDescription,

    instagram: settings.instagram || "",
    facebook: settings.facebook || "",
    youtube: settings.youtube || "",
    linkedin: settings.linkedin || "",
    tiktok: settings.tiktok || "",

    allowProviderRegistration: settings.allowProviderRegistration !== false,
    allowParentRegistration: settings.allowParentRegistration !== false,

    showBlogs: settings.showBlogs !== false,
    showEvents: settings.showEvents !== false,
    showTopBrands: settings.showTopBrands !== false,
    showTopActivities: settings.showTopActivities !== false,

    maintenanceMode: Boolean(settings.maintenanceMode),
    maintenanceMessage:
      settings.maintenanceMessage || defaults.maintenanceMessage,
    updatedAt: settings.updatedAt || null,
  };
}

function normalizeEventForPublic(event) {
  const startDate = event?.startDate || event?.eventDate || null;
  const endDate = event?.endDate || null;
  const status = String(event?.status || "PUBLISHED").toUpperCase();

  const active =
    event?.active !== undefined
      ? Boolean(event.active)
      : status === "PUBLISHED";

  const title = event?.title || event?.name || "Event";
  const city = event?.city || "Doha";
  const venue = event?.venue || "";

  return {
    _id: event._id,
    id: event._id,

    title,
    name: title,
    slug: event.slug || String(event._id || ""),
    description: event.description || "",

    image: event.image || "",
    poster: event.image || "",
    thumbnail: event.image || "",
    coverImage: event.image || "",

    link: event.link || "",
    url: event.link || "",

    startDate,
    endDate,
    eventDate: startDate || event.createdAt || null,
    date: startDate || event.createdAt || null,

    venue,
    city,
    location: event.location || venue || city || "Doha",
    address: event.address || venue || city || "Doha",

    active,
    status: active ? "ACTIVE" : "INACTIVE",
    rawStatus: status,

    createdAt: event.createdAt || null,
    updatedAt: event.updatedAt || null,
  };
}

function buildPublicEventFilter() {
  return {
    $or: [
      { active: true },
      { status: "PUBLISHED" },
      { active: { $exists: false }, status: "PUBLISHED" },
    ],
  };
}

function normalizeContentPageForPublic(page, fallback = {}) {
  return {
    _id: page?._id || null,
    id: page?._id || null,

    title: page?.title || fallback.title || "",
    slug: page?.slug || fallback.slug || "",
    type: page?.type || fallback.type || "PAGE",

    excerpt: page?.excerpt || fallback.excerpt || "",
    content: page?.content || fallback.content || "",

    status: page?.status || fallback.status || "PUBLISHED",
    active: page?.active !== false,

    publishedAt: page?.publishedAt || fallback.publishedAt || null,
    createdAt: page?.createdAt || fallback.createdAt || null,
    updatedAt: page?.updatedAt || fallback.updatedAt || null,
  };
}

/* ---------------------------------
 * Default legal page content
 * Keep plain numbered text for frontend parsing
 * -------------------------------- */
const DEFAULT_TERMS_PAGE = {
  title: "Terms & Conditions",
  slug: "terms-and-conditions",
  type: "TERMS_CONDITIONS",
  excerpt:
    "These terms govern the use of KidGage by parents, guardians, academies, activity providers, and administrators using the platform.",
  content: `1. Acceptance of Terms

By accessing or using KidGage, you agree to comply with these terms and any related policies published on the platform.

2. Platform Services

KidGage provides a platform for discovering academies, viewing activities, checking availability, making bookings, and managing related account information.

We may update, improve, suspend, or remove features at any time to maintain service quality and security.

3. User Accounts

Users are responsible for maintaining accurate profile information and protecting login credentials.

You are responsible for activity conducted through your account unless unauthorized access is reported promptly.

4. Bookings and Payments

Booking availability is subject to academy schedules, slot capacity, and provider rules.

Payment terms, refund rules, cancellation policies, and rescheduling conditions may vary by academy or activity provider.

5. Provider Responsibilities

Activity providers and academies must ensure that published content, pricing, schedules, and operational details are accurate and kept up to date.

6. Acceptable Use

Users may not misuse the platform, interfere with security, submit misleading data, or attempt unauthorized access to accounts, systems, or protected content.

7. Intellectual Property

KidGage branding, interface elements, platform design, and related content remain the property of KidGage unless otherwise stated.

8. Limitation of Liability

KidGage acts as a technology platform. Activity delivery, service quality, safety practices, and on-site operations remain the responsibility of the academy or provider offering the activity.

9. Updates to These Terms

We may revise these terms from time to time. Continued use of the platform after updates means you accept the revised terms.

10. Contact

For questions regarding these terms, please use the contact page on the platform.`,
};

const DEFAULT_PRIVACY_PAGE = {
  title: "Privacy Policy",
  slug: "privacy-policy",
  type: "PRIVACY_POLICY",
  excerpt:
    "This policy explains how KidGage collects, uses, stores, and protects personal information across parent, academy, and admin accounts.",
  content: `1. Information We Collect

We may collect names, email addresses, phone numbers, account credentials, child-related booking information, academy details, and transaction-related information.

2. How We Use Information

We use information to provide bookings, manage accounts, process transactions, communicate updates, improve platform services, and maintain security and compliance.

3. Provider and Booking Data

Information submitted by academies and providers may be used to display listings, manage campaigns, process onboarding, and support operations within the platform.

4. Sharing of Data

We only share relevant data with academies, providers, payment processors, technical service partners, or legal authorities when necessary to deliver services or comply with applicable law.

5. Data Security

We use reasonable technical and administrative safeguards to protect personal information against unauthorized access, loss, or misuse.

6. Data Retention

We retain information only as long as necessary for operational, contractual, accounting, support, or legal purposes.

7. User Rights

Users may request access, correction, or deletion of personal information, subject to legal, contractual, or operational requirements.

8. Cookies and Analytics

KidGage may use cookies, analytics, and essential technical data to improve functionality, performance, and user experience.

9. Changes to This Policy

This privacy policy may be updated from time to time. Continued use of the platform after changes indicates acceptance of the revised policy.

10. Contact

For privacy-related questions or requests, please use the contact page on the platform.`,
};

function isTermsSlug(slug) {
  return ["terms", "terms-conditions", "terms-and-conditions"].includes(
    String(slug || "")
      .trim()
      .toLowerCase(),
  );
}

function isPrivacySlug(slug) {
  return ["privacy", "privacy-policy"].includes(
    String(slug || "")
      .trim()
      .toLowerCase(),
  );
}

function normalizeLegalType(type) {
  const value = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const typeMap = {
    PRIVACY: "PRIVACY_POLICY",
    PRIVACY_POLICY: "PRIVACY_POLICY",

    TERMS: "TERMS_CONDITIONS",
    TERMS_CONDITIONS: "TERMS_CONDITIONS",
    TERMS_AND_CONDITIONS: "TERMS_CONDITIONS",
    TERMS_AND_CONDITION: "TERMS_CONDITIONS",
  };

  return typeMap[value] || "";
}

async function findPublishedContentPageBySlug(slug) {
  return ContentPage.findOne({
    slug,
    active: true,
    status: "PUBLISHED",
  }).lean();
}

async function findPublishedContentPageBySlugList(slugs = []) {
  const safeSlugs = slugs
    .map((item) =>
      String(item || "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  if (!safeSlugs.length) return null;

  return ContentPage.findOne({
    slug: { $in: safeSlugs },
    active: true,
    status: "PUBLISHED",
  })
    .sort({ updatedAt: -1 })
    .lean();
}

async function findPublishedContentPageByTypeList(types = []) {
  const safeTypes = types
    .map((item) =>
      String(item || "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);

  if (!safeTypes.length) return null;

  return ContentPage.findOne({
    type: { $in: safeTypes },
    active: true,
    status: "PUBLISHED",
  })
    .sort({ updatedAt: -1 })
    .lean();
}

async function findTermsPage() {
  return (
    (await findPublishedContentPageBySlugList([
      "terms-and-conditions",
      "terms-conditions",
      "terms",
    ])) ||
    (await findPublishedContentPageByTypeList([
      "TERMS_CONDITIONS",
      "TERMS_AND_CONDITIONS",
      "TERMS",
    ]))
  );
}

async function findPrivacyPage() {
  return (
    (await findPublishedContentPageBySlugList(["privacy-policy", "privacy"])) ||
    (await findPublishedContentPageByTypeList(["PRIVACY_POLICY", "PRIVACY"]))
  );
}

async function findContentPageWithFallbackBySlug(slug) {
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return {
      page: null,
      fallback: null,
      source: "",
    };
  }

  if (isPrivacySlug(normalizedSlug)) {
    const page = await findPrivacyPage();

    return {
      page,
      fallback: DEFAULT_PRIVACY_PAGE,
      source: page ? "database" : "default",
    };
  }

  if (isTermsSlug(normalizedSlug)) {
    const page = await findTermsPage();

    return {
      page,
      fallback: DEFAULT_TERMS_PAGE,
      source: page ? "database" : "default",
    };
  }

  const page = await findPublishedContentPageBySlug(normalizedSlug);

  return {
    page,
    fallback: null,
    source: page ? "database" : "",
  };
}

/* ---------------------------------
 * Public settings endpoint
 * Must stay before maintenance guard
 * -------------------------------- */
router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await getPublicSettings();

    return res.json({
      settings: normalizePublicSettings(settings),
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Maintenance guard
 * -------------------------------- */
router.use(async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    if (!settings?.maintenanceMode) {
      return next();
    }

    const allowedPaths = new Set([
      "/settings",
      "/provider-joining-form",
      "/contact",

      "/terms-and-conditions",
      "/terms-conditions",
      "/terms",
      "/privacy-policy",
      "/privacy",

      "/content-pages/privacy-policy",
      "/content-pages/privacy",
      "/content-pages/terms-and-conditions",
      "/content-pages/terms-conditions",
      "/content-pages/terms",

      "/legal/PRIVACY_POLICY",
      "/legal/PRIVACY",
      "/legal/privacy-policy",
      "/legal/privacy",

      "/legal/TERMS_CONDITIONS",
      "/legal/TERMS_AND_CONDITIONS",
      "/legal/TERMS",
      "/legal/terms-conditions",
      "/legal/terms-and-conditions",
      "/legal/terms",
    ]);

    const dynamicAllowed =
      req.path.startsWith("/bookings/") || req.path.startsWith("/booking/");

    if (allowedPaths.has(req.path) || dynamicAllowed) {
      return next();
    }

    return res.status(503).json({
      message:
        settings.maintenanceMessage ||
        "We are updating KidGage. Please check back shortly.",
      maintenanceMode: true,
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Public Content Pages
 * -------------------------------- */
router.get("/content-pages/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();

    if (!slug) {
      return res.status(400).json({
        page: null,
        message: "Content page slug is required",
      });
    }

    const { page, fallback, source } =
      await findContentPageWithFallbackBySlug(slug);

    if (!page && !fallback) {
      return res.status(404).json({
        page: null,
        message: "Content page not found",
      });
    }

    return res.json({
      page: normalizeContentPageForPublic(page, fallback),
      source,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/legal/:type", async (req, res, next) => {
  try {
    const type = normalizeLegalType(req.params.type);

    if (!type) {
      return res.status(400).json({
        page: null,
        message: "Invalid legal page type",
      });
    }

    const page =
      type === "PRIVACY_POLICY"
        ? await findPrivacyPage()
        : await findTermsPage();

    const fallback =
      type === "PRIVACY_POLICY" ? DEFAULT_PRIVACY_PAGE : DEFAULT_TERMS_PAGE;

    return res.json({
      page: normalizeContentPageForPublic(page, fallback),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/terms-and-conditions", async (_req, res, next) => {
  try {
    const page = await findTermsPage();

    return res.json({
      page: normalizeContentPageForPublic(page, DEFAULT_TERMS_PAGE),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/terms-conditions", async (_req, res, next) => {
  try {
    const page = await findTermsPage();

    return res.json({
      page: normalizeContentPageForPublic(page, DEFAULT_TERMS_PAGE),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/terms", async (_req, res, next) => {
  try {
    const page = await findTermsPage();

    return res.json({
      page: normalizeContentPageForPublic(page, DEFAULT_TERMS_PAGE),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/privacy-policy", async (_req, res, next) => {
  try {
    const page = await findPrivacyPage();

    return res.json({
      page: normalizeContentPageForPublic(page, DEFAULT_PRIVACY_PAGE),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/privacy", async (_req, res, next) => {
  try {
    const page = await findPrivacyPage();

    return res.json({
      page: normalizeContentPageForPublic(page, DEFAULT_PRIVACY_PAGE),
      source: page ? "database" : "default",
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Home + public listings
 * -------------------------------- */
router.get("/home", async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    const originalJson = res.json.bind(res);

    res.json = (payload) => {
      const safePayload = payload && typeof payload === "object" ? payload : {};

      return originalJson({
        ...safePayload,

        featuredAcademies:
          settings?.showTopBrands === false
            ? []
            : Array.isArray(safePayload.featuredAcademies)
              ? safePayload.featuredAcademies
              : [],

        topActivities:
          settings?.showTopActivities === false
            ? []
            : Array.isArray(safePayload.topActivities)
              ? safePayload.topActivities
              : [],

        blogs:
          settings?.showBlogs === false
            ? []
            : Array.isArray(safePayload.blogs)
              ? safePayload.blogs
              : [],

        events:
          settings?.showEvents === false
            ? []
            : Array.isArray(safePayload.events)
              ? safePayload.events
              : [],
      });
    };

    return home(req, res, next);
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Contact form
 * -------------------------------- */
router.post("/contact", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required.",
      });
    }

    if (!subject || subject.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Subject is required.",
      });
    }

    if (!message || message.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      source: "CONTACT_PAGE",
      status: "NEW",
      userAgent: req.get("user-agent") || "",
      ip:
        String(req.headers["x-forwarded-for"] || "")
          .split(",")[0]
          .trim() ||
        req.socket?.remoteAddress ||
        "",
    });

    let emailSent = false;
    let emailError = "";

    try {
      const appSettings =
        (await AppSetting.findOne({ key: "GLOBAL" }).lean()) ||
        (await AppSetting.findOne({}).sort({ createdAt: -1 }).lean()) ||
        {};

      const receiverEmail =
        String(appSettings.contactEmail || "").trim() ||
        String(process.env.CONTACT_RECEIVER_EMAIL || "").trim();

      if (!receiverEmail) {
        throw new Error(
          "Contact receiver email is not configured. Set Contact Email in Platform Settings or CONTACT_RECEIVER_EMAIL in Render env.",
        );
      }

      await sendKidgageEmail({
        to: receiverEmail,
        replyTo: email,
        subject: `KidGage Contact Form: ${subject}`,
        text: `
New contact message from KidGage

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
        `.trim(),
        html: `
          <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
            <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:18px;padding:24px;border:1px solid #e2e8f0">
              <h2 style="margin:0 0 12px;color:#ec7a3b">New Contact Message</h2>

              <table style="width:100%;border-collapse:collapse;margin-top:16px">
                <tr>
                  <td style="padding:8px 0;font-weight:bold;width:120px">Name</td>
                  <td style="padding:8px 0">${escapeHtml(name)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:bold">Email</td>
                  <td style="padding:8px 0">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:bold">Subject</td>
                  <td style="padding:8px 0">${escapeHtml(subject)}</td>
                </tr>
              </table>

              <div style="margin-top:20px;padding:16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa">
                <div style="font-weight:bold;margin-bottom:8px">Message</div>
                <div style="white-space:pre-line;line-height:1.6">${escapeHtml(message)}</div>
              </div>

              <p style="margin-top:18px;font-size:12px;color:#64748b">
                Reply directly to this email to contact ${escapeHtml(name)}.
              </p>
            </div>
          </div>
        `,
      });

      emailSent = true;
    } catch (mailError) {
      emailError = mailError?.message || "Email sending failed.";
      console.error("Contact email send error:", mailError);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Your message has been received and emailed."
        : "Your message has been received, but email delivery failed.",
      emailSent,
      emailError,
      contactMessage,
    });
  } catch (error) {
    console.error("Public contact submit error:", error);
    return next(error);
  }
});

/* ---------------------------------
 * Academies
 * -------------------------------- */
router.get("/academies", listAcademies);
router.get("/academies/:slug", academyDetails);

/* ---------------------------------
 * Activities
 * -------------------------------- */
router.get(
  "/activities",
  (req, _res, next) => {
    req.publicActivityFilter = PUBLIC_ACTIVITY_FILTER;
    return next();
  },
  listActivities,
);
router.get("/activities/:slug", ensurePublicActivityApproved, activityDetails);

/* ---------------------------------
 * Booking flow endpoints
 * Expire old unpaid bookings before availability checks
 * -------------------------------- */
router.get(
  "/activities/:slug/booking-data",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  getActivityBookingData,
);

router.get(
  "/activities/:slug/available-dates",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  getAvailableDates,
);

router.get(
  "/activities/:slug/slots",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  getSlotsByDate,
);

router.get(
  "/activities/:slug/flexible-date-range",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  getFlexibleDateRange,
);

router.get(
  "/activities/:slug/straight-schedule-preview",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  getStraightSchedulePreview,
);

/* ---------------------------------
 * Guest booking endpoint
 * Expire old unpaid bookings before creating a new booking
 * -------------------------------- */
router.post(
  "/activities/:slug/guest-booking",
  expirePendingPublicBookings,
  ensurePublicActivityApproved,
  createGuestBooking,
);

/* ---------------------------------
 * Public guest booking details
 * Used by BookingSuccessPage
 * -------------------------------- */
router.get(
  "/bookings/:bookingId",
  expirePendingPublicBookings,
  getPublicBookingById,
);

router.get(
  "/booking/:bookingId",
  expirePendingPublicBookings,
  getPublicBookingById,
);

/* ---------------------------------
 * Blogs
 * -------------------------------- */
router.get("/blogs", async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    if (settings?.showBlogs === false) {
      return res.json({ blogs: [] });
    }

    return listBlogs(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get("/blogs/:slug", async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    if (settings?.showBlogs === false) {
      return res.status(404).json({
        blog: null,
        message: "Blogs are currently unavailable",
      });
    }

    return blogDetails(req, res, next);
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Public Events from Super Admin Events
 * -------------------------------- */
router.get("/events", async (_req, res, next) => {
  try {
    const settings = await getPublicSettings();

    if (settings?.showEvents === false) {
      return res.json({
        count: 0,
        events: [],
      });
    }

    const events = await Event.find(buildPublicEventFilter())
      .sort({
        eventDate: 1,
        startDate: 1,
        createdAt: -1,
      })
      .lean();

    return res.json({
      count: events.length,
      events: events.map(normalizeEventForPublic),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/events/:slugOrId", async (req, res, next) => {
  try {
    const settings = await getPublicSettings();

    if (settings?.showEvents === false) {
      return res.status(404).json({
        event: null,
        message: "Events are currently unavailable",
      });
    }

    const slugOrId = String(req.params.slugOrId || "").trim();

    if (!slugOrId) {
      return res.status(400).json({
        event: null,
        message: "Event id or slug is required",
      });
    }

    const identityFilter = isValidObjectId(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId };

    const event = await Event.findOne({
      $and: [identityFilter, buildPublicEventFilter()],
    }).lean();

    if (!event) {
      return res.status(404).json({
        event: null,
        message: "Event not found",
      });
    }

    return res.json({
      event: normalizeEventForPublic(event),
    });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Provider joining form
 * -------------------------------- */
router.post(
  "/provider-joining-form",
  registrationUpload.single("crDocument"),
  async (req, res, next) => {
    try {
      const settings = await getPublicSettings();

      if (settings?.allowProviderRegistration === false) {
        return res.status(403).json({
          message: "Provider registration is currently disabled.",
        });
      }

      const academyName = String(req.body.academyName || "").trim();
      const location = String(req.body.location || "").trim();
      const bio = String(req.body.bio || "").trim();
      const address = String(req.body.address || "").trim();
      const crNumber = String(req.body.crNumber || "").trim();
      const phone = String(req.body.phone || "").trim();
      const email = String(req.body.email || "").trim();
      const fullName = String(req.body.fullName || "").trim();
      const designation = String(req.body.designation || "").trim();
      const website = String(req.body.website || "").trim();
      const instagram = String(req.body.instagram || "").trim();
      const agreed = String(req.body.agreed || "false") === "true";

      if (!academyName) {
        return res.status(400).json({ message: "Academy name is required" });
      }

      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }

      if (!bio) {
        return res.status(400).json({ message: "Academy bio is required" });
      }

      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      if (!crNumber) {
        return res.status(400).json({ message: "CR number is required" });
      }

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!fullName) {
        return res.status(400).json({ message: "Full name is required" });
      }

      if (!designation) {
        return res.status(400).json({ message: "Designation is required" });
      }

      if (!agreed) {
        return res.status(400).json({
          message: "You must accept the declaration",
        });
      }

      const registration = await AcademyRegistration.create({
        academyName,
        location,
        bio,
        address,
        crNumber,
        crDocument: req.file
          ? `/uploads/academy-registrations/${req.file.filename}`
          : "",
        phone,
        email,
        fullName,
        designation,
        website,
        instagram,
        agreed,
      });

      await Promise.allSettled([
        notifyAcademyRegistrationSubmitted({
          registration,
        }),
      ]);

      return res.status(201).json({
        message: "Provider joining form submitted successfully",
        registration,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------
 * Categories
 * -------------------------------- */
router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Category.find({ status: "ACTIVE" })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ categories });
  } catch (error) {
    next(error);
  }
});

/* ---------------------------------
 * Banners
 * -------------------------------- */
router.get("/banners", async (_req, res, next) => {
  try {
    const banners = await Banner.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ banners });
  } catch (error) {
    next(error);
  }
});

export default router;

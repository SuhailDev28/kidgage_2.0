// server/src/routes/notification.routes.js

import express from "express";
import mongoose from "mongoose";

import Notification, {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
} from "../models/Notification.js";

import { auth } from "../middleware/auth.js";

import {
  buildNotificationListQueryForUser,
  getUnreadNotificationCountForUser,
  getNotificationStatsForUser,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsReadForUser,
  deleteNotificationForUser,
} from "../services/notification.service.js";

const router = express.Router();

router.use(auth);

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function parsePositiveInt(value, fallback = 1, max = 100) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.min(Math.max(Math.floor(n), 1), max);
}

function normalizeUpper(value = "", fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

/* -------------------------------------------------------------------------- */
/* GET /api/notifications                                                     */
/* -------------------------------------------------------------------------- */

router.get("/", async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 15, 100);
    const skip = (page - 1) * limit;

    const filters = {
      status: req.query.status || "ALL",
      category: req.query.category || "ALL",
      priority: req.query.priority || "ALL",
      search: req.query.search || "",
    };

    const query = buildNotificationListQueryForUser(req.user, filters);

    const [notifications, total, unreadCount, stats] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(query),

      getUnreadNotificationCountForUser(req.user),

      getNotificationStatsForUser(req.user),
    ]);

    return res.json({
      success: true,
      ok: true,

      notifications,
      items: notifications,

      unreadCount,
      stats,

      categories: NOTIFICATION_CATEGORIES,
      priorities: NOTIFICATION_PRIORITIES,

      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },

      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/notifications/unread-count                                        */
/* -------------------------------------------------------------------------- */

router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await getUnreadNotificationCountForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      count,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/notifications/stats                                               */
/* -------------------------------------------------------------------------- */

router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getNotificationStatsForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PATCH /api/notifications/mark-all-read                                     */
/* IMPORTANT: keep this before /:id routes                                    */
/* -------------------------------------------------------------------------- */

router.patch("/mark-all-read", async (req, res, next) => {
  try {
    const result = await markAllNotificationsReadForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      modifiedCount: result.modifiedCount || 0,
      message: `${result.modifiedCount || 0} notification(s) marked as read.`,
    });
  } catch (error) {
    next(error);
  }
});

/* Optional alias for frontend compatibility */
router.patch("/bulk/mark-all-read", async (req, res, next) => {
  try {
    const result = await markAllNotificationsReadForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      modifiedCount: result.modifiedCount || 0,
      message: `${result.modifiedCount || 0} notification(s) marked as read.`,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PATCH /api/notifications/:id/read                                          */
/* -------------------------------------------------------------------------- */

router.patch("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await markNotificationRead(id, req.user);

    if (!notification) {
      return res.status(404).json({
        success: false,
        ok: false,
        message: "Notification not found.",
      });
    }

    const unreadCount = await getUnreadNotificationCountForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      notification,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* PATCH /api/notifications/:id/unread                                        */
/* -------------------------------------------------------------------------- */

router.patch("/:id/unread", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await markNotificationUnread(id, req.user);

    if (!notification) {
      return res.status(404).json({
        success: false,
        ok: false,
        message: "Notification not found.",
      });
    }

    const unreadCount = await getUnreadNotificationCountForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      notification,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE /api/notifications/:id                                              */
/* Soft delete                                                                */
/* -------------------------------------------------------------------------- */

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        ok: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await deleteNotificationForUser(id, req.user);

    if (!notification) {
      return res.status(404).json({
        success: false,
        ok: false,
        message: "Notification not found.",
      });
    }

    const unreadCount = await getUnreadNotificationCountForUser(req.user);

    return res.json({
      success: true,
      ok: true,
      message: "Notification deleted.",
      notification,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

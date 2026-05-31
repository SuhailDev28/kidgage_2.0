import express from "express";
import mongoose from "mongoose";
import { z } from "zod";

import BlogComment from "../models/BlogComment.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

const blogPostSchema = new mongoose.Schema({}, { strict: false, collection: "news" });

const BlogPost =
  mongoose.models.News || mongoose.model("News", blogPostSchema);

const createCommentSchema = z.object({
  blogId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  message: z.string().trim().min(3).max(2000),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
});

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SPAM"]),
});

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "";
}

function getUserId(req) {
  return req.user?._id || req.user?.id || req.userId || null;
}

/**
 * PUBLIC: Submit blog comment
 * POST /api/public/blog-comments
 */
router.post("/public/blog-comments", async (req, res, next) => {
  try {
    const payload = createCommentSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(payload.blogId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID.",
      });
    }

    const blog = await BlogPost.findById(payload.blogId).lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    const comment = await BlogComment.create({
      blogId: blog._id,
      blogTitle: blog.title || "",
      blogSlug: blog.slug || "",
      name: payload.name,
      email: payload.email,
      message: payload.message,
      rating: payload.rating || 0,
      status: "PENDING",
      ipAddress: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
    });

    return res.status(201).json({
      success: true,
      message:
        "Comment submitted successfully. It will be visible after review.",
      comment: {
        _id: comment._id,
        status: comment.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUBLIC: Approved comments for one blog
 * GET /api/public/blog-comments/:blogId
 */
router.get("/public/blog-comments/:blogId", async (req, res, next) => {
  try {
    const { blogId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID.",
      });
    }

    const comments = await BlogComment.find({
      blogId,
      status: "APPROVED",
    })
      .sort({ createdAt: -1 })
      .select("name message rating createdAt")
      .lean();

    return res.json({
      success: true,
      comments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * SUPER ADMIN: Read all comments
 * GET /api/super-admin/blog-comments
 */
router.get(
  "/super-admin/blog-comments",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { search = "", status = "", page = 1, limit = 20 } = req.query;

      const filter = {};

      const cleanStatus = String(status || "").trim().toUpperCase();

      if (["PENDING", "APPROVED", "REJECTED", "SPAM"].includes(cleanStatus)) {
        filter.status = cleanStatus;
      }

      const q = String(search || "").trim();

      if (q) {
        const regex = new RegExp(escapeRegex(q), "i");

        filter.$or = [
          { name: regex },
          { email: regex },
          { message: regex },
          { blogTitle: regex },
          { blogSlug: regex },
        ];
      }

      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
      const skip = (safePage - 1) * safeLimit;

      const [comments, total, statusCounts] = await Promise.all([
        BlogComment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate("reviewedBy", "name email")
          .lean(),

        BlogComment.countDocuments(filter),

        BlogComment.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const counts = {
        ALL: 0,
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        SPAM: 0,
      };

      statusCounts.forEach((item) => {
        const key = item?._id || "PENDING";
        const count = Number(item?.count || 0);

        counts[key] = count;
        counts.ALL += count;
      });

      return res.json({
        success: true,
        comments,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.max(Math.ceil(total / safeLimit), 1),
        },
        counts,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * SUPER ADMIN: Update comment status
 * PATCH /api/super-admin/blog-comments/:id/status
 */
router.patch(
  "/super-admin/blog-comments/:id/status",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid comment ID.",
        });
      }

      const payload = updateStatusSchema.parse(req.body);

      const comment = await BlogComment.findByIdAndUpdate(
        id,
        {
          status: payload.status,
          reviewedAt: new Date(),
          reviewedBy: getUserId(req),
        },
        { new: true },
      );

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found.",
        });
      }

      return res.json({
        success: true,
        message: "Comment status updated successfully.",
        comment,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * SUPER ADMIN: Delete comment
 * DELETE /api/super-admin/blog-comments/:id
 */
router.delete(
  "/super-admin/blog-comments/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid comment ID.",
        });
      }

      const comment = await BlogComment.findByIdAndDelete(id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found.",
        });
      }

      return res.json({
        success: true,
        message: "Comment deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
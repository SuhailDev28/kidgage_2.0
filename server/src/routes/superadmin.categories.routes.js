// server/src/routes/superadmin.categories.routes.js
import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import Category from "../models/Category.js";
import { AppError } from "../utils/AppError.js";

const router = Router();

/* -----------------------------
 * Helpers
 * --------------------------- */
function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function requireSuperAdmin(req, _res, next) {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    return next(new AppError("Forbidden", 403));
  }

  next();
}

function normalizeStatus(value) {
  return String(value || "ACTIVE").toUpperCase() === "INACTIVE"
    ? "INACTIVE"
    : "ACTIVE";
}

function buildCategoryImagePath(filename) {
  return `/uploads/category/${filename}`;
}

function cleanupCategoryImage(imagePath) {
  const value = String(imagePath || "").trim();

  if (!value.startsWith("/uploads/category/")) return;

  const filename = path.basename(value);
  const fullPath = path.join(uploadDir, filename);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

async function generateUniqueSlug(name, excludeId = null) {
  const baseSlug = slugify(name) || "category";
  let slug = baseSlug;
  let count = 1;

  const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };

  while (await Category.findOne(filter).lean()) {
    slug = `${baseSlug}-${count++}`;

    if (excludeId) {
      filter.slug = slug;
    } else {
      filter.slug = slug;
    }
  }

  return slug;
}

/* -----------------------------
 * Upload setup
 * --------------------------- */
const uploadDir = path.join(process.cwd(), "uploads", "category");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `category-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }

    return cb(new AppError("Only image uploads are allowed", 400));
  },
});

/* -----------------------------
 * Auth
 * --------------------------- */
router.use(auth, requireSuperAdmin);

/* -----------------------------
 * List categories
 * GET /api/super-admin/categories
 * --------------------------- */
router.get("/", async (_req, res, next) => {
  try {
    const categories = await Category.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.json({ categories });
  } catch (error) {
    next(error);
  }
});

/* -----------------------------
 * Upload category image
 * POST /api/super-admin/categories/upload
 * --------------------------- */
router.post("/upload", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Image file is required", 400);
    }

    const relativePath = buildCategoryImagePath(req.file.filename);

    return res.status(201).json({
      message: "Image uploaded successfully",
      image: relativePath,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
});

/* -----------------------------
 * Create category
 * POST /api/super-admin/categories
 * --------------------------- */
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      icon = "",
      emoji = "🎯",
      image = "",
      bg = "#f1f5f9",
      status = "ACTIVE",
      sortOrder = 0,
    } = req.body;

    const trimmedName = String(name || "").trim();

    if (!trimmedName) {
      throw new AppError("Category name is required", 400);
    }

    const slug = await generateUniqueSlug(trimmedName);

    const category = await Category.create({
      name: trimmedName,
      slug,
      icon: String(icon || "").trim(),
      emoji: String(emoji || "🎯").trim(),
      image: String(image || "").trim(),
      bg: String(bg || "#f1f5f9").trim(),
      status: normalizeStatus(status),
      sortOrder: Number(sortOrder) || 0,
    });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
});

/* -----------------------------
 * Update category
 * PUT /api/super-admin/categories/:id
 * --------------------------- */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid category id", 400);
    }

    const category = await Category.findById(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const { name, icon, emoji, image, bg, status, sortOrder } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name || "").trim();

      if (!trimmedName) {
        throw new AppError("Category name is required", 400);
      }

      if (trimmedName !== category.name) {
        category.name = trimmedName;
        category.slug = await generateUniqueSlug(trimmedName, category._id);
      }
    }

    if (icon !== undefined) {
      category.icon = String(icon || "").trim();
    }

    if (emoji !== undefined) {
      category.emoji = String(emoji || "🎯").trim();
    }

    if (image !== undefined) {
      const nextImage = String(image || "").trim();
      const oldImage = String(category.image || "").trim();

      if (oldImage && oldImage !== nextImage) {
        cleanupCategoryImage(oldImage);
      }

      category.image = nextImage;
    }

    if (bg !== undefined) {
      category.bg = String(bg || "#f1f5f9").trim();
    }

    if (status !== undefined) {
      category.status = normalizeStatus(status);
    }

    if (sortOrder !== undefined) {
      category.sortOrder = Number(sortOrder) || 0;
    }

    await category.save();

    return res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
});

/* -----------------------------
 * Delete category
 * DELETE /api/super-admin/categories/:id
 * --------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid category id", 400);
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    cleanupCategoryImage(category.image);

    return res.json({
      message: "Category deleted successfully",
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

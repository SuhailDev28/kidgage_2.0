import Category from "../models/Category.js";
import { AppError } from "../utils/AppError.js";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listCategories(_req, res, next) {
  try {
    const categories = await Category.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const {
      name,
      icon = "",
      emoji = "🎯",
      image = "",
      bg = "#d9d9d9",
      status = "ACTIVE",
      sortOrder = 0,
    } = req.body;

    if (!String(name || "").trim()) {
      throw new AppError("Category name is required", 400);
    }

    const baseSlug = slugify(name);
    if (!baseSlug) {
      throw new AppError("Invalid category name", 400);
    }

    let slug = baseSlug;
    let count = 1;

    while (await Category.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    const category = await Category.create({
      name: String(name).trim(),
      slug,
      icon: String(icon || "").trim(),
      emoji: String(emoji || "🎯").trim(),
      image: String(image || "").trim(),
      bg: String(bg || "#d9d9d9").trim(),
      status:
        String(status || "ACTIVE").toUpperCase() === "INACTIVE"
          ? "INACTIVE"
          : "ACTIVE",
      sortOrder: Number(sortOrder) || 0,
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const { name, icon, emoji, image, bg, status, sortOrder } = req.body;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new AppError("Category name is required", 400);
      }

      if (trimmedName !== category.name) {
        const baseSlug = slugify(trimmedName);
        let slug = baseSlug;
        let count = 1;

        while (
          await Category.findOne({
            slug,
            _id: { $ne: category._id },
          })
        ) {
          slug = `${baseSlug}-${count++}`;
        }

        category.name = trimmedName;
        category.slug = slug;
      }
    }

    if (icon !== undefined) category.icon = String(icon || "").trim();
    if (emoji !== undefined) category.emoji = String(emoji || "🎯").trim();
    if (image !== undefined) category.image = String(image || "").trim();
    if (bg !== undefined) category.bg = String(bg || "#d9d9d9").trim();
    if (status !== undefined) {
      category.status =
        String(status).toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    }
    if (sortOrder !== undefined) {
      category.sortOrder = Number(sortOrder) || 0;
    }

    await category.save();

    res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
}

import Category from "../models/Category.js";

export async function listPublicCategories(_req, res, next) {
  try {
    const categories = await Category.find({ status: "ACTIVE" })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

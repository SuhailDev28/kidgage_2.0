import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export async function auth(req, _res, next) {
  try {
    const header = String(req.headers.authorization || "").trim();
    console.log("AUTH HEADER:", header || "(empty)");

    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    console.log("TOKEN PRESENT:", Boolean(token));

    if (!token) {
      throw new AppError("Missing token", 401);
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log("JWT PAYLOAD:", payload);

    const userId = payload?.userId || payload?.id || payload?._id || null;
    const role = String(payload?.role || "").toUpperCase();
    const academyId = payload?.academyId || null;

    if (!userId || !role) {
      throw new AppError("Invalid token payload", 401);
    }

    const user = await User.findById(userId).select("-passwordHash");

    if (!user) {
      throw new AppError("User not found", 401);
    }

    req.user = {
      ...user.toObject(),
      _id: user._id,
      id: user._id,
      role,
      academyId:
        user.academyId?._id ||
        user.academyId?.id ||
        user.academyId ||
        academyId ||
        null,
    };

    if (req.user.academyId) {
      req.academyId = req.user.academyId;
    }

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err?.message || err);

    if (err?.name === "TokenExpiredError") {
      return next(new AppError("Token expired", 401));
    }

    if (err?.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token", 401));
    }

    next(err instanceof AppError ? err : new AppError("Unauthorized", 401));
  }
}

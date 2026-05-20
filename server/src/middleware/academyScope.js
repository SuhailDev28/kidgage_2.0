import { AppError } from "../utils/AppError.js";

export function academyScope(req, _res, next) {
  const role = req.user?.role;
  if (["ACADEMY_ADMIN", "MANAGER", "STAFF"].includes(role)) {
    req.academyId = String(req.user.academyId || "");
    if (!req.academyId) return next(new AppError("Academy scope missing", 403));
  }
  next();
}

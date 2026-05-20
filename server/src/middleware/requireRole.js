export function requireRole(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toUpperCase().trim(),
  );

  return (req, res, next) => {
    const userRole = String(req?.user?.role || "")
      .toUpperCase()
      .trim();

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!userRole) {
      return res.status(403).json({ message: "User role is missing" });
    }

    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
}

import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Academy from "../models/Academy.js";
import AppSetting from "../models/AppSetting.js";

import { sendKidgageEmail } from "../services/email/smtp.service.js";
import { renderEmailTemplate } from "../services/email/emailTemplate.service.js";

function normalizeClientUrl() {
  const raw =
    process.env.CLIENT_URL?.split(",")?.[0] ||
    process.env.APP_URL ||
    "https://kidgage.com";

  return String(raw || "")
    .trim()
    .replace(/\/$/, "");
}

function createResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  return {
    token,
    tokenHash,
  };
}

function hashResetToken(token = "") {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

async function getEmailRuntimeDefaults() {
  const appSettings =
    (await AppSetting.findOne({ key: "GLOBAL" }).lean()) ||
    (await AppSetting.findOne({}).sort({ createdAt: -1 }).lean()) ||
    {};

  const siteName = appSettings.siteName || "KidGage";

  const supportEmail =
    appSettings.contactEmail ||
    process.env.CONTACT_RECEIVER_EMAIL ||
    "support@kidgage.com";

  return {
    appSettings,
    siteName,
    supportEmail,
  };
}

async function sendParentWelcomeEmail({ user, plainPassword }) {
  try {
    if (!user?.email || !plainPassword) return;

    const { siteName, supportEmail } = await getEmailRuntimeDefaults();
    const appUrl = normalizeClientUrl();

    const rendered = await renderEmailTemplate("PARENT_ACCOUNT_WELCOME", {
      siteName,
      parentName: user.fullName || user.name || "Parent",
      email: user.email,
      password: plainPassword,
      loginUrl: `${appUrl}/login`,
      supportEmail,
    });

    await sendKidgageEmail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (emailError) {
    console.error("Parent welcome email failed:", emailError);
  }
}

async function sendPasswordResetEmail({ user, resetUrl }) {
  try {
    if (!user?.email || !resetUrl) return false;

    const { siteName, supportEmail } = await getEmailRuntimeDefaults();

    const rendered = await renderEmailTemplate("PASSWORD_RESET", {
      siteName,
      userName: user.fullName || user.name || "User",
      email: user.email,
      resetUrl,
      expiresIn: "15 minutes",
      supportEmail,
    });

    await sendKidgageEmail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    return true;
  } catch (emailError) {
    console.error("Password reset email failed:", emailError);
    return false;
  }
}

export async function registerParent(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const plainPassword = String(req.body.password || "");
    const password = plainPassword;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
      role: "PARENT",
      status: "ACTIVE",
    });

    await sendParentWelcomeEmail({
      user,
      plainPassword,
    });

    const token = jwt.sign(
      {
        id: user._id,
        role: "PARENT",
        academyId: null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: "PARENT",
        status: user.status || "ACTIVE",
        academyId: null,
        academyName: "",
        academyLogo: "",
        academyCode: "",
        academyStatus: "",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const genericMessage =
      "If an account exists for this email, a password reset link has been sent.";

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const status = String(user.status || "ACTIVE").toUpperCase();

    if (status !== "ACTIVE") {
      return res.json({
        success: true,
        message: genericMessage,
      });
    }

    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    user.resetPasswordRequestedAt = new Date();

    await user.save();

    const appUrl = normalizeClientUrl();
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail({
      user,
      resetUrl,
    });

    return res.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || password || "");

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const tokenHash = hashResetToken(token);

    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

    if (!user) {
      return res.status(400).json({
        message: "Password reset link is invalid or expired",
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = "";
    user.resetPasswordExpiresAt = null;
    user.resetPasswordRequestedAt = null;
    user.passwordChangedAt = new Date();

    await user.save();

    return res.json({
      success: true,
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (String(user.status || "ACTIVE").toUpperCase() !== "ACTIVE") {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash || "",
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const role = String(user.role || "").toUpperCase();
    let academy = null;

    if (role === "ACADEMY_ADMIN") {
      if (!user.academyId) {
        return res
          .status(403)
          .json({ message: "No academy assigned to this account" });
      }

      academy = await Academy.findById(user.academyId).lean();

      if (!academy) {
        return res.status(403).json({ message: "Assigned academy not found" });
      }

      if (String(academy.status || "").toUpperCase() !== "ACTIVE") {
        return res.status(403).json({
          message: "Academy is not approved or currently inactive",
        });
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        role,
        academyId: user.academyId || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role,
        status: user.status || "ACTIVE",
        academyId: user.academyId || null,
        academyName: academy?.name || "",
        academyLogo: academy?.logo || "",
        academyCode: academy?.slug || "",
        academyStatus: academy?.status || "",
        academyObjectId: academy?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const userId = req?.user?._id || req?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let academy = null;
    const role = String(user.role || "").toUpperCase();

    if (role === "ACADEMY_ADMIN" && user.academyId) {
      academy = await Academy.findById(user.academyId).lean();
    }

    return res.json({
      user: {
        _id: user._id,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role,
        status: user.status || "ACTIVE",
        academyId: user.academyId || null,
        academyName: academy?.name || "",
        academyLogo: academy?.logo || "",
        academyCode: academy?.slug || "",
        academyStatus: academy?.status || "",
        academyObjectId: academy?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

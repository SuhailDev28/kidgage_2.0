// server/src/controllers/socialAuth.controller.js
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import User from "../models/User.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeName(value, fallback = "KidGage User") {
  const text = String(value || "").trim();
  return text || fallback;
}

function makeUserPayload(user) {
  return {
    id: user._id,
    _id: user._id,
    fullName: user.fullName,
    name: user.fullName, // keep this for old frontend compatibility
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    authProvider: user.authProvider,
    academyId: user.academyId,
    parentId: user.parentId,
    status: user.status,
  };
}

async function findOrCreateSocialUser({
  provider,
  providerId,
  email,
  fullName,
  avatar = "",
}) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    const error = new Error("Email is required from social account");
    error.statusCode = 400;
    throw error;
  }

  if (!providerId) {
    const error = new Error(`${provider} account id is required`);
    error.statusCode = 400;
    throw error;
  }

  const socialField = provider === "GOOGLE" ? "googleId" : "appleId";

  let user = await User.findOne({
    $or: [{ email: cleanEmail }, { [socialField]: providerId }],
  });

  if (!user) {
    user = await User.create({
      role: "PARENT",
      academyId: null,
      parentId: null,
      fullName: safeName(fullName),
      email: cleanEmail,
      phone: "",
      passwordHash: "",
      mustChangePassword: false,
      tempPassword: "",
      authProvider: provider,
      [socialField]: providerId,
      avatar,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    });

    return user;
  }

  if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
    const error = new Error("Your account is not active");
    error.statusCode = 403;
    throw error;
  }

  if (!user[socialField]) {
    user[socialField] = providerId;
  }

  if (!user.avatar && avatar) {
    user.avatar = avatar;
  }

  if (!user.fullName && fullName) {
    user.fullName = fullName;
  }

  user.authProvider = user.authProvider || provider;
  user.lastLoginAt = new Date();

  await user.save();

  return user;
}

export async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "GOOGLE_CLIENT_ID is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google account data",
      });
    }

    const user = await findOrCreateSocialUser({
      provider: "GOOGLE",
      providerId: payload.sub,
      email: payload.email,
      fullName: payload.name,
      avatar: payload.picture,
    });

    const token = signToken(user);

    return res.json({
      success: true,
      message: "Google login successful",
      token,
      user: makeUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function appleLogin(req, res, next) {
  try {
    const { idToken, user } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Apple ID token is required",
      });
    }

    if (!process.env.APPLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "APPLE_CLIENT_ID is not configured",
      });
    }

    const applePayload = await appleSignin.verifyIdToken(idToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    if (!applePayload?.sub) {
      return res.status(400).json({
        success: false,
        message: "Invalid Apple account data",
      });
    }

    const email = normalizeEmail(applePayload.email || user?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Apple did not return an email. Please use another login method or contact support.",
      });
    }

    const appleFullName = [user?.name?.firstName, user?.name?.lastName]
      .filter(Boolean)
      .join(" ");

    const dbUser = await findOrCreateSocialUser({
      provider: "APPLE",
      providerId: applePayload.sub,
      email,
      fullName: appleFullName || "Apple User",
      avatar: "",
    });

    const token = signToken(dbUser);

    return res.json({
      success: true,
      message: "Apple login successful",
      token,
      user: makeUserPayload(dbUser),
    });
  } catch (error) {
    next(error);
  }
}

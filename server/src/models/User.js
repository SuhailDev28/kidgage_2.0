// server/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ACADEMY_ADMIN",
        "MANAGER",
        "STAFF",
        "PARENT",
        "CHILD",
      ],
      required: true,
      default: "PARENT",
    },

    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      default: null,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    resetPasswordTokenHash: {
      type: String,
      default: "",
      select: false,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    resetPasswordRequestedAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    /**
     * LOCAL = normal email/password login
     * GOOGLE = Google social login
     * APPLE = Apple social login
     */
    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE", "APPLE"],
      default: "LOCAL",
    },

    googleId: {
      type: String,
      default: "",
      trim: true,
    },

    appleId: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * Required only for normal/local users.
     * Social login users do not need passwordHash.
     */
    passwordHash: {
      type: String,
      default: "",
      required: function () {
        return this.authProvider === "LOCAL";
      },
    },

    // When true, force user to update password after login.
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // Visible only for Super Admin workflows.
    // Store latest temporary/reset password if you want Super Admin to view it.
    tempPassword: {
      type: String,
      default: "",
      select: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

userSchema.index({ role: 1 });
userSchema.index({ academyId: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ authProvider: 1 });
userSchema.index({ resetPasswordTokenHash: 1 });
userSchema.index({ resetPasswordExpiresAt: 1 });

userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      googleId: { $type: "string", $ne: "" },
    },
  },
);

userSchema.index(
  { appleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      appleId: { $type: "string", $ne: "" },
    },
  },
);

export default mongoose.model("User", userSchema);

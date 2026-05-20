import mongoose from "mongoose";

export const NOTIFICATION_RECIPIENT_ROLES = [
  "SUPER_ADMIN",
  "ACADEMY_ADMIN",
  "ACADEMY_MANAGER",
  "ACADEMY_STAFF",
  "PARENT",
];

export const NOTIFICATION_TYPES = [
  "SYSTEM",

  "BOOKING_CREATED",
  "BOOKING_CONFIRMED",
  "BOOKING_UPDATED",
  "BOOKING_CANCELLED",

  "PAYMENT_CREATED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "PAYMENT_REFUNDED",

  "REGISTRATION_CREATED",
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",

  "ACADEMY_CREATED",
  "ACADEMY_UPDATED",

  "ACTIVITY_CREATED",
  "ACTIVITY_UPDATED",

  "EVENT_CREATED",
  "BLOG_CREATED",

  "CONTENT_CREATED",
  "CONTENT_UPDATED",

  "SETTLEMENT_READY",
  "SETTLEMENT_PAID",

  "APPROVAL_REQUIRED",
  "MESSAGE",
];

export const NOTIFICATION_CATEGORIES = [
  "SYSTEM",
  "BOOKING",
  "PAYMENT",
  "REGISTRATION",
  "ACADEMY",
  "ACTIVITY",
  "EVENT",
  "BLOG",
  "CONTENT",
  "SETTLEMENT",
  "APPROVAL",
  "MESSAGE",
];

export const NOTIFICATION_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

const notificationSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      default: null,
      index: true,
    },

    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    recipientRole: {
      type: String,
      enum: NOTIFICATION_RECIPIENT_ROLES,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "SYSTEM",
      trim: true,
      uppercase: true,
      index: true,
    },

    category: {
      type: String,
      enum: NOTIFICATION_CATEGORIES,
      default: "SYSTEM",
      trim: true,
      uppercase: true,
      index: true,
    },

    priority: {
      type: String,
      enum: NOTIFICATION_PRIORITIES,
      default: "NORMAL",
      trim: true,
      uppercase: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },

    actionUrl: {
      type: String,
      default: "",
      trim: true,
    },

    source: {
      type: String,
      default: "SYSTEM",
      trim: true,
      uppercase: true,
      index: true,
    },

    entityType: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

notificationSchema.index({
  recipientRole: 1,
  recipientUserId: 1,
  academyId: 1,
  isRead: 1,
  deletedAt: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipientUserId: 1,
  isRead: 1,
  deletedAt: 1,
  createdAt: -1,
});

notificationSchema.index({
  academyId: 1,
  recipientRole: 1,
  category: 1,
  deletedAt: 1,
  createdAt: -1,
});

notificationSchema.index({
  category: 1,
  priority: 1,
  deletedAt: 1,
  createdAt: -1,
});

notificationSchema.pre("save", function syncReadFields(next) {
  if (this.isRead && !this.readAt) {
    this.readAt = new Date();
  }

  if (!this.isRead) {
    this.readAt = null;
  }

  next();
});

notificationSchema.set("toJSON", { virtuals: true });
notificationSchema.set("toObject", { virtuals: true });

export default mongoose.model("Notification", notificationSchema);

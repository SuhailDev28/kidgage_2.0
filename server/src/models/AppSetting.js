// server/src/models/AppSetting.js
import mongoose from "mongoose";

const appSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    siteName: {
      type: String,
      default: "KidGage",
      trim: true,
    },

    tagline: {
      type: String,
      default: "Discover the best kids activities in Qatar",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    favicon: {
      type: String,
      default: "",
      trim: true,
    },

    logoUpdatedAt: {
      type: Date,
      default: null,
    },

    primaryColor: {
      type: String,
      default: "#2563eb",
      trim: true,
    },

    secondaryColor: {
      type: String,
      default: "#6d28d9",
      trim: true,
    },

    menuLinkColor: {
      type: String,
      default: "#475569",
      trim: true,
    },

    menuLinkHoverColor: {
      type: String,
      default: "#ec7a3b",
      trim: true,
    },

    menuLinkActiveColor: {
      type: String,
      default: "#ec7a3b",
      trim: true,
    },

    menuLinkActiveBg: {
      type: String,
      default: "#fff4ec",
      trim: true,
    },

    contactEmail: {
      type: String,
      default: "",
      trim: true,
    },

    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },

    whatsapp: {
      type: String,
      default: "",
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    footerDescription: {
      type: String,
      default:
        "Book activities for kids across trusted academies and help parents discover enriching experiences with confidence, clarity, and joy.",
      trim: true,
    },

    footerCopyright: {
      type: String,
      default: "© KidGage. All rights reserved.",
      trim: true,
    },

    metaTitle: {
      type: String,
      default: "KidGage | Kids Activities Booking Platform",
      trim: true,
    },

    metaDescription: {
      type: String,
      default:
        "Book activities, programs, and events for children across trusted academies.",
      trim: true,
    },

    instagram: {
      type: String,
      default: "",
      trim: true,
    },

    facebook: {
      type: String,
      default: "",
      trim: true,
    },

    youtube: {
      type: String,
      default: "",
      trim: true,
    },

    tiktok: {
      type: String,
      default: "",
      trim: true,
    },

    allowProviderRegistration: {
      type: Boolean,
      default: true,
    },

    allowParentRegistration: {
      type: Boolean,
      default: true,
    },

    showBlogs: {
      type: Boolean,
      default: true,
    },

    showEvents: {
      type: Boolean,
      default: true,
    },

    showTopBrands: {
      type: Boolean,
      default: true,
    },

    showTopActivities: {
      type: Boolean,
      default: true,
    },

    maintenanceMode: {
      type: Boolean,
      default: false,
    },

    maintenanceMessage: {
      type: String,
      default: "We are updating KidGage. Please check back shortly.",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.AppSetting ||
  mongoose.model("AppSetting", appSettingSchema);

import mongoose from "mongoose";

const smtpSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "GLOBAL",
      unique: true,
      index: true,
    },

    enabled: {
      type: Boolean,
      default: false,
    },

    host: {
      type: String,
      default: "",
      trim: true,
    },

    port: {
      type: Number,
      default: 587,
    },

    secure: {
      type: Boolean,
      default: false,
    },

    username: {
      type: String,
      default: "",
      trim: true,
    },

    passwordEncrypted: {
      type: String,
      default: "",
    },

    fromName: {
      type: String,
      default: "KidGage",
      trim: true,
    },

    fromEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    replyTo: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    provider: {
      type: String,
      default: "CUSTOM",
      enum: ["CUSTOM", "GMAIL", "OUTLOOK", "ZOHO", "SENDGRID", "MAILGUN"],
    },

    lastTestedAt: {
      type: Date,
      default: null,
    },

    lastTestStatus: {
      type: String,
      enum: ["NOT_TESTED", "SUCCESS", "FAILED"],
      default: "NOT_TESTED",
    },

    lastTestMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("SmtpSetting", smtpSettingSchema);

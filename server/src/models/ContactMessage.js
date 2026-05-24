import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    source: {
      type: String,
      default: "CONTACT_PAGE",
      trim: true,
    },

    status: {
      type: String,
      enum: ["NEW", "READ", "REPLIED", "ARCHIVED"],
      default: "NEW",
    },

    ip: {
      type: String,
      default: "",
      trim: true,
    },

    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ status: 1 });

export default mongoose.model("ContactMessage", contactMessageSchema);

import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "BOOKING",
        "PAYMENT",
        "CONTACT",
        "ACADEMY",
        "AUTH",
        "CERTIFICATE",
        "SYSTEM",
      ],
      default: "SYSTEM",
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    html: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      default: "",
    },

    variables: {
      type: [String],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },

    isSystem: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

emailTemplateSchema.index({ key: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ active: 1 });

export default mongoose.model("EmailTemplate", emailTemplateSchema);

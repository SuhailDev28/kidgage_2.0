import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Course Completion Certificate",
    },

    type: {
      type: String,
      enum: ["COURSE_COMPLETION"],
      default: "COURSE_COMPLETION",
      index: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      enum: ["IMAGE", "PDF"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "CertificateTemplate",
  certificateTemplateSchema,
);
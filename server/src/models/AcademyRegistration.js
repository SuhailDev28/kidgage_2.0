import mongoose from "mongoose";

const academyRegistrationSchema = new mongoose.Schema(
  {
    academyName: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    crNumber: { type: String, default: "", trim: true },
    crDocument: { type: String, default: "", trim: true },

    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },

    fullName: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },

    website: { type: String, default: "", trim: true },
    instagram: { type: String, default: "", trim: true },

    agreed: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      default: null,
    },

    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("AcademyRegistration", academyRegistrationSchema);

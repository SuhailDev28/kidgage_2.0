// server/src/models/Child.js
import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    age: {
      type: Number,
      default: 0,
      min: 0,
    },

    gender: {
      type: String,
      enum: ["BOY", "GIRL"],
      required: true,
      uppercase: true,
      trim: true,
    },

    photo: {
      type: String,
      default: "",
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    medicalNotes: {
      type: String,
      default: "",
      trim: true,
    },

    allergies: {
      type: String,
      default: "",
      trim: true,
    },

    emergencyContactName: {
      type: String,
      default: "",
      trim: true,
    },

    emergencyContactPhone: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      uppercase: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

function calculateAge(dob) {
  if (!dob) return 0;

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

childSchema.pre("validate", function beforeValidate(next) {
  if (!this.name && this.fullName) {
    this.name = this.fullName;
  }

  if (this.dob) {
    this.age = calculateAge(this.dob);
  }

  if (!this.avatar && this.photo) {
    this.avatar = this.photo;
  }

  if (!this.photo && this.avatar) {
    this.photo = this.avatar;
  }

  next();
});

childSchema.index({ parentId: 1, createdAt: -1 });
childSchema.index({ parentId: 1, status: 1 });
childSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Child || mongoose.model("Child", childSchema);

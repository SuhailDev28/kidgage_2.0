import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    icon: {
      type: String,
      default: "",
      trim: true,
    },

    emoji: {
      type: String,
      default: "🎯",
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    bg: {
      type: String,
      default: "#d9d9d9",
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Category", categorySchema);

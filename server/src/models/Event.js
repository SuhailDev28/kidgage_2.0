// server/src/models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    link: {
      type: String,
      default: "",
      trim: true,
    },

    venue: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "Doha",
      trim: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    eventDate: {
      type: Date,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
      default: "PUBLISHED",
      index: true,
    },
  },
  { timestamps: true },
);

eventSchema.pre("save", function syncEventStatus(next) {
  if (this.active === undefined || this.active === null) {
    this.active = this.status === "PUBLISHED";
  }

  if (this.active && this.status !== "ARCHIVED") {
    this.status = "PUBLISHED";
  }

  if (!this.active && this.status === "PUBLISHED") {
    this.status = "DRAFT";
  }

  if (!this.eventDate && this.startDate) {
    this.eventDate = this.startDate;
  }

  next();
});

export default mongoose.models.Event || mongoose.model("Event", eventSchema);

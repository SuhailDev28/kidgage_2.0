import mongoose from "mongoose";

const awardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    issuer: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
  },
  { _id: true },
);

const recognitionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    organization: { type: String, default: "", trim: true },
    date: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
  },
  { _id: true },
);

const academySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },

    logo: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "", trim: true },
    bannerImage: { type: String, default: "", trim: true },
    gallery: [{ type: String, trim: true }],

    description: { type: String, default: "", trim: true },
    shortBio: { type: String, default: "", trim: true },
    mission: { type: String, default: "", trim: true },
    vision: { type: String, default: "", trim: true },

    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    whatsapp: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },

    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "Qatar", trim: true },

    establishedYear: { type: String, default: "", trim: true },
    ownerName: { type: String, default: "", trim: true },
    contactPerson: { type: String, default: "", trim: true },

    facilities: [{ type: String, trim: true }],
    programsOffered: [{ type: String, trim: true }],
    ageGroups: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],

    instagram: { type: String, default: "", trim: true },
    facebook: { type: String, default: "", trim: true },
    youtube: { type: String, default: "", trim: true },
    tiktok: { type: String, default: "", trim: true },

    awards: [awardSchema],
    recognitions: [recognitionSchema],

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"],
      default: "PENDING",
    },

    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

academySchema.virtual("featured").get(function featured() {
  return this.isFeatured;
});

academySchema.virtual("academyName").get(function academyName() {
  return this.name;
});

academySchema.virtual("academyLogo").get(function academyLogo() {
  return this.logo;
});

academySchema.set("toJSON", { virtuals: true });
academySchema.set("toObject", { virtuals: true });

academySchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
academySchema.index({ city: 1 });
academySchema.index({ name: "text", description: "text", city: "text" });

export default mongoose.models.Academy ||
  mongoose.model("Academy", academySchema);

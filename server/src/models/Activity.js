import mongoose from "mongoose";

const bookingConfigSchema = new mongoose.Schema(
  {
    packageType: {
      type: String,
      enum: ["MONTHLY", "SESSIONS", "CUSTOM"],
      default: "SESSIONS",
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWeeks: {
      type: Number,
      default: 0,
      min: 0,
    },
    sessionsPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookingMode: {
      type: String,
      enum: ["FLEXIBLE", "STRAIGHT", "BOTH"],
      default: "BOTH",
    },
    slotDurationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    defaultCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    allowWaitlist: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

export const ACTIVITY_APPROVAL_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
];

const activitySchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },

    branchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    images: [
      {
        type: String,
        trim: true,
      },
    ],

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    bannerImage: {
      type: String,
      default: "",
      trim: true,
    },

    venueName: {
      type: String,
      default: "",
      trim: true,
    },

    venueAddress: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "Qatar",
      trim: true,
    },

    organizerName: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    categoryName: {
      type: String,
      default: "",
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

    dateFrom: {
      type: Date,
      default: null,
    },

    dateTo: {
      type: Date,
      default: null,
    },

    durationLabel: {
      type: String,
      default: "",
      trim: true,
    },

    duration: {
      type: String,
      default: "",
      trim: true,
    },

    fees: {
      type: String,
      default: "",
      trim: true,
    },

    minAge: {
      type: Number,
      default: 3,
      min: 0,
    },

    maxAge: {
      type: Number,
      default: 16,
      min: 0,
    },

    gender: {
      type: String,
      enum: ["ALL", "BOYS", "GIRLS"],
      default: "ALL",
    },

    skillLevel: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL"],
      default: "ALL",
    },

    currency: {
      type: String,
      default: "QAR",
      trim: true,
    },

    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    trialClassEnabled: {
      type: Boolean,
      default: false,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    shareEnabled: {
      type: Boolean,
      default: true,
    },

    modes: [
      {
        type: String,
        trim: true,
      },
    ],

    classModes: [
      {
        type: String,
        trim: true,
      },
    ],

    modeOfClasses: [
      {
        type: String,
        trim: true,
      },
    ],

    packageType: {
      type: String,
      enum: ["MONTHLY", "SESSIONS", "CUSTOM"],
      default: "SESSIONS",
    },

    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    sessionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalWeeks: {
      type: Number,
      default: 0,
      min: 0,
    },

    weekCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sessionsPerWeek: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookingMode: {
      type: String,
      enum: ["FLEXIBLE", "STRAIGHT", "BOTH"],
      default: "BOTH",
    },

    slotDurationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },

    defaultCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    allowWaitlist: {
      type: Boolean,
      default: false,
    },

    bookingConfig: {
      type: bookingConfigSchema,
      default: () => ({}),
    },

    availabilityType: {
      type: String,
      enum: ["DATE_RANGE", "SPECIFIC_DATES"],
      default: "DATE_RANGE",
    },

    bookingStartDate: {
      type: Date,
      default: null,
    },

    bookingEndDate: {
      type: Date,
      default: null,
    },

    specificDates: [
      {
        type: Date,
      },
    ],

    daysOfWeek: [
      {
        type: Number,
        min: 0,
        max: 6,
      },
    ],

    seatCapacityDefault: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "INACTIVE"],
      default: "DRAFT",
      index: true,
    },

    /*
     * Super Admin approval workflow.
     *
     * Public/parent listing must require:
     * status: "PUBLISHED"
     * approvalStatus: "APPROVED"
     */
    approvalStatus: {
      type: String,
      enum: ACTIVITY_APPROVAL_STATUSES,
      default: "PENDING_APPROVAL",
      index: true,
    },

    approvalRequestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

activitySchema.pre("validate", function activityPreValidate(next) {
  if (!this.name && this.title) {
    this.name = this.title;
  }

  if (!this.title && this.name) {
    this.title = this.name;
  }

  if (!this.dateFrom && this.startDate) {
    this.dateFrom = this.startDate;
  }

  if (!this.dateTo && this.endDate) {
    this.dateTo = this.endDate;
  }

  if (!this.startDate && this.dateFrom) {
    this.startDate = this.dateFrom;
  }

  if (!this.endDate && this.dateTo) {
    this.endDate = this.dateTo;
  }

  if (!this.duration && this.durationLabel) {
    this.duration = this.durationLabel;
  }

  if (!this.durationLabel && this.duration) {
    this.durationLabel = this.duration;
  }

  if ((!this.basePrice || this.basePrice < 0) && this.price) {
    this.basePrice = this.price;
  }

  if ((!this.price || this.price < 0) && this.basePrice) {
    this.price = this.basePrice;
  }

  if ((!this.sessionCount || this.sessionCount < 0) && this.totalSessions) {
    this.sessionCount = this.totalSessions;
  }

  if ((!this.totalSessions || this.totalSessions < 0) && this.sessionCount) {
    this.totalSessions = this.sessionCount;
  }

  if ((!this.weekCount || this.weekCount < 0) && this.totalWeeks) {
    this.weekCount = this.totalWeeks;
  }

  if ((!this.totalWeeks || this.totalWeeks < 0) && this.weekCount) {
    this.totalWeeks = this.weekCount;
  }

  if ((!this.capacity || this.capacity < 1) && this.defaultCapacity) {
    this.capacity = this.defaultCapacity;
  }

  if ((!this.defaultCapacity || this.defaultCapacity < 1) && this.capacity) {
    this.defaultCapacity = this.capacity;
  }

  if (
    (!this.seatCapacityDefault || this.seatCapacityDefault < 1) &&
    this.defaultCapacity
  ) {
    this.seatCapacityDefault = this.defaultCapacity;
  }

  const imageCandidates = [
    this.coverImage,
    this.bannerImage,
    this.image,
    ...(Array.isArray(this.images) ? this.images : []),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const primaryImage = imageCandidates[0] || "";

  if (!this.coverImage) this.coverImage = primaryImage;
  if (!this.image) this.image = primaryImage;
  if (!this.bannerImage) this.bannerImage = primaryImage;

  if (!Array.isArray(this.images)) {
    this.images = [];
  }

  const uniqueImages = [
    ...new Set(
      [this.coverImage, this.image, this.bannerImage, ...this.images]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ];

  this.images = uniqueImages;

  if (!this.bookingConfig || typeof this.bookingConfig !== "object") {
    this.bookingConfig = {};
  }

  this.packageType =
    this.packageType || this.bookingConfig.packageType || "SESSIONS";

  this.totalSessions =
    Number(
      this.totalSessions ||
        this.sessionCount ||
        this.bookingConfig.totalSessions ||
        0,
    ) || 0;

  this.sessionCount = this.totalSessions;

  this.totalWeeks =
    Number(
      this.totalWeeks || this.weekCount || this.bookingConfig.totalWeeks || 0,
    ) || 0;

  this.weekCount = this.totalWeeks;

  this.sessionsPerWeek =
    Number(this.sessionsPerWeek || this.bookingConfig.sessionsPerWeek || 0) ||
    0;

  this.bookingMode =
    this.bookingMode || this.bookingConfig.bookingMode || "BOTH";

  this.slotDurationMinutes =
    Number(
      this.slotDurationMinutes || this.bookingConfig.slotDurationMinutes || 60,
    ) || 60;

  this.defaultCapacity =
    Number(
      this.defaultCapacity ||
        this.capacity ||
        this.bookingConfig.defaultCapacity ||
        1,
    ) || 1;

  this.capacity = this.defaultCapacity;
  this.seatCapacityDefault = this.defaultCapacity;

  this.allowWaitlist =
    typeof this.allowWaitlist === "boolean"
      ? this.allowWaitlist
      : Boolean(this.bookingConfig.allowWaitlist);

  this.bookingConfig.packageType = this.packageType;
  this.bookingConfig.totalSessions = this.totalSessions;
  this.bookingConfig.totalWeeks = this.totalWeeks;
  this.bookingConfig.sessionsPerWeek = this.sessionsPerWeek;
  this.bookingConfig.bookingMode = this.bookingMode;
  this.bookingConfig.slotDurationMinutes = this.slotDurationMinutes;
  this.bookingConfig.defaultCapacity = this.defaultCapacity;
  this.bookingConfig.allowWaitlist = this.allowWaitlist;

  /*
   * Approval safety:
   * Keeps approve/reject metadata consistent.
   */
  if (!this.approvalStatus) {
    this.approvalStatus = "PENDING_APPROVAL";
  }

  if (!this.approvalRequestedAt) {
    this.approvalRequestedAt = new Date();
  }

  if (this.approvalStatus === "PENDING_APPROVAL") {
    this.approvedAt = null;
    this.approvedBy = null;
    this.rejectedAt = null;
    this.rejectedBy = null;
    this.rejectionReason = "";
  }

  if (this.approvalStatus === "APPROVED") {
    this.rejectedAt = null;
    this.rejectedBy = null;
    this.rejectionReason = "";
  }

  if (this.approvalStatus === "REJECTED") {
    this.approvedAt = null;
    this.approvedBy = null;
  }

  next();
});

activitySchema.index({ academyId: 1, status: 1 });
activitySchema.index({ academyId: 1, title: 1 });
activitySchema.index({ academyId: 1, categoryId: 1, status: 1 });
activitySchema.index({ academyId: 1, categoryName: 1 });
activitySchema.index({ featured: 1, status: 1 });
activitySchema.index({ bookingMode: 1, status: 1 });

/*
 * Approval workflow indexes.
 */
activitySchema.index({ academyId: 1, approvalStatus: 1 });
activitySchema.index({ academyId: 1, status: 1, approvalStatus: 1 });
activitySchema.index({ status: 1, approvalStatus: 1 });
activitySchema.index({ approvalStatus: 1, approvalRequestedAt: -1 });
activitySchema.index({ featured: 1, status: 1, approvalStatus: 1 });
activitySchema.index({
  academyId: 1,
  categoryId: 1,
  status: 1,
  approvalStatus: 1,
});

export default mongoose.models.Activity ||
  mongoose.model("Activity", activitySchema);

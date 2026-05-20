// server/src/models/Booking.js
import mongoose from "mongoose";

const PAYMENT_METHODS = ["CASH", "ONLINE"];
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];

const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PARTIALLY_BOOKED",
  "CANCELLED",
  "COMPLETED",
  "WAITLISTED",
  "NO_SHOW",
];

const ACTIVE_BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PARTIALLY_BOOKED",
  "WAITLISTED",
];

const SLOT_BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "PARTIALLY_BOOKED"];

const CANCELLATION_STATUSES = ["NONE", "REQUESTED", "APPROVED", "REJECTED"];

const DEFAULT_BOOKING_HOLD_MINUTES = Number(
  process.env.BOOKING_HOLD_MINUTES || 15,
);

const bookingGuestParentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const bookingGuestChildSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },

    dob: {
      type: Date,
      default: null,
    },

    age: {
      type: Number,
      default: 0,
      min: 0,
    },

    gender: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const bookedSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivitySlot",
      required: true,
    },

    date: {
      type: Date,
      default: null,
    },

    startTime: {
      type: String,
      default: "",
      trim: true,
    },

    endTime: {
      type: String,
      default: "",
      trim: true,
    },

    sessionLabel: {
      type: String,
      default: "",
      trim: true,
    },

    attendanceStatus: {
      type: String,
      enum: ["PENDING", "PRESENT", "ABSENT", "CANCELLED"],
      default: "PENDING",
    },

    status: {
      type: String,
      enum: ["BOOKED", "COMPLETED", "MISSED", "CANCELLED"],
      default: "BOOKED",
    },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: {
      type: String,
      required: true,
      trim: true,
    },

    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      required: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      default: null,
    },

    isGuestBooking: {
      type: Boolean,
      default: false,
    },

    guestPaymentToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    guestParent: {
      type: bookingGuestParentSchema,
      default: () => ({}),
    },

    guestChild: {
      type: bookingGuestChildSchema,
      default: () => ({}),
    },

    bookingMode: {
      type: String,
      enum: ["STRAIGHT", "FLEXIBLE"],
      default: "FLEXIBLE",
    },

    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    currency: {
      type: String,
      default: "QAR",
      trim: true,
      uppercase: true,
    },

    subtotalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    baseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    promoCode: {
      type: String,
      default: "",
      trim: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "CASH",
      uppercase: true,
      trim: true,
    },

    paymentGateway: {
      type: String,
      default: "MANUAL",
      uppercase: true,
      trim: true,
    },

    paymentReference: {
      type: String,
      default: "",
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationRequested: {
      type: Boolean,
      default: false,
    },

    cancellationStatus: {
      type: String,
      enum: CANCELLATION_STATUSES,
      default: "NONE",
      uppercase: true,
      trim: true,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    cancellationRequestedAt: {
      type: Date,
      default: null,
    },

    cancellationRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReviewedAt: {
      type: Date,
      default: null,
    },

    cancellationReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationAdminNote: {
      type: String,
      default: "",
      trim: true,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    bookingStatus: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "PENDING",
    },

    attendanceStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PRESENT", "ABSENT"],
      default: "PENDING",
    },

    bookingSource: {
      type: String,
      enum: ["WEB", "ADMIN", "MOBILE", "PARENT_ACCOUNT", "GUEST"],
      default: "WEB",
    },

    initialSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivitySlot",
      default: null,
    },

    slotIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ActivitySlot",
      },
    ],

    bookedSlotItems: {
      type: [bookedSlotSchema],
      default: [],
    },

    firstSessionDate: {
      type: Date,
      default: null,
    },

    lastSessionDate: {
      type: Date,
      default: null,
    },

    packageSnapshot: {
      title: { type: String, default: "", trim: true },
      slug: { type: String, default: "", trim: true },
      packageType: { type: String, default: "", trim: true },
      durationValue: { type: Number, default: 0 },
      durationUnit: { type: String, default: "", trim: true },
      sessionCount: { type: Number, default: 0 },
      validityDays: { type: Number, default: 0 },
      bookingPattern: { type: String, default: "", trim: true },
      price: { type: Number, default: 0 },
      currency: { type: String, default: "QAR", trim: true },
    },

    activitySnapshot: {
      title: { type: String, default: "", trim: true },
      slug: { type: String, default: "", trim: true },
      coverImage: { type: String, default: "", trim: true },
      venueName: { type: String, default: "", trim: true },
      venueAddress: { type: String, default: "", trim: true },
      organizerName: { type: String, default: "", trim: true },
      minAge: { type: Number, default: 0 },
      maxAge: { type: Number, default: 0 },
    },

    academySnapshot: {
      name: { type: String, default: "", trim: true },
      logo: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
    },

    childSnapshot: {
      fullName: { type: String, default: "", trim: true },
      age: { type: Number, default: 0 },
      gender: { type: String, default: "", trim: true },
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

function roundMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

function toValidObjectId(value) {
  const id = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + Number(minutes || 0) * 60 * 1000);
}

function normalizeDateOnly(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

bookingSchema.pre("validate", function bookingPreValidate(next) {
  if (this.isGuestBooking || this.bookingSource === "GUEST") {
    this.parentId = null;
    this.childId = null;
    this.isGuestBooking = true;
  }

  if (!Array.isArray(this.slotIds)) {
    this.slotIds = [];
  }

  const uniqueSlotIds = [
    ...new Set(
      this.slotIds.map((id) => String(id || "").trim()).filter(Boolean),
    ),
  ];

  this.slotIds = uniqueSlotIds.map(toValidObjectId).filter(Boolean);

  if (
    this.bookingMode === "STRAIGHT" &&
    !this.initialSlotId &&
    this.slotIds[0]
  ) {
    this.initialSlotId = this.slotIds[0];
  }

  if (!this.initialSlotId && this.bookedSlotItems?.[0]?.slotId) {
    this.initialSlotId = this.bookedSlotItems[0].slotId;
  }

  if (!this.totalSessions || this.totalSessions < 0) {
    this.totalSessions =
      this.packageSnapshot?.sessionCount ||
      this.slotIds.length ||
      this.bookedSlotItems.length ||
      0;
  }

  if (!this.bookedSessions || this.bookedSessions < 0) {
    this.bookedSessions =
      this.bookedSlotItems.length || this.slotIds.length || 0;
  }

  this.remainingSessions = Math.max(
    0,
    Number(this.totalSessions || 0) - Number(this.bookedSessions || 0),
  );

  if (
    !this.childSnapshot?.fullName &&
    this.isGuestBooking &&
    this.guestChild?.name
  ) {
    this.childSnapshot = {
      ...this.childSnapshot,
      fullName: this.guestChild.name || "",
      age: Number(this.guestChild.age || 0),
      gender: this.guestChild.gender || "",
    };
  }

  if (
    this.guestChild?.dob &&
    (!this.guestChild.age || this.guestChild.age <= 0)
  ) {
    const today = new Date();
    const dob = new Date(this.guestChild.dob);

    if (!Number.isNaN(dob.getTime())) {
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      this.guestChild.age = Math.max(0, age);
    }
  }

  if (!this.baseAmount || this.baseAmount <= 0) {
    this.baseAmount = Number(
      this.packageSnapshot?.price ||
        this.subtotalAmount ||
        this.finalAmount ||
        0,
    );
  }

  if (!this.subtotalAmount || this.subtotalAmount <= 0) {
    this.subtotalAmount = Number(
      this.baseAmount || this.packageSnapshot?.price || this.finalAmount || 0,
    );
  }

  if (!this.finalAmount || this.finalAmount <= 0) {
    const subtotal = Number(
      this.subtotalAmount ||
        this.baseAmount ||
        this.packageSnapshot?.price ||
        0,
    );

    const discount = Number(this.discount || 0);
    const tax = Number(this.taxAmount || 0);

    this.finalAmount = Math.max(0, subtotal - discount + tax);
  }

  this.baseAmount = roundMoney(this.baseAmount);
  this.subtotalAmount = roundMoney(this.subtotalAmount);
  this.discount = roundMoney(this.discount);
  this.taxAmount = roundMoney(this.taxAmount);
  this.finalAmount = roundMoney(this.finalAmount);

  this.currency = normalizeUpper(this.currency, "QAR");
  this.paymentMethod = normalizeUpper(this.paymentMethod, "CASH");
  this.paymentStatus = normalizeUpper(this.paymentStatus, "PENDING");
  this.bookingStatus = normalizeUpper(this.bookingStatus, "PENDING");
  this.bookingSource = normalizeUpper(this.bookingSource, "WEB");
  this.cancellationStatus = normalizeUpper(this.cancellationStatus, "NONE");

  if (this.paymentMethod === "CASH") {
    this.paymentGateway = "MANUAL";
  }

  if (this.paymentMethod === "ONLINE" && !this.paymentGateway) {
    this.paymentGateway = "MYFATOORAH";
  }

  this.paymentGateway = normalizeUpper(this.paymentGateway, "MANUAL");

  if (this.cancellationStatus === "REQUESTED") {
    this.cancellationRequested = true;

    if (!this.cancellationRequestedAt) {
      this.cancellationRequestedAt = new Date();
    }
  }

  if (["APPROVED", "REJECTED", "NONE"].includes(this.cancellationStatus)) {
    if (this.cancellationStatus === "NONE") {
      this.cancellationRequested = false;
      this.cancellationReason = "";
      this.cancellationRequestedAt = null;
      this.cancellationRequestedBy = null;
      this.cancellationReviewedAt = null;
      this.cancellationReviewedBy = null;
      this.cancellationAdminNote = "";
    } else {
      this.cancellationRequested = false;
    }
  }

  if (Array.isArray(this.bookedSlotItems)) {
    this.bookedSlotItems = this.bookedSlotItems.map((item) => ({
      ...item,
      date: normalizeDateOnly(item?.date),
    }));
  }

  if (this.firstSessionDate) {
    this.firstSessionDate = normalizeDateOnly(this.firstSessionDate);
  }

  if (this.lastSessionDate) {
    this.lastSessionDate = normalizeDateOnly(this.lastSessionDate);
  }

  next();
});

bookingSchema.pre("save", function bookingStatusDates(next) {
  const now = new Date();

  if (this.isNew && this.bookingStatus === "PENDING" && !this.expiresAt) {
    this.expiresAt = addMinutes(now, DEFAULT_BOOKING_HOLD_MINUTES);
  }

  if (this.isModified("paymentStatus")) {
    if (this.paymentStatus === "PAID") {
      if (!this.paidAt) this.paidAt = now;

      if (
        this.bookingStatus === "PENDING" ||
        this.bookingStatus === "WAITLISTED" ||
        this.bookingStatus === "PARTIALLY_BOOKED"
      ) {
        this.bookingStatus = "CONFIRMED";
      }
    }

    if (this.paymentStatus === "FAILED") {
      if (!this.failedAt) this.failedAt = now;

      if (
        this.bookingStatus !== "CONFIRMED" &&
        this.bookingStatus !== "COMPLETED"
      ) {
        this.bookingStatus = "CANCELLED";
      }
    }

    if (this.paymentStatus === "CANCELLED") {
      if (!this.cancelledAt) this.cancelledAt = now;
      this.bookingStatus = "CANCELLED";
    }

    if (this.paymentStatus === "REFUNDED") {
      if (!this.refundedAt) this.refundedAt = now;
    }
  }

  if (this.isModified("bookingStatus")) {
    if (this.bookingStatus === "CONFIRMED") {
      if (!this.confirmedAt) this.confirmedAt = now;
      this.expiresAt = null;
    }

    if (this.bookingStatus === "CANCELLED") {
      if (!this.cancelledAt) this.cancelledAt = now;
      this.expiresAt = null;
    }

    if (this.bookingStatus === "COMPLETED") {
      this.expiresAt = null;
    }
  }

  if (this.isModified("cancellationStatus")) {
    if (this.cancellationStatus === "REQUESTED") {
      this.cancellationRequested = true;
      if (!this.cancellationRequestedAt) {
        this.cancellationRequestedAt = now;
      }
    }

    if (this.cancellationStatus === "APPROVED") {
      this.cancellationRequested = false;
      if (!this.cancellationReviewedAt) {
        this.cancellationReviewedAt = now;
      }
    }

    if (this.cancellationStatus === "REJECTED") {
      this.cancellationRequested = false;
      if (!this.cancellationReviewedAt) {
        this.cancellationReviewedAt = now;
      }
    }

    if (this.cancellationStatus === "NONE") {
      this.cancellationRequested = false;
    }
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* STATICS                                                                    */
/* -------------------------------------------------------------------------- */

bookingSchema.statics.slotBlockingFilter = function slotBlockingFilter({
  slotId,
  date,
  excludeBookingId = null,
}) {
  const normalizedDate = normalizeDateOnly(date);
  const now = new Date();

  const filter = {
    $and: [
      excludeBookingId
        ? {
            _id: { $ne: new mongoose.Types.ObjectId(String(excludeBookingId)) },
          }
        : {},
      {
        $or: [
          {
            bookingStatus: { $in: ["CONFIRMED", "PARTIALLY_BOOKED"] },
          },
          {
            bookingStatus: "PENDING",
            expiresAt: { $gt: now },
          },
        ],
      },
      {
        paymentStatus: { $nin: ["FAILED", "CANCELLED", "REFUNDED"] },
      },
      {
        $or: [
          {
            initialSlotId: new mongoose.Types.ObjectId(String(slotId)),
            firstSessionDate: normalizedDate,
          },
          {
            bookedSlotItems: {
              $elemMatch: {
                slotId: new mongoose.Types.ObjectId(String(slotId)),
                date: normalizedDate,
                status: { $ne: "CANCELLED" },
              },
            },
          },
        ],
      },
    ],
  };

  return filter;
};

bookingSchema.statics.countSlotBookings = function countSlotBookings({
  slotId,
  date,
  excludeBookingId = null,
  session = null,
}) {
  const query = this.countDocuments(
    this.slotBlockingFilter({
      slotId,
      date,
      excludeBookingId,
    }),
  );

  if (session) query.session(session);

  return query;
};

bookingSchema.statics.expirePendingBookings = function expirePendingBookings({
  now = new Date(),
  session = null,
} = {}) {
  const query = this.updateMany(
    {
      bookingStatus: "PENDING",
      paymentStatus: "PENDING",
      expiresAt: { $lte: now },
    },
    {
      $set: {
        bookingStatus: "CANCELLED",
        paymentStatus: "CANCELLED",
        cancelledAt: now,
      },
    },
  );

  if (session) query.session(session);

  return query;
};

/* -------------------------------------------------------------------------- */
/* VIRTUALS                                                                   */
/* -------------------------------------------------------------------------- */

bookingSchema.virtual("payableAmount").get(function payableAmount() {
  return this.finalAmount;
});

bookingSchema.virtual("isPaid").get(function isPaid() {
  return this.paymentStatus === "PAID";
});

bookingSchema.virtual("isCashPayment").get(function isCashPayment() {
  return this.paymentMethod === "CASH";
});

bookingSchema.virtual("isOnlinePayment").get(function isOnlinePayment() {
  return this.paymentMethod === "ONLINE";
});

bookingSchema.virtual("isExpired").get(function isExpired() {
  return (
    this.bookingStatus === "PENDING" &&
    this.paymentStatus === "PENDING" &&
    this.expiresAt &&
    new Date(this.expiresAt).getTime() <= Date.now()
  );
});

bookingSchema.virtual("isActiveBooking").get(function isActiveBooking() {
  return ACTIVE_BOOKING_STATUSES.includes(this.bookingStatus);
});

bookingSchema
  .virtual("hasCancellationRequest")
  .get(function hasCancellationRequest() {
    return (
      this.cancellationRequested === true ||
      this.cancellationStatus === "REQUESTED"
    );
  });

bookingSchema.set("toJSON", { virtuals: true });
bookingSchema.set("toObject", { virtuals: true });

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

bookingSchema.index({ bookingNo: 1 }, { unique: true });

bookingSchema.index({ academyId: 1 });
bookingSchema.index({ branchId: 1 });
bookingSchema.index({ activityId: 1 });
bookingSchema.index({ packageId: 1 });
bookingSchema.index({ parentId: 1 });
bookingSchema.index({ childId: 1 });
bookingSchema.index({ isGuestBooking: 1 });
bookingSchema.index({ bookingMode: 1 });
bookingSchema.index({ paymentMethod: 1 });
bookingSchema.index({ paymentGateway: 1 });
bookingSchema.index({ paymentReference: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ bookingSource: 1 });
bookingSchema.index({ initialSlotId: 1 });
bookingSchema.index({ slotIds: 1 });
bookingSchema.index({ "bookedSlotItems.slotId": 1 });
bookingSchema.index({ "bookedSlotItems.date": 1 });
bookingSchema.index({ firstSessionDate: 1 });
bookingSchema.index({ lastSessionDate: 1 });
bookingSchema.index({ paymentId: 1 });
bookingSchema.index({ expiresAt: 1 });
bookingSchema.index({ confirmedAt: 1 });
bookingSchema.index({ cancelledAt: 1 });
bookingSchema.index({ paidAt: 1 });
bookingSchema.index({ cancellationRequested: 1 });
bookingSchema.index({ cancellationStatus: 1 });
bookingSchema.index({ cancellationRequestedAt: -1 });
bookingSchema.index({ cancellationRequestedBy: 1 });
bookingSchema.index({ cancellationReviewedBy: 1 });

bookingSchema.index({ academyId: 1, createdAt: -1 });
bookingSchema.index({ parentId: 1, createdAt: -1 });
bookingSchema.index({ childId: 1, createdAt: -1 });
bookingSchema.index({ isGuestBooking: 1, createdAt: -1 });
bookingSchema.index({ activityId: 1, bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ packageId: 1, bookingMode: 1 });
bookingSchema.index({ initialSlotId: 1, firstSessionDate: 1 });
bookingSchema.index({ paymentStatus: 1, bookingStatus: 1 });
bookingSchema.index({ paymentMethod: 1, paymentStatus: 1 });
bookingSchema.index({ paymentGateway: 1, paymentReference: 1 });
bookingSchema.index({ bookingSource: 1, createdAt: -1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ academyId: 1, cancellationStatus: 1, createdAt: -1 });
bookingSchema.index({ parentId: 1, cancellationStatus: 1, createdAt: -1 });

/* Slot availability / overbooking protection indexes */
bookingSchema.index({
  initialSlotId: 1,
  firstSessionDate: 1,
  bookingStatus: 1,
  paymentStatus: 1,
  expiresAt: 1,
});

bookingSchema.index({
  "bookedSlotItems.slotId": 1,
  "bookedSlotItems.date": 1,
  bookingStatus: 1,
  paymentStatus: 1,
  expiresAt: 1,
});

bookingSchema.index({
  academyId: 1,
  bookingStatus: 1,
  paymentStatus: 1,
  expiresAt: 1,
});

export {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  BOOKING_STATUSES,
  ACTIVE_BOOKING_STATUSES,
  SLOT_BLOCKING_STATUSES,
  CANCELLATION_STATUSES,
};

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

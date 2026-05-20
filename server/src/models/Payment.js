// server/src/models/Payment.js
import mongoose from "mongoose";

const PAYMENT_METHODS = ["CASH", "ONLINE"];

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

const SETTLEMENT_STATUSES = [
  "PENDING",
  "READY",
  "PAID_TO_ACADEMY",
  "HOLD",
  "CANCELLED",
];

const PAYMENT_RECEIVERS = ["KIDGAGE"];

const COMMISSION_TYPES = ["PERCENTAGE", "FIXED"];

const PAYMENT_GATEWAYS = ["MANUAL", "MYFATOORAH"];

const paymentSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      default: null,
      index: true,
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      default: null,
      index: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActivityPackage",
      default: null,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "CASH",
      uppercase: true,
      trim: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "QAR",
      trim: true,
      uppercase: true,
    },

    paymentReceiver: {
      type: String,
      enum: PAYMENT_RECEIVERS,
      default: "KIDGAGE",
      uppercase: true,
      trim: true,
      index: true,
    },

    paymentGateway: {
      type: String,
      enum: PAYMENT_GATEWAYS,
      default: "MANUAL",
      trim: true,
      uppercase: true,
      index: true,
    },

    gatewayOrderId: {
      /**
       * MyFatoorah InvoiceId.
       */
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    gatewayInvoiceId: {
      /**
       * Optional duplicate/alias for compatibility.
       * Keep this available if some older code uses gatewayInvoiceId.
       */
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    gatewayPaymentId: {
      /**
       * MyFatoorah PaymentId from redirect/GetPaymentStatus.
       */
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    gatewayReference: {
      /**
       * ReferenceId / TrackId / Transaction reference / fallback URL.
       */
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    gatewayCheckoutUrl: {
      /**
       * MyFatoorah hosted payment URL.
       */
      type: String,
      default: "",
      trim: true,
    },

    gatewaySessionId: {
      /**
       * For future embedded/card-session integrations.
       */
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    gatewayRawResponse: {
      /**
       * Optional gateway raw payload store.
       * Main service also stores details inside meta.
       */
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
      uppercase: true,
      trim: true,
      index: true,
    },

    settlementStatus: {
      type: String,
      enum: SETTLEMENT_STATUSES,
      default: "PENDING",
      uppercase: true,
      trim: true,
      index: true,
    },

    kidgageCommissionType: {
      type: String,
      enum: COMMISSION_TYPES,
      default: "PERCENTAGE",
      uppercase: true,
      trim: true,
    },

    kidgageCommissionValue: {
      type: Number,
      default: 10,
      min: 0,
    },

    kidgageCommissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    academyPayableAmount: {
      type: Number,
      default: 0,
      min: 0,
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

    refundedAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    settlementReference: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    settledAt: {
      type: Date,
      default: null,
    },

    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

function roundMoney(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n)) {
    return 0;
  }

  return Math.round(n * 100) / 100;
}

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

paymentSchema.pre("validate", function calculateKidgageSettlement(next) {
  const amount = roundMoney(this.amount);

  this.paymentReceiver = normalizeUpper(this.paymentReceiver, "KIDGAGE");
  this.currency = normalizeUpper(this.currency, "QAR");
  this.paymentMethod = normalizeUpper(this.paymentMethod, "CASH");
  this.paymentStatus = normalizeUpper(this.paymentStatus, "PENDING");
  this.settlementStatus = normalizeUpper(this.settlementStatus, "PENDING");

  this.kidgageCommissionType = normalizeUpper(
    this.kidgageCommissionType,
    "PERCENTAGE",
  );

  if (this.paymentMethod === "CASH") {
    this.paymentGateway = "MANUAL";
  }

  if (this.paymentMethod === "ONLINE") {
    this.paymentGateway = normalizeUpper(this.paymentGateway, "MYFATOORAH");
  }

  this.paymentGateway = normalizeUpper(this.paymentGateway, "MANUAL");

  if (!PAYMENT_METHODS.includes(this.paymentMethod)) {
    this.paymentMethod = "CASH";
  }

  if (!PAYMENT_GATEWAYS.includes(this.paymentGateway)) {
    this.paymentGateway =
      this.paymentMethod === "ONLINE" ? "MYFATOORAH" : "MANUAL";
  }

  if (!PAYMENT_STATUSES.includes(this.paymentStatus)) {
    this.paymentStatus = "PENDING";
  }

  if (!SETTLEMENT_STATUSES.includes(this.settlementStatus)) {
    this.settlementStatus = "PENDING";
  }

  if (!COMMISSION_TYPES.includes(this.kidgageCommissionType)) {
    this.kidgageCommissionType = "PERCENTAGE";
  }

  let commissionAmount = 0;

  if (this.kidgageCommissionType === "FIXED") {
    commissionAmount = roundMoney(this.kidgageCommissionValue);
  } else {
    commissionAmount = roundMoney(
      (amount * Number(this.kidgageCommissionValue || 0)) / 100,
    );
  }

  if (commissionAmount > amount) {
    commissionAmount = amount;
  }

  if (commissionAmount < 0) {
    commissionAmount = 0;
  }

  this.amount = amount;
  this.kidgageCommissionAmount = roundMoney(commissionAmount);
  this.academyPayableAmount = roundMoney(amount - commissionAmount);

  /**
   * Keep gatewayInvoiceId synced for older code compatibility.
   */
  if (!this.gatewayInvoiceId && this.gatewayOrderId) {
    this.gatewayInvoiceId = this.gatewayOrderId;
  }

  if (!this.gatewayOrderId && this.gatewayInvoiceId) {
    this.gatewayOrderId = this.gatewayInvoiceId;
  }

  next();
});

paymentSchema.pre("save", function updateStatusDates(next) {
  const now = new Date();

  if (this.isModified("paymentStatus")) {
    if (this.paymentStatus === "PAID") {
      if (!this.paidAt) {
        this.paidAt = now;
      }

      if (this.paymentMethod === "CASH" && !this.confirmedAt) {
        this.confirmedAt = now;
      }

      this.failedAt = null;
      this.cancelledAt = null;

      if (
        this.settlementStatus === "PENDING" ||
        this.settlementStatus === "CANCELLED" ||
        !this.settlementStatus
      ) {
        this.settlementStatus = "READY";
      }
    }

    if (this.paymentStatus === "FAILED") {
      if (!this.failedAt) {
        this.failedAt = now;
      }

      this.paidAt = null;
      this.cancelledAt = null;
      this.settlementStatus = "CANCELLED";
    }

    if (this.paymentStatus === "CANCELLED") {
      if (!this.cancelledAt) {
        this.cancelledAt = now;
      }

      this.paidAt = null;
      this.failedAt = null;
      this.settlementStatus = "CANCELLED";
    }

    if (this.paymentStatus === "REFUNDED") {
      if (!this.refundedAt) {
        this.refundedAt = now;
      }

      this.settlementStatus = "CANCELLED";
    }

    if (this.paymentStatus === "PENDING") {
      this.paidAt = null;
      this.failedAt = null;
      this.cancelledAt = null;
      this.refundedAt = null;

      if (
        this.settlementStatus !== "HOLD" &&
        this.settlementStatus !== "PAID_TO_ACADEMY"
      ) {
        this.settlementStatus = "PENDING";
      }
    }
  }

  if (this.isModified("settlementStatus")) {
    if (this.settlementStatus === "PAID_TO_ACADEMY") {
      if (!this.settledAt) {
        this.settledAt = now;
      }
    }

    if (
      this.settlementStatus === "PENDING" ||
      this.settlementStatus === "READY" ||
      this.settlementStatus === "HOLD" ||
      this.settlementStatus === "CANCELLED"
    ) {
      if (this.settlementStatus === "CANCELLED") {
        this.settledAt = null;
      }
    }
  }

  next();
});

paymentSchema.virtual("isPaid").get(function () {
  return this.paymentStatus === "PAID";
});

paymentSchema.virtual("isPending").get(function () {
  return this.paymentStatus === "PENDING";
});

paymentSchema.virtual("isFailed").get(function () {
  return this.paymentStatus === "FAILED";
});

paymentSchema.virtual("isCancelled").get(function () {
  return this.paymentStatus === "CANCELLED";
});

paymentSchema.virtual("isRefunded").get(function () {
  return this.paymentStatus === "REFUNDED";
});

paymentSchema.virtual("isCash").get(function () {
  return this.paymentMethod === "CASH";
});

paymentSchema.virtual("isOnline").get(function () {
  return this.paymentMethod === "ONLINE";
});

paymentSchema.virtual("isManualGateway").get(function () {
  return this.paymentGateway === "MANUAL";
});

paymentSchema.virtual("isMyFatoorahGateway").get(function () {
  return this.paymentGateway === "MYFATOORAH";
});

paymentSchema.virtual("isReadyForSettlement").get(function () {
  return this.paymentStatus === "PAID" && this.settlementStatus === "READY";
});

paymentSchema.virtual("isSettledToAcademy").get(function () {
  return this.settlementStatus === "PAID_TO_ACADEMY";
});

paymentSchema.virtual("netPlatformAmount").get(function () {
  return this.kidgageCommissionAmount || 0;
});

paymentSchema.virtual("netAcademyAmount").get(function () {
  return this.academyPayableAmount || 0;
});

paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* -------------------------------------------------------------------------- */

paymentSchema.index({ academyId: 1, paymentStatus: 1 });
paymentSchema.index({ academyId: 1, settlementStatus: 1 });
paymentSchema.index({ academyId: 1, paymentMethod: 1, paymentStatus: 1 });
paymentSchema.index({ academyId: 1, createdAt: -1 });

paymentSchema.index({ paymentReceiver: 1, paymentStatus: 1 });
paymentSchema.index({ paymentReceiver: 1, settlementStatus: 1 });
paymentSchema.index({ paymentReceiver: 1, paymentMethod: 1 });
paymentSchema.index({ paymentReceiver: 1, paymentGateway: 1 });

paymentSchema.index({ paymentGateway: 1, gatewayPaymentId: 1 });
paymentSchema.index({ paymentGateway: 1, gatewayOrderId: 1 });
paymentSchema.index({ paymentGateway: 1, gatewayInvoiceId: 1 });
paymentSchema.index({ paymentGateway: 1, gatewayReference: 1 });

paymentSchema.index({ parentId: 1, createdAt: -1 });
paymentSchema.index({ childId: 1, createdAt: -1 });
paymentSchema.index({ activityId: 1, createdAt: -1 });
paymentSchema.index({ packageId: 1, createdAt: -1 });

paymentSchema.index({ settlementStatus: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });

export {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SETTLEMENT_STATUSES,
  PAYMENT_RECEIVERS,
  COMMISSION_TYPES,
  PAYMENT_GATEWAYS,
};

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);

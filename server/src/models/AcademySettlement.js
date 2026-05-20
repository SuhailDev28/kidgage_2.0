// server/src/models/AcademySettlement.js
import mongoose from "mongoose";

const academySettlementSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
    },

    paymentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],

    periodStart: {
      type: Date,
      default: null,
    },

    periodEnd: {
      type: Date,
      default: null,
    },

    totalCollected: {
      type: Number,
      default: 0,
      min: 0,
    },

    kidgageCommissionTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    academyPayableTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "QAR",
      trim: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      enum: ["MANUAL_BANK_TRANSFER", "CASH", "CHEQUE", "ONLINE_TRANSFER"],
      default: "MANUAL_BANK_TRANSFER",
      trim: true,
      uppercase: true,
    },

    settlementReference: {
      type: String,
      default: "",
      trim: true,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

academySettlementSchema.virtual("paymentCount").get(function paymentCount() {
  return Array.isArray(this.paymentIds) ? this.paymentIds.length : 0;
});

academySettlementSchema.pre("validate", function beforeValidate(next) {
  if (Array.isArray(this.paymentIds)) {
    const uniqueIds = [
      ...new Set(
        this.paymentIds.map((id) => String(id || "").trim()).filter(Boolean),
      ),
    ];

    this.paymentIds = uniqueIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
  }

  this.currency = String(this.currency || "QAR")
    .trim()
    .toUpperCase();

  this.status = String(this.status || "PENDING")
    .trim()
    .toUpperCase();

  this.paymentMethod = String(this.paymentMethod || "MANUAL_BANK_TRANSFER")
    .trim()
    .toUpperCase();

  this.totalCollected =
    Math.round(Math.max(0, Number(this.totalCollected || 0)) * 100) / 100;

  this.kidgageCommissionTotal =
    Math.round(Math.max(0, Number(this.kidgageCommissionTotal || 0)) * 100) /
    100;

  this.academyPayableTotal =
    Math.round(Math.max(0, Number(this.academyPayableTotal || 0)) * 100) / 100;

  if (this.status === "PAID" && !this.settledAt) {
    this.settledAt = new Date();
  }

  if (this.status !== "PAID") {
    this.settledAt = this.settledAt || null;
  }

  next();
});

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                    */
/* Keep all indexes here. Do not duplicate with field-level index: true.       */
/* -------------------------------------------------------------------------- */

academySettlementSchema.index({ academyId: 1, status: 1 });
academySettlementSchema.index({ academyId: 1, createdAt: -1 });
academySettlementSchema.index({ status: 1, createdAt: -1 });
academySettlementSchema.index({ settledAt: -1 });
academySettlementSchema.index({ paymentIds: 1 });
academySettlementSchema.index({ settlementReference: 1 });

academySettlementSchema.index(
  { academyId: 1, settlementReference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      settlementReference: { $type: "string", $gt: "" },
    },
  },
);

export default mongoose.models.AcademySettlement ||
  mongoose.model("AcademySettlement", academySettlementSchema);

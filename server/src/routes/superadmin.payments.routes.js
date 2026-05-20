// server/src/routes/superadmin.payments.routes.js
import express from "express";
import mongoose from "mongoose";

import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

import Payment from "../models/Payment.js";
import AcademySettlement from "../models/AcademySettlement.js";

let Booking = null;

try {
  const mod = await import("../models/Booking.js");
  Booking = mod?.default || null;
} catch {
  Booking = null;
}

const router = express.Router();

router.use(auth, requireRole("SUPER_ADMIN"));

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function roundMoney(value) {
  return Number(toMoney(value, 0).toFixed(2));
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeDateStart(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeDateEnd(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  d.setHours(23, 59, 59, 999);
  return d;
}

function buildDateFilter(req) {
  const createdAt = {};

  const from = normalizeDateStart(req.query.from || req.query.dateFrom);
  const to = normalizeDateEnd(req.query.to || req.query.dateTo);

  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  return Object.keys(createdAt).length ? createdAt : null;
}

function buildPaymentFilter(req) {
  const filter = {};

  if (req.query.academyId && isValidObjectId(req.query.academyId)) {
    filter.academyId = req.query.academyId;
  }

  if (req.query.paymentStatus) {
    filter.paymentStatus = normalizeStatus(req.query.paymentStatus);
  }

  if (req.query.settlementStatus) {
    filter.settlementStatus = normalizeStatus(req.query.settlementStatus);
  }

  if (req.query.paymentMethod) {
    filter.paymentMethod = normalizeStatus(req.query.paymentMethod);
  }

  if (req.query.receiver) {
    filter.paymentReceiver = normalizeStatus(req.query.receiver);
  } else {
    filter.paymentReceiver = "KIDGAGE";
  }

  if (req.query.gateway) {
    filter.paymentGateway = normalizeStatus(req.query.gateway);
  }

  if (req.query.paymentGateway) {
    filter.paymentGateway = normalizeStatus(req.query.paymentGateway);
  }

  const createdAt = buildDateFilter(req);
  if (createdAt) filter.createdAt = createdAt;

  return filter;
}

function safeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value?._id || value?.id || value || null;
}

function normalizePaymentForClient(item) {
  if (!item) return null;

  const academy = item?.academyId || {};
  const booking = item?.bookingId || {};
  const parent = item?.parentId || {};
  const child = item?.childId || {};
  const activity = item?.activityId || {};
  const pkg = item?.packageId || {};

  return {
    _id: item._id,
    id: item._id,

    academyId: safeId(academy) || item.academyId || null,
    academyName:
      item.academyName || academy?.name || item?.meta?.academyName || "Academy",
    academyCity: academy?.city || item.academyCity || "",
    academyLogo: academy?.logo || "",

    bookingId: safeId(booking) || item.bookingId || null,
    bookingNo:
      item.bookingNo ||
      booking?.bookingNo ||
      booking?.referenceNo ||
      booking?.invoiceNo ||
      "N/A",
    bookingStatus: booking?.bookingStatus || booking?.status || "",

    parentId: safeId(parent) || item.parentId || null,
    parentName:
      item.parentName ||
      parent?.fullName ||
      parent?.name ||
      item?.guestParent?.fullName ||
      "Parent / Guest",
    parentEmail:
      item.parentEmail || parent?.email || item?.guestParent?.email || "",
    parentPhone:
      item.parentPhone || parent?.phone || item?.guestParent?.phone || "",

    childId: safeId(child) || item.childId || null,
    childName:
      child?.fullName || child?.name || item?.guestChild?.fullName || "",

    activityId: safeId(activity) || item.activityId || null,
    activityName:
      item.activityName ||
      activity?.title ||
      activity?.name ||
      item?.bookingId?.activityName ||
      "N/A",

    packageId: safeId(pkg) || item.packageId || null,
    packageName:
      item.packageName || pkg?.title || item?.bookingId?.packageName || "N/A",

    amount: roundMoney(item.amount),
    currency: item.currency || "QAR",

    paymentReceiver: item.paymentReceiver || "KIDGAGE",

    paymentMethod: item.paymentMethod || "CASH",
    paymentGateway: item.paymentGateway || "MANUAL",

    gatewayOrderId: item.gatewayOrderId || "",
    gatewayPaymentId: item.gatewayPaymentId || "",
    gatewayReference: item.gatewayReference || "",
    gatewayCheckoutUrl: item.gatewayCheckoutUrl || "",

    paymentStatus: item.paymentStatus || "PENDING",
    settlementStatus: item.settlementStatus || "PENDING",

    kidgageCommissionType: item.kidgageCommissionType || "PERCENTAGE",
    kidgageCommissionValue: toMoney(item.kidgageCommissionValue, 0),
    kidgageCommissionAmount: roundMoney(item.kidgageCommissionAmount),
    academyPayableAmount: roundMoney(item.academyPayableAmount),

    paidAt: item.paidAt || null,
    failedAt: item.failedAt || null,
    cancelledAt: item.cancelledAt || null,
    refundedAt: item.refundedAt || null,

    confirmedBy: item.confirmedBy || null,
    confirmedAt: item.confirmedAt || null,

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,

    notes: item.notes || "",
    meta: item.meta || {},
  };
}

function normalizeSettlementForClient(item) {
  if (!item) return null;

  const academy = item?.academyId || {};
  const settledBy = item?.settledBy || {};

  return {
    _id: item._id,
    id: item._id,

    academyId: safeId(academy) || item.academyId || null,
    academyName: academy?.name || item.academyName || "Academy",
    academyCity: academy?.city || item.academyCity || "",
    academyLogo: academy?.logo || "",

    paymentIds: Array.isArray(item.paymentIds)
      ? item.paymentIds
          .map((payment) => safeId(payment) || payment)
          .filter(Boolean)
      : [],
    paymentCount: Array.isArray(item.paymentIds) ? item.paymentIds.length : 0,

    totalCollected: roundMoney(item.totalCollected),
    kidgageCommissionTotal: roundMoney(item.kidgageCommissionTotal),
    academyPayableTotal: roundMoney(item.academyPayableTotal),
    currency: item.currency || "QAR",

    status: item.status || "PAID",
    paymentMethod: item.paymentMethod || "MANUAL_BANK_TRANSFER",
    settlementReference: item.settlementReference || "",
    notes: item.notes || "",

    settledAt: item.settledAt || null,
    settledBy: safeId(settledBy) || item.settledBy || null,
    settledByName: settledBy?.fullName || settledBy?.name || "",
    settledByEmail: settledBy?.email || "",

    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

async function syncBookingAsPaid(payment) {
  if (!Booking || !payment?.bookingId) return null;

  return Booking.findOneAndUpdate(
    {
      _id: payment.bookingId,
      academyId: payment.academyId,
    },
    {
      $set: {
        bookingStatus: "CONFIRMED",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: payment.paymentMethod,
        paymentGateway: payment.paymentGateway,
        paymentReference:
          payment.gatewayPaymentId ||
          payment.gatewayOrderId ||
          payment.gatewayReference ||
          "",
        paymentId: payment._id,
        paidAt: payment.paidAt || new Date(),
      },
    },
    { new: true },
  );
}

/* -------------------------------------------------------------------------- */
/* CENTRAL PAYMENTS                                                           */
/* -------------------------------------------------------------------------- */

router.get("/payments", async (req, res, next) => {
  try {
    const filter = buildPaymentFilter(req);

    const q = String(req.query.q || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 300), 1), 500);

    let payments = await Payment.find(filter)
      .populate("academyId", "name city logo")
      .populate(
        "bookingId",
        "bookingNo referenceNo invoiceNo bookingStatus paymentStatus activityName packageName",
      )
      .populate("parentId", "fullName name email phone")
      .populate("childId", "fullName name")
      .populate("activityId", "title name")
      .populate("packageId", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (q) {
      const needle = q.toLowerCase();

      payments = payments.filter((item) => {
        const normalized = normalizePaymentForClient(item);

        return [
          normalized.id,
          normalized.academyName,
          normalized.academyCity,
          normalized.bookingNo,
          normalized.parentName,
          normalized.parentEmail,
          normalized.parentPhone,
          normalized.childName,
          normalized.activityName,
          normalized.packageName,
          normalized.paymentMethod,
          normalized.paymentGateway,
          normalized.gatewayOrderId,
          normalized.gatewayPaymentId,
          normalized.gatewayReference,
          normalized.paymentStatus,
          normalized.settlementStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    const totals = payments.reduce(
      (acc, item) => {
        const amount = toMoney(item.amount, 0);
        const commission = toMoney(item.kidgageCommissionAmount, 0);
        const payable = toMoney(item.academyPayableAmount, 0);

        acc.totalCollected += amount;
        acc.kidgageCommission += commission;
        acc.academyPayable += payable;

        if (item.paymentStatus === "PAID") {
          acc.paidCount += 1;
          acc.paidCollected += amount;
          acc.paidCommission += commission;
          acc.paidAcademyPayable += payable;
        }

        if (item.paymentStatus === "PENDING") acc.pendingCount += 1;
        if (item.paymentStatus === "FAILED") acc.failedCount += 1;
        if (item.paymentStatus === "CANCELLED") acc.cancelledCount += 1;
        if (item.paymentStatus === "REFUNDED") acc.refundedCount += 1;

        if (item.paymentMethod === "CASH") acc.cashCount += 1;
        if (item.paymentMethod === "ONLINE") acc.onlineCount += 1;

        if (item.paymentGateway === "MANUAL") acc.manualGatewayCount += 1;
        if (item.paymentGateway === "MYFATOORAH")
          acc.myfatoorahGatewayCount += 1;

        if (item.settlementStatus === "READY") {
          acc.readyForSettlement += 1;
          acc.readySettlementAmount += payable;
        }

        if (item.settlementStatus === "PAID_TO_ACADEMY") {
          acc.settledCount += 1;
          acc.settledAmount += payable;
        }

        return acc;
      },
      {
        totalCollected: 0,
        kidgageCommission: 0,
        academyPayable: 0,

        paidCollected: 0,
        paidCommission: 0,
        paidAcademyPayable: 0,

        paidCount: 0,
        pendingCount: 0,
        failedCount: 0,
        cancelledCount: 0,
        refundedCount: 0,

        cashCount: 0,
        onlineCount: 0,
        manualGatewayCount: 0,
        myfatoorahGatewayCount: 0,

        readyForSettlement: 0,
        readySettlementAmount: 0,
        settledCount: 0,
        settledAmount: 0,
      },
    );

    return res.json({
      count: payments.length,
      totals: {
        totalCollected: roundMoney(totals.totalCollected),
        kidgageCommission: roundMoney(totals.kidgageCommission),
        academyPayable: roundMoney(totals.academyPayable),

        paidCollected: roundMoney(totals.paidCollected),
        paidCommission: roundMoney(totals.paidCommission),
        paidAcademyPayable: roundMoney(totals.paidAcademyPayable),

        paidCount: totals.paidCount,
        pendingCount: totals.pendingCount,
        failedCount: totals.failedCount,
        cancelledCount: totals.cancelledCount,
        refundedCount: totals.refundedCount,

        cashCount: totals.cashCount,
        onlineCount: totals.onlineCount,
        manualGatewayCount: totals.manualGatewayCount,
        myfatoorahGatewayCount: totals.myfatoorahGatewayCount,

        readyForSettlement: totals.readyForSettlement,
        readySettlementAmount: roundMoney(totals.readySettlementAmount),

        settledCount: totals.settledCount,
        settledAmount: roundMoney(totals.settledAmount),
      },
      payments: payments.map(normalizePaymentForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/payments/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id)
      .populate("academyId", "name city logo email phone")
      .populate("bookingId")
      .populate("parentId", "fullName name email phone")
      .populate("childId")
      .populate("activityId", "title name")
      .populate("packageId", "title")
      .lean();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json({
      payment: normalizePaymentForClient(payment),
      rawPayment: payment,
    });
  } catch (error) {
    next(error);
  }
});

async function markPaymentPaid(req, res, next) {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.paymentStatus === "PAID") {
      return res.json({
        message: "Payment is already marked as paid",
        payment: normalizePaymentForClient(payment),
      });
    }

    payment.paymentStatus = "PAID";
    payment.settlementStatus = "READY";
    payment.gatewayPaymentId = String(req.body.gatewayPaymentId || "").trim();
    payment.gatewayReference = String(req.body.gatewayReference || "").trim();
    payment.paidAt = new Date();
    payment.failedAt = null;
    payment.cancelledAt = null;

    if (payment.paymentMethod === "CASH") {
      payment.paymentGateway = "MANUAL";
      payment.confirmedBy = req.user?._id || null;
      payment.confirmedAt = new Date();
    }

    payment.meta = {
      ...(payment.meta || {}),
      manuallyMarkedPaidBy: req.user?._id || null,
      manuallyMarkedPaidAt: new Date(),
    };

    await payment.save();
    await syncBookingAsPaid(payment);

    return res.json({
      message: "Payment marked as paid successfully",
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
}

router.patch("/payments/:id/mark-paid", markPaymentPaid);
router.post("/payments/:id/mark-paid", markPaymentPaid);

router.patch("/payments/:id/confirm-cash", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.paymentMethod !== "CASH") {
      return res.status(400).json({
        message: "Only cash payments can be confirmed manually",
      });
    }

    if (payment.paymentStatus === "PAID") {
      return res.json({
        message: "Cash payment already confirmed",
        payment: normalizePaymentForClient(payment),
      });
    }

    payment.paymentStatus = "PAID";
    payment.paymentGateway = "MANUAL";
    payment.settlementStatus = "READY";
    payment.paidAt = new Date();
    payment.failedAt = null;
    payment.cancelledAt = null;
    payment.confirmedBy = req.user?._id || null;
    payment.confirmedAt = new Date();
    payment.notes = String(
      req.body.notes || payment.notes || "Cash received",
    ).trim();

    payment.meta = {
      ...(payment.meta || {}),
      cashConfirmedBy: req.user?._id || null,
      cashConfirmedAt: new Date(),
    };

    await payment.save();
    await syncBookingAsPaid(payment);

    return res.json({
      message: "Cash payment confirmed successfully",
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/payments/:id/hold", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.paymentStatus !== "PAID") {
      return res.status(400).json({
        message: "Only paid payments can be put on hold",
      });
    }

    if (payment.settlementStatus === "PAID_TO_ACADEMY") {
      return res.status(400).json({
        message: "Settled payments cannot be put on hold",
      });
    }

    payment.settlementStatus = "HOLD";
    payment.notes = String(req.body.notes || payment.notes || "").trim();

    payment.meta = {
      ...(payment.meta || {}),
      holdBy: req.user?._id || null,
      holdAt: new Date(),
    };

    await payment.save();

    return res.json({
      message: "Payment settlement placed on hold",
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/payments/:id/release-hold", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.paymentStatus !== "PAID") {
      return res.status(400).json({
        message: "Only paid payments can be released for settlement",
      });
    }

    if (payment.settlementStatus === "PAID_TO_ACADEMY") {
      return res.status(400).json({
        message: "Payment is already settled",
      });
    }

    payment.settlementStatus = "READY";

    payment.meta = {
      ...(payment.meta || {}),
      holdReleasedBy: req.user?._id || null,
      holdReleasedAt: new Date(),
    };

    await payment.save();

    return res.json({
      message: "Payment released for settlement",
      payment: normalizePaymentForClient(payment),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* SETTLEMENT SUMMARY                                                         */
/* -------------------------------------------------------------------------- */

router.get("/settlement-summary", async (req, res, next) => {
  try {
    const match = {
      paymentStatus: "PAID",
      settlementStatus: "READY",
      paymentReceiver: "KIDGAGE",
    };

    if (req.query.academyId && isValidObjectId(req.query.academyId)) {
      match.academyId = toObjectId(req.query.academyId);
    }

    const createdAt = buildDateFilter(req);
    if (createdAt) match.createdAt = createdAt;

    const rows = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$academyId",
          totalCollected: { $sum: "$amount" },
          kidgageCommissionTotal: { $sum: "$kidgageCommissionAmount" },
          academyPayableTotal: { $sum: "$academyPayableAmount" },
          paymentCount: { $sum: 1 },
          paymentIds: { $push: "$_id" },
          firstPaymentAt: { $min: "$createdAt" },
          lastPaymentAt: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "academies",
          localField: "_id",
          foreignField: "_id",
          as: "academy",
        },
      },
      {
        $unwind: {
          path: "$academy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          academyPayableTotal: -1,
        },
      },
    ]);

    return res.json({
      count: rows.length,
      settlements: rows.map((row) => ({
        academyId: row._id,
        academyName: row.academy?.name || "Academy",
        academyCity: row.academy?.city || "",
        academyLogo: row.academy?.logo || "",
        totalCollected: roundMoney(row.totalCollected),
        kidgageCommissionTotal: roundMoney(row.kidgageCommissionTotal),
        academyPayableTotal: roundMoney(row.academyPayableTotal),
        paymentCount: row.paymentCount || 0,
        paymentIds: row.paymentIds || [],
        currency: "QAR",
        firstPaymentAt: row.firstPaymentAt || null,
        lastPaymentAt: row.lastPaymentAt || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/* -------------------------------------------------------------------------- */
/* SETTLEMENTS                                                                */
/* -------------------------------------------------------------------------- */

router.post("/settlements", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const academyId = String(req.body.academyId || "").trim();

    const paymentIds = Array.isArray(req.body.paymentIds)
      ? req.body.paymentIds.map(String).filter(isValidObjectId)
      : [];

    if (!academyId || !isValidObjectId(academyId)) {
      return res.status(400).json({ message: "Valid academyId is required" });
    }

    if (!paymentIds.length) {
      return res.status(400).json({ message: "paymentIds are required" });
    }

    let settlement = null;

    await session.withTransaction(async () => {
      const payments = await Payment.find({
        _id: { $in: paymentIds },
        academyId,
        paymentReceiver: "KIDGAGE",
        paymentStatus: "PAID",
        settlementStatus: "READY",
      }).session(session);

      if (!payments.length) {
        throw Object.assign(new Error("No payable payments found"), {
          statusCode: 400,
        });
      }

      if (payments.length !== paymentIds.length) {
        throw Object.assign(
          new Error(
            "Some selected payments are not payable, already settled, or do not belong to this academy",
          ),
          { statusCode: 400 },
        );
      }

      const totalCollected = roundMoney(
        payments.reduce((sum, item) => sum + toMoney(item.amount, 0), 0),
      );

      const kidgageCommissionTotal = roundMoney(
        payments.reduce(
          (sum, item) => sum + toMoney(item.kidgageCommissionAmount, 0),
          0,
        ),
      );

      const academyPayableTotal = roundMoney(
        payments.reduce(
          (sum, item) => sum + toMoney(item.academyPayableAmount, 0),
          0,
        ),
      );

      const docs = await AcademySettlement.create(
        [
          {
            academyId,
            paymentIds: payments.map((item) => item._id),
            totalCollected,
            kidgageCommissionTotal,
            academyPayableTotal,
            currency: payments[0]?.currency || "QAR",
            status: "PAID",
            paymentMethod: String(
              req.body.paymentMethod || "MANUAL_BANK_TRANSFER",
            )
              .trim()
              .toUpperCase(),
            settlementReference: String(
              req.body.settlementReference || "",
            ).trim(),
            notes: String(req.body.notes || "").trim(),
            settledAt: new Date(),
            settledBy: req.user?._id || null,
            meta: {
              createdByRole: req.user?.role || "SUPER_ADMIN",
              createdByUserId: req.user?._id || null,
            },
          },
        ],
        { session },
      );

      settlement = docs[0];

      await Payment.updateMany(
        {
          _id: { $in: payments.map((item) => item._id) },
          academyId,
          paymentReceiver: "KIDGAGE",
        },
        {
          $set: {
            settlementStatus: "PAID_TO_ACADEMY",
          },
        },
        { session },
      );
    });

    const populatedSettlement = await AcademySettlement.findById(settlement._id)
      .populate("academyId", "name city logo")
      .populate("settledBy", "fullName email")
      .lean();

    return res.status(201).json({
      message: "Academy settlement recorded successfully",
      settlement: normalizeSettlementForClient(populatedSettlement),
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    next(error);
  } finally {
    await session.endSession();
  }
});

router.get("/settlements", async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.academyId && isValidObjectId(req.query.academyId)) {
      filter.academyId = req.query.academyId;
    }

    if (req.query.status) {
      filter.status = normalizeStatus(req.query.status);
    }

    const createdAt = buildDateFilter(req);
    if (createdAt) filter.createdAt = createdAt;

    const settlements = await AcademySettlement.find(filter)
      .populate("academyId", "name city logo")
      .populate("settledBy", "fullName email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const totals = settlements.reduce(
      (acc, item) => {
        acc.totalCollected += toMoney(item.totalCollected, 0);
        acc.kidgageCommissionTotal += toMoney(item.kidgageCommissionTotal, 0);
        acc.academyPayableTotal += toMoney(item.academyPayableTotal, 0);
        acc.settlementCount += 1;
        return acc;
      },
      {
        totalCollected: 0,
        kidgageCommissionTotal: 0,
        academyPayableTotal: 0,
        settlementCount: 0,
      },
    );

    return res.json({
      count: settlements.length,
      totals: {
        totalCollected: roundMoney(totals.totalCollected),
        kidgageCommissionTotal: roundMoney(totals.kidgageCommissionTotal),
        academyPayableTotal: roundMoney(totals.academyPayableTotal),
        settlementCount: totals.settlementCount,
      },
      settlements: settlements.map(normalizeSettlementForClient),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/settlements/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid settlement id" });
    }

    const settlement = await AcademySettlement.findById(id)
      .populate("academyId", "name city logo email phone")
      .populate("settledBy", "fullName email")
      .populate({
        path: "paymentIds",
        populate: [
          { path: "academyId", select: "name city logo" },
          { path: "bookingId", select: "bookingNo referenceNo invoiceNo" },
          { path: "parentId", select: "fullName name email phone" },
          { path: "childId", select: "fullName name" },
          { path: "activityId", select: "title name" },
          { path: "packageId", select: "title" },
        ],
      })
      .lean();

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    return res.json({
      settlement: normalizeSettlementForClient(settlement),
      payments: Array.isArray(settlement.paymentIds)
        ? settlement.paymentIds.map(normalizePaymentForClient)
        : [],
    });
  } catch (error) {
    next(error);
  }
});
router.delete("/settlements/:id", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid settlement id",
      });
    }

    let deletedSettlement = null;
    let restoredPaymentsCount = 0;

    await session.withTransaction(async () => {
      const settlement = await AcademySettlement.findById(id).session(session);

      if (!settlement) {
        throw Object.assign(new Error("Settlement not found"), {
          statusCode: 404,
        });
      }

      deletedSettlement = settlement.toObject();

      const paymentIds = Array.isArray(settlement.paymentIds)
        ? settlement.paymentIds.filter(Boolean)
        : [];

      if (paymentIds.length) {
        const result = await Payment.updateMany(
          {
            _id: { $in: paymentIds },
            paymentReceiver: "KIDGAGE",
            settlementStatus: "PAID_TO_ACADEMY",
          },
          {
            $set: {
              settlementStatus: "READY",
            },
            $unset: {
              settlementId: "",
            },
          },
          { session },
        );

        restoredPaymentsCount = result.modifiedCount || result.nModified || 0;
      }

      await AcademySettlement.deleteOne({ _id: settlement._id }).session(
        session,
      );
    });

    return res.json({
      message: "Settlement deleted successfully",
      deletedId: String(deletedSettlement?._id || id),
      restoredPaymentsCount,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    next(error);
  } finally {
    await session.endSession();
  }
});
/* -------------------------------------------------------------------------- */
/* DASHBOARD SUMMARY                                                          */
/* -------------------------------------------------------------------------- */

router.get("/payments-dashboard", async (_req, res, next) => {
  try {
    const [
      allPayments,
      paidPayments,
      pendingPayments,
      readyPayments,
      settledPayments,
      cashPayments,
      onlinePayments,
      manualPayments,
      myfatoorahPayments,
      settlements,
    ] = await Promise.all([
      Payment.find({ paymentReceiver: "KIDGAGE" }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentStatus: "PAID",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentStatus: "PENDING",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentStatus: "PAID",
        settlementStatus: "READY",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        settlementStatus: "PAID_TO_ACADEMY",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentMethod: "CASH",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentMethod: "ONLINE",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentGateway: "MANUAL",
      }).lean(),

      Payment.find({
        paymentReceiver: "KIDGAGE",
        paymentGateway: "MYFATOORAH",
      }).lean(),

      AcademySettlement.find({ status: "PAID" }).lean(),
    ]);

    const sum = (rows, field) =>
      roundMoney(rows.reduce((acc, item) => acc + toMoney(item[field], 0), 0));

    return res.json({
      paymentsCount: allPayments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,

      cashCount: cashPayments.length,
      onlineCount: onlinePayments.length,
      manualCount: manualPayments.length,
      myfatoorahCount: myfatoorahPayments.length,

      readySettlementCount: readyPayments.length,
      settledPaymentsCount: settledPayments.length,
      settlementsCount: settlements.length,

      totalCollected: sum(allPayments, "amount"),
      paidCollected: sum(paidPayments, "amount"),
      pendingAmount: sum(pendingPayments, "amount"),

      cashAmount: sum(cashPayments, "amount"),
      onlineAmount: sum(onlinePayments, "amount"),
      manualAmount: sum(manualPayments, "amount"),
      myfatoorahAmount: sum(myfatoorahPayments, "amount"),

      kidgageCommissionTotal: sum(paidPayments, "kidgageCommissionAmount"),
      academyPayableTotal: sum(paidPayments, "academyPayableAmount"),

      readySettlementAmount: sum(readyPayments, "academyPayableAmount"),
      settledAmount: sum(settledPayments, "academyPayableAmount"),
    });
  } catch (error) {
    next(error);
  }
});

export default router;

// server/src/controllers/superadmin.controller.js

import Academy from "../models/Academy.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import Activity from "../models/Activity.js";

function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
}

function normalizeAcademyForClient(academy) {
  return {
    _id: academy._id,
    id: academy._id,
    name: academy.name || "",
    slug: academy.slug || "",
    email: academy.email || "",
    phone: academy.phone || "",
    city: academy.city || "",
    address: academy.address || "",
    website: academy.website || "",
    description: academy.description || "",
    logo: academy.logo || "",
    status: academy.status || "INACTIVE",
    featured: Boolean(academy.isFeatured || academy.featured),
    isFeatured: Boolean(academy.isFeatured || academy.featured),
    createdAt: academy.createdAt || null,
    updatedAt: academy.updatedAt || null,
  };
}

export async function dashboard(_req, res, next) {
  try {
    const [
      academies,
      activeAcademies,
      users,
      parents,
      academyAdmins,
      activities,
      bookings,
      pendingBookings,
      confirmedBookings,
      paidBookings,
      payments,
      paidPayments,
      paymentTotals,
    ] = await Promise.all([
      Academy.countDocuments(),
      Academy.countDocuments({ status: "ACTIVE" }),

      User.countDocuments(),
      User.countDocuments({ role: "PARENT" }),
      User.countDocuments({ role: "ACADEMY_ADMIN" }),

      Activity.countDocuments(),

      Booking.countDocuments(),
      Booking.countDocuments({ bookingStatus: "PENDING" }),
      Booking.countDocuments({ bookingStatus: "CONFIRMED" }),
      Booking.countDocuments({ paymentStatus: "PAID" }),

      Payment.countDocuments(),
      Payment.countDocuments({ paymentStatus: "PAID" }),

      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$amount", 0],
              },
            },
            kidgageCommissionAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  "$kidgageCommissionAmount",
                  0,
                ],
              },
            },
            academyPayableAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "PAID"] },
                  "$academyPayableAmount",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const totals = paymentTotals?.[0] || {};

    return res.json({
      academies,
      activeAcademies,

      users,
      parents,
      academyAdmins,

      activities,

      bookings,
      pendingBookings,
      confirmedBookings,
      paidBookings,

      payments,
      paidPayments,

      totalAmount: toMoney(totals.totalAmount, 0),
      paidAmount: toMoney(totals.paidAmount, 0),
      kidgageCommissionAmount: toMoney(totals.kidgageCommissionAmount, 0),
      academyPayableAmount: toMoney(totals.academyPayableAmount, 0),
      currency: "QAR",
    });
  } catch (error) {
    next(error);
  }
}

export async function listAcademies(_req, res, next) {
  try {
    const academies = await Academy.find().sort({ createdAt: -1 }).lean();

    const academyIds = academies.map((academy) => academy._id);

    const [activityAgg, bookingAgg, adminUsers] = await Promise.all([
      Activity.aggregate([
        { $match: { academyId: { $in: academyIds } } },
        { $group: { _id: "$academyId", count: { $sum: 1 } } },
      ]),

      Booking.aggregate([
        { $match: { academyId: { $in: academyIds } } },
        {
          $group: {
            _id: "$academyId",
            bookingsCount: { $sum: 1 },
            paidBookings: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, 1, 0],
              },
            },
            totalAmount: {
              $sum: {
                $ifNull: ["$finalAmount", 0],
              },
            },
          },
        },
      ]),

      User.find({
        academyId: { $in: academyIds },
        role: "ACADEMY_ADMIN",
      })
        .select(
          "fullName name email phone academyId status tempPassword mustChangePassword",
        )
        .lean(),
    ]);

    const activityMap = new Map(
      activityAgg.map((item) => [String(item._id), item.count]),
    );

    const bookingMap = new Map(
      bookingAgg.map((item) => [String(item._id), item]),
    );

    const adminMap = new Map(
      adminUsers.map((user) => [String(user.academyId), user]),
    );

    return res.json({
      count: academies.length,
      academies: academies.map((academy) => {
        const id = String(academy._id);
        const bookingStats = bookingMap.get(id) || {};
        const adminUser = adminMap.get(id) || null;

        return {
          ...normalizeAcademyForClient(academy),

          activitiesCount: activityMap.get(id) || 0,
          bookingsCount: bookingStats.bookingsCount || 0,
          paidBookings: bookingStats.paidBookings || 0,
          totalAmount: toMoney(bookingStats.totalAmount, 0),
          currency: "QAR",

          adminUser: adminUser
            ? {
                _id: adminUser._id,
                id: adminUser._id,
                fullName: adminUser.fullName || adminUser.name || "",
                name: adminUser.fullName || adminUser.name || "",
                email: adminUser.email || "",
                phone: adminUser.phone || "",
                status: adminUser.status || "",
                tempPassword: adminUser.tempPassword || "",
                mustChangePassword: Boolean(adminUser.mustChangePassword),
              }
            : null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
}

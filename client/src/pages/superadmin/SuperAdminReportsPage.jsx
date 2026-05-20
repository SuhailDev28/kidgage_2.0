// client/src/pages/superadmin/SuperAdminReportsPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  FolderOpen,
  Landmark,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeUpper(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return text || fallback;
}

function formatDate(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value, currency = "QAR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickAcademyName(item) {
  return (
    item?.academyId?.name ||
    item?.academy?.name ||
    item?.academyName ||
    item?.academySnapshot?.name ||
    item?.meta?.academyName ||
    "Academy"
  );
}

function pickActivityName(item) {
  return (
    item?.activityId?.title ||
    item?.activityId?.name ||
    item?.activityName ||
    item?.courseName ||
    item?.activitySnapshot?.title ||
    item?.activity?.name ||
    "N/A"
  );
}

function pickCategoryName(item) {
  return (
    item?.activityId?.categoryName ||
    item?.activityId?.category ||
    item?.categoryName ||
    item?.category ||
    item?.course?.categoryName ||
    item?.activity?.categoryName ||
    "N/A"
  );
}

function pickParentName(item) {
  return (
    item?.parentId?.fullName ||
    item?.parentId?.name ||
    item?.parentName ||
    item?.guestParent?.fullName ||
    item?.guestParent?.name ||
    item?.guestParentSnapshot?.fullName ||
    item?.name ||
    "Guest Parent"
  );
}

function pickAmount(item) {
  return toNumber(
    item?.finalAmount ??
      item?.subtotalAmount ??
      item?.baseAmount ??
      item?.amount ??
      item?.totalAmount ??
      item?.price ??
      item?.packageSnapshot?.price ??
      item?.packageId?.price ??
      item?.activityId?.price,
    0,
  );
}

function normalizeBooking(item, index) {
  const id = normalizeId(item?._id || item?.id || "");

  return {
    raw: item,
    id: id || `booking-${index + 1}`,
    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        "",
    ),
    academyName: pickAcademyName(item),
    bookingNo:
      item?.bookingNo ||
      item?.referenceNo ||
      item?.invoiceNo ||
      item?._id ||
      item?.id ||
      "N/A",
    parentName: pickParentName(item),
    activityName: pickActivityName(item),
    categoryName: pickCategoryName(item),
    bookingStatus: normalizeUpper(
      item?.bookingStatus || item?.status,
      "PENDING",
    ),
    paymentStatus: normalizeUpper(item?.paymentStatus, "PENDING"),
    amount: pickAmount(item),
    currency: item?.currency || "QAR",
    createdAt: item?.createdAt || null,
  };
}

function normalizeActivity(item, index) {
  const id = normalizeId(item?._id || item?.id || "");

  return {
    raw: item,
    id: id || `activity-${index + 1}`,
    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        "",
    ),
    academyName: pickAcademyName(item),
    name: safeText(item?.title || item?.name, "Untitled Activity"),
    categoryName:
      item?.categoryId?.name ||
      item?.category?.name ||
      item?.categoryName ||
      item?.category ||
      "N/A",
    status: normalizeUpper(item?.status, "PUBLISHED"),
    price: toNumber(item?.price ?? item?.basePrice ?? item?.fees, 0),
    currency: item?.currency || "QAR",
    createdAt: item?.createdAt || null,
  };
}

function normalizePayment(item, index) {
  const id = normalizeId(item?._id || item?.id || "");
  const booking = item?.bookingId || {};
  const parent = item?.parentId || {};
  const activity = item?.activityId || {};

  return {
    raw: item,
    id: id || `payment-${index + 1}`,
    bookingNo:
      item?.bookingNo ||
      booking?.bookingNo ||
      booking?.referenceNo ||
      booking?.invoiceNo ||
      "N/A",
    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        "",
    ),
    academyName: pickAcademyName(item),
    parentName:
      item?.parentName ||
      parent?.fullName ||
      parent?.name ||
      item?.meta?.parentName ||
      "Parent",
    activityName:
      item?.activityName ||
      activity?.title ||
      activity?.name ||
      item?.meta?.activityName ||
      "N/A",
    amount: toNumber(item?.amount, 0),
    commission: toNumber(
      item?.kidgageCommissionAmount ||
        item?.commissionAmount ||
        item?.platformCommissionAmount,
      0,
    ),
    academyPayable: toNumber(
      item?.academyPayableAmount ||
        item?.payableAmount ||
        item?.settlementAmount ||
        item?.netAmount,
      0,
    ),
    currency: item?.currency || "QAR",
    paymentMethod: normalizeUpper(item?.paymentMethod, "N/A"),
    paymentGateway: normalizeUpper(item?.paymentGateway, "N/A"),
    paymentStatus: normalizeUpper(item?.paymentStatus, "PENDING"),
    settlementStatus: normalizeUpper(item?.settlementStatus, "PENDING"),
    gatewayReference:
      item?.gatewayReference ||
      item?.gatewayPaymentId ||
      item?.gatewayOrderId ||
      item?.settlementReference ||
      "",
    createdAt: item?.createdAt || null,
    paidAt: item?.paidAt || null,
    settledAt: item?.settledAt || null,
  };
}

function normalizeParent(item, index) {
  const id = normalizeId(item?._id || item?.id || "");

  return {
    raw: item,
    id: id || `parent-${index + 1}`,
    fullName: item?.fullName || item?.name || "Parent",
    email: item?.email || "",
    phone: item?.phone || "",
    status: normalizeUpper(item?.status, "ACTIVE"),
    bookingsCount: toNumber(item?.bookingsCount, 0),
    totalAmount: toNumber(item?.totalAmount, 0),
    createdAt: item?.createdAt || null,
  };
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100 ${className}`}
    >
      {children}
    </select>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-orange-100/60 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-500">{label}</div>

          <div className="mt-3 break-words text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-2 break-words text-xs font-medium leading-5 text-slate-400 sm:text-sm">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  const text = normalizeUpper(value);

  const classes = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PAID_TO_ACADEMY: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    SETTLED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    READY: "bg-blue-50 text-blue-700 ring-blue-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    FAILED: "bg-red-50 text-red-700 ring-red-100",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
    CANCELED: "bg-red-50 text-red-700 ring-red-100",
    REFUNDED: "bg-violet-50 text-violet-700 ring-violet-100",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        classes[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {text.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
        <FileText className="h-7 w-7" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function BarRow({ label, value, max, amount }) {
  const percent = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-sm font-black text-slate-800">
          {label}
        </div>
        <div className="shrink-0 text-sm font-black text-slate-900">
          {value}
        </div>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        <div
          className="h-full rounded-full bg-[#ff7a3d]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {amount !== undefined ? (
        <div className="mt-2 text-xs font-bold text-slate-500">
          {money(amount)}
        </div>
      ) : null}
    </div>
  );
}

function ReportSection({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900 sm:text-xl">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function SmallSummaryRow({ label, value, tone = "slate" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-lg font-black">{value}</span>
      </div>
    </div>
  );
}

function inDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  if (from) {
    const f = new Date(from);
    f.setHours(0, 0, 0, 0);
    if (d < f) return false;
  }

  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    if (d > t) return false;
  }

  return true;
}

export default function SuperAdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [payments, setPayments] = useState([]);
  const [parents, setParents] = useState([]);
  const [academies, setAcademies] = useState([]);

  const [filters, setFilters] = useState({
    q: "",
    academy: "",
    from: "",
    to: "",
    status: "",
    reportType: "overview",
  });

  async function loadReports({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [
        bookingsRes,
        activitiesRes,
        paymentsRes,
        parentsRes,
        academiesRes,
      ] = await Promise.allSettled([
        api.get("/super-admin/bookings"),
        api.get("/super-admin/activities"),
        api.get("/super-admin/payments"),
        api.get("/super-admin/parents"),
        api.get("/super-admin/academies"),
      ]);

      const bookingRows =
        bookingsRes.status === "fulfilled"
          ? toArray(
              bookingsRes.value?.data?.bookings ||
                bookingsRes.value?.data?.items ||
                [],
            )
          : [];

      const activityRows =
        activitiesRes.status === "fulfilled"
          ? toArray(
              activitiesRes.value?.data?.activities ||
                activitiesRes.value?.data?.courses ||
                activitiesRes.value?.data?.items ||
                [],
            )
          : [];

      const paymentRows =
        paymentsRes.status === "fulfilled"
          ? toArray(
              paymentsRes.value?.data?.payments ||
                paymentsRes.value?.data?.items ||
                [],
            )
          : [];

      const parentRows =
        parentsRes.status === "fulfilled"
          ? toArray(
              parentsRes.value?.data?.parents ||
                parentsRes.value?.data?.items ||
                [],
            )
          : [];

      const academyRows =
        academiesRes.status === "fulfilled"
          ? toArray(
              academiesRes.value?.data?.academies ||
                academiesRes.value?.data?.items ||
                [],
            )
          : [];

      setBookings(bookingRows.map(normalizeBooking));
      setActivities(activityRows.map(normalizeActivity));
      setPayments(paymentRows.map(normalizePayment));
      setParents(parentRows.map(normalizeParent));

      setAcademies(
        academyRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `academy-${index + 1}`),
          name: safeText(item?.name || item?.academyName, "Academy"),
          status: normalizeUpper(item?.status, "ACTIVE"),
          city: item?.city || "",
          activitiesCount: toNumber(item?.activitiesCount, 0),
          branchesCount: toNumber(item?.branchesCount, 0),
          createdAt: item?.createdAt || null,
        })),
      );

      if (
        bookingsRes.status === "rejected" &&
        activitiesRes.status === "rejected" &&
        paymentsRes.status === "rejected" &&
        parentsRes.status === "rejected" &&
        academiesRes.status === "rejected"
      ) {
        throw new Error("Unable to load reports data.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load report data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      q: "",
      academy: "",
      from: "",
      to: "",
      status: "",
      reportType: "overview",
    });
  }

  const academyOptions = useMemo(() => {
    const set = new Set();

    academies.forEach((item) => {
      if (item.name && item.name !== "N/A") set.add(item.name);
    });

    bookings.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A") {
        set.add(item.academyName);
      }
    });

    activities.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A") {
        set.add(item.academyName);
      }
    });

    payments.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A") {
        set.add(item.academyName);
      }
    });

    return [...set].sort();
  }, [academies, bookings, activities, payments]);

  const filteredBookings = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return bookings.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.academyName,
          item.bookingNo,
          item.parentName,
          item.activityName,
          item.categoryName,
          item.bookingStatus,
          item.paymentStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !filters.academy ||
        item.academyName.toLowerCase() === filters.academy.toLowerCase();

      const matchesStatus =
        !filters.status ||
        item.bookingStatus === filters.status ||
        item.paymentStatus === filters.status;

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesStatus &&
        inDateRange(item.createdAt, filters.from, filters.to)
      );
    });
  }, [bookings, filters]);

  const filteredActivities = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return activities.filter((item) => {
      const matchesSearch =
        !q ||
        [item.academyName, item.name, item.categoryName, item.status]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !filters.academy ||
        item.academyName.toLowerCase() === filters.academy.toLowerCase();

      const matchesStatus = !filters.status || item.status === filters.status;

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesStatus &&
        inDateRange(item.createdAt, filters.from, filters.to)
      );
    });
  }, [activities, filters]);

  const filteredPayments = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return payments.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.bookingNo,
          item.academyName,
          item.parentName,
          item.activityName,
          item.paymentStatus,
          item.settlementStatus,
          item.paymentMethod,
          item.paymentGateway,
          item.gatewayReference,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !filters.academy ||
        item.academyName.toLowerCase() === filters.academy.toLowerCase();

      const matchesStatus =
        !filters.status ||
        item.paymentStatus === filters.status ||
        item.settlementStatus === filters.status;

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesStatus &&
        inDateRange(item.createdAt, filters.from, filters.to)
      );
    });
  }, [payments, filters]);

  const filteredParents = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return parents.filter((item) => {
      const matchesSearch =
        !q ||
        [item.fullName, item.email, item.phone, item.status]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus = !filters.status || item.status === filters.status;

      return (
        matchesSearch &&
        matchesStatus &&
        inDateRange(item.createdAt, filters.from, filters.to)
      );
    });
  }, [parents, filters]);

  const reportStats = useMemo(() => {
    const totalBookings = filteredBookings.length;

    const paidBookings = filteredBookings.filter(
      (item) => item.paymentStatus === "PAID",
    ).length;

    const pendingBookings = filteredBookings.filter(
      (item) => item.bookingStatus === "PENDING",
    ).length;

    const confirmedBookings = filteredBookings.filter(
      (item) => item.bookingStatus === "CONFIRMED",
    ).length;

    const bookingValue = filteredBookings.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const paidPayments = filteredPayments.filter(
      (item) => item.paymentStatus === "PAID",
    );

    const paymentCollected = paidPayments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const commission = paidPayments.reduce(
      (sum, item) => sum + Number(item.commission || 0),
      0,
    );

    const academyPayable = paidPayments.reduce(
      (sum, item) => sum + Number(item.academyPayable || 0),
      0,
    );

    const readyPayments = filteredPayments.filter(
      (item) =>
        item.paymentStatus === "PAID" && item.settlementStatus === "READY",
    );

    const paidToAcademyPayments = filteredPayments.filter((item) =>
      ["PAID_TO_ACADEMY", "PAID", "SETTLED"].includes(item.settlementStatus),
    );

    const readySettlementAmount = readyPayments.reduce(
      (sum, item) => sum + Number(item.academyPayable || 0),
      0,
    );

    const paidToAcademyAmount = paidToAcademyPayments.reduce(
      (sum, item) => sum + Number(item.academyPayable || 0),
      0,
    );

    const pendingPaymentCount = filteredPayments.filter(
      (item) => item.paymentStatus === "PENDING",
    ).length;

    const failedPaymentCount = filteredPayments.filter(
      (item) => item.paymentStatus === "FAILED",
    ).length;

    return {
      totalBookings,
      paidBookings,
      pendingBookings,
      confirmedBookings,
      bookingValue,
      paymentCollected,
      commission,
      academyPayable,
      readySettlementAmount,
      paidToAcademyAmount,
      readySettlementPayments: readyPayments.length,
      paidToAcademyPayments: paidToAcademyPayments.length,
      paidPaymentCount: paidPayments.length,
      pendingPaymentCount,
      failedPaymentCount,
      activitiesCount: filteredActivities.length,
      parentsCount: filteredParents.length,
      academiesCount: academyOptions.length,
    };
  }, [
    filteredBookings,
    filteredPayments,
    filteredActivities,
    filteredParents,
    academyOptions,
  ]);

  const academyBreakdown = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const key = booking.academyName || "Academy";
      const row = map.get(key) || {
        academyName: key,
        bookings: 0,
        paid: 0,
        pending: 0,
        confirmed: 0,
        amount: 0,
      };

      row.bookings += 1;
      row.amount += Number(booking.amount || 0);
      if (booking.paymentStatus === "PAID") row.paid += 1;
      if (booking.bookingStatus === "PENDING") row.pending += 1;
      if (booking.bookingStatus === "CONFIRMED") row.confirmed += 1;

      map.set(key, row);
    });

    return [...map.values()].sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  const revenueByAcademy = useMemo(() => {
    const map = new Map();

    filteredPayments
      .filter((item) => item.paymentStatus === "PAID")
      .forEach((payment) => {
        const key = payment.academyName || "Academy";

        const row = map.get(key) || {
          academyName: key,
          collected: 0,
          commission: 0,
          academyPayable: 0,
          ready: 0,
          paidToAcademy: 0,
          payments: 0,
        };

        row.collected += Number(payment.amount || 0);
        row.commission += Number(payment.commission || 0);
        row.academyPayable += Number(payment.academyPayable || 0);
        row.payments += 1;

        if (payment.settlementStatus === "READY") {
          row.ready += Number(payment.academyPayable || 0);
        }

        if (
          ["PAID_TO_ACADEMY", "PAID", "SETTLED"].includes(
            payment.settlementStatus,
          )
        ) {
          row.paidToAcademy += Number(payment.academyPayable || 0);
        }

        map.set(key, row);
      });

    return [...map.values()].sort((a, b) => b.collected - a.collected);
  }, [filteredPayments]);

  const paymentStatusBreakdown = useMemo(() => {
    const map = new Map();

    filteredPayments.forEach((payment) => {
      const status = payment.paymentStatus || "N/A";

      const row = map.get(status) || {
        status,
        count: 0,
        amount: 0,
        commission: 0,
        academyPayable: 0,
      };

      row.count += 1;
      row.amount += Number(payment.amount || 0);
      row.commission += Number(payment.commission || 0);
      row.academyPayable += Number(payment.academyPayable || 0);

      map.set(status, row);
    });

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredPayments]);

  const settlementStatusBreakdown = useMemo(() => {
    const map = new Map();

    filteredPayments.forEach((payment) => {
      const status = payment.settlementStatus || "N/A";

      const row = map.get(status) || {
        status,
        count: 0,
        amount: 0,
        commission: 0,
        academyPayable: 0,
      };

      row.count += 1;
      row.amount += Number(payment.amount || 0);
      row.commission += Number(payment.commission || 0);
      row.academyPayable += Number(payment.academyPayable || 0);

      map.set(status, row);
    });

    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [filteredPayments]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const key = booking.categoryName || "N/A";
      const row = map.get(key) || {
        categoryName: key,
        bookings: 0,
        amount: 0,
      };

      row.bookings += 1;
      row.amount += Number(booking.amount || 0);

      map.set(key, row);
    });

    return [...map.values()].sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  const activityBreakdown = useMemo(() => {
    const map = new Map();

    filteredBookings.forEach((booking) => {
      const key = booking.activityName || "N/A";
      const row = map.get(key) || {
        activityName: key,
        academyName: booking.academyName || "Academy",
        bookings: 0,
        amount: 0,
      };

      row.bookings += 1;
      row.amount += Number(booking.amount || 0);

      map.set(key, row);
    });

    return [...map.values()].sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  const recentBookings = useMemo(() => {
    return [...filteredBookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);
  }, [filteredBookings]);

  const recentPayments = useMemo(() => {
    return [...filteredPayments]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);
  }, [filteredPayments]);

  const maxAcademyBookings = Math.max(
    ...academyBreakdown.map((item) => item.bookings),
    0,
  );

  const maxCategoryBookings = Math.max(
    ...categoryBreakdown.map((item) => item.bookings),
    0,
  );

  const maxActivityBookings = Math.max(
    ...activityBreakdown.map((item) => item.bookings),
    0,
  );

  const maxRevenuePayments = Math.max(
    ...revenueByAcademy.map((item) => item.payments),
    0,
  );

  function exportCurrentReport() {
    const type = filters.reportType;

    if (type === "bookings") {
      downloadCsv(
        "kidgage-booking-report.csv",
        filteredBookings.map((item) => ({
          Booking: item.bookingNo,
          Academy: item.academyName,
          Parent: item.parentName,
          Activity: item.activityName,
          Category: item.categoryName,
          BookingStatus: item.bookingStatus,
          PaymentStatus: item.paymentStatus,
          Amount: item.amount,
          Currency: item.currency,
          CreatedAt: formatDateTime(item.createdAt),
        })),
      );
      return;
    }

    if (type === "payments") {
      downloadCsv(
        "kidgage-payment-report.csv",
        filteredPayments.map((item) => ({
          PaymentId: item.id,
          Booking: item.bookingNo,
          Academy: item.academyName,
          Parent: item.parentName,
          Activity: item.activityName,
          Amount: item.amount,
          Commission: item.commission,
          AcademyPayable: item.academyPayable,
          PaymentStatus: item.paymentStatus,
          SettlementStatus: item.settlementStatus,
          PaymentMethod: item.paymentMethod,
          Gateway: item.paymentGateway,
          Reference: item.gatewayReference,
          CreatedAt: formatDateTime(item.createdAt),
          PaidAt: formatDateTime(item.paidAt),
          SettledAt: formatDateTime(item.settledAt),
        })),
      );
      return;
    }

    if (type === "settlements") {
      downloadCsv(
        "kidgage-settlement-report.csv",
        filteredPayments
          .filter((item) => item.paymentStatus === "PAID")
          .map((item) => ({
            PaymentId: item.id,
            Booking: item.bookingNo,
            Academy: item.academyName,
            CollectedAmount: item.amount,
            KidGageCommission: item.commission,
            AcademyPayable: item.academyPayable,
            PaymentStatus: item.paymentStatus,
            SettlementStatus: item.settlementStatus,
            Reference: item.gatewayReference,
            CreatedAt: formatDateTime(item.createdAt),
            SettledAt: formatDateTime(item.settledAt),
          })),
      );
      return;
    }

    if (type === "activities") {
      downloadCsv(
        "kidgage-activity-report.csv",
        filteredActivities.map((item) => ({
          Activity: item.name,
          Academy: item.academyName,
          Category: item.categoryName,
          Status: item.status,
          Price: item.price,
          Currency: item.currency,
          CreatedAt: formatDateTime(item.createdAt),
        })),
      );
      return;
    }

    if (type === "parents") {
      downloadCsv(
        "kidgage-parent-report.csv",
        filteredParents.map((item) => ({
          Parent: item.fullName,
          Email: item.email,
          Phone: item.phone,
          Status: item.status,
          Bookings: item.bookingsCount,
          TotalAmount: item.totalAmount,
          CreatedAt: formatDateTime(item.createdAt),
        })),
      );
      return;
    }

    downloadCsv(
      "kidgage-overview-report.csv",
      revenueByAcademy.map((item) => ({
        Academy: item.academyName,
        PaidPayments: item.payments,
        Collected: item.collected,
        KidGageCommission: item.commission,
        AcademyPayable: item.academyPayable,
        ReadySettlement: item.ready,
        PaidToAcademy: item.paidToAcademy,
      })),
    );
  }

  function downloadPdfReport() {
    const revenueRows = revenueByAcademy
      .slice(0, 12)
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.academyName)}</td>
            <td>${item.payments}</td>
            <td>${htmlEscape(money(item.collected))}</td>
            <td>${htmlEscape(money(item.commission))}</td>
            <td>${htmlEscape(money(item.academyPayable))}</td>
            <td>${htmlEscape(money(item.ready))}</td>
            <td>${htmlEscape(money(item.paidToAcademy))}</td>
          </tr>
        `,
      )
      .join("");

    const paymentStatusRows = paymentStatusBreakdown
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.status)}</td>
            <td>${item.count}</td>
            <td>${htmlEscape(money(item.amount))}</td>
            <td>${htmlEscape(money(item.commission))}</td>
            <td>${htmlEscape(money(item.academyPayable))}</td>
          </tr>
        `,
      )
      .join("");

    const settlementStatusRows = settlementStatusBreakdown
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.status)}</td>
            <td>${item.count}</td>
            <td>${htmlEscape(money(item.amount))}</td>
            <td>${htmlEscape(money(item.commission))}</td>
            <td>${htmlEscape(money(item.academyPayable))}</td>
          </tr>
        `,
      )
      .join("");

    const recentPaymentRows = recentPayments
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.bookingNo)}</td>
            <td>${htmlEscape(item.academyName)}</td>
            <td>${htmlEscape(item.parentName)}</td>
            <td>${htmlEscape(item.paymentStatus)}</td>
            <td>${htmlEscape(item.settlementStatus)}</td>
            <td>${htmlEscape(money(item.amount, item.currency))}</td>
            <td>${htmlEscape(money(item.commission, item.currency))}</td>
            <td>${htmlEscape(money(item.academyPayable, item.currency))}</td>
          </tr>
        `,
      )
      .join("");

    const recentRows = recentBookings
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.bookingNo)}</td>
            <td>${htmlEscape(item.academyName)}</td>
            <td>${htmlEscape(item.parentName)}</td>
            <td>${htmlEscape(item.activityName)}</td>
            <td>${htmlEscape(item.bookingStatus)}</td>
            <td>${htmlEscape(item.paymentStatus)}</td>
            <td>${htmlEscape(money(item.amount, item.currency))}</td>
          </tr>
        `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>KidGage Report</title>
          <style>
            @page {
              size: A4;
              margin: 16mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            .header {
              border-bottom: 4px solid #ff7a3d;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }

            .badge {
              display: inline-block;
              background: #fff4ec;
              color: #ff7a3d;
              border: 1px solid #fed7aa;
              border-radius: 999px;
              padding: 7px 12px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.12em;
            }

            h1 {
              margin: 14px 0 6px;
              font-size: 32px;
              line-height: 1.1;
            }

            .meta {
              color: #64748b;
              font-size: 13px;
              line-height: 1.6;
            }

            .stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin: 22px 0;
            }

            .stat {
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 14px;
              background: #f8fafc;
            }

            .stat-label {
              color: #64748b;
              font-size: 12px;
              font-weight: 700;
            }

            .stat-value {
              margin-top: 8px;
              color: #0f172a;
              font-size: 20px;
              font-weight: 900;
              word-break: break-word;
            }

            h2 {
              margin: 26px 0 12px;
              font-size: 18px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
              font-size: 10px;
            }

            th {
              text-align: left;
              background: #fff4ec;
              color: #9a3412;
              border: 1px solid #fed7aa;
              padding: 8px;
              font-weight: 900;
            }

            td {
              border: 1px solid #e2e8f0;
              padding: 8px;
              vertical-align: top;
            }

            tr:nth-child(even) td {
              background: #f8fafc;
            }

            .footer {
              margin-top: 28px;
              padding-top: 14px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 11px;
            }

            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="badge">KidGage Super Admin</div>
            <h1>Reports Summary</h1>
            <div class="meta">
              Generated: ${htmlEscape(formatDateTime(new Date()))}<br />
              Report Type: ${htmlEscape(filters.reportType.toUpperCase())}<br />
              Academy: ${htmlEscape(filters.academy || "All Academies")}<br />
              Date Range: ${htmlEscape(filters.from || "Start")} to ${htmlEscape(filters.to || "Today")}
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">Bookings</div>
              <div class="stat-value">${reportStats.totalBookings}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Collected</div>
              <div class="stat-value">${htmlEscape(money(reportStats.paymentCollected))}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Commission</div>
              <div class="stat-value">${htmlEscape(money(reportStats.commission))}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Academy Payable</div>
              <div class="stat-value">${htmlEscape(money(reportStats.academyPayable))}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Ready Settlement</div>
              <div class="stat-value">${htmlEscape(money(reportStats.readySettlementAmount))}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Paid to Academy</div>
              <div class="stat-value">${htmlEscape(money(reportStats.paidToAcademyAmount))}</div>
            </div>
          </div>

          <h2>Revenue by Academy</h2>
          <table>
            <thead>
              <tr>
                <th>Academy</th>
                <th>Payments</th>
                <th>Collected</th>
                <th>Commission</th>
                <th>Academy Payable</th>
                <th>Ready</th>
                <th>Paid to Academy</th>
              </tr>
            </thead>
            <tbody>
              ${
                revenueRows ||
                `<tr><td colspan="7">No revenue data found.</td></tr>`
              }
            </tbody>
          </table>

          <h2>Payment Status Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Academy Payable</th>
              </tr>
            </thead>
            <tbody>
              ${
                paymentStatusRows ||
                `<tr><td colspan="5">No payment status data found.</td></tr>`
              }
            </tbody>
          </table>

          <h2>Settlement Status Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Academy Payable</th>
              </tr>
            </thead>
            <tbody>
              ${
                settlementStatusRows ||
                `<tr><td colspan="5">No settlement status data found.</td></tr>`
              }
            </tbody>
          </table>

          <h2>Recent Payments</h2>
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Academy</th>
                <th>Parent</th>
                <th>Payment</th>
                <th>Settlement</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Payable</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentPaymentRows ||
                `<tr><td colspan="8">No recent payment data found.</td></tr>`
              }
            </tbody>
          </table>

          <h2>Recent Bookings</h2>
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Academy</th>
                <th>Parent</th>
                <th>Activity</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                recentRows ||
                `<tr><td colspan="7">No recent booking data found.</td></tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            KidGage Reports · This report is generated from the current filtered Super Admin data.
          </div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <div className="w-full bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 md:px-8 md:py-6">
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/40 p-4 shadow-sm sm:p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              KidGage Super Admin
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Reports
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 md:text-base">
              Track bookings, revenue, parent activity, academy performance,
              categories, activities, commissions, and settlement movement from
              one reporting workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-row">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>

            <button
              type="button"
              onClick={downloadPdfReport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100"
            >
              <FileText className="h-4 w-4" />
              Download PDF
            </button>

            <button
              type="button"
              onClick={exportCurrentReport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => loadReports({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:col-span-2 xl:col-span-1"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={ClipboardList}
            label="Bookings"
            value={loading ? "..." : reportStats.totalBookings}
            subtitle="Filtered booking records"
          />

          <StatCard
            icon={Wallet}
            label="Collected"
            value={loading ? "..." : money(reportStats.paymentCollected)}
            subtitle="Paid amount collected by KidGage"
          />

          <StatCard
            icon={TrendingUp}
            label="Commission"
            value={loading ? "..." : money(reportStats.commission)}
            subtitle="KidGage earnings"
          />

          <StatCard
            icon={Building2}
            label="Academy Payable"
            value={loading ? "..." : money(reportStats.academyPayable)}
            subtitle="Total payable to academies"
          />

          <StatCard
            icon={Landmark}
            label="Ready Settlement"
            value={loading ? "..." : money(reportStats.readySettlementAmount)}
            subtitle={`${reportStats.readySettlementPayments} payment(s) ready`}
          />

          <StatCard
            icon={FolderOpen}
            label="Paid to Academy"
            value={loading ? "..." : money(reportStats.paidToAcademyAmount)}
            subtitle={`${reportStats.paidToAcademyPayments} payment(s) settled`}
          />

          <StatCard
            icon={BookOpen}
            label="Activities"
            value={loading ? "..." : reportStats.activitiesCount}
            subtitle="Activity records"
          />

          <StatCard
            icon={Users}
            label="Parents"
            value={loading ? "..." : reportStats.parentsCount}
            subtitle="Parent CRM records"
          />
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_190px_190px_170px_170px_170px_auto]">
          <div className="relative lg:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Search academy, parent, activity, category..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <Select
            value={filters.reportType}
            onChange={(e) => updateFilter("reportType", e.target.value)}
          >
            <option value="overview">Overview</option>
            <option value="bookings">Bookings</option>
            <option value="payments">Payments</option>
            <option value="settlements">Settlements</option>
            <option value="activities">Activities</option>
            <option value="parents">Parents</option>
          </Select>

          <Select
            value={filters.academy}
            onChange={(e) => updateFilter("academy", e.target.value)}
          >
            <option value="">All Academies</option>
            {academyOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="READY">READY</option>
            <option value="PAID_TO_ACADEMY">PAID TO ACADEMY</option>
            <option value="SETTLED">SETTLED</option>
          </Select>

          <TextInput
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
          />

          <TextInput
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
          />

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      {loading ? (
        <section className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-[28px] bg-slate-100"
            />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            <ReportSection
              title="Revenue by Academy"
              subtitle="Collected amount, KidGage commission, academy payable, and settlement movement."
            >
              {revenueByAcademy.length ? (
                <div className="space-y-3">
                  {revenueByAcademy.slice(0, 8).map((item) => (
                    <BarRow
                      key={item.academyName}
                      label={item.academyName}
                      value={item.payments}
                      max={maxRevenuePayments}
                      amount={item.collected}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No revenue data found." />
              )}
            </ReportSection>

            <ReportSection
              title="Payment Status Breakdown"
              subtitle="Payment count and amount by payment status."
            >
              {paymentStatusBreakdown.length ? (
                <div className="space-y-3">
                  {paymentStatusBreakdown.map((item) => (
                    <div
                      key={item.status}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge value={item.status} />
                        <div className="text-sm font-black text-slate-900">
                          {item.count}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                        <div>Amount: {money(item.amount)}</div>
                        <div>Fee: {money(item.commission)}</div>
                        <div>Payable: {money(item.academyPayable)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No payment status data found." />
              )}
            </ReportSection>

            <ReportSection
              title="Settlement Status Breakdown"
              subtitle="Ready and paid-to-academy payment movement."
            >
              {settlementStatusBreakdown.length ? (
                <div className="space-y-3">
                  {settlementStatusBreakdown.map((item) => (
                    <div
                      key={item.status}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge value={item.status} />
                        <div className="text-sm font-black text-slate-900">
                          {item.count}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                        <div>Collected: {money(item.amount)}</div>
                        <div>Fee: {money(item.commission)}</div>
                        <div>Payable: {money(item.academyPayable)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No settlement status data found." />
              )}
            </ReportSection>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            <ReportSection
              title="Academy Performance"
              subtitle="Bookings and value grouped by academy."
            >
              {academyBreakdown.length ? (
                <div className="space-y-3">
                  {academyBreakdown.slice(0, 8).map((item) => (
                    <BarRow
                      key={item.academyName}
                      label={item.academyName}
                      value={item.bookings}
                      max={maxAcademyBookings}
                      amount={item.amount}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No academy performance data found." />
              )}
            </ReportSection>

            <ReportSection
              title="Category Performance"
              subtitle="Popular categories based on bookings."
            >
              {categoryBreakdown.length ? (
                <div className="space-y-3">
                  {categoryBreakdown.slice(0, 8).map((item) => (
                    <BarRow
                      key={item.categoryName}
                      label={item.categoryName}
                      value={item.bookings}
                      max={maxCategoryBookings}
                      amount={item.amount}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No category performance data found." />
              )}
            </ReportSection>

            <ReportSection
              title="Activity Performance"
              subtitle="Top activities by booking count."
            >
              {activityBreakdown.length ? (
                <div className="space-y-3">
                  {activityBreakdown.slice(0, 8).map((item) => (
                    <BarRow
                      key={item.activityName}
                      label={item.activityName}
                      value={item.bookings}
                      max={maxActivityBookings}
                      amount={item.amount}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No activity performance data found." />
              )}
            </ReportSection>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <ReportSection
                title="Recent Payments"
                subtitle={`Showing latest ${recentPayments.length} filtered payment records.`}
                action={
                  <button
                    type="button"
                    onClick={() => updateFilter("reportType", "payments")}
                    className="rounded-2xl bg-orange-50 px-4 py-2 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100"
                  >
                    Payment Report
                  </button>
                }
              >
                {recentPayments.length ? (
                  <>
                    <div className="hidden overflow-x-auto 2xl:block">
                      <table className="w-full min-w-[1080px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-left">
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Booking
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Academy
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Parent
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Payment
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Settlement
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Amount
                            </th>
                            <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                              Fee
                            </th>
                            <th className="pb-4 text-sm font-black text-slate-500">
                              Payable
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {recentPayments.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="py-5 pr-5 align-top">
                                <div className="text-sm font-black text-slate-900">
                                  {item.bookingNo}
                                </div>
                                <div className="mt-1 text-xs font-medium text-slate-500">
                                  {formatDateTime(item.createdAt)}
                                </div>
                              </td>

                              <td className="py-5 pr-5 align-top text-sm font-bold text-slate-900">
                                {item.academyName}
                              </td>

                              <td className="py-5 pr-5 align-top text-sm font-bold text-slate-900">
                                {item.parentName}
                              </td>

                              <td className="py-5 pr-5 align-top">
                                <StatusBadge value={item.paymentStatus} />
                              </td>

                              <td className="py-5 pr-5 align-top">
                                <StatusBadge value={item.settlementStatus} />
                              </td>

                              <td className="py-5 pr-5 align-top text-sm font-black text-slate-900">
                                {money(item.amount, item.currency)}
                              </td>

                              <td className="py-5 pr-5 align-top text-sm font-black text-orange-700">
                                {money(item.commission, item.currency)}
                              </td>

                              <td className="py-5 align-top text-sm font-black text-emerald-700">
                                {money(item.academyPayable, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-4 2xl:hidden">
                      {recentPayments.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-[24px] border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-black text-slate-900">
                                {item.bookingNo}
                              </div>
                              <div className="mt-1 text-xs font-medium text-slate-500">
                                {formatDateTime(item.createdAt)}
                              </div>
                            </div>
                            <StatusBadge value={item.paymentStatus} />
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-3">
                              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Academy
                              </div>
                              <div className="mt-1 text-sm font-black text-slate-900">
                                {item.academyName}
                              </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-3">
                              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Parent
                              </div>
                              <div className="mt-1 text-sm font-black text-slate-900">
                                {item.parentName}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <StatusBadge value={item.settlementStatus} />
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {money(item.amount, item.currency)}
                            </span>
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                              Fee {money(item.commission, item.currency)}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              Payable{" "}
                              {money(item.academyPayable, item.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState text="No recent payments found." />
                )}
              </ReportSection>
            </div>

            <div className="xl:col-span-4">
              <ReportSection
                title="Summary"
                subtitle="Operational snapshot for the selected filters."
              >
                <div className="grid gap-3">
                  <SmallSummaryRow
                    label="Confirmed Bookings"
                    value={reportStats.confirmedBookings}
                  />

                  <SmallSummaryRow
                    label="Pending Bookings"
                    value={reportStats.pendingBookings}
                    tone="amber"
                  />

                  <SmallSummaryRow
                    label="Paid Bookings"
                    value={reportStats.paidBookings}
                    tone="emerald"
                  />

                  <SmallSummaryRow
                    label="Booking Value"
                    value={money(reportStats.bookingValue)}
                  />

                  <SmallSummaryRow
                    label="Pending Payments"
                    value={reportStats.pendingPaymentCount}
                    tone="amber"
                  />

                  <SmallSummaryRow
                    label="Failed Payments"
                    value={reportStats.failedPaymentCount}
                    tone="red"
                  />

                  <SmallSummaryRow
                    label="Ready Settlement"
                    value={money(reportStats.readySettlementAmount)}
                    tone="blue"
                  />

                  <SmallSummaryRow
                    label="Paid to Academy"
                    value={money(reportStats.paidToAcademyAmount)}
                    tone="emerald"
                  />

                  <div className="rounded-2xl bg-orange-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-[#ff7a3d]">
                        Current Report
                      </span>
                      <span className="text-sm font-black uppercase text-[#ff7a3d]">
                        {filters.reportType}
                      </span>
                    </div>
                  </div>
                </div>
              </ReportSection>
            </div>
          </section>

          <section className="mt-6">
            <ReportSection
              title="Recent Bookings"
              subtitle={`Showing latest ${recentBookings.length} filtered booking records.`}
              action={
                <button
                  type="button"
                  onClick={() => updateFilter("reportType", "bookings")}
                  className="rounded-2xl bg-orange-50 px-4 py-2 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100"
                >
                  Booking Report
                </button>
              }
            >
              {recentBookings.length ? (
                <>
                  <div className="hidden overflow-x-auto 2xl:block">
                    <table className="w-full min-w-[1050px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Booking
                          </th>
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Academy
                          </th>
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Parent
                          </th>
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Activity
                          </th>
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Status
                          </th>
                          <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                            Payment
                          </th>
                          <th className="pb-4 text-sm font-black text-slate-500">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentBookings.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="py-5 pr-5 align-top">
                              <div className="text-sm font-black text-slate-900">
                                {item.bookingNo}
                              </div>
                              <div className="mt-1 text-xs font-medium text-slate-500">
                                {formatDateTime(item.createdAt)}
                              </div>
                            </td>

                            <td className="py-5 pr-5 align-top">
                              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-[#ff7a3d]">
                                <Building2 className="h-4 w-4" />
                                {item.academyName}
                              </span>
                            </td>

                            <td className="py-5 pr-5 align-top text-sm font-bold text-slate-900">
                              {item.parentName}
                            </td>

                            <td className="py-5 pr-5 align-top">
                              <div className="text-sm font-black text-slate-900">
                                {item.activityName}
                              </div>
                              <div className="mt-1 text-xs font-medium text-slate-500">
                                {item.categoryName}
                              </div>
                            </td>

                            <td className="py-5 pr-5 align-top">
                              <StatusBadge value={item.bookingStatus} />
                            </td>

                            <td className="py-5 pr-5 align-top">
                              <StatusBadge value={item.paymentStatus} />
                            </td>

                            <td className="py-5 align-top text-sm font-black text-slate-900">
                              {money(item.amount, item.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 2xl:hidden">
                    {recentBookings.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[24px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-black text-slate-900">
                              {item.bookingNo}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {formatDateTime(item.createdAt)}
                            </div>
                          </div>
                          <StatusBadge value={item.bookingStatus} />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                              Academy
                            </div>
                            <div className="mt-1 text-sm font-black text-slate-900">
                              {item.academyName}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                              Parent
                            </div>
                            <div className="mt-1 text-sm font-black text-slate-900">
                              {item.parentName}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
                            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                              Activity
                            </div>
                            <div className="mt-1 text-sm font-black text-slate-900">
                              {item.activityName}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {item.categoryName}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <StatusBadge value={item.paymentStatus} />
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                            {money(item.amount, item.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState text="No recent bookings found." />
              )}
            </ReportSection>
          </section>
        </>
      )}
    </div>
  );
}

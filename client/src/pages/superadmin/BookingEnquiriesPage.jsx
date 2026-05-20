// client/src/pages/superadmin/SuperAdminBookingEnquiriesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Baby,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  Eye,
  FileDown,
  FolderOpen,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeUpper(value, fallback = "") {
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
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function pickAcademyName(item) {
  return (
    item?.academyId?.name ||
    item?.academy?.name ||
    item?.academyName ||
    item?.academySnapshot?.name ||
    "Academy"
  );
}

function pickBookingNo(item) {
  return (
    item?.bookingNo ||
    item?.referenceNo ||
    item?.invoiceNo ||
    item?.enquiryNo ||
    item?._id ||
    item?.id ||
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

function pickParentEmail(item) {
  return (
    item?.parentId?.email ||
    item?.email ||
    item?.userEmail ||
    item?.parentEmail ||
    item?.customerEmail ||
    item?.guestParent?.email ||
    item?.guestParentSnapshot?.email ||
    ""
  );
}

function pickParentPhone(item) {
  return (
    item?.parentId?.phone ||
    item?.phone ||
    item?.parentPhone ||
    item?.guestParent?.phone ||
    item?.guestParentSnapshot?.phone ||
    ""
  );
}

function pickChildName(item) {
  return (
    item?.childId?.fullName ||
    item?.childId?.name ||
    item?.childName ||
    item?.guestChild?.fullName ||
    item?.guestChild?.name ||
    item?.childSnapshot?.fullName ||
    "N/A"
  );
}

function pickActivityName(item) {
  return (
    item?.activityId?.title ||
    item?.activityId?.name ||
    item?.activityName ||
    item?.courseName ||
    item?.activitySnapshot?.title ||
    item?.course?.name ||
    item?.activity?.name ||
    "N/A"
  );
}

function pickPackageName(item) {
  return (
    item?.packageId?.title ||
    item?.packageName ||
    item?.packageSnapshot?.title ||
    item?.package?.title ||
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

function getSlotDate(slot) {
  return slot?.date || slot?.slotDate || slot?.slotId?.date || null;
}

function getSlotStart(slot) {
  return slot?.startTime || slot?.slotId?.startTime || "";
}

function getSlotEnd(slot) {
  return slot?.endTime || slot?.slotId?.endTime || "";
}

function getSlotLabel(slot, index) {
  return (
    slot?.sessionLabel ||
    slot?.label ||
    slot?.slotId?.sessionLabel ||
    `Session ${index + 1}`
  );
}

function getSlotStatus(slot) {
  return (
    slot?.status || slot?.sessionStatus || slot?.attendanceStatus || "BOOKED"
  );
}

function getSelectedSessions(item) {
  const raw = item?.raw || item || {};

  const bookingSessions = toArray(
    raw.sessions || raw.bookingSessions || raw.bookingSessionItems,
  );

  if (bookingSessions.length) {
    return bookingSessions.map((session, index) => ({
      id: normalizeId(
        session?._id ||
          session?.id ||
          session?.slotId ||
          `session-${index + 1}`,
      ),
      label: getSlotLabel(session, index),
      date: getSlotDate(session),
      startTime: getSlotStart(session),
      endTime: getSlotEnd(session),
      status: getSlotStatus(session),
    }));
  }

  const bookedSlotItems = toArray(raw.bookedSlotItems);

  if (bookedSlotItems.length) {
    return bookedSlotItems.map((slot, index) => ({
      id: normalizeId(
        slot?.slotId?._id || slot?.slotId || slot?._id || `slot-${index + 1}`,
      ),
      label: getSlotLabel(slot, index),
      date: getSlotDate(slot),
      startTime: getSlotStart(slot),
      endTime: getSlotEnd(slot),
      status: getSlotStatus(slot),
    }));
  }

  const populatedSlotIds = toArray(raw.slotIds).filter(
    (slot) => slot && typeof slot === "object",
  );

  if (populatedSlotIds.length) {
    return populatedSlotIds.map((slot, index) => ({
      id: normalizeId(slot?._id || slot?.id || `slot-${index + 1}`),
      label: getSlotLabel(slot, index),
      date: getSlotDate(slot),
      startTime: getSlotStart(slot),
      endTime: getSlotEnd(slot),
      status: getSlotStatus(slot),
    }));
  }

  return [];
}

function normalizePayment(item) {
  const raw =
    item?.payment ||
    item?.paymentId ||
    item?.latestPayment ||
    item?.raw?.payment ||
    null;

  if (!raw || typeof raw !== "object") {
    return {
      paymentId: normalizeId(item?.paymentId || item?.raw?.paymentId || ""),
      paymentMethod: item?.paymentMethod || item?.raw?.paymentMethod || "N/A",
      paymentGateway:
        item?.paymentGateway || item?.raw?.paymentGateway || "N/A",
      paymentStatus:
        item?.paymentStatus || item?.raw?.paymentStatus || "PENDING",
      amount: item?.finalAmount || item?.raw?.finalAmount || 0,
      currency: item?.currency || item?.raw?.currency || "QAR",
      paidAt: item?.paidAt || item?.raw?.paidAt || null,
      settlementStatus:
        item?.settlementStatus || item?.raw?.settlementStatus || "N/A",
    };
  }

  return {
    paymentId: normalizeId(raw?._id || raw?.id || ""),
    paymentMethod: raw?.paymentMethod || item?.paymentMethod || "N/A",
    paymentGateway: raw?.paymentGateway || item?.paymentGateway || "N/A",
    paymentStatus: raw?.paymentStatus || item?.paymentStatus || "PENDING",
    amount: raw?.amount || item?.finalAmount || 0,
    currency: raw?.currency || item?.currency || "QAR",
    paidAt: raw?.paidAt || item?.paidAt || null,
    settlementStatus: raw?.settlementStatus || item?.settlementStatus || "N/A",
  };
}

function normalizeBooking(item, index) {
  const id = normalizeId(item?._id || item?.id || "");

  const finalAmount = firstPositiveNumber(
    item?.finalAmount,
    item?.subtotalAmount,
    item?.baseAmount,
    item?.amount,
    item?.totalAmount,
    item?.price,
    item?.packageSnapshot?.price,
    item?.packageId?.price,
    item?.package?.price,
    item?.activityId?.price,
    item?.activityId?.basePrice,
    item?.activitySnapshot?.price,
    item?.activitySnapshot?.basePrice,
  );

  const currency =
    item?.currency ||
    item?.packageSnapshot?.currency ||
    item?.packageId?.currency ||
    item?.package?.currency ||
    item?.activityId?.currency ||
    "QAR";

  const cancellationStatus = normalizeUpper(item?.cancellationStatus, "NONE");

  const normalized = {
    raw: item,
    id: id || `booking-${index + 1}`,
    dbId: id,

    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        item?.academy?.id ||
        "",
    ),
    academyName: pickAcademyName(item),

    bookingNo: pickBookingNo(item),
    parentName: pickParentName(item),
    parentEmail: pickParentEmail(item),
    parentPhone: pickParentPhone(item),
    childName: pickChildName(item),
    activityName: pickActivityName(item),
    packageName: pickPackageName(item),
    categoryName: pickCategoryName(item),

    sessions:
      item?.totalSessions ||
      item?.bookedSessions ||
      item?.sessions ||
      item?.noOfSessions ||
      item?.numberOfSessions ||
      item?.packageSnapshot?.sessionCount ||
      item?.packageId?.sessionCount ||
      0,

    bookingMode: item?.bookingMode || "N/A",
    bookingStatus: normalizeUpper(
      item?.bookingStatus || item?.status,
      "PENDING",
    ),
    paymentStatus: normalizeUpper(item?.paymentStatus, "PENDING"),
    attendanceStatus: normalizeUpper(item?.attendanceStatus, "PENDING"),
    source: normalizeUpper(
      item?.bookingSource || (item?.isGuestBooking ? "GUEST" : "WEB"),
      "WEB",
    ),

    cancellationRequested: Boolean(item?.cancellationRequested),
    cancellationStatus,
    cancellationReason: item?.cancellationReason || "",
    cancellationRequestedAt: item?.cancellationRequestedAt || null,
    cancellationRequestedBy: item?.cancellationRequestedBy || null,
    cancellationReviewedAt: item?.cancellationReviewedAt || null,
    cancellationReviewedBy: item?.cancellationReviewedBy || null,
    cancellationAdminNote: item?.cancellationAdminNote || "",
    hasCancellationRequest: Boolean(
      item?.cancellationRequested || cancellationStatus === "REQUESTED",
    ),

    notes: item?.notes || "",
    finalAmount,
    currency,

    createdAt: item?.createdAt || null,
    firstSessionDate: item?.firstSessionDate || null,
    lastSessionDate: item?.lastSessionDate || null,
  };

  normalized.selectedSessions = getSelectedSessions(normalized);
  normalized.payment = normalizePayment(normalized);
  normalized.paymentStatus = normalizeUpper(
    normalized.payment?.paymentStatus || normalized.paymentStatus,
    "PENDING",
  );

  return normalized;
}

function canConfirmCashPayment(booking) {
  if (!booking) return false;

  return (
    normalizeUpper(booking.payment?.paymentMethod, "N/A") === "CASH" &&
    normalizeUpper(booking.paymentStatus, "PENDING") !== "PAID" &&
    Boolean(normalizeId(booking.payment?.paymentId))
  );
}

function canSyncOnlinePayment(booking) {
  if (!booking) return false;

  return (
    normalizeUpper(booking.payment?.paymentMethod, "N/A") === "ONLINE" &&
    normalizeUpper(booking.paymentStatus, "PENDING") === "PENDING" &&
    (Boolean(normalizeId(booking.payment?.paymentId)) ||
      Boolean(normalizeId(booking.dbId || booking.id)))
  );
}

function csvCell(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
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

function StatusBadge({ value }) {
  const text = normalizeUpper(value, "N/A");

  const classes = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    REQUESTED: "bg-amber-50 text-amber-700 ring-amber-100",
    FAILED: "bg-red-50 text-red-700 ring-red-100",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
    CANCELED: "bg-red-50 text-red-700 ring-red-100",
    REJECTED: "bg-red-50 text-red-700 ring-red-100",
    REFUNDED: "bg-violet-50 text-violet-700 ring-violet-100",
    ABSENT: "bg-slate-100 text-slate-700 ring-slate-200",
    NONE: "bg-slate-100 text-slate-700 ring-slate-200",
    GUEST: "bg-violet-50 text-violet-700 ring-violet-100",
    WEB: "bg-blue-50 text-blue-700 ring-blue-100",
    ONLINE: "bg-blue-50 text-blue-700 ring-blue-100",
    CASH: "bg-orange-50 text-[#ff7a3d] ring-orange-100",
    MANUAL: "bg-orange-50 text-[#ff7a3d] ring-orange-100",
    MYFATOORAH: "bg-blue-50 text-blue-700 ring-blue-100",
  };

  return (
    <span
      className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-black ring-1 ${
        classes[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100 ${className}`}
      >
        {children}
      </select>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
        <ClipboardList className="h-7 w-7" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-500">{label}</div>

          <div className="mt-3 break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-2 text-sm font-medium leading-5 text-slate-400">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d] ring-1 ring-orange-100">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  variant = "slate",
  disabled = false,
}) {
  const classes = {
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    orange: "bg-orange-50 text-[#ff7a3d] hover:bg-orange-100",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[variant] || classes.slate}`}
    >
      {children}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div
          className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${danger ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#ff7a3d]"}`}
        >
          <AlertCircle className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#ff7a3d] hover:bg-[#ec6f35]"
            }`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
        No selected session/slot details found from API.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((slot, index) => (
        <div
          key={slot.id || index}
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Clock3 className="h-4 w-4 text-[#ff7a3d]" />
              {slot.label || `Session ${index + 1}`}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              {formatDate(slot.date)} · {slot.startTime || "--:--"} -{" "}
              {slot.endTime || "--:--"}
            </div>
          </div>
          <StatusBadge value={slot.status || "BOOKED"} />
        </div>
      ))}
    </div>
  );
}

function CancellationPanel({ booking }) {
  const status = normalizeUpper(booking?.cancellationStatus, "NONE");

  if (status === "NONE" && !booking?.cancellationReason) return null;

  return (
    <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-amber-600" />
        <h4 className="text-base font-black text-slate-950">
          Cancellation Request
        </h4>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-3 border-b border-amber-100 pb-2">
          <span className="font-semibold text-slate-500">Status</span>
          <StatusBadge value={status} />
        </div>
        <div className="flex justify-between gap-3 border-b border-amber-100 pb-2">
          <span className="font-semibold text-slate-500">Requested</span>
          <span className="text-right font-black text-slate-950">
            {formatDateTime(booking.cancellationRequestedAt)}
          </span>
        </div>
        <div>
          <div className="font-semibold text-slate-500">Parent Reason</div>
          <div className="mt-1 rounded-2xl bg-white p-3 font-bold leading-6 text-slate-800 ring-1 ring-amber-100">
            {booking.cancellationReason || "No reason provided."}
          </div>
        </div>
        {booking.cancellationAdminNote ? (
          <div>
            <div className="font-semibold text-slate-500">Admin Note</div>
            <div className="mt-1 rounded-2xl bg-white p-3 font-bold leading-6 text-slate-800 ring-1 ring-amber-100">
              {booking.cancellationAdminNote}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BookingViewModal({
  open,
  booking,
  onClose,
  onAction,
  onConfirmCash,
  onSyncOnline,
  actionLoading,
}) {
  if (!open || !booking) return null;

  const rows = [
    ["Academy", booking.academyName],
    ["Booking No", booking.bookingNo],
    ["Parent", booking.parentName],
    ["Email", booking.parentEmail || "N/A"],
    ["Phone", booking.parentPhone || "N/A"],
    ["Child", booking.childName],
    ["Activity", booking.activityName],
    ["Category", booking.categoryName],
    ["Package", booking.packageName],
    ["Sessions", booking.sessions || "N/A"],
    ["Booking Mode", booking.bookingMode],
    ["Booking Status", booking.bookingStatus],
    ["Payment Status", booking.paymentStatus],
    ["Attendance Status", booking.attendanceStatus],
    ["Cancellation Status", booking.cancellationStatus],
    ["Source", booking.source],
    ["Amount", money(booking.finalAmount, booking.currency)],
    ["Created", formatDateTime(booking.createdAt)],
    ["First Session", formatDate(booking.firstSessionDate)],
    ["Last Session", formatDate(booking.lastSessionDate)],
  ];

  const payment = booking.payment || {};
  const cancellationRequested = booking.cancellationStatus === "REQUESTED";

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Eye className="h-3.5 w-3.5" />
              Booking Details
            </div>

            <h3 className="mt-3 break-words text-xl font-black text-slate-900 sm:text-2xl">
              {booking.bookingNo}
            </h3>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {booking.academyName}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={booking.bookingStatus} />
              <StatusBadge value={booking.paymentStatus} />
              <StatusBadge value={booking.cancellationStatus} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            aria-label="Close booking details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 px-4 py-5 lg:grid-cols-[1fr_380px] sm:px-6 sm:py-6">
          <div className="min-w-0">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {rows.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 break-words text-sm font-bold text-slate-900">
                    {value || "N/A"}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Notes
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-700">
                  {booking.notes || "No notes."}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-5 w-5 text-[#ff7a3d]" />
                <h4 className="text-base font-black text-slate-950">
                  Selected Sessions
                </h4>
              </div>
              <SessionsPanel sessions={booking.selectedSessions || []} />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#ff7a3d]" />
                <h4 className="text-base font-black text-slate-950">
                  Payment Details
                </h4>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-500">
                    Payment ID
                  </span>
                  <span className="break-all text-right font-black text-slate-950">
                    {payment.paymentId || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-500">Status</span>
                  <StatusBadge
                    value={payment.paymentStatus || booking.paymentStatus}
                  />
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-500">Method</span>
                  <StatusBadge value={payment.paymentMethod || "N/A"} />
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-500">Gateway</span>
                  <StatusBadge value={payment.paymentGateway || "N/A"} />
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-500">
                    Settlement
                  </span>
                  <StatusBadge value={payment.settlementStatus || "N/A"} />
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">Amount</span>
                  <span className="font-black text-slate-950">
                    {money(
                      payment.amount || booking.finalAmount,
                      payment.currency || booking.currency,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <CancellationPanel booking={booking} />

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#ff7a3d]" />
                <h4 className="text-base font-black text-slate-950">
                  Quick Actions
                </h4>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onAction(booking, "CONFIRM")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Booking
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onAction(booking, "MARK_PAID")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white hover:bg-[#ec6f35] disabled:opacity-60"
                >
                  <Wallet className="h-4 w-4" />
                  Mark Payment Paid
                </button>

                {canConfirmCashPayment(booking) ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => onConfirmCash(booking)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-[#ff7a3d] hover:bg-orange-100 disabled:opacity-60"
                  >
                    <Wallet className="h-4 w-4" />
                    Confirm Cash Payment
                  </button>
                ) : null}

                {canSyncOnlinePayment(booking) ? (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => onSyncOnline(booking)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${actionLoading ? "animate-spin" : ""}`}
                    />
                    Sync Online Payment
                  </button>
                ) : null}

                {cancellationRequested ? (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        onAction(booking, "APPROVE_CANCEL_REQUEST")
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Cancel Request
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onAction(booking, "REJECT_CANCEL_REQUEST")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Cancel Request
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onAction(booking, "CANCEL")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Booking
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingMobileCard({
  booking,
  onView,
  onAction,
  onConfirmCash,
  onSyncOnline,
  actionLoading,
}) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#ff7a3d] ring-1 ring-orange-100">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{booking.academyName}</span>
          </div>

          <div className="mt-3 break-words text-base font-black text-slate-900">
            {booking.bookingNo}
          </div>

          <div className="mt-1 text-xs font-medium text-slate-500">
            {formatDateTime(booking.createdAt)}
          </div>
        </div>

        <StatusBadge value={booking.bookingStatus} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Parent
          </div>
          <div className="mt-1 break-words text-sm font-black text-slate-900">
            {booking.parentName}
          </div>
          <div className="mt-1 break-words text-xs font-medium text-slate-500">
            {booking.parentEmail || booking.parentPhone || "N/A"}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Child
          </div>
          <div className="mt-1 break-words text-sm font-black text-slate-900">
            {booking.childName}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Activity
          </div>
          <div className="mt-1 break-words text-sm font-black text-slate-900">
            {booking.activityName}
          </div>
          <div className="mt-1 break-words text-xs font-medium text-slate-500">
            {booking.categoryName} · {booking.packageName}
          </div>
        </div>

        {booking.cancellationStatus !== "NONE" ? (
          <div className="rounded-2xl bg-amber-50 p-3 sm:col-span-2">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
              Cancellation
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={booking.cancellationStatus} />
              {booking.cancellationRequestedAt ? (
                <span className="text-xs font-bold text-amber-700">
                  {formatDateTime(booking.cancellationRequestedAt)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge value={booking.paymentStatus} />
        <StatusBadge value={booking.payment?.paymentMethod || "N/A"} />
        <StatusBadge value={booking.source} />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
          {money(booking.finalAmount, booking.currency)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onAction(booking, "CONFIRM")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm
        </button>
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onAction(booking, "MARK_PAID")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100 disabled:opacity-60"
        >
          <Wallet className="h-4 w-4" />
          Paid
        </button>

        {canConfirmCashPayment(booking) ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onConfirmCash(booking)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100 disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            Cash
          </button>
        ) : null}

        {canSyncOnlinePayment(booking) ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onSyncOnline(booking)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${actionLoading ? "animate-spin" : ""}`}
            />
            Sync
          </button>
        ) : null}

        {booking.cancellationStatus === "REQUESTED" ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAction(booking, "APPROVE_CANCEL_REQUEST")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        ) : (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAction(booking, "CANCEL")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
          >
            <Ban className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

function actionConfig(type, booking) {
  if (type === "CONFIRM") {
    return {
      title: "Confirm booking",
      message: `Confirm booking ${booking.bookingNo}?`,
      confirmText: "Confirm",
      payload: { bookingStatus: "CONFIRMED" },
      success: "Booking confirmed successfully.",
      danger: false,
    };
  }

  if (type === "MARK_PAID") {
    return {
      title: "Mark payment paid",
      message: `Mark payment as PAID for booking ${booking.bookingNo}?`,
      confirmText: "Mark Paid",
      payload: { bookingStatus: "CONFIRMED", paymentStatus: "PAID" },
      success: "Payment marked as paid successfully.",
      danger: false,
    };
  }

  if (type === "APPROVE_CANCEL_REQUEST") {
    return {
      title: "Approve cancellation request",
      message: `Approve the parent cancellation request for booking ${booking.bookingNo}? The booking will be cancelled.`,
      confirmText: "Approve Request",
      payload: {
        bookingStatus: "CANCELLED",
        paymentStatus: booking.paymentStatus === "PAID" ? "PAID" : "CANCELLED",
        cancellationStatus: "APPROVED",
        cancellationRequested: false,
        cancellationAdminNote: "Cancellation request approved by super admin.",
      },
      success: "Cancellation request approved successfully.",
      danger: true,
    };
  }

  if (type === "REJECT_CANCEL_REQUEST") {
    return {
      title: "Reject cancellation request",
      message: `Reject the parent cancellation request for booking ${booking.bookingNo}?`,
      confirmText: "Reject Request",
      payload: {
        cancellationStatus: "REJECTED",
        cancellationRequested: false,
        cancellationAdminNote: "Cancellation request rejected by super admin.",
      },
      success: "Cancellation request rejected successfully.",
      danger: false,
    };
  }

  return {
    title: "Cancel booking",
    message: `Cancel booking ${booking.bookingNo}? This action should only be used after checking the academy/parent request.`,
    confirmText: "Cancel Booking",
    payload: { bookingStatus: "CANCELLED", paymentStatus: "CANCELLED" },
    success: "Booking cancelled successfully.",
    danger: true,
  };
}

export default function SuperAdminBookingEnquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [bookings, setBookings] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);

  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [cancellationFilter, setCancellationFilter] = useState("");

  const [viewBooking, setViewBooking] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "",
    booking: null,
  });

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [bookingsRes, academiesRes, categoriesRes] =
        await Promise.allSettled([
          api.get("/super-admin/bookings"),
          api.get("/super-admin/academies"),
          api.get("/super-admin/categories"),
        ]);

      const bookingRows =
        bookingsRes.status === "fulfilled"
          ? toArray(
              bookingsRes.value?.data?.bookings ||
                bookingsRes.value?.data?.enquiries ||
                bookingsRes.value?.data?.items ||
                [],
            )
          : [];

      if (bookingsRes.status === "rejected") {
        throw new Error(
          bookingsRes.reason?.response?.data?.message ||
            "Failed to load super admin bookings.",
        );
      }

      const academyRows =
        academiesRes.status === "fulfilled"
          ? toArray(
              academiesRes.value?.data?.academies ||
                academiesRes.value?.data?.items ||
                [],
            )
          : [];

      const categoryRows =
        categoriesRes.status === "fulfilled"
          ? toArray(categoriesRes.value?.data?.categories || [])
          : [];

      const normalizedBookings = bookingRows.map(normalizeBooking);

      setBookings(normalizedBookings);

      setAcademies(
        academyRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `academy-${index + 1}`),
          name: safeText(item?.name || item?.academyName, "Academy"),
        })),
      );

      setCategories(
        categoryRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `category-${index + 1}`),
          name: safeText(item?.name || item?.title, "Category"),
        })),
      );

      const activityMap = new Map();

      normalizedBookings.forEach((booking, index) => {
        const name = safeText(booking.activityName, "");
        if (name && name !== "N/A" && !activityMap.has(name)) {
          activityMap.set(name, { id: `activity-${index + 1}`, name });
        }
      });

      setActivities([...activityMap.values()]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load booking enquiries.",
      );
      setBookings([]);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const uniqueAcademies = useMemo(() => {
    const set = new Set();
    bookings.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A")
        set.add(item.academyName);
    });
    academies.forEach((item) => {
      if (item.name) set.add(item.name);
    });
    return [...set].sort();
  }, [bookings, academies]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    bookings.forEach((item) => {
      if (item.categoryName && item.categoryName !== "N/A")
        set.add(item.categoryName);
    });
    categories.forEach((item) => {
      if (item.name) set.add(item.name);
    });
    return [...set].sort();
  }, [bookings, categories]);

  const uniqueActivities = useMemo(() => {
    const set = new Set();
    bookings.forEach((item) => {
      if (item.activityName && item.activityName !== "N/A")
        set.add(item.activityName);
    });
    activities.forEach((item) => {
      if (item.name) set.add(item.name);
    });
    return [...set].sort();
  }, [bookings, activities]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bookings.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.academyName,
          item.bookingNo,
          item.parentName,
          item.parentEmail,
          item.parentPhone,
          item.childName,
          item.activityName,
          item.packageName,
          item.categoryName,
          item.bookingStatus,
          item.paymentStatus,
          item.cancellationStatus,
          item.cancellationReason,
          item.source,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !academyFilter ||
        String(item.academyName).toLowerCase() ===
          String(academyFilter).toLowerCase();

      const matchesCategory =
        !categoryFilter ||
        String(item.categoryName).toLowerCase() ===
          String(categoryFilter).toLowerCase();

      const matchesActivity =
        !activityFilter ||
        String(item.activityName).toLowerCase() ===
          String(activityFilter).toLowerCase();

      const matchesStatus =
        !statusFilter ||
        String(item.bookingStatus).toUpperCase() ===
          String(statusFilter).toUpperCase();

      const matchesPayment =
        !paymentFilter ||
        String(item.paymentStatus).toUpperCase() ===
          String(paymentFilter).toUpperCase();

      const matchesCancellation =
        !cancellationFilter ||
        String(item.cancellationStatus).toUpperCase() ===
          String(cancellationFilter).toUpperCase();

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesCategory &&
        matchesActivity &&
        matchesStatus &&
        matchesPayment &&
        matchesCancellation
      );
    });
  }, [
    bookings,
    search,
    academyFilter,
    categoryFilter,
    activityFilter,
    statusFilter,
    paymentFilter,
    cancellationFilter,
  ]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(
      (item) => String(item.bookingStatus).toUpperCase() === "PENDING",
    ).length;
    const confirmed = bookings.filter(
      (item) => String(item.bookingStatus).toUpperCase() === "CONFIRMED",
    ).length;
    const paid = bookings.filter(
      (item) => String(item.paymentStatus).toUpperCase() === "PAID",
    ).length;
    const cancelRequests = bookings.filter(
      (item) => String(item.cancellationStatus).toUpperCase() === "REQUESTED",
    ).length;
    const amount = bookings.reduce(
      (sum, item) => sum + Number(item.finalAmount || 0),
      0,
    );

    return { total, pending, confirmed, paid, cancelRequests, amount };
  }, [bookings]);

  function clearFilters() {
    setSearch("");
    setAcademyFilter("");
    setCategoryFilter("");
    setActivityFilter("");
    setStatusFilter("");
    setPaymentFilter("");
    setCancellationFilter("");
  }

  function exportBookingsCsv() {
    const header = [
      "Academy",
      "Booking No",
      "Parent",
      "Email",
      "Phone",
      "Child",
      "Activity",
      "Category",
      "Package",
      "Sessions",
      "Booking Status",
      "Payment Status",
      "Payment Method",
      "Payment Gateway",
      "Cancellation Status",
      "Amount",
      "Currency",
      "Created",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.academyName,
      booking.bookingNo,
      booking.parentName,
      booking.parentEmail,
      booking.parentPhone,
      booking.childName,
      booking.activityName,
      booking.categoryName,
      booking.packageName,
      booking.sessions,
      booking.bookingStatus,
      booking.paymentStatus,
      booking.payment?.paymentMethod || "N/A",
      booking.payment?.paymentGateway || "N/A",
      booking.cancellationStatus,
      booking.finalAmount,
      booking.currency,
      formatDateTime(booking.createdAt),
    ]);

    downloadCsv(
      `kidgage_superadmin_bookings_${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows],
    );
  }

  function openAction(booking, type) {
    if (!booking?.dbId || String(booking.dbId).startsWith("booking-")) {
      setError("This booking does not have a valid database ID.");
      return;
    }

    setError("");
    setMessage("");
    setConfirmState({ open: true, type, booking });
  }

  function closeAction() {
    if (actionLoading) return;
    setConfirmState({ open: false, type: "", booking: null });
  }

  async function confirmAction() {
    const booking = confirmState.booking;
    const type = confirmState.type;
    const config = actionConfig(type, booking);

    if (!booking?.dbId) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.put(
        `/super-admin/bookings/${encodeURIComponent(booking.dbId)}`,
        config.payload,
      );

      setMessage(config.success);
      closeAction();
      setViewBooking(null);
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update booking.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmCashPayment(booking) {
    const paymentId = normalizeId(booking?.payment?.paymentId);

    if (!paymentId) {
      setError("Cannot confirm cash payment because payment ID is missing.");
      setMessage("");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const { data } = await api.patch(
        `/payments/${encodeURIComponent(paymentId)}/confirm-cash`,
        {
          notes: "Cash payment confirmed by super admin.",
        },
      );

      setMessage(data?.message || "Cash payment confirmed successfully.");
      setViewBooking(null);
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to confirm cash payment.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function syncOnlinePayment(booking) {
    const paymentId = normalizeId(booking?.payment?.paymentId);
    const bookingId = normalizeId(booking?.dbId || booking?.id);

    if (!paymentId && !bookingId) {
      setError(
        "Cannot sync online payment because payment ID and booking ID are missing.",
      );
      setMessage("");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const { data } = await api.post("/payments/myfatoorah/sync", {
        bookingId,
        localPaymentId: paymentId,
        paymentRecordId: paymentId,
      });

      const status = normalizeUpper(
        data?.status ||
          data?.payment?.paymentStatus ||
          data?.payment?.status ||
          "PENDING",
        "PENDING",
      );

      setMessage(`Payment status refreshed: ${status}`);
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to refresh online payment status.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const currentActionConfig = confirmState.open
    ? actionConfig(confirmState.type, confirmState.booking)
    : null;

  return (
    <div className="w-full bg-slate-50 px-4 py-5 text-slate-900 md:px-8 md:py-6">
      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              KidGage Super Admin
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Booking Enquiries
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 md:text-base">
              Monitor bookings across all academies, activities, categories,
              packages, parents, children, selected slots, payment statuses, and
              cancellation requests.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportBookingsCsv}
              disabled={!filteredBookings.length}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-black text-[#ff7a3d] shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          icon={ClipboardList}
          label="Total Bookings"
          value={loading ? "..." : stats.total}
          subtitle="Across all academies"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          value={loading ? "..." : stats.pending}
          subtitle="Awaiting academy action"
        />
        <StatCard
          icon={CalendarDays}
          label="Confirmed"
          value={loading ? "..." : stats.confirmed}
          subtitle="Approved bookings"
        />
        <StatCard
          icon={Wallet}
          label="Paid"
          value={loading ? "..." : stats.paid}
          subtitle="Payment completed"
        />
        <StatCard
          icon={MessageSquareText}
          label="Cancel Requests"
          value={loading ? "..." : stats.cancelRequests}
          subtitle="Parent requests"
        />
        <StatCard
          icon={Wallet}
          label="Total Value"
          value={loading ? "..." : money(stats.amount, "QAR")}
          subtitle="Estimated booking value"
        />
      </section>

      {message ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_210px_210px] 2xl:grid-cols-[1fr_190px_190px_190px_170px_170px_190px_auto]">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking, parent, academy, child, activity..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <Select
            value={academyFilter}
            onChange={(e) => setAcademyFilter(e.target.value)}
          >
            <option value="">All Academies</option>
            {uniqueAcademies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
          >
            <option value="">All Activities</option>
            {uniqueActivities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>

          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUNDED">REFUNDED</option>
          </Select>

          <Select
            value={cancellationFilter}
            onChange={(e) => setCancellationFilter(e.target.value)}
          >
            <option value="">All Cancellation</option>
            <option value="NONE">NONE</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </Select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              All Booking Enquiries
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Showing {filteredBookings.length} of {bookings.length} records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState text="No booking enquiries found." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1780px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Academy
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Booking
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Parent
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Child
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Activity
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Package
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Status
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Cancellation
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Payment
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Slots
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Amount
                    </th>
                    <th className="pb-4 text-sm font-black text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-5 pr-5 align-top">
                        <div className="inline-flex max-w-[190px] items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-[#ff7a3d] ring-1 ring-orange-100">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {booking.academyName}
                          </span>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="max-w-[160px] break-words text-sm font-black text-slate-900">
                          {booking.bookingNo}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          {formatDateTime(booking.createdAt)}
                        </div>
                        <div className="mt-2">
                          <StatusBadge value={booking.source} />
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="max-w-[190px] break-words text-sm font-bold text-slate-900">
                          {booking.parentName}
                        </div>
                        <div className="mt-2 space-y-1 text-xs font-medium text-slate-500">
                          {booking.parentEmail ? (
                            <div className="flex max-w-[220px] items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {booking.parentEmail}
                              </span>
                            </div>
                          ) : null}
                          {booking.parentPhone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {booking.parentPhone}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="inline-flex max-w-[170px] items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                          <Baby className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{booking.childName}</span>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="max-w-[220px] break-words text-sm font-black text-slate-900">
                          {booking.activityName}
                        </div>
                        <div className="mt-2 inline-flex max-w-[220px] items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {booking.categoryName}
                          </span>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="max-w-[180px] break-words text-sm font-bold text-slate-900">
                          {booking.packageName}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          {booking.sessions || 0} sessions ·{" "}
                          {booking.bookingMode}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <StatusBadge value={booking.bookingStatus} />
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="space-y-2">
                          <StatusBadge value={booking.cancellationStatus} />
                          {booking.cancellationRequestedAt ? (
                            <div className="text-xs font-medium text-slate-500">
                              {formatDateTime(booking.cancellationRequestedAt)}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="space-y-2">
                          <StatusBadge value={booking.paymentStatus} />
                          <StatusBadge
                            value={booking.payment?.paymentMethod || "N/A"}
                          />
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                          {booking.selectedSessions?.length || 0} slots
                        </span>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-black text-slate-900">
                          {money(booking.finalAmount, booking.currency)}
                        </div>
                      </td>

                      <td className="py-5 align-top">
                        <div className="flex items-center gap-2">
                          <IconButton
                            title="View"
                            onClick={() => setViewBooking(booking)}
                          >
                            <Eye className="h-5 w-5" />
                          </IconButton>
                          <IconButton
                            title="Confirm"
                            variant="green"
                            disabled={actionLoading}
                            onClick={() => openAction(booking, "CONFIRM")}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </IconButton>
                          <IconButton
                            title="Mark Paid"
                            variant="orange"
                            disabled={actionLoading}
                            onClick={() => openAction(booking, "MARK_PAID")}
                          >
                            <Wallet className="h-5 w-5" />
                          </IconButton>

                          {canConfirmCashPayment(booking) ? (
                            <IconButton
                              title="Confirm Cash Payment"
                              variant="orange"
                              disabled={actionLoading}
                              onClick={() => confirmCashPayment(booking)}
                            >
                              <Wallet className="h-5 w-5" />
                            </IconButton>
                          ) : null}

                          {canSyncOnlinePayment(booking) ? (
                            <IconButton
                              title="Sync Online Payment"
                              variant="blue"
                              disabled={actionLoading}
                              onClick={() => syncOnlinePayment(booking)}
                            >
                              <RefreshCw
                                className={`h-5 w-5 ${actionLoading ? "animate-spin" : ""}`}
                              />
                            </IconButton>
                          ) : null}

                          {booking.cancellationStatus === "REQUESTED" ? (
                            <>
                              <IconButton
                                title="Approve Cancel Request"
                                variant="green"
                                disabled={actionLoading}
                                onClick={() =>
                                  openAction(booking, "APPROVE_CANCEL_REQUEST")
                                }
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </IconButton>
                              <IconButton
                                title="Reject Cancel Request"
                                variant="red"
                                disabled={actionLoading}
                                onClick={() =>
                                  openAction(booking, "REJECT_CANCEL_REQUEST")
                                }
                              >
                                <XCircle className="h-5 w-5" />
                              </IconButton>
                            </>
                          ) : null}

                          <IconButton
                            title="Cancel"
                            variant="red"
                            disabled={actionLoading}
                            onClick={() => openAction(booking, "CANCEL")}
                          >
                            <Ban className="h-5 w-5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 xl:hidden">
              {filteredBookings.map((booking) => (
                <BookingMobileCard
                  key={booking.id}
                  booking={booking}
                  onView={() => setViewBooking(booking)}
                  onAction={openAction}
                  onConfirmCash={confirmCashPayment}
                  onSyncOnline={syncOnlinePayment}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <BookingViewModal
        open={Boolean(viewBooking)}
        booking={viewBooking}
        onClose={() => setViewBooking(null)}
        onAction={openAction}
        onConfirmCash={confirmCashPayment}
        onSyncOnline={syncOnlinePayment}
        actionLoading={actionLoading}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={currentActionConfig?.title || "Confirm Action"}
        message={currentActionConfig?.message || "Are you sure?"}
        confirmText={currentActionConfig?.confirmText || "Confirm"}
        danger={Boolean(currentActionConfig?.danger)}
        loading={actionLoading}
        onCancel={closeAction}
        onConfirm={confirmAction}
      />
    </div>
  );
}

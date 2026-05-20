// client/src/pages/academy/BookingEnquiriesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Baby,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Eye,
  FileDown,
  Filter,
  FolderOpen,
  Mail,
  MessageSquareText,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { getUser } from "../../lib/auth.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
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

function pickBookingName(item) {
  return (
    item?.bookingNo ||
    item?.referenceNo ||
    item?.invoiceNo ||
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
    "N/A"
  );
}

function pickPackageName(item) {
  return (
    item?.packageId?.title ||
    item?.packageName ||
    item?.packageSnapshot?.title ||
    "N/A"
  );
}

function pickCategoryName(item) {
  return (
    item?.activityId?.categoryName ||
    item?.activityId?.category ||
    item?.categoryName ||
    item?.category ||
    "N/A"
  );
}

function normalizeSessionItem(item = {}, index = 0) {
  const slot =
    item?.slotId || item?.activitySlotId || item?.bookingSlotId || {};

  return {
    id: normalizeId(
      item?._id || item?.id || slot?._id || slot?.id || `session-${index + 1}`,
    ),
    sessionNo: item?.sessionNo || item?.sequence || index + 1,
    label:
      item?.sessionLabel ||
      item?.label ||
      item?.slotLabel ||
      slot?.sessionLabel ||
      `Session ${index + 1}`,
    date:
      item?.date ||
      item?.slotDate ||
      item?.sessionDate ||
      slot?.date ||
      slot?.slotDate ||
      null,
    startTime:
      item?.startTime ||
      item?.slotStartTime ||
      item?.fromTime ||
      slot?.startTime ||
      "",
    endTime:
      item?.endTime || item?.slotEndTime || item?.toTime || slot?.endTime || "",
    status: normalizeUpper(
      item?.sessionStatus || item?.status || item?.slotStatus || "BOOKED",
      "BOOKED",
    ),
    attendanceStatus: normalizeUpper(item?.attendanceStatus, "PENDING"),
  };
}

function pickSelectedSessions(item = {}) {
  const candidates = [
    item?.selectedSessions,
    item?.sessionsList,
    item?.sessionItems,
    item?.bookingSessions,
    item?.bookedSlotItems,
    item?.sessions,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length)
      return candidate.map(normalizeSessionItem);
  }

  if (Array.isArray(item?.slotIds) && item.slotIds.length) {
    return item.slotIds.map((slot, index) =>
      normalizeSessionItem(
        typeof slot === "object" ? { slotId: slot, ...slot } : { slotId: slot },
        index,
      ),
    );
  }

  return [];
}

function pickPaymentDetails(item = {}) {
  const payment =
    item?.payment ||
    item?.paymentDetails ||
    item?.paymentId ||
    item?.raw?.payment ||
    null;

  if (payment && typeof payment === "object") {
    return {
      id: normalizeId(payment?._id || payment?.id),
      amount: firstPositiveNumber(payment?.amount, item?.finalAmount),
      currency: payment?.currency || item?.currency || "QAR",
      paymentMethod: normalizeUpper(
        payment?.paymentMethod || item?.paymentMethod,
        "N/A",
      ),
      paymentGateway: normalizeUpper(
        payment?.paymentGateway || item?.paymentGateway,
        "N/A",
      ),
      paymentStatus: normalizeUpper(
        payment?.paymentStatus || item?.paymentStatus,
        "PENDING",
      ),
      settlementStatus: normalizeUpper(payment?.settlementStatus, "PENDING"),
      gatewayReference:
        payment?.gatewayReference ||
        payment?.gatewayPaymentId ||
        payment?.gatewayOrderId ||
        item?.paymentReference ||
        "",
      paidAt: payment?.paidAt || item?.paidAt || null,
      createdAt: payment?.createdAt || null,
    };
  }

  return {
    id: normalizeId(item?.paymentId),
    amount: firstPositiveNumber(item?.finalAmount, item?.amount),
    currency: item?.currency || "QAR",
    paymentMethod: normalizeUpper(item?.paymentMethod, "N/A"),
    paymentGateway: normalizeUpper(item?.paymentGateway, "N/A"),
    paymentStatus: normalizeUpper(item?.paymentStatus, "PENDING"),
    settlementStatus: "PENDING",
    gatewayReference: item?.paymentReference || "",
    paidAt: item?.paidAt || null,
    createdAt: null,
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
    item?.activityId?.price,
    item?.activityId?.basePrice,
  );
  const currency =
    item?.currency ||
    item?.packageSnapshot?.currency ||
    item?.packageId?.currency ||
    item?.activityId?.currency ||
    "QAR";
  const paymentDetails = pickPaymentDetails({ ...item, finalAmount, currency });
  const cancellationStatus = normalizeUpper(item?.cancellationStatus, "NONE");
  const selectedSessions = pickSelectedSessions(item);

  return {
    raw: item,
    id: id || `booking-${index + 1}`,
    dbId: id,
    bookingNo: pickBookingName(item),
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
      selectedSessions.length ||
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
    paymentStatus: normalizeUpper(
      paymentDetails.paymentStatus || item?.paymentStatus,
      "PENDING",
    ),
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
    selectedSessions,
    paymentDetails,
    paymentMethod: normalizeUpper(
      paymentDetails.paymentMethod || item?.paymentMethod,
      "N/A",
    ),
    paymentGateway: normalizeUpper(
      paymentDetails.paymentGateway || item?.paymentGateway,
      "N/A",
    ),
    paymentId: normalizeId(
      paymentDetails.id ||
        item?.paymentId?._id ||
        item?.paymentId?.id ||
        item?.paymentId,
    ),
    notes: item?.notes || "",
    finalAmount,
    currency,
    createdAt: item?.createdAt || null,
    firstSessionDate:
      item?.firstSessionDate || selectedSessions[0]?.date || null,
    lastSessionDate:
      item?.lastSessionDate ||
      selectedSessions[selectedSessions.length - 1]?.date ||
      null,
  };
}

function canConfirmCashPayment(booking) {
  if (!booking) return false;
  return (
    normalizeUpper(booking.paymentMethod, "N/A") === "CASH" &&
    normalizeUpper(booking.paymentStatus, "PENDING") !== "PAID" &&
    Boolean(normalizeId(booking.paymentId || booking.paymentDetails?.id))
  );
}

function canSyncOnlinePayment(booking) {
  if (!booking) return false;
  return (
    normalizeUpper(booking.paymentMethod, "N/A") === "ONLINE" &&
    normalizeUpper(booking.paymentStatus, "PENDING") === "PENDING" &&
    (Boolean(normalizeId(booking.paymentId || booking.paymentDetails?.id)) ||
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
  const raw = normalizeUpper(value, "N/A");
  const key = raw === "N/A" ? "N_A" : raw;
  const classes = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    REQUESTED: "bg-amber-50 text-amber-700 ring-amber-100",
    FAILED: "bg-red-50 text-red-700 ring-red-100",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
    CANCELED: "bg-red-50 text-red-700 ring-red-100",
    PAYMENT_FAILED: "bg-red-50 text-red-700 ring-red-100",
    REJECTED: "bg-red-50 text-red-700 ring-red-100",
    REFUNDED: "bg-violet-50 text-violet-700 ring-violet-100",
    ABSENT: "bg-slate-100 text-slate-700 ring-slate-200",
    NONE: "bg-slate-100 text-slate-700 ring-slate-200",
    GUEST: "bg-violet-50 text-violet-700 ring-violet-100",
    WEB: "bg-blue-50 text-[#1877f2] ring-blue-100",
    ONLINE: "bg-blue-50 text-[#1877f2] ring-blue-100",
    CASH: "bg-orange-50 text-[#ff7a3d] ring-orange-100",
    MANUAL: "bg-orange-50 text-[#ff7a3d] ring-orange-100",
    MYFATOORAH: "bg-blue-50 text-[#1877f2] ring-blue-100",
    N_A: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[key] || classes.N_A}`}
    >
      <span className="truncate">{key === "N_A" ? "N/A" : raw}</span>
    </span>
  );
}

function AlertBox({ type, message }) {
  const isSuccess = type === "success";
  return (
    <div
      className={`mt-6 rounded-[22px] border px-4 py-3 text-sm font-black ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span className="break-words">{message}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-orange-200 bg-orange-50/35 px-4 py-12 text-center sm:rounded-[28px]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#ff7a3d] shadow-sm ring-1 ring-orange-100">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-600">{text}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-black text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    >
      {children}
    </select>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-md rounded-[26px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[32px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[20px] ${danger ? "bg-red-50 text-red-600" : "bg-orange-50 text-[#ff7a3d]"}`}
            >
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="break-words text-xl font-black text-slate-950">
              {title}
            </h3>
            <p className="mt-2 break-words text-sm leading-6 text-slate-500">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full rounded-2xl px-4 py-2.5 text-sm font-black text-white transition disabled:opacity-60 sm:w-auto ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#ff7a3d] hover:bg-[#ec6f35]"}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionList({ sessions = [] }) {
  if (!sessions.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 sm:rounded-[24px]">
        No selected session details found for this booking.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session, index) => (
        <div
          key={session.id || index}
          className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-[24px]"
        >
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-950">
              Session {session.sessionNo || index + 1}: {session.label}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#ff7a3d]" />
                {formatDate(session.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-[#1877f2]" />
                {session.startTime || "--:--"} - {session.endTime || "--:--"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <StatusBadge value={session.status} />
            <StatusBadge value={session.attendanceStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoTile({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-3 ${className}`}>
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "N/A"}
      </div>
    </div>
  );
}

function PaymentPanel({
  payment,
  booking,
  onConfirmCash,
  onSyncOnlinePayment,
  paymentActionLoading,
}) {
  const details = payment || {};
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-950">
              Payment Details
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Synced with booking payment record when available.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirmCashPayment(booking) ? (
            <button
              type="button"
              onClick={() => onConfirmCash(booking)}
              disabled={paymentActionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#ec6f35] disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" /> Confirm Cash
            </button>
          ) : null}
          {canSyncOnlinePayment(booking) ? (
            <button
              type="button"
              onClick={() => onSyncOnlinePayment(booking)}
              disabled={paymentActionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-xs font-black text-[#1877f2] transition hover:bg-blue-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${paymentActionLoading ? "animate-spin" : ""}`}
              />{" "}
              Sync Online
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile
          label="Amount"
          value={money(
            details.amount || booking.finalAmount,
            details.currency || booking.currency,
          )}
        />
        <InfoTile
          label="Payment ID"
          value={details.id || booking.paymentId || "N/A"}
        />
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Method / Gateway
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={details.paymentMethod} />
            <StatusBadge value={details.paymentGateway} />
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Status / Settlement
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge
              value={details.paymentStatus || booking.paymentStatus}
            />
            <StatusBadge value={details.settlementStatus || "PENDING"} />
          </div>
        </div>
        <InfoTile
          className="sm:col-span-2"
          label="Gateway Reference"
          value={details.gatewayReference || "N/A"}
        />
      </div>
    </div>
  );
}

function CancellationPanel({ booking }) {
  const status = normalizeUpper(booking?.cancellationStatus, "NONE");
  if (status === "NONE" && !booking?.cancellationReason) return null;
  return (
    <div className="rounded-[22px] border border-amber-100 bg-amber-50/70 p-4 shadow-sm sm:rounded-[24px]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-100">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-black text-slate-950">
            Cancellation Request
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Parent request and academy review status.
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-100">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Status
          </div>
          <div className="mt-2">
            <StatusBadge value={status} />
          </div>
        </div>
        <InfoTile
          label="Requested At"
          value={formatDateTime(booking?.cancellationRequestedAt)}
          className="bg-white ring-1 ring-amber-100"
        />
        <InfoTile
          label="Parent Reason"
          value={booking?.cancellationReason || "No reason provided."}
          className="bg-white ring-1 ring-amber-100 sm:col-span-2"
        />
        {booking?.cancellationAdminNote ? (
          <InfoTile
            label="Admin Note"
            value={booking.cancellationAdminNote}
            className="bg-white ring-1 ring-amber-100 sm:col-span-2"
          />
        ) : null}
      </div>
    </div>
  );
}

function ModalHeader({
  icon: Icon,
  title,
  heading,
  sub,
  onClose,
  disabled = false,
}) {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
            <Icon className="h-3.5 w-3.5" />
            {title}
          </div>
          <h3 className="mt-3 break-words text-xl font-black text-slate-950 sm:text-2xl">
            {heading}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{sub}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function BookingViewModal({
  open,
  booking,
  onClose,
  onApproveCancel,
  onRejectCancel,
  onConfirmCash,
  onSyncOnlinePayment,
  paymentActionLoading,
}) {
  if (!open || !booking) return null;
  const rows = [
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
    ["Payment Method", booking.paymentMethod],
    ["Payment Gateway", booking.paymentGateway],
    ["Attendance Status", booking.attendanceStatus],
    ["Cancellation Status", booking.cancellationStatus || "NONE"],
    ["Source", booking.source],
    ["Amount", money(booking.finalAmount, booking.currency)],
    ["Created", formatDateTime(booking.createdAt)],
    ["First Session", formatDate(booking.firstSessionDate)],
    ["Last Session", formatDate(booking.lastSessionDate)],
  ];
  const cancellationRequested =
    normalizeUpper(booking.cancellationStatus, "NONE") === "REQUESTED";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <div className="border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Eye className="h-3.5 w-3.5" />
                Booking Details
              </div>
              <h3 className="mt-3 break-words text-xl font-black text-slate-950 sm:text-2xl">
                {booking.bookingNo}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Full parent booking, payment, sessions, and cancellation
                overview.
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
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 px-4 py-5 sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-6">
          {rows.map(([label, value]) => (
            <InfoTile key={label} label={label} value={value} />
          ))}
          <div className="sm:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#ff7a3d]" />
              <h4 className="text-base font-black text-slate-950">
                Selected Sessions / Slots
              </h4>
            </div>
            <SessionList sessions={booking.selectedSessions || []} />
          </div>
          <div className="sm:col-span-2">
            <PaymentPanel
              payment={booking.paymentDetails}
              booking={booking}
              onConfirmCash={onConfirmCash}
              onSyncOnlinePayment={onSyncOnlinePayment}
              paymentActionLoading={paymentActionLoading}
            />
          </div>
          <div className="sm:col-span-2">
            <CancellationPanel booking={booking} />
          </div>
          <InfoTile
            label="Notes"
            value={booking.notes || "No notes."}
            className="sm:col-span-2"
          />
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-5 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Close
          </button>
          {cancellationRequested ? (
            <>
              <button
                type="button"
                onClick={() => onRejectCancel(booking)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 sm:w-auto"
              >
                <XCircle className="h-4 w-4" />
                Reject Cancellation
              </button>
              <button
                type="button"
                onClick={() => onApproveCancel(booking)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve Cancellation
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BookingEditModal({
  open,
  booking,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open || !booking) return null;
  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <ModalHeader
          icon={Pencil}
          title="Edit Booking"
          heading={booking.bookingNo}
          sub="Update booking, payment, attendance, and cancellation status."
          onClose={onClose}
          disabled={saving}
        />
        <form onSubmit={onSubmit} className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Booking Status">
              <Select
                value={form.bookingStatus}
                onChange={(e) => onChange("bookingStatus", e.target.value)}
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </Field>
            <Field label="Payment Status">
              <Select
                value={form.paymentStatus}
                onChange={(e) => onChange("paymentStatus", e.target.value)}
              >
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </Select>
            </Field>
            <Field label="Attendance Status">
              <Select
                value={form.attendanceStatus}
                onChange={(e) => onChange("attendanceStatus", e.target.value)}
              >
                <option value="PENDING">PENDING</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
                <option value="COMPLETED">COMPLETED</option>
              </Select>
            </Field>
            <Field label="Cancellation Status">
              <Select
                value={form.cancellationStatus}
                onChange={(e) => onChange("cancellationStatus", e.target.value)}
              >
                <option value="NONE">NONE</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </Select>
            </Field>
            <Field label="Admin Notes">
              <TextArea
                rows={4}
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Optional notes..."
              />
            </Field>
            <Field label="Cancellation Admin Note">
              <TextArea
                rows={4}
                value={form.cancellationAdminNote}
                onChange={(e) =>
                  onChange("cancellationAdminNote", e.target.value)
                }
                placeholder="Optional cancellation review note..."
              />
            </Field>
          </div>
          <div className="sticky bottom-3 z-10 mt-6 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-end sm:rounded-[26px]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingEmailModal({
  open,
  booking,
  form,
  sending,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open || !booking) return null;
  return (
    <div className="fixed inset-0 z-[86] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <ModalHeader
          icon={Mail}
          title="Send Email"
          heading={booking.bookingNo}
          sub="Send a booking update email to the parent."
          onClose={onClose}
          disabled={sending}
        />
        <form onSubmit={onSubmit} className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-5">
            <Field label="Recipient Email">
              <input
                type="email"
                value={form.to}
                onChange={(e) => onChange("to", e.target.value)}
                placeholder="parent@example.com"
                required
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
            </Field>
            <Field label="Subject">
              <input
                type="text"
                value={form.subject}
                onChange={(e) => onChange("subject", e.target.value)}
                placeholder="Booking update from KidGage"
                required
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
            </Field>
            <Field label="Message">
              <TextArea
                rows={8}
                value={form.message}
                onChange={(e) => onChange("message", e.target.value)}
                placeholder="Write your message..."
                required
              />
            </Field>
          </div>
          <div className="sticky bottom-3 z-10 mt-6 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-end sm:rounded-[26px]">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const initialEditForm = {
  bookingStatus: "PENDING",
  paymentStatus: "PENDING",
  attendanceStatus: "PENDING",
  cancellationStatus: "NONE",
  cancellationAdminNote: "",
  notes: "",
};

const initialEmailForm = {
  to: "",
  subject: "",
  message: "",
};

export default function BookingEnquiriesPage() {
  const user = getUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [cancellationFilter, setCancellationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [viewBooking, setViewBooking] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [emailBooking, setEmailBooking] = useState(null);
  const [emailForm, setEmailForm] = useState(initialEmailForm);
  const [deleteState, setDeleteState] = useState({
    open: false,
    id: "",
    bookingNo: "",
  });
  const [quickAction, setQuickAction] = useState({
    open: false,
    type: "",
    id: "",
    bookingNo: "",
    title: "",
    message: "",
    confirmText: "",
    danger: false,
    payload: null,
  });
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const academyName = user?.academyName || user?.academy?.name || "Academy";

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [bookingsRes, activitiesRes, categoriesRes] =
        await Promise.allSettled([
          api.get("/academy/bookings"),
          api.get("/academy/activities"),
          api.get("/academy/categories"),
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
      const activityRows =
        activitiesRes.status === "fulfilled"
          ? toArray(
              activitiesRes.value?.data?.activities ||
                activitiesRes.value?.data?.courses ||
                activitiesRes.value?.data?.items ||
                [],
            )
          : [];
      const categoryRows =
        categoriesRes.status === "fulfilled"
          ? toArray(categoriesRes.value?.data?.categories || [])
          : [];
      setBookings(bookingRows.map(normalizeBooking));
      setActivities(
        activityRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `activity-${index + 1}`),
          name: item?.title || item?.name || "Untitled Activity",
        })),
      );
      setCategories(
        categoryRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `category-${index + 1}`),
          name: item?.name || item?.title || "Untitled Category",
        })),
      );
      if (
        bookingsRes.status === "rejected" &&
        activitiesRes.status === "rejected" &&
        categoriesRes.status === "rejected"
      )
        throw bookingsRes.reason || new Error("Failed to load bookings.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load bookings.");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(
      (item) => normalizeUpper(item.bookingStatus) === "PENDING",
    ).length;
    const confirmed = bookings.filter(
      (item) => normalizeUpper(item.bookingStatus) === "CONFIRMED",
    ).length;
    const paid = bookings.filter(
      (item) => normalizeUpper(item.paymentStatus) === "PAID",
    ).length;
    const cancellationRequests = bookings.filter(
      (item) => normalizeUpper(item.cancellationStatus, "NONE") === "REQUESTED",
    ).length;
    return { total, pending, confirmed, paid, cancellationRequests };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((item) => {
      const matchesSearch =
        !q ||
        [
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
          item.paymentMethod,
          item.paymentGateway,
          item.attendanceStatus,
          item.source,
          item.cancellationStatus,
          item.cancellationReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesStatus =
        !statusFilter ||
        normalizeUpper(item.bookingStatus) === normalizeUpper(statusFilter);
      const matchesPayment =
        !paymentFilter ||
        normalizeUpper(item.paymentStatus) === normalizeUpper(paymentFilter);
      const matchesCancellation =
        !cancellationFilter ||
        normalizeUpper(item.cancellationStatus, "NONE") ===
          normalizeUpper(cancellationFilter);
      const matchesCategory =
        !categoryFilter ||
        String(item.categoryName).toLowerCase() ===
          String(categoryFilter).toLowerCase();
      const matchesActivity =
        !activityFilter ||
        String(item.activityName).toLowerCase() ===
          String(activityFilter).toLowerCase();
      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesCancellation &&
        matchesCategory &&
        matchesActivity
      );
    });
  }, [
    bookings,
    search,
    statusFilter,
    paymentFilter,
    cancellationFilter,
    categoryFilter,
    activityFilter,
  ]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    bookings.forEach(
      (item) =>
        item.categoryName &&
        item.categoryName !== "N/A" &&
        set.add(item.categoryName),
    );
    categories.forEach(
      (item) => item.name && item.name !== "N/A" && set.add(item.name),
    );
    return [...set].sort();
  }, [bookings, categories]);

  const uniqueActivities = useMemo(() => {
    const set = new Set();
    bookings.forEach(
      (item) =>
        item.activityName &&
        item.activityName !== "N/A" &&
        set.add(item.activityName),
    );
    activities.forEach(
      (item) => item.name && item.name !== "N/A" && set.add(item.name),
    );
    return [...set].sort();
  }, [bookings, activities]);

  function openEditModal(booking) {
    setEditBooking(booking);
    setEditForm({
      bookingStatus: normalizeUpper(booking.bookingStatus, "PENDING"),
      paymentStatus: normalizeUpper(booking.paymentStatus, "PENDING"),
      attendanceStatus: normalizeUpper(booking.attendanceStatus, "PENDING"),
      cancellationStatus: normalizeUpper(booking.cancellationStatus, "NONE"),
      cancellationAdminNote: booking.cancellationAdminNote || "",
      notes: booking.notes || "",
    });
  }

  function updateEditForm(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitEdit(e) {
    e.preventDefault();
    const bookingId = normalizeId(editBooking?.dbId || editBooking?.id);
    if (!bookingId || bookingId.startsWith("booking-")) {
      setError(
        "Cannot update this booking because it has no valid database ID.",
      );
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        bookingStatus: normalizeUpper(editForm.bookingStatus, "PENDING"),
        paymentStatus: normalizeUpper(editForm.paymentStatus, "PENDING"),
        attendanceStatus: normalizeUpper(editForm.attendanceStatus, "PENDING"),
        cancellationStatus: normalizeUpper(editForm.cancellationStatus, "NONE"),
        cancellationRequested:
          normalizeUpper(editForm.cancellationStatus, "NONE") === "REQUESTED",
        cancellationAdminNote: editForm.cancellationAdminNote || "",
        notes: editForm.notes || "",
      };
      const { data } = await api.put(
        `/academy/bookings/${encodeURIComponent(bookingId)}`,
        payload,
      );
      setMessage(data?.message || "Booking updated successfully.");
      setEditBooking(null);
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update booking.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEmailModal(booking) {
    if (!booking?.parentEmail) {
      setError("This booking does not have a parent email address.");
      setMessage("");
      return;
    }
    const subject = `Booking update - ${booking.bookingNo}`;
    const messageText = `Hello ${booking.parentName},\n\nThis is an update regarding your KidGage booking.\n\nBooking No: ${booking.bookingNo}\nChild: ${booking.childName}\nActivity: ${booking.activityName}\nPackage: ${booking.packageName}\nBooking Status: ${booking.bookingStatus}\nPayment Status: ${booking.paymentStatus}\nCancellation Status: ${booking.cancellationStatus}\nAmount: ${money(booking.finalAmount, booking.currency)}\n\nThank you,\n${academyName}`;
    setError("");
    setMessage("");
    setEmailBooking(booking);
    setEmailForm({
      to: booking.parentEmail || "",
      subject,
      message: messageText,
    });
  }

  function updateEmailForm(key, value) {
    setEmailForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitEmail(e) {
    e.preventDefault();
    const bookingId = normalizeId(emailBooking?.dbId || emailBooking?.id);
    if (!bookingId || bookingId.startsWith("booking-")) {
      setError(
        "Cannot send email because this booking has no valid database ID.",
      );
      return;
    }
    if (
      !emailForm.to.trim() ||
      !emailForm.subject.trim() ||
      !emailForm.message.trim()
    ) {
      setError("Recipient email, subject, and message are required.");
      return;
    }
    try {
      setSendingEmail(true);
      setError("");
      setMessage("");
      await api.post(
        `/academy/bookings/${encodeURIComponent(bookingId)}/send-email`,
        {
          to: emailForm.to.trim(),
          subject: emailForm.subject.trim(),
          message: emailForm.message.trim(),
        },
      );
      setMessage("Email sent successfully.");
      setEmailBooking(null);
      setEmailForm(initialEmailForm);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to send email.",
      );
    } finally {
      setSendingEmail(false);
    }
  }

  function openDeleteDialog(booking) {
    setDeleteState({
      open: true,
      id: booking.dbId || booking.id,
      bookingNo: booking.bookingNo,
    });
  }

  function closeDeleteDialog() {
    setDeleteState({ open: false, id: "", bookingNo: "" });
  }

  async function confirmDelete() {
    const bookingId = normalizeId(deleteState.id);
    if (!bookingId || bookingId.startsWith("booking-")) {
      setError(
        "Cannot delete this booking because it does not have a valid database ID.",
      );
      closeDeleteDialog();
      return;
    }
    try {
      setDeleting(true);
      setError("");
      setMessage("");
      await api.delete(`/academy/bookings/${encodeURIComponent(bookingId)}`);
      setBookings((prev) =>
        prev.filter(
          (booking) => String(booking.dbId || booking.id) !== String(bookingId),
        ),
      );
      setMessage("Booking deleted successfully from database.");
      closeDeleteDialog();
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete booking from database.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmCashPayment(booking) {
    const paymentId = normalizeId(
      booking?.paymentId || booking?.paymentDetails?.id,
    );
    if (!paymentId) {
      setError("Cannot confirm cash payment because payment ID is missing.");
      setMessage("");
      return;
    }
    try {
      setPaymentActionLoading(true);
      setError("");
      setMessage("");
      const { data } = await api.patch(
        `/payments/${encodeURIComponent(paymentId)}/confirm-cash`,
        {
          notes: `Cash payment confirmed by ${academyName}`,
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
      setPaymentActionLoading(false);
    }
  }

  async function syncOnlinePayment(booking) {
    const paymentId = normalizeId(
      booking?.paymentId || booking?.paymentDetails?.id,
    );
    const bookingId = normalizeId(booking?.dbId || booking?.id);
    if (!paymentId && !bookingId) {
      setError(
        "Cannot refresh online payment because payment or booking ID is missing.",
      );
      setMessage("");
      return;
    }
    try {
      setPaymentActionLoading(true);
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
          "Failed to refresh payment status.",
      );
    } finally {
      setPaymentActionLoading(false);
    }
  }

  function exportBookingsCsv() {
    const header = [
      "Booking No",
      "Parent",
      "Email",
      "Phone",
      "Child",
      "Activity",
      "Package",
      "Sessions",
      "Booking Status",
      "Payment Status",
      "Payment Method",
      "Cancellation Status",
      "Amount",
      "Currency",
      "Created",
    ];
    const rows = filteredBookings.map((booking) => [
      booking.bookingNo,
      booking.parentName,
      booking.parentEmail,
      booking.parentPhone,
      booking.childName,
      booking.activityName,
      booking.packageName,
      booking.sessions,
      booking.bookingStatus,
      booking.paymentStatus,
      booking.paymentMethod,
      booking.cancellationStatus,
      booking.finalAmount,
      booking.currency,
      formatDateTime(booking.createdAt),
    ]);
    downloadCsv(
      `kidgage_bookings_${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows],
    );
  }

  function openQuickAction(booking, type) {
    const bookingId = normalizeId(booking?.dbId || booking?.id);
    if (!bookingId || bookingId.startsWith("booking-")) {
      setError(
        "Cannot update this booking because it has no valid database ID.",
      );
      setMessage("");
      return;
    }
    const actions = {
      confirm: {
        title: "Confirm Booking",
        message: `Confirm booking "${booking.bookingNo}"?`,
        confirmText: "Confirm Booking",
        danger: false,
        payload: {
          bookingStatus: "CONFIRMED",
          paymentStatus: booking.paymentStatus || "PENDING",
          attendanceStatus: booking.attendanceStatus || "PENDING",
          notes: booking.notes || "",
        },
      },
      markPaid: {
        title: "Mark Payment as Paid",
        message: `Mark payment as PAID and confirm booking "${booking.bookingNo}"? This will sync the booking status only. Use Confirm Cash for cash settlement sync when payment ID exists.`,
        confirmText: "Mark Paid",
        danger: false,
        payload: {
          bookingStatus: "CONFIRMED",
          paymentStatus: "PAID",
          attendanceStatus: booking.attendanceStatus || "PENDING",
          notes: booking.notes || "",
        },
      },
      cancel: {
        title: "Cancel Booking",
        message: `Cancel booking "${booking.bookingNo}"? Pending payments will be cancelled too.`,
        confirmText: "Cancel Booking",
        danger: true,
        payload: {
          bookingStatus: "CANCELLED",
          paymentStatus:
            normalizeUpper(booking.paymentStatus) === "PAID"
              ? "PAID"
              : "CANCELLED",
          attendanceStatus: booking.attendanceStatus || "PENDING",
          notes: booking.notes || "",
        },
      },
      approveCancellation: {
        title: "Approve Cancellation Request",
        message: `Approve parent cancellation request for "${booking.bookingNo}"? The booking will be cancelled.`,
        confirmText: "Approve Request",
        danger: true,
        payload: {
          bookingStatus: "CANCELLED",
          paymentStatus:
            normalizeUpper(booking.paymentStatus) === "PAID"
              ? "PAID"
              : "CANCELLED",
          attendanceStatus: booking.attendanceStatus || "PENDING",
          cancellationStatus: "APPROVED",
          cancellationRequested: false,
          cancellationAdminNote: "Cancellation request approved by academy.",
          notes: booking.notes || "",
        },
      },
      rejectCancellation: {
        title: "Reject Cancellation Request",
        message: `Reject parent cancellation request for "${booking.bookingNo}"? The booking will remain active.`,
        confirmText: "Reject Request",
        danger: false,
        payload: {
          bookingStatus: booking.bookingStatus || "PENDING",
          paymentStatus: booking.paymentStatus || "PENDING",
          attendanceStatus: booking.attendanceStatus || "PENDING",
          cancellationStatus: "REJECTED",
          cancellationRequested: false,
          cancellationAdminNote: "Cancellation request rejected by academy.",
          notes: booking.notes || "",
        },
      },
    };
    const action = actions[type];
    if (!action) return;
    setQuickAction({
      open: true,
      type,
      id: bookingId,
      bookingNo: booking.bookingNo,
      ...action,
    });
  }

  function closeQuickAction() {
    setQuickAction({
      open: false,
      type: "",
      id: "",
      bookingNo: "",
      title: "",
      message: "",
      confirmText: "",
      danger: false,
      payload: null,
    });
  }

  async function confirmQuickAction() {
    const bookingId = normalizeId(quickAction.id);
    if (!bookingId || !quickAction.payload) {
      setError("Invalid quick action request.");
      closeQuickAction();
      return;
    }
    try {
      setQuickActionLoading(true);
      setError("");
      setMessage("");
      const { data } = await api.put(
        `/academy/bookings/${encodeURIComponent(bookingId)}`,
        quickAction.payload,
      );
      const actionMessage =
        data?.message ||
        (quickAction.type === "markPaid"
          ? "Payment marked as paid successfully."
          : quickAction.type === "cancel"
            ? "Booking cancelled successfully."
            : quickAction.type === "approveCancellation"
              ? "Cancellation request approved successfully."
              : quickAction.type === "rejectCancellation"
                ? "Cancellation request rejected successfully."
                : "Booking confirmed successfully.");
      setMessage(actionMessage);
      closeQuickAction();
      setViewBooking(null);
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update booking.",
      );
    } finally {
      setQuickActionLoading(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPaymentFilter("");
    setCancellationFilter("");
    setCategoryFilter("");
    setActivityFilter("");
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#fff8f4] px-3 py-4 text-slate-950 sm:px-4 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[26px] border border-orange-100 bg-gradient-to-br from-white via-orange-50/80 to-blue-50 p-4 shadow-sm sm:rounded-[32px] sm:p-6 lg:rounded-[36px]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">KidGage Booking Management</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              Booking Enquiries
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              View, edit, filter, manage payments, and review parent
              cancellation requests for {academyName}.
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={ClipboardList}
            label="Total"
            value={loading ? "..." : stats.total}
            color="text-[#ff7a3d]"
            bg="bg-orange-50"
          />
          <StatCard
            icon={AlertCircle}
            label="Pending"
            value={loading ? "..." : stats.pending}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            icon={CalendarDays}
            label="Confirmed"
            value={loading ? "..." : stats.confirmed}
            color="text-[#1877f2]"
            bg="bg-blue-50"
          />
          <StatCard
            icon={CreditCard}
            label="Paid"
            value={loading ? "..." : stats.paid}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <StatCard
            icon={MessageSquareText}
            label="Cancel Requests"
            value={loading ? "..." : stats.cancellationRequests}
            color="text-violet-600"
            bg="bg-violet-50"
          />
        </div>
      </section>

      {message ? <AlertBox type="success" message={message} /> : null}
      {error ? <AlertBox type="error" message={error} /> : null}

      <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[34px] sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
            <Filter className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">
              Search bookings by parent, child, activity, category, status,
              payment, or cancellation.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(260px,1fr)_180px_180px_200px_220px_240px_auto]">
          <div className="relative md:col-span-2 xl:col-span-3 2xl:col-span-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookings..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </div>
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
          <button
            type="button"
            onClick={clearFilters}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-orange-50 hover:text-[#ff7a3d]"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[34px] sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-950 sm:text-2xl">
              All Booking Enquiries
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredBookings.length} of {bookings.length} records.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ff7a3d] ring-1 ring-orange-100">
            <ShieldCheck className="h-4 w-4" />
            KidGage Records
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[26px] bg-slate-100"
              />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState text="No booking enquiries found." />
        ) : (
          <>
            <DesktopBookingsTable
              bookings={filteredBookings}
              onView={setViewBooking}
              onEdit={openEditModal}
              onEmail={openEmailModal}
              onDelete={openDeleteDialog}
              onQuickAction={openQuickAction}
              onConfirmCash={confirmCashPayment}
              onSyncOnlinePayment={syncOnlinePayment}
              paymentActionLoading={paymentActionLoading}
            />
            <MobileBookingsList
              bookings={filteredBookings}
              onView={setViewBooking}
              onEdit={openEditModal}
              onEmail={openEmailModal}
              onDelete={openDeleteDialog}
              onQuickAction={openQuickAction}
              onConfirmCash={confirmCashPayment}
              onSyncOnlinePayment={syncOnlinePayment}
              paymentActionLoading={paymentActionLoading}
            />
          </>
        )}
      </section>

      <BookingViewModal
        open={Boolean(viewBooking)}
        booking={viewBooking}
        onClose={() => setViewBooking(null)}
        onApproveCancel={(booking) =>
          openQuickAction(booking, "approveCancellation")
        }
        onRejectCancel={(booking) =>
          openQuickAction(booking, "rejectCancellation")
        }
        onConfirmCash={confirmCashPayment}
        onSyncOnlinePayment={syncOnlinePayment}
        paymentActionLoading={paymentActionLoading}
      />
      <BookingEditModal
        open={Boolean(editBooking)}
        booking={editBooking}
        form={editForm}
        saving={saving}
        onChange={updateEditForm}
        onClose={() => setEditBooking(null)}
        onSubmit={submitEdit}
      />
      <BookingEmailModal
        open={Boolean(emailBooking)}
        booking={emailBooking}
        form={emailForm}
        sending={sendingEmail}
        onChange={updateEmailForm}
        onClose={() => setEmailBooking(null)}
        onSubmit={submitEmail}
      />
      <ConfirmDialog
        open={quickAction.open}
        title={quickAction.title}
        message={quickAction.message}
        confirmText={quickAction.confirmText}
        danger={quickAction.danger}
        loading={quickActionLoading}
        onConfirm={confirmQuickAction}
        onCancel={closeQuickAction}
      />
      <ConfirmDialog
        open={deleteState.open}
        title="Delete Booking"
        message={`Are you sure you want to delete "${deleteState.bookingNo}"? This will delete the booking from the database.`}
        confirmText="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}

function DesktopBookingsTable({
  bookings,
  onView,
  onEdit,
  onEmail,
  onDelete,
  onQuickAction,
  onConfirmCash,
  onSyncOnlinePayment,
  paymentActionLoading,
}) {
  return (
    <div className="hidden w-full overflow-x-auto xl:block">
      <table className="w-full min-w-[1700px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <TableHead>Booking</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Child</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Package</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cancellation</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Actions</TableHead>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr
              key={booking.id}
              className="border-b border-slate-100 last:border-b-0 hover:bg-orange-50/25"
            >
              <td className="py-5 pr-5 align-top">
                <div className="text-sm font-black text-slate-950">
                  {booking.bookingNo}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(booking.createdAt)}
                </div>
                <div className="mt-2">
                  <StatusBadge value={booking.source} />
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="text-sm font-black text-slate-950">
                  {booking.parentName}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  {booking.parentEmail ? (
                    <InfoLine icon={Mail} text={booking.parentEmail} orange />
                  ) : null}
                  {booking.parentPhone ? (
                    <InfoLine icon={Phone} text={booking.parentPhone} blue />
                  ) : null}
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="inline-flex max-w-[190px] items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-[#ff7a3d] ring-1 ring-orange-100">
                  <Baby className="h-4 w-4 shrink-0" />
                  <span className="truncate">{booking.childName}</span>
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="max-w-[220px] text-sm font-black text-slate-950">
                  {booking.activityName}
                </div>
                <div className="mt-2 inline-flex max-w-[220px] items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#1877f2]" />
                  <span className="truncate">{booking.categoryName}</span>
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="max-w-[190px] text-sm font-black text-slate-950">
                  {booking.packageName}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {booking.sessions || 0} sessions · {booking.bookingMode}
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <StatusBadge value={booking.bookingStatus} />
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="space-y-2">
                  <StatusBadge value={booking.cancellationStatus} />
                  {booking.cancellationRequestedAt ? (
                    <div className="text-xs text-slate-500">
                      {formatDateTime(booking.cancellationRequestedAt)}
                    </div>
                  ) : null}
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="space-y-2">
                  <StatusBadge value={booking.paymentStatus} />
                  <StatusBadge value={booking.paymentMethod} />
                </div>
              </td>
              <td className="py-5 pr-5 align-top">
                <div className="text-sm font-black text-slate-950">
                  {money(booking.finalAmount, booking.currency)}
                </div>
              </td>
              <td className="py-5 align-top">
                <BookingActionButtons
                  booking={booking}
                  onView={onView}
                  onEdit={onEdit}
                  onEmail={onEmail}
                  onDelete={onDelete}
                  onQuickAction={onQuickAction}
                  onConfirmCash={onConfirmCash}
                  onSyncOnlinePayment={onSyncOnlinePayment}
                  paymentActionLoading={paymentActionLoading}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="pb-4 pr-5 text-sm font-black text-slate-500">{children}</th>
  );
}

function InfoLine({ icon: Icon, text, orange = false, blue = false }) {
  return (
    <div className="flex max-w-[240px] items-center gap-1.5">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${orange ? "text-[#ff7a3d]" : blue ? "text-[#1877f2]" : "text-slate-400"}`}
      />
      <span className="truncate">{text}</span>
    </div>
  );
}

function MobileBookingsList({
  bookings,
  onView,
  onEdit,
  onEmail,
  onDelete,
  onQuickAction,
  onConfirmCash,
  onSyncOnlinePayment,
  paymentActionLoading,
}) {
  return (
    <div className="grid gap-4 xl:hidden">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="break-words text-base font-black text-slate-950">
                {booking.bookingNo}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {formatDateTime(booking.createdAt)}
              </div>
            </div>
            <div className="shrink-0">
              <StatusBadge value={booking.bookingStatus} />
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <MobileTile
              label="Activity"
              value={booking.activityName}
              tone="orange"
            />
            <MobileTile
              label="Parent / Child"
              value={`${booking.parentName} · ${booking.childName}`}
              tone="blue"
            />
            {normalizeUpper(booking.cancellationStatus, "NONE") !== "NONE" ? (
              <MobileTile
                label="Cancellation"
                value={`${booking.cancellationStatus}${booking.cancellationReason ? ` · ${booking.cancellationReason}` : ""}`}
                tone="amber"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={booking.paymentStatus} />
              <StatusBadge value={booking.paymentMethod} />
              <StatusBadge value={booking.source} />
              <StatusBadge value={booking.cancellationStatus} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {money(booking.finalAmount, booking.currency)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <BookingActionButtons
              booking={booking}
              onView={onView}
              onEdit={onEdit}
              onEmail={onEmail}
              onDelete={onDelete}
              onQuickAction={onQuickAction}
              onConfirmCash={onConfirmCash}
              onSyncOnlinePayment={onSyncOnlinePayment}
              paymentActionLoading={paymentActionLoading}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileTile({ label, value, tone = "slate" }) {
  const tones = {
    orange: "bg-orange-50/45",
    blue: "bg-blue-50/45",
    amber: "bg-amber-50/70",
    slate: "bg-slate-50",
  };
  return (
    <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function BookingActionButtons({
  booking,
  onView,
  onEdit,
  onEmail,
  onDelete,
  onQuickAction,
  onConfirmCash,
  onSyncOnlinePayment,
  paymentActionLoading = false,
  compact = false,
}) {
  const cancellationRequested =
    normalizeUpper(booking.cancellationStatus, "NONE") === "REQUESTED";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <IconButton title="View" onClick={() => onView(booking)}>
          <Eye className="h-5 w-5" />
        </IconButton>
        <IconButton
          title="Confirm Booking"
          variant="green"
          disabled={normalizeUpper(booking.bookingStatus) === "CONFIRMED"}
          onClick={() => onQuickAction(booking, "confirm")}
        >
          <CheckCircle2 className="h-5 w-5" />
        </IconButton>
        <IconButton
          title="Mark Payment Paid"
          variant="emerald"
          disabled={normalizeUpper(booking.paymentStatus) === "PAID"}
          onClick={() => onQuickAction(booking, "markPaid")}
        >
          <CreditCard className="h-5 w-5" />
        </IconButton>
        {canConfirmCashPayment(booking) ? (
          <IconButton
            title="Confirm Cash Payment"
            variant="orange"
            disabled={paymentActionLoading}
            onClick={() => onConfirmCash(booking)}
          >
            <Wallet className="h-5 w-5" />
          </IconButton>
        ) : null}
        {canSyncOnlinePayment(booking) ? (
          <IconButton
            title="Refresh Online Payment"
            variant="blue"
            disabled={paymentActionLoading}
            onClick={() => onSyncOnlinePayment(booking)}
          >
            <RefreshCw
              className={`h-5 w-5 ${paymentActionLoading ? "animate-spin" : ""}`}
            />
          </IconButton>
        ) : null}
        <IconButton
          title="Cancel Booking"
          variant="red"
          disabled={normalizeUpper(booking.bookingStatus) === "CANCELLED"}
          onClick={() => onQuickAction(booking, "cancel")}
        >
          <XCircle className="h-5 w-5" />
        </IconButton>
        {cancellationRequested ? (
          <>
            <IconButton
              title="Approve Cancellation Request"
              variant="green"
              onClick={() => onQuickAction(booking, "approveCancellation")}
            >
              <CheckCircle2 className="h-5 w-5" />
            </IconButton>
            <IconButton
              title="Reject Cancellation Request"
              variant="red"
              onClick={() => onQuickAction(booking, "rejectCancellation")}
            >
              <XCircle className="h-5 w-5" />
            </IconButton>
          </>
        ) : null}
        <IconButton title="Edit" variant="blue" onClick={() => onEdit(booking)}>
          <Pencil className="h-5 w-5" />
        </IconButton>
        <IconButton
          title={booking.parentEmail ? "Send Email" : "No parent email"}
          variant="orange"
          disabled={!booking.parentEmail}
          onClick={() => onEmail(booking)}
        >
          <Mail className="h-5 w-5" />
        </IconButton>
        <IconButton
          title="Delete"
          variant="red"
          onClick={() => onDelete(booking)}
        >
          <Trash2 className="h-5 w-5" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:flex-wrap">
      <ActionTextButton
        icon={Eye}
        label="View"
        onClick={() => onView(booking)}
      />
      <ActionTextButton
        icon={Pencil}
        label="Edit"
        color="blue"
        onClick={() => onEdit(booking)}
      />
      <ActionTextButton
        icon={CheckCircle2}
        label="Confirm"
        color="green"
        disabled={normalizeUpper(booking.bookingStatus) === "CONFIRMED"}
        onClick={() => onQuickAction(booking, "confirm")}
      />
      <ActionTextButton
        icon={CreditCard}
        label="Paid"
        color="green"
        disabled={normalizeUpper(booking.paymentStatus) === "PAID"}
        onClick={() => onQuickAction(booking, "markPaid")}
      />
      {canConfirmCashPayment(booking) ? (
        <ActionTextButton
          icon={Wallet}
          label="Confirm Cash"
          color="orange"
          disabled={paymentActionLoading}
          onClick={() => onConfirmCash(booking)}
        />
      ) : null}
      {canSyncOnlinePayment(booking) ? (
        <ActionTextButton
          icon={RefreshCw}
          label="Sync Pay"
          color="blue"
          disabled={paymentActionLoading}
          onClick={() => onSyncOnlinePayment(booking)}
        />
      ) : null}
      <ActionTextButton
        icon={XCircle}
        label="Cancel"
        color="red"
        disabled={normalizeUpper(booking.bookingStatus) === "CANCELLED"}
        onClick={() => onQuickAction(booking, "cancel")}
      />
      {cancellationRequested ? (
        <>
          <ActionTextButton
            icon={CheckCircle2}
            label="Approve Cancel"
            color="green"
            onClick={() => onQuickAction(booking, "approveCancellation")}
          />
          <ActionTextButton
            icon={XCircle}
            label="Reject Cancel"
            color="red"
            onClick={() => onQuickAction(booking, "rejectCancellation")}
          />
        </>
      ) : null}
      <ActionTextButton
        icon={Mail}
        label="Email"
        color="orange"
        disabled={!booking.parentEmail}
        onClick={() => onEmail(booking)}
      />
      <ActionTextButton
        icon={Trash2}
        label="Delete"
        color="red"
        onClick={() => onDelete(booking)}
      />
    </div>
  );
}

function ActionTextButton({
  icon: Icon,
  label,
  onClick,
  color = "slate",
  disabled = false,
}) {
  const classes = {
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    blue: "bg-blue-50 text-[#1877f2] hover:bg-blue-100",
    orange: "bg-orange-50 text-[#ff7a3d] hover:bg-orange-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 ${classes[color] || classes.slate}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="rounded-[22px] border border-white bg-white/90 p-4 shadow-sm backdrop-blur sm:rounded-[24px]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${bg} ${color}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="truncate text-2xl font-black text-slate-950">
            {value}
          </div>
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
    blue: "bg-blue-50 text-[#1877f2] hover:bg-blue-100",
    orange: "bg-orange-50 text-[#ff7a3d] hover:bg-orange-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[variant] || classes.slate}`}
    >
      {children}
    </button>
  );
}

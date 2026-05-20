// client/src/pages/parent/ParentBookingHistory.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Baby,
  Building2,
  BookOpen,
  PackageCheck,
  Eye,
  X,
  ReceiptText,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Send,
  MessageSquareText,
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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function shortId(value) {
  const id = normalizeId(value);
  if (!id) return "N/A";
  return id.length > 10 ? id.slice(-8).toUpperCase() : id.toUpperCase();
}

function normalizeUpper(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();
  return text || fallback;
}

function normalizeSession(session, index = 0) {
  const slot =
    session?.slotId && typeof session.slotId === "object"
      ? session.slotId
      : session;

  return {
    id: normalizeId(
      slot?._id || slot?.id || session?.slotId || `session-${index + 1}`,
    ),
    sessionLabel:
      session?.sessionLabel || slot?.sessionLabel || `Session ${index + 1}`,
    sessionNo: Number(session?.sessionNo || index + 1),
    date:
      session?.date ||
      session?.slotDate ||
      slot?.date ||
      slot?.slotDate ||
      null,
    startTime: session?.startTime || slot?.startTime || "",
    endTime: session?.endTime || slot?.endTime || "",
    status:
      session?.status ||
      session?.sessionStatus ||
      session?.attendanceStatus ||
      "BOOKED",
  };
}

function getSessions(item) {
  const direct = toArray(
    item?.selectedSessions || item?.sessionsList || item?.sessionItems,
  );
  if (direct.length) return direct.map(normalizeSession);

  const booked = toArray(item?.bookedSlotItems);
  if (booked.length) return booked.map(normalizeSession);

  const slots = toArray(item?.slotIds);
  if (slots.length) return slots.map(normalizeSession);

  return [];
}

function buildPaymentUrl(item) {
  const bookingId = normalizeId(item?._id || item?.id || item?.bookingId);
  const paymentId = normalizeId(
    item?.paymentId || item?.payment?._id || item?.payment?.id,
  );

  if (!bookingId) return item?.checkoutUrl || "";

  const query = new URLSearchParams();
  if (paymentId) query.set("paymentId", paymentId);

  const qs = query.toString();
  return `/payment/myfatoorah/${bookingId}${qs ? `?${qs}` : ""}`;
}

function normalizeHistoryItem(item, index) {
  const payment = item?.payment || item?.paymentDetails || null;
  const sessions = getSessions(item);

  return {
    raw: item,
    payment,

    id: normalizeId(item?._id || item?.id || `history-${index + 1}`),

    bookingNo:
      item?.bookingNo ||
      item?.referenceNo ||
      item?.invoiceNo ||
      item?._id ||
      "N/A",

    academyName:
      item?.academyName ||
      item?.academyId?.name ||
      item?.academy?.name ||
      "Academy",

    academyCity:
      item?.academyCity || item?.academyId?.city || item?.academy?.city || "",

    childName:
      item?.childName ||
      item?.childId?.fullName ||
      item?.childId?.name ||
      "N/A",

    activityName:
      item?.activityName ||
      item?.activityId?.title ||
      item?.activityId?.name ||
      "Activity",

    packageName:
      item?.packageName ||
      item?.packageId?.title ||
      item?.package?.title ||
      "Package",

    sessions: toNumber(item?.sessions || sessions.length, 0),
    selectedSessions: sessions,
    bookingMode: item?.bookingMode || "N/A",

    bookingStatus: normalizeUpper(item?.bookingStatus, "PENDING"),
    paymentStatus: normalizeUpper(item?.paymentStatus, "PENDING"),
    paymentMethod: normalizeUpper(item?.paymentMethod, "N/A"),
    paymentGateway: normalizeUpper(item?.paymentGateway, "N/A"),

    cancellationRequested: Boolean(item?.cancellationRequested),
    cancellationStatus: normalizeUpper(item?.cancellationStatus, "NONE"),
    cancellationReason: item?.cancellationReason || "",
    cancellationRequestedAt: item?.cancellationRequestedAt || null,
    cancellationAdminNote: item?.cancellationAdminNote || "",
    hasCancellationRequest: Boolean(
      item?.hasCancellationRequest ||
      item?.cancellationRequested ||
      normalizeUpper(item?.cancellationStatus, "NONE") === "REQUESTED",
    ),

    amount: toNumber(item?.amount, 0),
    currency: String(item?.currency || "QAR").toUpperCase(),

    paymentId: normalizeId(
      item?.paymentId || payment?._id || payment?.id || "",
    ),

    paymentReference:
      item?.paymentReference ||
      payment?.gatewayPaymentId ||
      payment?.gatewayOrderId ||
      payment?.gatewayReference ||
      "",

    checkoutUrl:
      item?.paymentPage ||
      item?.paymentUrl ||
      item?.checkoutUrl ||
      payment?.gatewayCheckoutUrl ||
      item?.gatewayCheckoutUrl ||
      buildPaymentUrl({ ...item, payment }) ||
      "",

    firstSessionDate:
      item?.firstSessionDate ||
      sessions[0]?.date ||
      sessions[0]?.slotDate ||
      null,

    lastSessionDate:
      item?.lastSessionDate ||
      sessions[sessions.length - 1]?.date ||
      sessions[sessions.length - 1]?.slotDate ||
      null,

    paidAt: item?.paidAt || payment?.paidAt || null,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    notes: item?.notes || "",
  };
}

function canRequestCancel(item) {
  if (!item) return false;

  if (
    ["CANCELLED", "CANCELED", "COMPLETED", "NO_SHOW"].includes(
      item.bookingStatus,
    )
  ) {
    return false;
  }

  if (["REQUESTED", "APPROVED"].includes(item.cancellationStatus)) return false;
  if (item.paymentStatus === "REFUNDED") return false;

  return true;
}

function canSyncPayment(item) {
  if (!item) return false;

  return (
    item.paymentStatus === "PENDING" &&
    item.paymentMethod === "ONLINE" &&
    (Boolean(item.paymentId) || Boolean(item.id))
  );
}

function StatusBadge({ value }) {
  const text = normalizeUpper(value, "N/A");

  const classes = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",

    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    REQUESTED: "bg-amber-50 text-amber-700 ring-amber-200",

    FAILED: "bg-red-50 text-red-700 ring-red-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",

    REFUNDED: "bg-violet-50 text-violet-700 ring-violet-200",
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",

    CASH: "bg-orange-50 text-[#ff7a3d] ring-orange-200",
    ONLINE: "bg-blue-50 text-blue-700 ring-blue-200",
    MANUAL: "bg-slate-100 text-slate-700 ring-slate-200",
    MYFATOORAH: "bg-blue-50 text-blue-700 ring-blue-200",
    NONE: "bg-slate-100 text-slate-700 ring-slate-200",
    N_A: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  const key = text === "N/A" ? "N_A" : text;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ring-1 ${
        classes[key] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      <span className="truncate">{text.replaceAll("_", " ")}</span>
    </span>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-[24px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
            {title}
          </div>

          <div className="mt-3 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-1 truncate text-xs font-medium text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[tone] || tones.orange
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <ReceiptText className="h-6 w-6" />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function DetailTile({ label, value, className = "" }) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-4 ${className}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-900">
        {value || "N/A"}
      </div>
    </div>
  );
}

function SessionsPanel({ sessions }) {
  if (!sessions?.length) return null;

  return (
    <div className="rounded-2xl bg-orange-50/60 p-4 sm:col-span-2 lg:col-span-3">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
        <PackageCheck className="h-4 w-4" />
        Selected Sessions
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {sessions.map((session, index) => (
          <div
            key={session.id || index}
            className="rounded-2xl bg-white p-3 ring-1 ring-orange-100"
          >
            <div className="text-sm font-black text-slate-900">
              {session.sessionLabel || `Session ${index + 1}`}
            </div>

            <div className="mt-1 text-xs font-semibold text-slate-500">
              {formatDate(session.date || session.slotDate)}
              {session.startTime || session.endTime
                ? ` · ${session.startTime || ""}${
                    session.endTime ? ` - ${session.endTime}` : ""
                  }`
                : ""}
            </div>

            <div className="mt-2">
              <StatusBadge value={session.status || "BOOKED"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingDetailsModal({
  open,
  item,
  onClose,
  onCancelRequest,
  onSyncPayment,
  actionSaving,
}) {
  if (!open || !item) return null;

  const rows = [
    ["Booking No", item.bookingNo],
    ["Booking ID", item.id],
    ["Academy", item.academyName],
    ["City", item.academyCity || "N/A"],
    ["Child", item.childName],
    ["Activity", item.activityName],
    ["Package", item.packageName],
    ["Sessions", item.sessions || "N/A"],
    ["Booking Mode", item.bookingMode],
    ["Booking Status", item.bookingStatus],
    ["Payment Status", item.paymentStatus],
    ["Payment Method", item.paymentMethod],
    ["Payment Gateway", item.paymentGateway],
    ["Payment ID", item.paymentId || "N/A"],
    ["Payment Reference", item.paymentReference || "N/A"],
    ["Amount", money(item.amount, item.currency)],
    ["Created", formatDateTime(item.createdAt)],
    ["Paid At", formatDateTime(item.paidAt)],
    ["First Session", formatDate(item.firstSessionDate)],
    ["Last Session", formatDate(item.lastSessionDate)],
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-orange-50/50 to-blue-50 px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                <ReceiptText className="h-3.5 w-3.5" />
                Booking Receipt
              </div>

              <h3 className="mt-3 break-words text-2xl font-black text-slate-900 sm:text-3xl">
                {item.bookingNo}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge value={item.bookingStatus} />
                <StatusBadge value={item.paymentStatus} />
                <StatusBadge value={item.paymentMethod} />
                {item.cancellationStatus !== "NONE" ? (
                  <StatusBadge
                    value={`Cancellation ${item.cancellationStatus}`}
                  />
                ) : null}
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

        <div className="grid gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <DetailTile key={label} label={label} value={value} />
          ))}

          <SessionsPanel sessions={item.selectedSessions} />

          {item.cancellationStatus !== "NONE" || item.cancellationReason ? (
            <div className="rounded-2xl bg-amber-50 p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-600">
                Cancellation Request
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge value={item.cancellationStatus} />
                <span className="text-xs font-bold text-amber-700">
                  Requested: {formatDateTime(item.cancellationRequestedAt)}
                </span>
              </div>

              <div className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                {item.cancellationReason || "No reason provided."}
              </div>

              {item.cancellationAdminNote ? (
                <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-semibold text-slate-700 ring-1 ring-amber-100">
                  Admin note: {item.cancellationAdminNote}
                </div>
              ) : null}
            </div>
          ) : null}

          <DetailTile
            label="Notes"
            value={item.notes || "No notes."}
            className="sm:col-span-2 lg:col-span-3"
          />

          {item.checkoutUrl && item.paymentStatus !== "PAID" ? (
            <div className="rounded-2xl bg-blue-50 p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
                Payment Link
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={item.checkoutUrl}
                  className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white transition hover:brightness-95"
                >
                  <ExternalLink className="h-4 w-4" />
                  Continue Payment
                </a>

                {canSyncPayment(item) ? (
                  <button
                    type="button"
                    onClick={() => onSyncPayment(item)}
                    disabled={actionSaving}
                    className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        actionSaving ? "animate-spin" : ""
                      }`}
                    />
                    Refresh Status
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-5 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Close
          </button>

          {canSyncPayment(item) ? (
            <button
              type="button"
              onClick={() => onSyncPayment(item)}
              disabled={actionSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${actionSaving ? "animate-spin" : ""}`}
              />
              Refresh Payment
            </button>
          ) : null}

          {canRequestCancel(item) ? (
            <button
              type="button"
              onClick={() => onCancelRequest(item)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 sm:w-auto"
            >
              <MessageSquareText className="h-4 w-4" />
              Request Cancellation
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CancelRequestModal({
  open,
  item,
  reason,
  saving,
  error,
  onReasonChange,
  onClose,
  onSubmit,
}) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[34px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-700 ring-1 ring-red-100">
              <MessageSquareText className="h-3.5 w-3.5" />
              Cancel Request
            </div>

            <h3 className="mt-3 text-xl font-black text-slate-950">
              Request cancellation
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Submit a cancellation request for{" "}
              <strong>{item.bookingNo}</strong>. The academy will review and
              approve or reject it.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Reason
          </span>

          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={5}
            placeholder="Example: My child is unavailable on the selected dates."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancellationLine({ item }) {
  if (item.cancellationStatus === "NONE") return null;

  return (
    <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
      Cancellation {item.cancellationStatus.toLowerCase().replaceAll("_", " ")}
      {item.cancellationRequestedAt
        ? ` · ${formatDateTime(item.cancellationRequestedAt)}`
        : ""}
    </div>
  );
}

function HistoryCard({
  item,
  onView,
  onCancelRequest,
  onSyncPayment,
  actionSaving,
}) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-lg font-black text-slate-900">
            {item.bookingNo}
          </div>

          <div className="mt-1 text-xs font-medium text-slate-500">
            #{shortId(item.id)} · {formatDateTime(item.createdAt)}
          </div>
        </div>

        <StatusBadge value={item.paymentStatus} />
      </div>

      <CancellationLine item={item} />

      <div className="mt-4 grid gap-3">
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Academy
            </div>
            <div className="mt-1 truncate text-sm font-bold text-slate-900">
              {item.academyName}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-orange-50/60 p-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7a3d]" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
              Activity
            </div>

            <div className="mt-1 truncate text-sm font-bold text-slate-900">
              {item.activityName}
            </div>

            <div className="truncate text-xs text-slate-500">
              {item.packageName}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
              Child
            </div>

            <div className="mt-1 truncate text-sm font-black text-slate-900">
              {item.childName}
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
              Amount
            </div>

            <div className="mt-1 text-sm font-black text-emerald-700">
              {money(item.amount, item.currency)}
            </div>
          </div>
        </div>

        {item.selectedSessions?.length ? (
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Next Session
            </div>

            <div className="mt-1 text-sm font-bold text-slate-900">
              {formatDate(
                item.selectedSessions[0]?.date ||
                  item.selectedSessions[0]?.slotDate,
              )}
              {item.selectedSessions[0]?.startTime
                ? ` · ${item.selectedSessions[0].startTime}`
                : ""}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <StatusBadge value={item.bookingStatus} />
          <StatusBadge value={item.paymentMethod} />
          <StatusBadge value={item.paymentGateway} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onView(item)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <Eye className="h-4 w-4" />
          View Details
        </button>

        {item.checkoutUrl && item.paymentStatus !== "PAID" ? (
          <a
            href={item.checkoutUrl}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
          >
            <CreditCard className="h-4 w-4" />
            Pay Now
          </a>
        ) : canRequestCancel(item) ? (
          <button
            type="button"
            onClick={() => onCancelRequest(item)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
          >
            <MessageSquareText className="h-4 w-4" />
            Cancel Request
          </button>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {item.paymentStatus === "PAID" ? "Paid" : "No Action"}
          </div>
        )}

        {canSyncPayment(item) ? (
          <button
            type="button"
            onClick={() => onSyncPayment(item)}
            disabled={actionSaving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#ff7a3d] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${actionSaving ? "animate-spin" : ""}`}
            />
            Refresh Payment Status
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ParentBookingHistory() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([]);

  const [search, setSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  const loadHistory = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const { data } = await api.get("/parent/history");

      const normalizedRows = toArray(
        data?.bookings || data?.items || data?.history || [],
      ).map(normalizeHistoryItem);

      setRows(normalizedRows);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load booking history.",
      );
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => {
    const total = rows.length;

    const confirmed = rows.filter(
      (item) => item.bookingStatus === "CONFIRMED",
    ).length;

    const paid = rows.filter((item) => item.paymentStatus === "PAID").length;

    const pending = rows.filter(
      (item) => item.paymentStatus === "PENDING",
    ).length;

    const cancelRequests = rows.filter(
      (item) => item.cancellationStatus === "REQUESTED",
    ).length;

    const totalPaidAmount = rows
      .filter((item) => item.paymentStatus === "PAID")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      total,
      confirmed,
      paid,
      pending,
      cancelRequests,
      totalPaidAmount,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.id,
          item.bookingNo,
          item.academyName,
          item.academyCity,
          item.childName,
          item.activityName,
          item.packageName,
          item.bookingStatus,
          item.paymentStatus,
          item.paymentMethod,
          item.paymentGateway,
          item.paymentReference,
          item.cancellationStatus,
          item.cancellationReason,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesBookingStatus =
        !bookingStatusFilter || item.bookingStatus === bookingStatusFilter;

      const matchesPaymentStatus =
        !paymentStatusFilter || item.paymentStatus === paymentStatusFilter;

      return matchesSearch && matchesBookingStatus && matchesPaymentStatus;
    });
  }, [rows, search, bookingStatusFilter, paymentStatusFilter]);

  const hasFilters = Boolean(
    search || bookingStatusFilter || paymentStatusFilter,
  );

  function clearFilters() {
    setSearch("");
    setBookingStatusFilter("");
    setPaymentStatusFilter("");
  }

  function openCancelModal(item) {
    setMessage("");
    setError("");
    setCancelError("");
    setCancelReason("");
    setCancelModalItem(item);
  }

  function closeCancelModal() {
    if (actionSaving) return;
    setCancelModalItem(null);
    setCancelReason("");
    setCancelError("");
  }

  async function submitCancelRequest() {
    if (!cancelModalItem) return;

    const reason = cancelReason.trim();

    if (reason.length < 5) {
      setCancelError("Please enter a reason with at least 5 characters.");
      return;
    }

    try {
      setActionSaving(true);
      setCancelError("");
      setError("");
      setMessage("");

      const { data } = await api.patch(
        `/parent/bookings/${encodeURIComponent(cancelModalItem.id)}/cancel-request`,
        { reason },
      );

      const updated = data?.booking
        ? normalizeHistoryItem(data.booking, 0)
        : null;

      if (updated) {
        setRows((prev) =>
          prev.map((row) => (row.id === updated.id ? updated : row)),
        );
        setSelectedItem((prev) => (prev?.id === updated.id ? updated : prev));
      } else {
        await loadHistory({ silent: true });
      }

      setMessage(
        data?.message || "Cancellation request submitted successfully.",
      );
      closeCancelModal();
    } catch (err) {
      setCancelError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to submit cancellation request.",
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function syncPaymentStatus(item) {
    if (!item) return;

    const localPaymentId = normalizeId(item.paymentId);
    const bookingId = normalizeId(item.id);

    if (!localPaymentId && !bookingId) {
      setError("Payment ID or booking ID missing.");
      return;
    }

    try {
      setActionSaving(true);
      setError("");
      setMessage("");

      const { data } = await api.post("/payments/myfatoorah/sync", {
        bookingId,
        localPaymentId,
        paymentRecordId: localPaymentId,
      });

      const status = normalizeUpper(
        data?.status ||
          data?.payment?.paymentStatus ||
          data?.payment?.status ||
          "PENDING",
        "PENDING",
      );

      await loadHistory({ silent: true });

      if (status === "PAID") {
        setMessage("Payment confirmed successfully.");
        return;
      }

      if (status === "FAILED") {
        setError("Payment status refreshed: FAILED.");
        return;
      }

      setMessage(`Payment status refreshed: ${status}`);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to refresh payment status.",
      );
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-50 px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm sm:rounded-[34px]">
          <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/2 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Parent Booking Center
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  My Bookings & Payments
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Track your child activity bookings, payment status, receipts,
                  selected sessions, and cancellation requests in one place.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadHistory({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{message}</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={CalendarDays}
            title="Total Bookings"
            value={loading ? "..." : stats.total}
            subtitle="All booking records"
            tone="orange"
          />

          <StatCard
            icon={CheckCircle2}
            title="Confirmed"
            value={loading ? "..." : stats.confirmed}
            subtitle="Confirmed bookings"
            tone="emerald"
          />

          <StatCard
            icon={CreditCard}
            title="Paid"
            value={loading ? "..." : stats.paid}
            subtitle={money(stats.totalPaidAmount, "QAR")}
            tone="blue"
          />

          <StatCard
            icon={Clock3}
            title="Pending"
            value={loading ? "..." : stats.pending}
            subtitle="Awaiting payment"
            tone="amber"
          />

          <StatCard
            icon={MessageSquareText}
            title="Cancel Requests"
            value={loading ? "..." : stats.cancelRequests}
            subtitle="Waiting for academy review"
            tone="violet"
          />
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking, academy, child, activity..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
              />
            </div>

            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d]"
            >
              <option value="">All Bookings</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d]"
            >
              <option value="">All Payments</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Booking History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRows.length} of {rows.length} records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value="CONFIRMED" />
              <StatusBadge value="PAID" />
              <StatusBadge value="REQUESTED" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <EmptyState text="No booking or payment history found." />
          ) : (
            <>
              <div className="hidden overflow-x-auto 2xl:block">
                <table className="w-full min-w-[1550px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Booking
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Academy
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Child
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Activity
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Status
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Cancellation
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Payment
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Amount
                      </th>
                      <th className="pb-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-5 pr-5 align-top">
                          <div className="text-sm font-black text-slate-900">
                            {item.bookingNo}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime(item.createdAt)}
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="inline-flex max-w-[230px] items-start gap-2 text-sm font-bold text-slate-900">
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span className="break-words">
                              {item.academyName}
                            </span>
                          </div>

                          {item.academyCity ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {item.academyCity}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="inline-flex max-w-[180px] items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                            <Baby className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.childName}</span>
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="max-w-[250px] text-sm font-bold text-slate-900">
                            {item.activityName}
                          </div>

                          <div className="mt-1 inline-flex max-w-[250px] items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.packageName}</span>
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <StatusBadge value={item.bookingStatus} />
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="space-y-2">
                            <StatusBadge value={item.cancellationStatus} />
                            {item.cancellationRequestedAt ? (
                              <div className="text-xs text-slate-500">
                                {formatDateTime(item.cancellationRequestedAt)}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="space-y-2">
                            <StatusBadge value={item.paymentStatus} />
                            <StatusBadge value={item.paymentMethod} />
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="text-sm font-black text-slate-900">
                            {money(item.amount, item.currency)}
                          </div>
                        </td>

                        <td className="py-5 align-top">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                              title="View"
                            >
                              <Eye className="h-5 w-5" />
                            </button>

                            {item.checkoutUrl &&
                            item.paymentStatus !== "PAID" ? (
                              <a
                                href={item.checkoutUrl}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff7a3d] text-white transition hover:brightness-95"
                                title="Pay Now"
                              >
                                <CreditCard className="h-5 w-5" />
                              </a>
                            ) : null}

                            {canSyncPayment(item) ? (
                              <button
                                type="button"
                                onClick={() => syncPaymentStatus(item)}
                                disabled={actionSaving}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-[#ff7a3d] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Refresh payment status"
                              >
                                <RefreshCw
                                  className={`h-5 w-5 ${
                                    actionSaving ? "animate-spin" : ""
                                  }`}
                                />
                              </button>
                            ) : null}

                            {!item.checkoutUrl &&
                            !canSyncPayment(item) &&
                            canRequestCancel(item) ? (
                              <button
                                type="button"
                                onClick={() => openCancelModal(item)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100"
                                title="Request cancellation"
                              >
                                <MessageSquareText className="h-5 w-5" />
                              </button>
                            ) : null}

                            {!item.checkoutUrl &&
                            !canSyncPayment(item) &&
                            !canRequestCancel(item) ? (
                              <div
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
                                title={
                                  item.paymentStatus === "PAID"
                                    ? "Paid"
                                    : "No action"
                                }
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 2xl:hidden">
                {filteredRows.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    onView={setSelectedItem}
                    onCancelRequest={openCancelModal}
                    onSyncPayment={syncPaymentStatus}
                    actionSaving={actionSaving}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <BookingDetailsModal
        open={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onCancelRequest={openCancelModal}
        onSyncPayment={syncPaymentStatus}
        actionSaving={actionSaving}
      />

      <CancelRequestModal
        open={Boolean(cancelModalItem)}
        item={cancelModalItem}
        reason={cancelReason}
        saving={actionSaving}
        error={cancelError}
        onReasonChange={setCancelReason}
        onClose={closeCancelModal}
        onSubmit={submitCancelRequest}
      />
    </main>
  );
}

// client/src/pages/superadmin/SettlementsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

const BRAND = "#ff7a3d";

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

function money(value, currency = "QAR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency: String(currency || "QAR").toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${String(currency || "QAR").toUpperCase()} ${amount.toFixed(2)}`;
  }
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

function shortId(value) {
  const id = normalizeId(value);
  if (!id) return "N/A";
  return id.length > 10 ? id.slice(-8).toUpperCase() : id.toUpperCase();
}

function cleanStatus(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();
  return text || fallback;
}

function isPaidSettlement(item) {
  const status = cleanStatus(item?.status);
  return ["PAID", "PAID_TO_ACADEMY", "SETTLED"].includes(status);
}

function getInitials(value = "A") {
  const parts = String(value || "A")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function normalizeSummaryRow(item, index) {
  const academyId = normalizeId(
    item?.academyId?._id || item?.academyId?.id || item?.academyId || "",
  );

  const paymentIds = toArray(item?.paymentIds)
    .map((id) => normalizeId(id?._id || id?.id || id))
    .filter(Boolean);

  return {
    id: academyId || `summary-${index + 1}`,
    academyId,
    academyName:
      item?.academyName ||
      item?.academyId?.name ||
      item?.academy?.name ||
      "Academy",
    academyCity:
      item?.academyCity || item?.academyId?.city || item?.academy?.city || "",
    totalCollected: toNumber(item?.totalCollected, 0),
    kidgageCommissionTotal: toNumber(item?.kidgageCommissionTotal, 0),
    academyPayableTotal: toNumber(item?.academyPayableTotal, 0),
    paymentCount: toNumber(item?.paymentCount, paymentIds.length),
    paymentIds,
    currency: String(item?.currency || "QAR").toUpperCase(),
    firstPaymentAt: item?.firstPaymentAt || null,
    lastPaymentAt: item?.lastPaymentAt || null,
  };
}

function normalizeSettlement(item, index) {
  const paymentIds = toArray(item?.paymentIds)
    .map((id) => normalizeId(id?._id || id?.id || id))
    .filter(Boolean);

  return {
    raw: item,
    id: normalizeId(item?._id || item?.id || `settlement-${index + 1}`),

    academyId: normalizeId(
      item?.academyId?._id || item?.academyId?.id || item?.academyId || "",
    ),
    academyName:
      item?.academyId?.name ||
      item?.academy?.name ||
      item?.academyName ||
      "Academy",
    academyCity:
      item?.academyId?.city || item?.academy?.city || item?.academyCity || "",

    paymentIds,
    paymentCount: toNumber(item?.paymentCount, paymentIds.length),

    totalCollected: toNumber(item?.totalCollected, 0),
    kidgageCommissionTotal: toNumber(item?.kidgageCommissionTotal, 0),
    academyPayableTotal: toNumber(item?.academyPayableTotal, 0),
    currency: String(item?.currency || "QAR").toUpperCase(),

    status: cleanStatus(item?.status, "PENDING"),
    paymentMethod: cleanStatus(item?.paymentMethod, "MANUAL_BANK_TRANSFER"),
    settlementReference: item?.settlementReference || "",
    notes: item?.notes || "",

    settledAt: item?.settledAt || null,
    settledBy:
      item?.settledByName ||
      item?.settledBy?.fullName ||
      item?.settledBy?.name ||
      item?.settledBy?.email ||
      item?.settledBy ||
      "",

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

function StatusBadge({ value, size = "md" }) {
  const text = cleanStatus(value);

  const classes = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    READY: "bg-blue-50 text-blue-700 ring-blue-200",
    PAID_TO_ACADEMY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    SETTLED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200",
    FAILED: "bg-red-50 text-red-700 ring-red-200",
    HOLD: "bg-slate-100 text-slate-700 ring-slate-200",
    MANUAL_BANK_TRANSFER: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    BANK_TRANSFER: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    CASH: "bg-amber-50 text-amber-700 ring-amber-200",
  };

  const sizeClass =
    size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center rounded-full font-black uppercase tracking-[0.08em] ring-1 ${
        classes[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      } ${sizeClass}`}
    >
      {text.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: { box: "bg-orange-50 text-[#ff7a3d]", glow: "from-orange-500/10" },
    emerald: {
      box: "bg-emerald-50 text-emerald-600",
      glow: "from-emerald-500/10",
    },
    blue: { box: "bg-blue-50 text-blue-600", glow: "from-blue-500/10" },
    amber: { box: "bg-amber-50 text-amber-600", glow: "from-amber-500/10" },
    violet: { box: "bg-violet-50 text-violet-600", glow: "from-violet-500/10" },
    slate: { box: "bg-slate-100 text-slate-600", glow: "from-slate-500/10" },
    red: { box: "bg-red-50 text-red-600", glow: "from-red-500/10" },
  };

  const theme = tones[tone] || tones.orange;

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-gradient-to-br ${theme.glow} to-transparent blur-2xl`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 break-words text-2xl font-black leading-tight tracking-tight text-slate-950">
            {value}
          </div>
          {subtitle ? (
            <div className="mt-2 break-words text-sm font-semibold leading-5 text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${theme.box}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title = "Nothing found", text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
        <Landmark className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-base font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function LoadingGrid({ count = 3, cardClass = "h-64" }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${cardClass} animate-pulse rounded-[28px] bg-slate-100`}
        />
      ))}
    </div>
  );
}

function AlertBox({ type = "error", children }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${styles}`}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{children}</span>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  loading = false,
  onConfirm,
  onCancel,
  showFields = true,
  danger = false,
}) {
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReference("");
      setNotes("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div
          className={`px-5 py-5 sm:px-6 ${danger ? "bg-gradient-to-br from-red-50 to-white" : "bg-gradient-to-br from-orange-50 to-white"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${danger ? "bg-red-100 text-red-600" : "bg-orange-100 text-[#ff7a3d]"}`}
              >
                {danger ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <Landmark className="h-5 w-5" />
                )}
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-950">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showFields ? (
          <div className="space-y-3 px-5 py-5 sm:px-6">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Bank Transfer Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Example: QNB-TRF-2026-0001"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional internal note"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ reference, notes })}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#ff7a3d] hover:bg-[#ea6728]"}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
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

function SettlementDetailsModal({ open, settlement, onClose }) {
  if (!open || !settlement) return null;

  const rows = [
    ["Settlement ID", settlement.id],
    ["Academy", settlement.academyName],
    ["City", settlement.academyCity || "N/A"],
    ["Status", settlement.status],
    ["Payment Method", settlement.paymentMethod],
    ["Reference", settlement.settlementReference || "N/A"],
    ["Payment Count", settlement.paymentIds.length],
    ["Total Collected", money(settlement.totalCollected, settlement.currency)],
    [
      "KidGage Commission",
      money(settlement.kidgageCommissionTotal, settlement.currency),
    ],
    [
      "Academy Payable",
      money(settlement.academyPayableTotal, settlement.currency),
    ],
    ["Settled By", settlement.settledBy || "N/A"],
    ["Settled At", formatDateTime(settlement.settledAt)],
    ["Created", formatDateTime(settlement.createdAt)],
    ["Updated", formatDateTime(settlement.updatedAt)],
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100 ring-1 ring-white/10 sm:text-xs">
                <ReceiptText className="h-3.5 w-3.5" />
                Settlement Details
              </div>
              <h3 className="mt-4 text-2xl font-black text-white sm:text-4xl">
                {money(settlement.academyPayableTotal, settlement.currency)}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Paid by KidGage to {settlement.academyName}. Settlement records
                are locked after payout.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={settlement.status} />
                <StatusBadge value={settlement.paymentMethod} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
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
          <DetailTile
            label="Notes"
            value={settlement.notes || "No notes."}
            className="sm:col-span-2 lg:col-span-3"
          />
          <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Payment IDs
            </div>
            {settlement.paymentIds.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {settlement.paymentIds.map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200"
                  >
                    #{shortId(id)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm font-semibold text-slate-500">
                No payment IDs found.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ item, onSettle }) {
  const progress =
    item.totalCollected > 0
      ? Math.min(
          100,
          Math.max(0, (item.academyPayableTotal / item.totalCollected) * 100),
        )
      : 0;

  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl sm:p-5">
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-orange-100/80 blur-3xl transition group-hover:bg-orange-200/80" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
              {getInitials(item.academyName)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black text-slate-950">
                {item.academyName}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {item.academyCity || "Doha"} · {item.paymentCount} payment
                {item.paymentCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <StatusBadge value="READY" size="sm" />
        </div>

        <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Payable to Academy
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                {money(item.academyPayableTotal, item.currency)}
              </div>
            </div>
            <Banknote className="h-8 w-8 shrink-0 text-emerald-500" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
              Collected
            </div>
            <div className="mt-1 truncate text-sm font-black text-slate-950">
              {money(item.totalCollected, item.currency)}
            </div>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
              KidGage Fee
            </div>
            <div className="mt-1 truncate text-sm font-black text-slate-950">
              {money(item.kidgageCommissionTotal, item.currency)}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Payment IDs
            </div>
            <div className="text-[10px] font-black text-slate-400">
              Last: {formatDate(item.lastPaymentAt)}
            </div>
          </div>
          {item.paymentIds.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.paymentIds.slice(0, 6).map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200"
                >
                  #{shortId(id)}
                </span>
              ))}
              {item.paymentIds.length > 6 ? (
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                  +{item.paymentIds.length - 6}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-xs font-semibold text-slate-500">
              No payment IDs found.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSettle(item)}
          disabled={!item.academyId || !item.paymentIds.length}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(255,122,61,0.24)] transition hover:bg-[#ea6728] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          <CheckCircle2 className="h-4 w-4" />
          Record Bank Transfer
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function SettlementCard({ item, onView, onDelete }) {
  const locked = isPaidSettlement(item);

  return (
    <article className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            #{shortId(item.id)}
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {money(item.academyPayableTotal, item.currency)}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {formatDateTime(item.createdAt)}
          </div>
        </div>
        <StatusBadge value={item.status} size="sm" />
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-900 shadow-sm">
          {getInitials(item.academyName)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-950">
            {item.academyName}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {item.academyCity || "Doha"} · {item.paymentIds.length} payment
            {item.paymentIds.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-blue-50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">
            Collected
          </div>
          <div className="mt-1 truncate text-sm font-black text-slate-950">
            {money(item.totalCollected, item.currency)}
          </div>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
            KidGage Fee
          </div>
          <div className="mt-1 truncate text-sm font-black text-slate-950">
            {money(item.kidgageCommissionTotal, item.currency)}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Reference
          </div>
          <StatusBadge value={item.paymentMethod} size="sm" />
        </div>
        <div className="mt-2 break-words text-sm font-bold text-slate-800">
          {item.settlementReference || "N/A"}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onView(item)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        {locked ? (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-400"
            title="Paid settlements are locked"
          >
            <LockKeyhole className="h-4 w-4" />
            Locked
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function DesktopSettlementsTable({ rows, onView, onDelete }) {
  return (
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full min-w-[1180px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
            <th className="rounded-l-2xl px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Settlement
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Academy
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Status
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Collected
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              KidGage Fee
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Paid Academy
            </th>
            <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Reference
            </th>
            <th className="rounded-r-2xl px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const locked = isPaidSettlement(item);
            return (
              <tr
                key={item.id}
                className="border-b border-slate-100 transition last:border-b-0 hover:bg-orange-50/30"
              >
                <td className="px-4 py-5 align-top">
                  <div className="text-sm font-black text-slate-950">
                    #{shortId(item.id)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {formatDateTime(item.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="flex max-w-[260px] items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                      {getInitials(item.academyName)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">
                        {item.academyName}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {item.academyCity || "Doha"} · {item.paymentIds.length}{" "}
                        payment{item.paymentIds.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="flex flex-col items-start gap-2">
                    <StatusBadge value={item.status} size="sm" />
                    <StatusBadge value={item.paymentMethod} size="sm" />
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="text-sm font-black text-slate-900">
                    {money(item.totalCollected, item.currency)}
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="text-sm font-black text-orange-700">
                    {money(item.kidgageCommissionTotal, item.currency)}
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="text-sm font-black text-emerald-700">
                    {money(item.academyPayableTotal, item.currency)}
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="max-w-[220px] break-words text-sm font-bold text-slate-700">
                    {item.settlementReference || "N/A"}
                  </div>
                </td>
                <td className="px-4 py-5 align-top">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                      title="View"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {locked ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                        title="Paid settlements are locked"
                      >
                        <ShieldCheck className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SettlementsPage() {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [summaryRows, setSummaryRows] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [settleState, setSettleState] = useState({ open: false, item: null });
  const [deleteState, setDeleteState] = useState({ open: false, item: null });

  const loadSettlementSummary = useCallback(async () => {
    const { data } = await api.get("/super-admin/settlement-summary");
    const rows = toArray(
      data?.settlements || data?.items || data?.data?.settlements || [],
    ).map(normalizeSummaryRow);
    setSummaryRows(rows);
  }, []);

  const loadSettlements = useCallback(async () => {
    const { data } = await api.get("/super-admin/settlements");
    const rows = toArray(
      data?.settlements || data?.items || data?.data?.settlements || [],
    ).map(normalizeSettlement);
    setSettlements(rows);
  }, []);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else {
          setSummaryLoading(true);
          setSettlementsLoading(true);
        }
        setError("");
        await Promise.all([loadSettlementSummary(), loadSettlements()]);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Failed to load settlements. Make sure settlement API routes are registered.",
        );
      } finally {
        setSummaryLoading(false);
        setSettlementsLoading(false);
        setRefreshing(false);
      }
    },
    [loadSettlementSummary, loadSettlements],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const stats = useMemo(() => {
    const readyCollected = summaryRows.reduce(
      (sum, item) => sum + item.totalCollected,
      0,
    );
    const readyCommission = summaryRows.reduce(
      (sum, item) => sum + item.kidgageCommissionTotal,
      0,
    );
    const readyPayable = summaryRows.reduce(
      (sum, item) => sum + item.academyPayableTotal,
      0,
    );
    const readyPayments = summaryRows.reduce(
      (sum, item) => sum + item.paymentCount,
      0,
    );
    const settledPayable = settlements.reduce(
      (sum, item) => sum + item.academyPayableTotal,
      0,
    );
    const settledCollected = settlements.reduce(
      (sum, item) => sum + item.totalCollected,
      0,
    );
    const paidSettlements = settlements.filter(isPaidSettlement).length;
    return {
      readyAcademies: summaryRows.length,
      readyPayments,
      readyCollected,
      readyCommission,
      readyPayable,
      settledCount: settlements.length,
      paidSettlements,
      settledPayable,
      settledCollected,
    };
  }, [summaryRows, settlements]);

  const filteredSettlements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return settlements.filter((item) => {
      const itemStatus = cleanStatus(item.status);
      if (statusFilter !== "ALL" && itemStatus !== statusFilter) return false;
      if (!q) return true;
      return [
        item.id,
        item.academyName,
        item.academyCity,
        item.status,
        item.paymentMethod,
        item.settlementReference,
        item.settledBy,
        ...item.paymentIds,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [settlements, search, statusFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  function exportPayablesCsv() {
    const header = [
      "Academy",
      "City",
      "Payments",
      "Collected",
      "KidGage Commission",
      "Academy Payable",
      "Currency",
      "First Payment",
      "Last Payment",
      "Payment IDs",
    ];
    const rows = summaryRows.map((item) => [
      item.academyName,
      item.academyCity,
      item.paymentCount,
      item.totalCollected,
      item.kidgageCommissionTotal,
      item.academyPayableTotal,
      item.currency,
      formatDateTime(item.firstPaymentAt),
      formatDateTime(item.lastPaymentAt),
      item.paymentIds.join(" | "),
    ]);
    downloadCsv(
      `kidgage_ready_payables_${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows],
    );
  }

  function exportSettlementsCsv() {
    const header = [
      "Settlement ID",
      "Academy",
      "City",
      "Status",
      "Payment Method",
      "Reference",
      "Payments",
      "Collected",
      "KidGage Commission",
      "Academy Payable",
      "Currency",
      "Settled By",
      "Settled At",
      "Created",
      "Payment IDs",
    ];
    const rows = filteredSettlements.map((item) => [
      item.id,
      item.academyName,
      item.academyCity,
      item.status,
      item.paymentMethod,
      item.settlementReference,
      item.paymentIds.length,
      item.totalCollected,
      item.kidgageCommissionTotal,
      item.academyPayableTotal,
      item.currency,
      item.settledBy,
      formatDateTime(item.settledAt),
      formatDateTime(item.createdAt),
      item.paymentIds.join(" | "),
    ]);
    downloadCsv(
      `kidgage_settlements_${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows],
    );
  }

  function openSettle(item) {
    setError("");
    setMessage("");
    setSettleState({ open: true, item });
  }

  function closeSettle() {
    if (actionLoading) return;
    setSettleState({ open: false, item: null });
  }

  function openDelete(item) {
    if (isPaidSettlement(item)) {
      setError(
        "Paid settlements are locked and cannot be deleted from the UI.",
      );
      return;
    }
    setError("");
    setMessage("");
    setDeleteState({ open: true, item });
  }

  function closeDelete() {
    if (actionLoading) return;
    setDeleteState({ open: false, item: null });
  }

  async function confirmSettlement({ reference, notes }) {
    const item = settleState.item;
    if (!item?.academyId || !item?.paymentIds?.length) {
      setError("No valid payable payments found for this academy.");
      return;
    }
    const cleanReference = String(reference || "").trim();
    if (!cleanReference) {
      setError("Settlement reference / bank transfer reference is required.");
      return;
    }
    try {
      setActionLoading(true);
      setError("");
      setMessage("");
      await api.post("/super-admin/settlements", {
        academyId: item.academyId,
        paymentIds: item.paymentIds,
        paymentMethod: "MANUAL_BANK_TRANSFER",
        settlementReference: cleanReference,
        notes: String(notes || "").trim(),
      });
      setMessage(
        `Settlement recorded for ${item.academyName}. Payments are now marked as paid to academy.`,
      );
      setSettleState({ open: false, item: null });
      await loadAll({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to record settlement.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDeleteSettlement() {
    const item = deleteState?.item;
    const settlementId = normalizeId(item?.id);
    if (!settlementId) {
      setError("Invalid settlement ID.");
      return;
    }
    if (isPaidSettlement(item)) {
      setError(
        "Paid settlements are locked and cannot be deleted from the UI.",
      );
      setDeleteState({ open: false, item: null });
      return;
    }
    try {
      setActionLoading(true);
      setError("");
      setMessage("");
      await api.delete(
        `/super-admin/settlements/${encodeURIComponent(settlementId)}`,
      );
      setMessage("Settlement deleted successfully from database.");
      setDeleteState({ open: false, item: null });
      setSelectedSettlement(null);
      await loadAll({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete settlement.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const heroDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  return (
    <main className="min-h-screen w-full bg-[#f8fafc] px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-100 sm:text-xs">
                <Landmark className="h-3.5 w-3.5" />
                KidGage Settlement Control
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Academy Settlements
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                KidGage receives parent payments first, deducts platform
                commission, then settles the academy payable amount by manual
                bank transfer.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10">
                  <Clock3 className="h-4 w-4 text-orange-200" />
                  {heroDate}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10">
                  <ShieldCheck className="h-4 w-4 text-emerald-200" />
                  Paid settlements locked
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-100">
                    Ready Payable
                  </div>
                  <div className="mt-3 text-3xl font-black tracking-tight text-white">
                    {summaryLoading ? "..." : money(stats.readyPayable, "QAR")}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-300">
                    {stats.readyPayments} payment(s) across{" "}
                    {stats.readyAcademies} academies
                  </div>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#ff7a3d] text-white shadow-[0_18px_40px_rgba(255,122,61,0.35)]">
                  <Wallet className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                    Collected
                  </div>
                  <div className="mt-1 break-words text-sm font-black text-white">
                    {money(stats.readyCollected, "QAR")}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                    Commission
                  </div>
                  <div className="mt-1 break-words text-sm font-black text-white">
                    {money(stats.readyCommission, "QAR")}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadAll({ silent: true })}
                disabled={refreshing}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </section>

        {message ? <AlertBox type="success">{message}</AlertBox> : null}
        {error ? <AlertBox>{error}</AlertBox> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Building2}
            title="Academies"
            value={summaryLoading ? "..." : stats.readyAcademies}
            subtitle={`${stats.readyPayments} payable payment(s)`}
            tone="orange"
          />
          <StatCard
            icon={Wallet}
            title="Collected"
            value={summaryLoading ? "..." : money(stats.readyCollected, "QAR")}
            subtitle="Gross collected by KidGage"
            tone="blue"
          />
          <StatCard
            icon={BadgeDollarSign}
            title="Commission"
            value={summaryLoading ? "..." : money(stats.readyCommission, "QAR")}
            subtitle="KidGage commission retained"
            tone="violet"
          />
          <StatCard
            icon={Banknote}
            title="Payable"
            value={summaryLoading ? "..." : money(stats.readyPayable, "QAR")}
            subtitle="Amount due to academies"
            tone="emerald"
          />
          <StatCard
            icon={CheckCircle2}
            title="Settlements"
            value={settlementsLoading ? "..." : stats.settledCount}
            subtitle={`${stats.paidSettlements} locked payout(s)`}
            tone="emerald"
          />
          <StatCard
            icon={Landmark}
            title="Settled"
            value={
              settlementsLoading ? "..." : money(stats.settledPayable, "QAR")
            }
            subtitle={`${money(stats.settledCollected, "QAR")} collected`}
            tone="slate"
          />
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 ring-1 ring-blue-100">
                <Wallet className="h-3.5 w-3.5" />
                Ready for Settlement
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">
                Academy Payables
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Paid KidGage payments grouped by academy. Record bank transfer
                only after payout is completed.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={exportPayablesCsv}
                disabled={!summaryRows.length}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export Payables
              </button>
              <StatusBadge value="READY" />
            </div>
          </div>
          {summaryLoading ? (
            <LoadingGrid count={3} cardClass="h-80" />
          ) : summaryRows.length === 0 ? (
            <EmptyState
              title="No payables ready"
              text="There are no paid KidGage payments waiting for academy settlement."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {summaryRows.map((item) => (
                <SummaryCard
                  key={item.academyId || item.id}
                  item={item}
                  onSettle={openSettle}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                <FileText className="h-3.5 w-3.5" />
                Settlement History
              </div>
              <h2 className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">
                Recorded Payouts
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Showing {filteredSettlements.length} of {settlements.length}{" "}
                settlement records.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto_auto] xl:min-w-[820px]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search academy, reference, status..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#ff7a3d] focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-black text-slate-700 outline-none transition focus:border-[#ff7a3d] focus:bg-white focus:ring-4 focus:ring-orange-100"
                >
                  <option value="ALL">All Status</option>
                  <option value="PAID">Paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="FAILED">Failed</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={exportSettlementsCsv}
                disabled={!filteredSettlements.length}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!search && statusFilter === "ALL"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          {settlementsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[26px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredSettlements.length === 0 ? (
            <EmptyState
              title="No settlement history"
              text="No recorded settlement matches your current search or filters."
            />
          ) : (
            <>
              <DesktopSettlementsTable
                rows={filteredSettlements}
                onView={setSelectedSettlement}
                onDelete={openDelete}
              />
              <div className="grid gap-4 xl:hidden">
                {filteredSettlements.map((item) => (
                  <SettlementCard
                    key={item.id}
                    item={item}
                    onView={setSelectedSettlement}
                    onDelete={openDelete}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <SettlementDetailsModal
        open={Boolean(selectedSettlement)}
        settlement={selectedSettlement}
        onClose={() => setSelectedSettlement(null)}
      />
      <ConfirmDialog
        open={settleState.open}
        title="Record Academy Settlement"
        message={`This will record a manual bank payout of ${money(settleState?.item?.academyPayableTotal, settleState?.item?.currency)} to ${settleState?.item?.academyName || "academy"} and mark ${settleState?.item?.paymentCount || 0} payment(s) as paid to academy.`}
        confirmText="Record Settlement"
        loading={actionLoading}
        onConfirm={confirmSettlement}
        onCancel={closeSettle}
        showFields
      />
      <ConfirmDialog
        open={deleteState.open}
        title="Delete Settlement"
        message={`This will permanently delete settlement #${shortId(deleteState?.item?.id)} for ${deleteState?.item?.academyName || "this academy"} from the database. Continue?`}
        confirmText="Delete Settlement"
        loading={actionLoading}
        onConfirm={confirmDeleteSettlement}
        onCancel={closeDelete}
        showFields={false}
        danger
      />
    </main>
  );
}

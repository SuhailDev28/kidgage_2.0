// client/src/pages/superadmin/SuperAdminPayments.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Wallet,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Building2,
  User2,
  BadgeDollarSign,
  ShieldCheck,
  X,
  Eye,
  ReceiptText,
  Banknote,
  Filter,
  RotateCcw,
  ChevronDown,
  ClipboardList,
  ExternalLink,
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

function pickAcademyName(item) {
  return (
    item?.academyName ||
    item?.academyId?.name ||
    item?.academy?.name ||
    item?.meta?.academyName ||
    "Academy"
  );
}

function pickParentName(item) {
  return (
    item?.parentName ||
    item?.parentId?.fullName ||
    item?.parentId?.name ||
    item?.parent?.fullName ||
    item?.bookingId?.parentName ||
    item?.booking?.parentName ||
    item?.guestParent?.fullName ||
    "Parent / Guest"
  );
}

function pickParentEmail(item) {
  return (
    item?.parentEmail ||
    item?.parentId?.email ||
    item?.parent?.email ||
    item?.guestParent?.email ||
    ""
  );
}

function pickActivityName(item) {
  return (
    item?.activityName ||
    item?.activityId?.title ||
    item?.activityId?.name ||
    item?.activity?.title ||
    item?.activity?.name ||
    item?.bookingId?.activityName ||
    item?.booking?.activityName ||
    "Activity"
  );
}

function pickPackageName(item) {
  return (
    item?.packageName ||
    item?.packageId?.title ||
    item?.package?.title ||
    item?.bookingId?.packageName ||
    item?.booking?.packageName ||
    "Package"
  );
}

function normalizePayment(item, index) {
  const amount = toNumber(item?.amount, 0);
  const commission = toNumber(item?.kidgageCommissionAmount, 0);
  const payable = toNumber(item?.academyPayableAmount, amount - commission);

  return {
    raw: item,

    id: normalizeId(item?._id || item?.id || `payment-${index + 1}`),

    bookingId: normalizeId(
      item?.bookingId?._id || item?.bookingId?.id || item?.bookingId || "",
    ),

    bookingNo:
      item?.bookingNo ||
      item?.bookingId?.bookingNo ||
      item?.bookingId?.referenceNo ||
      item?.booking?.bookingNo ||
      "",

    academyId: normalizeId(
      item?.academyId?._id || item?.academyId?.id || item?.academyId || "",
    ),

    academyName: pickAcademyName(item),

    parentName: pickParentName(item),
    parentEmail: pickParentEmail(item),

    activityName: pickActivityName(item),
    packageName: pickPackageName(item),

    amount,
    currency: String(item?.currency || "QAR").toUpperCase(),

    paymentReceiver: String(item?.paymentReceiver || "KIDGAGE").toUpperCase(),
    paymentMethod: String(item?.paymentMethod || "CASH").toUpperCase(),
    paymentGateway: String(item?.paymentGateway || "MANUAL").toUpperCase(),

    gatewayOrderId: item?.gatewayOrderId || "",
    gatewayPaymentId: item?.gatewayPaymentId || "",
    gatewayReference: item?.gatewayReference || "",
    gatewayCheckoutUrl: item?.gatewayCheckoutUrl || "",

    paymentStatus: String(item?.paymentStatus || "PENDING").toUpperCase(),
    settlementStatus: String(item?.settlementStatus || "PENDING").toUpperCase(),

    kidgageCommissionType: String(
      item?.kidgageCommissionType || "PERCENTAGE",
    ).toUpperCase(),

    kidgageCommissionValue: toNumber(item?.kidgageCommissionValue, 0),
    kidgageCommissionAmount: commission,
    academyPayableAmount: payable,

    paidAt: item?.paidAt || null,
    failedAt: item?.failedAt || null,
    cancelledAt: item?.cancelledAt || null,
    refundedAt: item?.refundedAt || null,

    confirmedBy: item?.confirmedBy || null,
    confirmedAt: item?.confirmedAt || null,

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,

    notes: item?.notes || "",
    meta: item?.meta || {},
  };
}

function StatusBadge({ value, size = "sm" }) {
  const text = String(value || "N/A").toUpperCase();

  const classes = {
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    READY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PAID_TO_ACADEMY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",

    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",

    FAILED: "bg-red-50 text-red-700 ring-red-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200",

    REFUNDED: "bg-violet-50 text-violet-700 ring-violet-200",
    HOLD: "bg-slate-100 text-slate-700 ring-slate-200",

    KIDGAGE: "bg-blue-50 text-blue-700 ring-blue-200",
    CASH: "bg-amber-50 text-amber-700 ring-amber-200",
    ONLINE: "bg-blue-50 text-blue-700 ring-blue-200",
    MANUAL: "bg-slate-100 text-slate-700 ring-slate-200",
    MYFATOORAH: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  const sizeClass =
    size === "xs"
      ? "px-2.5 py-1 text-[10px]"
      : "px-3 py-1.5 text-[11px] sm:text-xs";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-black uppercase tracking-[0.08em] ring-1 ${
        classes[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      } ${sizeClass}`}
    >
      {text.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Wallet className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
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
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:text-xs">
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

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#ff7a3d] hover:brightness-95"
            }`}
          >
            {loading ? "Processing..." : confirmText}
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

function PaymentDetailsModal({ open, payment, onClose }) {
  if (!open || !payment) return null;

  const rows = [
    ["Payment ID", payment.id],
    ["Booking ID", payment.bookingId || "N/A"],
    ["Booking No", payment.bookingNo || "N/A"],
    ["Academy", payment.academyName],
    ["Parent", payment.parentName],
    ["Parent Email", payment.parentEmail || "N/A"],
    ["Activity", payment.activityName],
    ["Package", payment.packageName],
    ["Receiver", payment.paymentReceiver],
    ["Method", payment.paymentMethod],
    ["Gateway", payment.paymentGateway],
    ["Payment Status", payment.paymentStatus],
    ["Settlement Status", payment.settlementStatus],
    ["Gateway Order ID", payment.gatewayOrderId || "N/A"],
    ["Gateway Payment ID", payment.gatewayPaymentId || "N/A"],
    ["Gateway Reference", payment.gatewayReference || "N/A"],
    ["Gross Amount", money(payment.amount, payment.currency)],
    [
      "KidGage Commission",
      `${money(payment.kidgageCommissionAmount, payment.currency)} ${
        payment.kidgageCommissionType === "PERCENTAGE"
          ? `(${payment.kidgageCommissionValue}%)`
          : "(Fixed)"
      }`,
    ],
    ["Academy Payable", money(payment.academyPayableAmount, payment.currency)],
    ["Created", formatDateTime(payment.createdAt)],
    ["Paid At", formatDateTime(payment.paidAt)],
    ["Confirmed At", formatDateTime(payment.confirmedAt)],
    ["Updated", formatDateTime(payment.updatedAt)],
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <ReceiptText className="h-3.5 w-3.5" />
              Payment Details
            </div>

            <h3 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {money(payment.amount, payment.currency)}
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={payment.paymentStatus} />
              <StatusBadge value={payment.settlementStatus} />
              <StatusBadge value={payment.paymentMethod} />
              <StatusBadge value={payment.paymentGateway} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <DetailTile key={label} label={label} value={value} />
          ))}

          {payment.gatewayCheckoutUrl ? (
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Checkout URL
              </div>

              <a
                href={payment.gatewayCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm font-bold leading-6 text-blue-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                {payment.gatewayCheckoutUrl}
              </a>
            </div>
          ) : null}

          <DetailTile
            label="Notes"
            value={payment.notes || "No notes."}
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMobileCard({ payment, onView, onMarkPaid, onSettle }) {
  const canSettle =
    payment.paymentStatus === "PAID" && payment.settlementStatus === "READY";

  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">
            {money(payment.amount, payment.currency)}
          </div>

          <div className="mt-1 text-xs font-medium text-slate-500">
            #{shortId(payment.id)} · {formatDateTime(payment.createdAt)}
          </div>

          {payment.bookingNo ? (
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Booking: {payment.bookingNo}
            </div>
          ) : null}
        </div>

        <StatusBadge value={payment.paymentStatus} size="xs" />
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Academy
            </div>

            <div className="mt-1 truncate text-sm font-bold text-slate-900">
              {payment.academyName}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Activity / Package
            </div>

            <div className="mt-1 truncate text-sm font-bold text-slate-900">
              {payment.activityName}
            </div>

            <div className="truncate text-xs text-slate-500">
              {payment.packageName}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-orange-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
              KidGage Fee
            </div>

            <div className="mt-1 text-sm font-black text-slate-900">
              {money(payment.kidgageCommissionAmount, payment.currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
              Payable
            </div>

            <div className="mt-1 text-sm font-black text-emerald-700">
              {money(payment.academyPayableAmount, payment.currency)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge value={payment.paymentMethod} size="xs" />
          <StatusBadge value={payment.paymentGateway} size="xs" />
          <StatusBadge value={payment.settlementStatus} size="xs" />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onView(payment)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <Eye className="h-4 w-4" />
          View Details
        </button>

        {payment.paymentStatus !== "PAID" ? (
          <button
            type="button"
            onClick={() => onMarkPaid(payment)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Paid
          </button>
        ) : canSettle ? (
          <button
            type="button"
            onClick={() => onSettle(payment)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <Banknote className="h-4 w-4" />
            Settle
          </button>
        ) : payment.settlementStatus === "PAID_TO_ACADEMY" ? (
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Settled
          </div>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
            {payment.settlementStatus}
          </div>
        )}
      </div>
    </article>
  );
}

function SelectBox({ value, onChange, children, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = React.Children.toArray(children).map((child) => ({
    value: child.props.value,
    label: child.props.children,
  }));

  const selected =
    options.find((item) => String(item.value) === String(value)) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function selectOption(nextValue) {
    onChange({
      target: {
        value: nextValue,
      },
    });

    setOpen(false);
  }

  return (
    <div ref={ref} className="relative min-w-0">
      {label ? (
        <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-12 w-full min-w-0 items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm font-semibold text-slate-800 outline-none transition ${
          open
            ? "border-[#ff7a3d] ring-4 ring-orange-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className="truncate">{selected?.label || "Select"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const active = String(option.value) === String(value);

              return (
                <button
                  key={`${label}-${option.value || "all"}`}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-orange-50 text-[#ff7a3d]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SuperAdminPayments() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [payments, setPayments] = useState([]);

  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [settlementStatusFilter, setSettlementStatusFilter] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [paymentGatewayFilter, setPaymentGatewayFilter] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [viewPayment, setViewPayment] = useState(null);

  const [markPaidState, setMarkPaidState] = useState({
    open: false,
    payment: null,
  });

  const [settleState, setSettleState] = useState({
    open: false,
    payment: null,
  });

  const loadPayments = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      let data = null;

      try {
        const res = await api.get("/super-admin/payments");
        data = res.data;
      } catch {
        const res = await api.get("/payments/admin/payments");
        data = res.data;
      }

      const rows = toArray(
        data?.payments || data?.items || data?.data?.payments || [],
      ).map(normalizePayment);

      setPayments(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load payments. Make sure /api/super-admin/payments is registered before the /api 404 fallback.",
      );
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const stats = useMemo(() => {
    const paidRows = payments.filter((p) => p.paymentStatus === "PAID");

    const totalGross = paidRows.reduce((sum, item) => sum + item.amount, 0);

    const totalCommission = paidRows.reduce(
      (sum, item) => sum + item.kidgageCommissionAmount,
      0,
    );

    const totalPayable = paidRows.reduce(
      (sum, item) => sum + item.academyPayableAmount,
      0,
    );

    const paid = paidRows.length;

    const pending = payments.filter(
      (p) => p.paymentStatus === "PENDING",
    ).length;

    const readySettlement = payments.filter(
      (p) => p.paymentStatus === "PAID" && p.settlementStatus === "READY",
    ).length;

    const cash = payments.filter((p) => p.paymentMethod === "CASH").length;
    const online = payments.filter((p) => p.paymentMethod === "ONLINE").length;

    return {
      totalGross,
      totalCommission,
      totalPayable,
      paid,
      pending,
      readySettlement,
      cash,
      online,
    };
  }, [payments]);

  const academyOptions = useMemo(() => {
    return [
      ...new Set(payments.map((item) => item.academyName).filter(Boolean)),
    ]
      .filter((name) => name !== "Academy")
      .sort();
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return payments.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.id,
          item.bookingId,
          item.bookingNo,
          item.academyName,
          item.parentName,
          item.parentEmail,
          item.activityName,
          item.packageName,
          item.paymentStatus,
          item.settlementStatus,
          item.paymentMethod,
          item.paymentGateway,
          item.gatewayOrderId,
          item.gatewayPaymentId,
          item.gatewayReference,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesPaymentStatus =
        !paymentStatusFilter || item.paymentStatus === paymentStatusFilter;

      const matchesSettlementStatus =
        !settlementStatusFilter ||
        item.settlementStatus === settlementStatusFilter;

      const matchesAcademy =
        !academyFilter ||
        item.academyName.toLowerCase() === academyFilter.toLowerCase();

      const matchesPaymentMethod =
        !paymentMethodFilter || item.paymentMethod === paymentMethodFilter;

      const matchesPaymentGateway =
        !paymentGatewayFilter || item.paymentGateway === paymentGatewayFilter;

      return (
        matchesSearch &&
        matchesPaymentStatus &&
        matchesSettlementStatus &&
        matchesAcademy &&
        matchesPaymentMethod &&
        matchesPaymentGateway
      );
    });
  }, [
    payments,
    search,
    paymentStatusFilter,
    settlementStatusFilter,
    academyFilter,
    paymentMethodFilter,
    paymentGatewayFilter,
  ]);

  const hasFilters = Boolean(
    search ||
    paymentStatusFilter ||
    settlementStatusFilter ||
    academyFilter ||
    paymentMethodFilter ||
    paymentGatewayFilter,
  );

  function clearFilters() {
    setSearch("");
    setPaymentStatusFilter("");
    setSettlementStatusFilter("");
    setAcademyFilter("");
    setPaymentMethodFilter("");
    setPaymentGatewayFilter("");
  }

  function openMarkPaid(payment) {
    setError("");
    setMessage("");
    setMarkPaidState({
      open: true,
      payment,
    });
  }

  function closeMarkPaid() {
    if (actionLoading) return;

    setMarkPaidState({
      open: false,
      payment: null,
    });
  }

  function openSettle(payment) {
    setError("");
    setMessage("");

    if (payment.paymentStatus !== "PAID") {
      setError("Only paid payments can be settled.");
      return;
    }

    if (payment.settlementStatus !== "READY") {
      setError("Only READY payments can be settled.");
      return;
    }

    setSettleState({
      open: true,
      payment,
    });
  }

  function closeSettle() {
    if (actionLoading) return;

    setSettleState({
      open: false,
      payment: null,
    });
  }

  async function confirmMarkPaid() {
    const paymentId = normalizeId(markPaidState?.payment?.id);

    if (!paymentId) {
      setError("Invalid payment ID.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      try {
        await api.post(`/super-admin/payments/${paymentId}/mark-paid`, {
          gatewayReference: `MANUAL-${Date.now()}`,
        });
      } catch {
        await api.post(`/payments/${paymentId}/mark-paid`, {
          gatewayReference: `MANUAL-${Date.now()}`,
        });
      }

      setMessage("Payment marked as paid. Booking is now confirmed.");

      setMarkPaidState({
        open: false,
        payment: null,
      });

      await loadPayments({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to mark payment paid.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmSettle() {
    const payment = settleState?.payment;
    const paymentId = normalizeId(payment?.id);
    const academyId = normalizeId(payment?.academyId);

    if (!paymentId) {
      setError("Invalid payment ID.");
      return;
    }

    if (!academyId) {
      setError("Invalid academy ID for this payment.");
      return;
    }

    if (payment?.paymentStatus !== "PAID") {
      setError("Only paid payments can be settled.");
      return;
    }

    if (payment?.settlementStatus !== "READY") {
      setError("Only READY payments can be settled.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.post("/super-admin/settlements", {
        academyId,
        paymentIds: [paymentId],
        paymentMethod: "MANUAL_BANK_TRANSFER",
        settlementReference: `SETTLEMENT-${Date.now()}`,
        notes: "Single academy payment settled from Super Admin Payments page.",
      });

      setMessage("Academy settlement marked as paid successfully.");

      setSettleState({
        open: false,
        payment: null,
      });

      await loadPayments({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to settle academy payment.",
      );
    } finally {
      setActionLoading(false);
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
                  KidGage Central Payments
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Payments
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  All parent payments are collected by KidGage first. Academy
                  settlement is handled after platform commission deduction.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 xl:hidden"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>

                <button
                  type="button"
                  onClick={() => loadPayments({ silent: true })}
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
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard
            icon={Wallet}
            title="Gross Collected"
            value={money(stats.totalGross, "QAR")}
            subtitle="Paid payment volume"
            tone="orange"
          />

          <StatCard
            icon={BadgeDollarSign}
            title="KidGage Fee"
            value={money(stats.totalCommission, "QAR")}
            subtitle="Platform revenue"
            tone="blue"
          />

          <StatCard
            icon={Building2}
            title="Academy Payable"
            value={money(stats.totalPayable, "QAR")}
            subtitle="After commission"
            tone="emerald"
          />

          <StatCard
            icon={CheckCircle2}
            title="Paid"
            value={loading ? "..." : stats.paid}
            subtitle="Confirmed payments"
            tone="emerald"
          />

          <StatCard
            icon={Clock3}
            title="Pending"
            value={loading ? "..." : stats.pending}
            subtitle="Awaiting payment"
            tone="amber"
          />

          <StatCard
            icon={Banknote}
            title="Ready Settlement"
            value={loading ? "..." : stats.readySettlement}
            subtitle="Payable items"
            tone="violet"
          />
        </section>

        <section
          className={`rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 ${
            showFilters ? "block" : "hidden xl:block"
          }`}
        >
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(260px,1fr)_170px_190px_170px_190px_220px_auto]">
            <div className="min-w-0 md:col-span-2 xl:col-span-3 2xl:col-span-1">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Search
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payment, booking, academy, parent..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
                />
              </div>
            </div>

            <SelectBox
              label="Payment"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">All Payments</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REFUNDED">REFUNDED</option>
            </SelectBox>

            <SelectBox
              label="Settlement"
              value={settlementStatusFilter}
              onChange={(e) => setSettlementStatusFilter(e.target.value)}
            >
              <option value="">All Settlements</option>
              <option value="PENDING">PENDING</option>
              <option value="READY">READY</option>
              <option value="PAID_TO_ACADEMY">PAID TO ACADEMY</option>
              <option value="HOLD">HOLD</option>
              <option value="CANCELLED">CANCELLED</option>
            </SelectBox>

            <SelectBox
              label="Method"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="CASH">CASH</option>
              <option value="ONLINE">ONLINE</option>
            </SelectBox>

            <SelectBox
              label="Gateway"
              value={paymentGatewayFilter}
              onChange={(e) => setPaymentGatewayFilter(e.target.value)}
            >
              <option value="">All Gateways</option>
              <option value="MANUAL">MANUAL</option>
              <option value="MYFATOORAH">MYFATOORAH</option>
            </SelectBox>

            <SelectBox
              label="Academy"
              value={academyFilter}
              onChange={(e) => setAcademyFilter(e.target.value)}
            >
              <option value="">All Academies</option>
              {academyOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectBox>

            <div className="flex items-end md:col-span-2 xl:col-span-3 2xl:col-span-1">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                All KidGage Payments
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredPayments.length} of {payments.length} records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value="KIDGAGE" />
              <StatusBadge value="READY" />
              <StatusBadge value="CASH" />
              <StatusBadge value="ONLINE" />
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
          ) : filteredPayments.length === 0 ? (
            <EmptyState text="No payments found." />
          ) : (
            <>
              <div className="hidden overflow-x-auto 2xl:block">
                <table className="w-full min-w-[1580px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Payment
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Academy
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Parent
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Activity
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Method
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Status
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Gross
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        KidGage Fee
                      </th>
                      <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Payable
                      </th>
                      <th className="pb-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map((payment) => {
                      const canSettle =
                        payment.paymentStatus === "PAID" &&
                        payment.settlementStatus === "READY";

                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="py-5 pr-5 align-top">
                            <div className="text-sm font-black text-slate-900">
                              #{shortId(payment.id)}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {formatDateTime(payment.createdAt)}
                            </div>

                            {payment.bookingNo ? (
                              <div className="mt-1 text-xs font-semibold text-slate-500">
                                Booking: {payment.bookingNo}
                              </div>
                            ) : null}
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="inline-flex max-w-[220px] items-start gap-2 text-sm font-bold text-slate-900">
                              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              <span className="break-words">
                                {payment.academyName}
                              </span>
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="inline-flex max-w-[220px] items-start gap-2 text-sm font-bold text-slate-900">
                              <User2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              <span className="break-words">
                                {payment.parentName}
                              </span>
                            </div>

                            {payment.parentEmail ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {payment.parentEmail}
                              </div>
                            ) : null}
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="max-w-[250px] text-sm font-bold text-slate-900">
                              {payment.activityName}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {payment.packageName}
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="space-y-2">
                              <StatusBadge value={payment.paymentMethod} />
                              <StatusBadge value={payment.paymentGateway} />
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="space-y-2">
                              <StatusBadge value={payment.paymentStatus} />
                              <StatusBadge value={payment.settlementStatus} />
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="text-sm font-black text-slate-900">
                              {money(payment.amount, payment.currency)}
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="text-sm font-black text-slate-900">
                              {money(
                                payment.kidgageCommissionAmount,
                                payment.currency,
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {payment.kidgageCommissionType === "PERCENTAGE"
                                ? `${payment.kidgageCommissionValue}%`
                                : "Fixed"}
                            </div>
                          </td>

                          <td className="py-5 pr-5 align-top">
                            <div className="text-sm font-black text-emerald-700">
                              {money(
                                payment.academyPayableAmount,
                                payment.currency,
                              )}
                            </div>
                          </td>

                          <td className="py-5 align-top">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="View"
                                onClick={() => setViewPayment(payment)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                              >
                                <Eye className="h-5 w-5" />
                              </button>

                              {payment.paymentStatus !== "PAID" ? (
                                <button
                                  type="button"
                                  title="Mark Paid"
                                  onClick={() => openMarkPaid(payment)}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </button>
                              ) : canSettle ? (
                                <button
                                  type="button"
                                  title="Settle Academy"
                                  onClick={() => openSettle(payment)}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                >
                                  <Banknote className="h-5 w-5" />
                                </button>
                              ) : payment.settlementStatus ===
                                "PAID_TO_ACADEMY" ? (
                                <div
                                  title="Settled"
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </div>
                              ) : (
                                <div
                                  title={payment.settlementStatus}
                                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600"
                                >
                                  {payment.settlementStatus}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 2xl:hidden">
                {filteredPayments.map((payment) => (
                  <PaymentMobileCard
                    key={payment.id}
                    payment={payment}
                    onView={setViewPayment}
                    onMarkPaid={openMarkPaid}
                    onSettle={openSettle}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <PaymentDetailsModal
        open={Boolean(viewPayment)}
        payment={viewPayment}
        onClose={() => setViewPayment(null)}
      />

      <ConfirmDialog
        open={markPaidState.open}
        title="Mark Payment as Paid"
        message={`This will mark ${money(
          markPaidState?.payment?.amount,
          markPaidState?.payment?.currency,
        )} as paid to KidGage and confirm the booking. Continue?`}
        confirmText="Mark Paid"
        loading={actionLoading}
        onConfirm={confirmMarkPaid}
        onCancel={closeMarkPaid}
      />

      <ConfirmDialog
        open={settleState.open}
        title="Settle Academy Payment"
        message={`This will record a manual payout of ${money(
          settleState?.payment?.academyPayableAmount,
          settleState?.payment?.currency,
        )} to ${
          settleState?.payment?.academyName || "the academy"
        } and mark this payment as paid to academy. Continue?`}
        confirmText="Settle Academy"
        loading={actionLoading}
        onConfirm={confirmSettle}
        onCancel={closeSettle}
      />
    </main>
  );
}

// client/src/pages/superadmin/RequestsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  FileText,
  Building2,
  MapPin,
  User2,
  BadgeCheck,
  Clock3,
  ShieldCheck,
  Trash2,
  Eye,
  X,
  RotateCcw,
  ChevronDown,
  Globe,
  Camera,
  ClipboardList,
  Ban,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeFile(fileValue) {
  if (!fileValue) return "";

  const value = String(fileValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value}`;
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

function normalizeRegistration(item) {
  const academyObj = item?.academyId || item?.academy || null;

  return {
    id: item?._id || item?.id || "",
    academyName: item?.academyName || "Untitled Academy",
    location: item?.location || "-",
    bio: item?.bio || "",
    address: item?.address || "-",
    crNumber: item?.crNumber || "-",
    crDocument: normalizeFile(item?.crDocument || ""),
    phone: item?.phone || "-",
    email: item?.email || "-",
    fullName: item?.fullName || "-",
    designation: item?.designation || "-",
    website: item?.website || "",
    instagram: item?.instagram || "",
    agreed: Boolean(item?.agreed),
    status: String(item?.status || "PENDING").toUpperCase(),
    createdAt: item?.createdAt || null,
    approvedAt: item?.approvedAt || null,
    rejectedAt: item?.rejectedAt || null,
    tempPassword: "",
    adminUser: item?.adminUserId || null,
    academy: academyObj,
    academyId:
      academyObj?._id ||
      academyObj?.id ||
      item?.academyId?._id ||
      item?.academyId?.id ||
      item?.academyId ||
      "",
    academyStatus: String(academyObj?.status || "").toUpperCase(),
    rejectionReason: item?.rejectionReason || "",
  };
}

function extractRegistrations(payload) {
  const root = payload?.data || payload || {};
  return toArray(root?.registrations).map(normalizeRegistration);
}

function StatusBadge({ status, size = "sm" }) {
  const text = String(status || "PENDING").toUpperCase();

  const styles = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  const sizeClass =
    size === "xs"
      ? "px-2.5 py-1 text-[10px]"
      : "px-3 py-1.5 text-[11px] sm:text-xs";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-black uppercase tracking-[0.08em] ring-1 ${
        styles[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      } ${sizeClass}`}
    >
      {text}
    </span>
  );
}

function InfoPill({ icon: Icon, text }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{text || "N/A"}</span>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
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

function EmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <ClipboardList className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-900">
        No requests found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try changing the search keyword or status filter.
      </p>
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

function RejectDialog({ open, loading, value, onChange, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Reject Request
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Add an optional reason. This will be saved with the registration.
            </p>
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

        <textarea
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Reason for rejection..."
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d]"
        />

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Rejecting..." : "Reject Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestDetailsModal({ open, item, onClose }) {
  if (!open || !item) return null;

  const rows = [
    ["Academy", item.academyName],
    ["Request Status", item.status],
    ["Academy Status", item.academyStatus || "N/A"],
    ["Location", item.location],
    ["Address", item.address],
    ["CR Number", item.crNumber],
    ["Contact Person", item.fullName],
    ["Designation", item.designation],
    ["Email", item.email],
    ["Phone", item.phone],
    ["Website", item.website || "N/A"],
    ["Instagram", item.instagram || "N/A"],
    ["Declaration", item.agreed ? "Accepted" : "Not Accepted"],
    ["Submitted", formatDate(item.createdAt)],
    ["Approved", formatDate(item.approvedAt)],
    ["Rejected", formatDate(item.rejectedAt)],
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Request Details
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {item.academyName}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={item.status} />
              {item.academyStatus ? (
                <StatusBadge status={item.academyStatus} />
              ) : null}
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                ID: {item.id}
              </span>
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
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {label}
              </div>
              <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-900">
                {value || "N/A"}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Bio
            </div>
            <div className="mt-2 text-sm leading-7 text-slate-700">
              {item.bio || "No bio provided."}
            </div>
          </div>

          {item.rejectionReason ? (
            <div className="rounded-2xl bg-red-50 p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-red-500">
                Rejection Reason
              </div>
              <div className="mt-2 text-sm font-bold leading-6 text-red-700">
                {item.rejectionReason}
              </div>
            </div>
          ) : null}

          {item.crDocument ? (
            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                CR Document
              </div>
              <a
                href={item.crDocument}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
              >
                <FileText className="h-4 w-4" />
                Open Document
              </a>
            </div>
          ) : null}
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

function RequestCard({
  item,
  onApprove,
  onReject,
  onSuspend,
  onActivate,
  onDelete,
  onView,
  actionLoading,
}) {
  const pending = item.status === "PENDING";
  const approved = item.status === "APPROVED";
  const suspended = item.academyStatus === "SUSPENDED";

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[1fr_96px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
                  <Building2 className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    {item.academyName}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={item.status} />

                    {item.academyStatus ? (
                      <StatusBadge status={item.academyStatus} />
                    ) : null}

                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pending ? (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </>
              ) : null}

              {approved && !suspended ? (
                <button
                  type="button"
                  onClick={onSuspend}
                  disabled={actionLoading || !item.academyId}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
                >
                  <Ban className="h-4 w-4" />
                  Suspend
                </button>
              ) : null}

              {approved && suspended ? (
                <button
                  type="button"
                  onClick={onActivate}
                  disabled={actionLoading || !item.academyId}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Activate
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <InfoPill icon={Mail} text={item.email} />
            <InfoPill icon={Phone} text={item.phone} />
            <InfoPill icon={MapPin} text={item.location} />
            <InfoPill
              icon={User2}
              text={`${item.fullName} • ${item.designation}`}
            />
            {item.website ? (
              <InfoPill icon={Globe} text={item.website} />
            ) : null}
            {item.instagram ? (
              <InfoPill icon={Camera} text={item.instagram} />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                CR Number
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {item.crNumber}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Declaration
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {item.agreed ? "Accepted" : "Not Accepted"}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Address
              </div>
              <div className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-900">
                {item.address}
              </div>
            </div>
          </div>

          {item.bio ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Academy Bio
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-700">
                {item.bio}
              </p>
            </div>
          ) : null}

          {item.status === "APPROVED" && item.tempPassword ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Temporary Password
              </div>
              <div className="mt-2 text-lg font-black tracking-wide text-emerald-800">
                {item.tempPassword}
              </div>
            </div>
          ) : null}

          {item.status === "REJECTED" && item.rejectionReason ? (
            <div className="mt-5 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-red-600">
                Rejection Reason
              </div>
              <div className="mt-2 text-sm font-bold text-red-700">
                {item.rejectionReason}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex border-t border-slate-100 p-4 xl:flex-col xl:border-l xl:border-t-0">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 xl:flex-none"
            title="View"
            aria-label="View request"
          >
            <Eye className="h-5 w-5" />
          </button>

          {item.crDocument ? (
            <a
              href={item.crDocument}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 xl:flex-none"
              title="Open Document"
              aria-label="Open document"
            >
              <FileText className="h-5 w-5" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50 xl:flex-none"
            title="Delete"
            aria-label="Delete request"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function SelectBox({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff7a3d]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [viewItem, setViewItem] = useState(null);

  const [approveState, setApproveState] = useState({
    open: false,
    item: null,
  });

  const [rejectState, setRejectState] = useState({
    open: false,
    item: null,
    reason: "",
  });

  const [deleteState, setDeleteState] = useState({
    open: false,
    item: null,
  });

  const [suspendState, setSuspendState] = useState({
    open: false,
    item: null,
    nextStatus: "",
  });

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const res = await api.get("/super-admin/academy-registrations");
      const rows = extractRegistrations(res);

      setRequests(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load academy requests.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.academyName,
          item.email,
          item.phone,
          item.location,
          item.fullName,
          item.designation,
          item.crNumber,
          item.website,
          item.instagram,
          item.status,
          item.academyStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const hasFilters = Boolean(search || statusFilter !== "ALL");

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  function openApprove(item) {
    setApproveState({ open: true, item });
  }

  function closeApprove() {
    if (actionLoading) return;
    setApproveState({ open: false, item: null });
  }

  async function confirmApprove() {
    const id = approveState?.item?.id;
    if (!id) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const res = await api.patch(
        `/super-admin/academy-registrations/${id}/approve`,
      );

      const tempPassword = res?.data?.tempPassword || "";

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "APPROVED",
                tempPassword,
                adminUser: res?.data?.adminUser || null,
                academy: res?.data?.academy || item.academy || null,
                academyId:
                  res?.data?.academy?._id ||
                  res?.data?.academy?.id ||
                  item.academyId ||
                  "",
                academyStatus: String(
                  res?.data?.academy?.status || "ACTIVE",
                ).toUpperCase(),
              }
            : item,
        ),
      );

      setMessage("Academy registration approved successfully.");
      closeApprove();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setActionLoading(false);
    }
  }

  function openReject(item) {
    setRejectState({ open: true, item, reason: "" });
  }

  function closeReject() {
    if (actionLoading) return;
    setRejectState({ open: false, item: null, reason: "" });
  }

  async function confirmReject() {
    const id = rejectState?.item?.id;
    if (!id) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const reason = String(rejectState.reason || "").trim();

      await api.patch(`/super-admin/academy-registrations/${id}/reject`, {
        reason,
      });

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "REJECTED",
                rejectionReason: reason,
              }
            : item,
        ),
      );

      setMessage("Academy registration rejected successfully.");
      closeReject();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject request.");
    } finally {
      setActionLoading(false);
    }
  }

  function openDelete(item) {
    setDeleteState({ open: true, item });
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteState({ open: false, item: null });
  }

  async function confirmDelete() {
    const id = deleteState?.item?.id;
    if (!id) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/super-admin/academy-registrations/${id}`);

      setRequests((prev) => prev.filter((item) => item.id !== id));
      setMessage("Academy registration request deleted successfully.");
      closeDelete();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete request.");
    } finally {
      setDeleting(false);
    }
  }

  function openSuspend(item) {
    setSuspendState({
      open: true,
      item,
      nextStatus: "SUSPENDED",
    });
  }

  function openActivate(item) {
    setSuspendState({
      open: true,
      item,
      nextStatus: "ACTIVE",
    });
  }

  function closeSuspend() {
    if (actionLoading) return;

    setSuspendState({
      open: false,
      item: null,
      nextStatus: "",
    });
  }

  async function confirmSuspendChange() {
    const academyId = suspendState?.item?.academyId;
    const nextStatus = suspendState?.nextStatus;

    if (!academyId || !nextStatus) {
      setError("Academy ID is missing for this request.");
      closeSuspend();
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.put(`/super-admin/academies/${academyId}/status`, {
        status: nextStatus,
      });

      setRequests((prev) =>
        prev.map((item) =>
          item.id === suspendState.item.id
            ? {
                ...item,
                academyStatus: nextStatus,
                academy: item.academy
                  ? {
                      ...item.academy,
                      status: nextStatus,
                    }
                  : item.academy,
              }
            : item,
        ),
      );

      setMessage(
        nextStatus === "SUSPENDED"
          ? "Academy suspended successfully."
          : "Academy activated successfully.",
      );

      closeSuspend();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${
            nextStatus === "SUSPENDED" ? "suspend" : "activate"
          } academy.`,
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm sm:rounded-[34px]">
          <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/2 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Provider Onboarding
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Academy Approval Requests
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Review academy registration submissions, approve providers,
                  reject invalid requests, suspend active academies, and remove
                  old records from the database.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadRequests({ silent: true })}
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
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Building2}
            title="Total Requests"
            value={loading ? "..." : stats.total}
            subtitle="All submissions"
            tone="orange"
          />
          <StatCard
            icon={Clock3}
            title="Pending"
            value={loading ? "..." : stats.pending}
            subtitle="Awaiting review"
            tone="amber"
          />
          <StatCard
            icon={BadgeCheck}
            title="Approved"
            value={loading ? "..." : stats.approved}
            subtitle="Providers created"
            tone="emerald"
          />
          <StatCard
            icon={XCircle}
            title="Rejected"
            value={loading ? "..." : stats.rejected}
            subtitle="Declined requests"
            tone="red"
          />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
                  placeholder="Search academy, email, phone, CR number, contact..."
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Status
              </label>
              <SelectBox
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </SelectBox>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Registration Requests
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRequests.length} of {requests.length} records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status="PENDING" />
              <StatusBadge status="APPROVED" />
              <StatusBadge status="REJECTED" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[300px] animate-pulse rounded-[28px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((item) => (
                <RequestCard
                  key={item.id}
                  item={item}
                  actionLoading={actionLoading}
                  onApprove={() => openApprove(item)}
                  onReject={() => openReject(item)}
                  onSuspend={() => openSuspend(item)}
                  onActivate={() => openActivate(item)}
                  onDelete={() => openDelete(item)}
                  onView={() => setViewItem(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>

      <RequestDetailsModal
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />

      <ConfirmDialog
        open={approveState.open}
        title="Approve Academy Request"
        message={`This will approve ${
          approveState?.item?.academyName || "this academy"
        }, create the academy account, and generate a temporary admin password.`}
        confirmText="Approve Request"
        loading={actionLoading}
        onConfirm={confirmApprove}
        onCancel={closeApprove}
      />

      <RejectDialog
        open={rejectState.open}
        loading={actionLoading}
        value={rejectState.reason}
        onChange={(reason) =>
          setRejectState((prev) => ({
            ...prev,
            reason,
          }))
        }
        onCancel={closeReject}
        onConfirm={confirmReject}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Academy Request"
        message={`This will permanently delete ${
          deleteState?.item?.academyName || "this request"
        } from the database. This action cannot be undone.`}
        confirmText="Delete Request"
        loading={deleting}
        danger
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />

      <ConfirmDialog
        open={suspendState.open}
        title={
          suspendState.nextStatus === "SUSPENDED"
            ? "Suspend Academy"
            : "Activate Academy"
        }
        message={`This will ${
          suspendState.nextStatus === "SUSPENDED" ? "suspend" : "activate"
        } ${suspendState?.item?.academyName || "this academy"}. Continue?`}
        confirmText={
          suspendState.nextStatus === "SUSPENDED"
            ? "Suspend Academy"
            : "Activate Academy"
        }
        loading={actionLoading}
        danger={suspendState.nextStatus === "SUSPENDED"}
        onConfirm={confirmSuspendChange}
        onCancel={closeSuspend}
      />
    </main>
  );
}

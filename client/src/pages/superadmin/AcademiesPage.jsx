// client/src/pages/superadmin/AcademiesPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  CheckCircle2,
  Ban,
  Filter,
  Building2,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Star,
  AlertCircle,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  Trash2,
  X,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  KeyRound,
  LockKeyhole,
  Copy,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  if (value.startsWith("uploads/")) return `${base}/${value}`;

  return `${base}/uploads/${value}`;
}

function normalizeAcademy(item) {
  return {
    id: item?._id || item?.id || "",
    name: item?.name || "Untitled Academy",
    slug: item?.slug || "",
    email: item?.email || item?.contactEmail || "-",
    phone: item?.phone || item?.contactNumber || "-",
    city: item?.city || item?.location?.city || "Doha",
    address: item?.address || "",
    website: item?.website || "",
    description: item?.description || "",
    logo: item?.logo || item?.image || "",
    activities: toNumber(
      item?.activities ?? item?.activitiesCount ?? item?.stats?.activities ?? 0,
    ),
    branches: toNumber(
      item?.branches ?? item?.branchesCount ?? item?.stats?.branches ?? 0,
    ),
    status: String(item?.status || "INACTIVE").toUpperCase(),
    featured: Boolean(item?.featured || item?.isFeatured),
    createdAt: item?.createdAt ? String(item.createdAt).slice(0, 10) : "-",

    adminUserId:
      item?.adminUserId?._id ||
      item?.adminUserId?.id ||
      item?.adminUserId ||
      item?.admin?._id ||
      item?.admin?.id ||
      "",
    adminName:
      item?.adminUserId?.fullName ||
      item?.adminUserId?.name ||
      item?.admin?.fullName ||
      item?.admin?.name ||
      "",
    adminEmail:
      item?.adminUserId?.email || item?.admin?.email || item?.adminEmail || "",

    tempPassword:
      item?.tempPassword ||
      item?.temporaryPassword ||
      item?.adminTempPassword ||
      item?.lastTempPassword ||
      "",
  };
}

function extractAcademies(payload) {
  const root = payload?.data || payload || {};
  const list =
    root?.academies || root?.items || root?.rows || root?.results || root;

  return toArray(list).map(normalizeAcademy);
}

function formatDate(value) {
  if (!value || value === "-") return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ value, size = "sm" }) {
  const text = String(value || "INACTIVE").toUpperCase();

  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
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
        styles[text] || styles.INACTIVE
      } ${sizeClass}`}
    >
      {text}
    </span>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 truncate text-2xl font-black tracking-tight text-slate-900">
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

function InfoPill({ icon: Icon, text }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{text || "N/A"}</span>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, tone = "slate" }) {
  const tones = {
    orange: "bg-orange-50 text-orange-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone] || tones.slate}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] opacity-80">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-slate-900">{value}</div>
    </div>
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

function PasswordDialog({
  open,
  academy,
  value,
  loading,
  onChange,
  onCancel,
  onConfirm,
}) {
  if (!open || !academy) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Change Academy Admin Password
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Set a new password for the academy admin account linked with{" "}
              <strong>{academy.name}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block">
          <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            New Password
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter new password"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
            />
          </div>
        </label>

        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 ring-1 ring-amber-200">
          Save this password safely. For security, the backend should only store
          the hashed password. If you want the password visible later, store a
          temporary display field separately.
        </div>

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
            disabled={loading || !value.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff7a3d] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ open, academy, onClose, onCopy }) {
  if (!open || !academy) return null;

  const rows = [
    ["Academy ID", academy.id],
    ["Name", academy.name],
    ["Slug", academy.slug || "N/A"],
    ["Status", academy.status],
    ["Featured", academy.featured ? "Yes" : "No"],
    ["Email", academy.email],
    ["Phone", academy.phone],
    ["City", academy.city],
    ["Address", academy.address || "N/A"],
    ["Website", academy.website || "N/A"],
    ["Activities", academy.activities],
    ["Branches", academy.branches],
    ["Created", formatDate(academy.createdAt)],
    ["Admin Name", academy.adminName || "N/A"],
    ["Admin Email", academy.adminEmail || "N/A"],
    ["Temporary Password", academy.tempPassword || "Not available"],
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Academy Details
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {academy.name}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={academy.status} />
              {academy.featured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-violet-700 ring-1 ring-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
              ) : null}
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

              <div className="mt-2 flex items-start justify-between gap-2">
                <div className="break-words text-sm font-bold leading-6 text-slate-900">
                  {value || "N/A"}
                </div>

                {label === "Temporary Password" && academy.tempPassword ? (
                  <button
                    type="button"
                    onClick={() => onCopy(academy.tempPassword)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-100"
                    title="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2 lg:col-span-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Description
            </div>
            <div className="mt-2 text-sm leading-7 text-slate-700">
              {academy.description || "No description available."}
            </div>
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

function EmptyState({ onClear }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Building2 className="h-7 w-7" />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-900">
        No academies found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try changing the search keyword or filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <RotateCcw className="h-4 w-4" />
        Clear Filters
      </button>
    </div>
  );
}

function LoadingAcademyCard() {
  return (
    <div className="h-[320px] animate-pulse rounded-[28px] bg-slate-100" />
  );
}

function AcademyCard({
  academy,
  actionLoading,
  onApprove,
  onSuspend,
  onActivate,
  onToggleFeatured,
  onView,
  onEdit,
  onDelete,
  onChangePassword,
  onCopyPassword,
}) {
  const logoSrc = normalizeImage(academy.logo);
  const isActive = academy.status === "ACTIVE";
  const isSuspended = academy.status === "SUSPENDED";

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[1fr_96px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-50 text-[#ff7a3d]">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt={academy.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-7 w-7" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">
                    {academy.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge value={academy.status} />
                    {academy.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-violet-700 ring-1 ring-violet-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Featured
                      </span>
                    ) : null}
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                      ID: {academy.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isActive ? (
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
              ) : null}

              {isSuspended ? (
                <button
                  type="button"
                  onClick={onActivate}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Activate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSuspend}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
                >
                  <Ban className="h-4 w-4" />
                  Suspend
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <InfoPill icon={Mail} text={academy.email} />
            <InfoPill icon={Phone} text={academy.phone} />
            <InfoPill icon={MapPin} text={academy.city} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              label="Activities"
              value={academy.activities}
              icon={LayoutGrid}
              tone="blue"
            />
            <MetricTile
              label="Branches"
              value={academy.branches}
              icon={Building2}
              tone="emerald"
            />
            <MetricTile
              label="Created"
              value={formatDate(academy.createdAt)}
              icon={CalendarDays}
              tone="amber"
            />
            <MetricTile
              label="Visibility"
              value={academy.featured ? "Featured" : "Standard"}
              icon={Star}
              tone={academy.featured ? "violet" : "slate"}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Temporary Password
                </div>
                <div className="mt-2 break-all text-sm font-black text-slate-900">
                  {academy.tempPassword || "Not available"}
                </div>
              </div>

              {academy.tempPassword ? (
                <button
                  type="button"
                  onClick={onCopyPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex border-t border-slate-100 p-4 xl:flex-col xl:border-l xl:border-t-0">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 xl:flex-none"
            title="View"
          >
            <Eye className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 xl:flex-none"
            title="Edit"
          >
            <Pencil className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onChangePassword}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-violet-600 transition hover:bg-violet-50 xl:flex-none"
            title="Change Password"
          >
            <KeyRound className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleFeatured}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-amber-600 transition hover:bg-amber-50 xl:flex-none"
            title={academy.featured ? "Remove Featured" : "Mark Featured"}
          >
            <Star className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50 xl:flex-none"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AcademiesPage() {
  const navigate = useNavigate();

  const [academies, setAcademies] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [viewAcademy, setViewAcademy] = useState(null);
  const [deleteState, setDeleteState] = useState({
    open: false,
    academy: null,
  });
  const [statusState, setStatusState] = useState({
    open: false,
    academy: null,
    nextStatus: "",
  });
  const [passwordState, setPasswordState] = useState({
    open: false,
    academy: null,
    password: "",
  });

  const loadAcademies = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const res = await api.get("/super-admin/academies");
      const normalized = extractAcademies(res);

      setAcademies(normalized);
    } catch (err) {
      setAcademies([]);
      setError(err?.response?.data?.message || "Failed to load academies.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  const cities = useMemo(() => {
    const unique = [...new Set(academies.map((a) => a.city).filter(Boolean))];
    return ["ALL", ...unique.sort()];
  }, [academies]);

  const stats = useMemo(() => {
    return {
      total: academies.length,
      active: academies.filter((a) => a.status === "ACTIVE").length,
      pending: academies.filter((a) => a.status === "PENDING").length,
      suspended: academies.filter((a) => a.status === "SUSPENDED").length,
      featured: academies.filter((a) => a.featured).length,
    };
  }, [academies]);

  const filteredAcademies = useMemo(() => {
    const q = search.trim().toLowerCase();

    return academies.filter((academy) => {
      const matchesSearch =
        !q ||
        [
          academy.name,
          academy.email,
          academy.phone,
          academy.city,
          academy.status,
          academy.adminName,
          academy.adminEmail,
          academy.slug,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "ALL" ? true : academy.status === statusFilter;

      const matchesCity =
        cityFilter === "ALL" ? true : academy.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [academies, search, statusFilter, cityFilter]);

  const hasFilters = Boolean(
    search || statusFilter !== "ALL" || cityFilter !== "ALL",
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setCityFilter("ALL");
  }

  function openStatus(academy, nextStatus) {
    setStatusState({
      open: true,
      academy,
      nextStatus,
    });
  }

  function closeStatus() {
    if (actionLoading) return;
    setStatusState({ open: false, academy: null, nextStatus: "" });
  }

  async function confirmStatus() {
    const id = statusState?.academy?.id;
    const nextStatus = statusState?.nextStatus;

    if (!id || !nextStatus) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.put(`/super-admin/academies/${id}/status`, {
        status: nextStatus,
      });

      setAcademies((prev) =>
        prev.map((academy) =>
          academy.id === id ? { ...academy, status: nextStatus } : academy,
        ),
      );

      setMessage(`Academy status updated to ${nextStatus}.`);
      closeStatus();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update academy status.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFeatured(academy) {
    if (!academy?.id) return;

    const nextFeatured = !academy.featured;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.put(`/super-admin/academies/${academy.id}`, {
        featured: nextFeatured,
      });

      setAcademies((prev) =>
        prev.map((item) =>
          item.id === academy.id ? { ...item, featured: nextFeatured } : item,
        ),
      );

      setMessage(
        nextFeatured
          ? "Academy marked as featured."
          : "Academy removed from featured.",
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update featured status.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function openDelete(academy) {
    setDeleteState({ open: true, academy });
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteState({ open: false, academy: null });
  }

  async function confirmDelete() {
    const id = deleteState?.academy?.id;
    if (!id) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/super-admin/academies/${id}`);

      setAcademies((prev) => prev.filter((academy) => academy.id !== id));
      setMessage("Academy deleted successfully from database.");
      closeDelete();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete academy.");
    } finally {
      setDeleting(false);
    }
  }

  function openPassword(academy) {
    setPasswordState({
      open: true,
      academy,
      password: "",
    });
  }

  function closePassword() {
    if (passwordLoading) return;
    setPasswordState({ open: false, academy: null, password: "" });
  }

  async function confirmPassword() {
    const academyId = passwordState?.academy?.id;
    const password = String(passwordState.password || "").trim();

    if (!academyId || !password) return;

    try {
      setPasswordLoading(true);
      setError("");
      setMessage("");

      const res = await api.patch(
        `/super-admin/academies/${academyId}/password`,
        {
          password,
        },
      );

      const returnedPassword =
        res?.data?.tempPassword || res?.data?.password || password;

      setAcademies((prev) =>
        prev.map((academy) =>
          academy.id === academyId
            ? { ...academy, tempPassword: returnedPassword }
            : academy,
        ),
      );

      setMessage("Academy admin password updated successfully.");
      closePassword();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to update academy admin password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setMessage("Temporary password copied.");
    } catch {
      setError("Unable to copy password.");
    }
  }

  function openView(academy) {
    setViewAcademy(academy);
  }

  function openEdit(id) {
    navigate(`/super-admin/academies/${id}/edit`);
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
                  KidGage Partner Control
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Academy Management
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Manage all academy partners, approvals, suspension, featured
                  visibility, admin passwords, and permanent database deletion.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => loadAcademies({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/super-admin/requests")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
                >
                  <Plus className="h-4 w-4" />
                  Add / Approve Academy
                </button>
              </div>
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={Building2}
            title="Total Academies"
            value={loading ? "..." : stats.total}
            subtitle="All partners"
            tone="orange"
          />
          <StatCard
            icon={CheckCircle2}
            title="Active"
            value={loading ? "..." : stats.active}
            subtitle="Live academies"
            tone="emerald"
          />
          <StatCard
            icon={AlertCircle}
            title="Pending"
            value={loading ? "..." : stats.pending}
            subtitle="Awaiting approval"
            tone="amber"
          />
          <StatCard
            icon={Ban}
            title="Suspended"
            value={loading ? "..." : stats.suspended}
            subtitle="Blocked academies"
            tone="red"
          />
          <StatCard
            icon={Star}
            title="Featured"
            value={loading ? "..." : stats.featured}
            subtitle="Homepage visibility"
            tone="violet"
          />
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_auto]">
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
                  placeholder="Search academy, email, phone, city, admin..."
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
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </SelectBox>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                City
              </label>
              <SelectBox
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city === "ALL" ? "All Cities" : city}
                  </option>
                ))}
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
                Academy Records
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredAcademies.length} of {academies.length}{" "}
                records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value="ACTIVE" />
              <StatusBadge value="PENDING" />
              <StatusBadge value="SUSPENDED" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingAcademyCard key={index} />
              ))}
            </div>
          ) : filteredAcademies.length > 0 ? (
            <div className="space-y-4">
              {filteredAcademies.map((academy) => (
                <AcademyCard
                  key={academy.id}
                  academy={academy}
                  actionLoading={actionLoading}
                  onApprove={() => openStatus(academy, "ACTIVE")}
                  onActivate={() => openStatus(academy, "ACTIVE")}
                  onSuspend={() => openStatus(academy, "SUSPENDED")}
                  onToggleFeatured={() => toggleFeatured(academy)}
                  onView={() => openView(academy)}
                  onEdit={() => openEdit(academy.id)}
                  onDelete={() => openDelete(academy)}
                  onChangePassword={() => openPassword(academy)}
                  onCopyPassword={() => copyText(academy.tempPassword)}
                />
              ))}
            </div>
          ) : (
            <EmptyState onClear={clearFilters} />
          )}
        </section>
      </div>

      <DetailsModal
        open={Boolean(viewAcademy)}
        academy={viewAcademy}
        onClose={() => setViewAcademy(null)}
        onCopy={copyText}
      />

      <ConfirmDialog
        open={statusState.open}
        title={
          statusState.nextStatus === "SUSPENDED"
            ? "Suspend Academy"
            : "Activate Academy"
        }
        message={`This will update ${
          statusState?.academy?.name || "this academy"
        } to ${statusState.nextStatus}. Continue?`}
        confirmText={
          statusState.nextStatus === "SUSPENDED"
            ? "Suspend Academy"
            : "Activate Academy"
        }
        loading={actionLoading}
        danger={statusState.nextStatus === "SUSPENDED"}
        onConfirm={confirmStatus}
        onCancel={closeStatus}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Academy"
        message={`This will permanently delete ${
          deleteState?.academy?.name || "this academy"
        } from the database. This action cannot be undone.`}
        confirmText="Delete Academy"
        loading={deleting}
        danger
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />

      <PasswordDialog
        open={passwordState.open}
        academy={passwordState.academy}
        value={passwordState.password}
        loading={passwordLoading}
        onChange={(password) =>
          setPasswordState((prev) => ({
            ...prev,
            password,
          }))
        }
        onCancel={closePassword}
        onConfirm={confirmPassword}
      />
    </main>
  );
}

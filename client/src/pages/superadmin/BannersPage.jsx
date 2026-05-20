// client/src/pages/superadmin/BannersPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Upload,
  RotateCcw,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Monitor,
  Smartphone,
  Home,
  Link as LinkIcon,
  Wallet,
} from "lucide-react";
import { api } from "../../lib/api.js";

const tabs = [
  { key: "home", label: "Home Banner", icon: Home },
  { key: "desktop", label: "Desktop Banner", icon: Monitor },
  { key: "mobile", label: "Mobile Banner", icon: Smartphone },
];

const emptyForm = {
  id: "",
  title: "",
  link: "",
  image: "",
  previewImage: "",
  imageFile: null,
  startDate: "",
  endDate: "",
  fees: "",
  active: true,
};

function isBlobUrl(value) {
  return String(value || "").startsWith("blob:");
}

function revokeBlobUrl(value) {
  if (isBlobUrl(value)) {
    try {
      URL.revokeObjectURL(value);
    } catch {
      // ignore
    }
  }
}

function normalizeBannerImage(imageValue) {
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (!imageValue) return "";

  const image = String(imageValue).trim();

  if (image.startsWith("blob:")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${base}${image}`;
  if (image.startsWith("uploads/")) return `${base}/${image}`;

  return `${base}/uploads/banners/${image}`;
}

function formatDate(value) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      className={`relative h-8 w-14 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
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

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-[#ff7a3d] text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)]"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        {hint ? (
          <span className="text-xs font-medium text-slate-400">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d] ${className}`}
    />
  );
}

function EmptyState({ activeTab, onAdd }) {
  const tab = tabs.find((item) => item.key === activeTab);
  const Icon = tab?.icon || ImageIcon;

  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        No campaigns found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Add a new banner campaign for the selected section.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
      >
        <Plus className="h-4 w-4" />
        Add Campaign
      </button>
    </div>
  );
}

function CampaignModal({
  open,
  mode,
  form,
  saving,
  activeTab,
  onClose,
  onChange,
  onFileChange,
  onSubmit,
}) {
  const [previewError, setPreviewError] = useState(false);
  const displayImage = form.previewImage || form.image;

  useEffect(() => {
    setPreviewError(false);
  }, [displayImage, open]);

  if (!open) return null;

  const title = mode === "edit" ? "Edit Campaign" : "Add Campaign";
  const tabLabel =
    tabs.find((item) => item.key === activeTab)?.label || "Banner";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              {tabLabel}
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Upload banner image, campaign link, dates, fees, and visibility.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <Field label="Campaign Name" hint="Required">
              <Input
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="Enter campaign name"
              />
            </Field>

            <Field label="Campaign Link">
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.link}
                  onChange={(e) => onChange("link", e.target.value)}
                  placeholder="https://..."
                  className="pl-11"
                />
              </div>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start Date">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onChange("startDate", e.target.value)}
                />
              </Field>

              <Field label="End Date">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => onChange("endDate", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Campaign Fees">
              <div className="relative">
                <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.fees}
                  onChange={(e) => onChange("fees", e.target.value)}
                  placeholder="Optional"
                  className="pl-11"
                />
              </div>
            </Field>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Visibility Status
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Active campaigns can appear on the public website.
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Toggle
                    checked={form.active}
                    onChange={() => onChange("active", !form.active)}
                    disabled={saving}
                  />
                  <StatusBadge active={form.active} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <Field
              label={activeTab === "mobile" ? "Banner Image" : "Banner Image"}
              hint={
                activeTab === "mobile"
                  ? "Mobile optimized"
                  : "1055 x 275 recommended"
              }
            >
              <label className="group flex min-h-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#ff7a3d] hover:bg-orange-50/30">
                {displayImage && !previewError ? (
                  <img
                    src={displayImage}
                    alt="Campaign preview"
                    className="h-full min-h-[320px] w-full object-cover"
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <div className="px-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:text-[#ff7a3d]">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="mt-4 text-sm font-bold text-slate-700">
                      Click to upload banner image
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      PNG, JPG, WEBP supported
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>
            </Field>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Preview Summary
              </div>

              <div className="mt-3 text-lg font-black text-slate-900">
                {form.title || "Campaign title"}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge active={form.active} />
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(form.startDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-5 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailsModal({ open, item, onClose }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item?.image, open]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Campaign Details
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {item.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge active={item.active} />
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
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

        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[420px_1fr]">
          <div className="overflow-hidden rounded-[26px] bg-slate-100">
            {item.image && !imgError ? (
              <img
                src={item.image}
                alt={item.title}
                className="h-[360px] w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-[360px] w-full items-center justify-center text-slate-400">
                No Image
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Campaign
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {item.title}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Link
              </div>
              <div className="mt-2 break-all text-sm font-bold text-slate-900">
                {item.link || "#"}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Start Date
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(item.startDate)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  End Date
                </div>
                <div className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(item.endDate)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Fees
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {item.fees || "N/A"}
              </div>
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

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
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
            className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ item, onToggle, onDelete, onEdit, onView, toggling }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item.image]);

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[320px_1fr_auto]">
        <div className="relative min-h-[240px] bg-slate-100 xl:min-h-full">
          {item.image && !imgError ? (
            <img
              src={item.image}
              alt={item.title}
              className="h-full min-h-[240px] w-full object-cover xl:absolute xl:inset-0"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-slate-100 text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}

          <div className="absolute left-4 top-4">
            <StatusBadge active={item.active} />
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                {item.title}
              </h3>

              <div className="mt-3 flex max-w-full items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                <LinkIcon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate break-all">{item.link || "#"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <Toggle
                checked={item.active}
                onChange={onToggle}
                disabled={toggling}
              />
              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Status
                </div>
                <div className="text-sm font-bold text-slate-700">
                  {item.active ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Start
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {formatDate(item.startDate)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                End
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {formatDate(item.endDate)}
              </div>
            </div>

            <div className="rounded-2xl bg-orange-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-orange-500">
                Fees
              </div>
              <div className="mt-2 text-sm font-bold text-slate-900">
                {item.fees || "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-slate-100 p-4 xl:w-[96px] xl:flex-col xl:border-l xl:border-t-0">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 xl:flex-none"
            title="View"
            aria-label="View campaign"
          >
            <Eye className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 xl:flex-none"
            title="Edit"
            aria-label="Edit campaign"
          >
            <Pencil className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50 xl:flex-none"
            title="Delete"
            aria-label="Delete campaign"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function BannersPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [campaignsByTab, setCampaignsByTab] = useState({
    home: [],
    desktop: [],
    mobile: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState(emptyForm);

  const [viewItem, setViewItem] = useState(null);
  const [deleteState, setDeleteState] = useState({
    open: false,
    item: null,
  });

  const loadCampaigns = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const { data } = await api.get("/super-admin/banners");
      const rows = Array.isArray(data?.banners) ? data.banners : [];

      const grouped = { home: [], desktop: [], mobile: [] };

      rows.forEach((item) => {
        const tab = String(item?.bannerType || "home").toLowerCase();

        if (!grouped[tab]) grouped[tab] = [];

        grouped[tab].push({
          id: item._id || item.id,
          title: item.title || "",
          link: item.link || "",
          image: normalizeBannerImage(item.image || ""),
          startDate: item.startDate ? String(item.startDate).slice(0, 10) : "",
          endDate: item.endDate ? String(item.endDate).slice(0, 10) : "",
          fees: item.fees || "",
          active: Boolean(item.active),
          bannerType: tab,
          createdAt: item.createdAt || "",
          updatedAt: item.updatedAt || "",
        });
      });

      setCampaignsByTab(grouped);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load banners.");
      setCampaignsByTab({ home: [], desktop: [], mobile: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    return () => {
      revokeBlobUrl(form.previewImage);
    };
  }, [form.previewImage]);

  const campaigns = useMemo(
    () => campaignsByTab[activeTab] || [],
    [campaignsByTab, activeTab],
  );

  const stats = useMemo(() => {
    const all = campaignsByTab[activeTab] || [];
    return {
      total: all.length,
      active: all.filter((x) => x.active).length,
      inactive: all.filter((x) => !x.active).length,
    };
  }, [campaignsByTab, activeTab]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();

    return campaigns.filter((item) => {
      const matchesSearch =
        !q ||
        [item.title, item.link, item.fees, item.startDate, item.endDate]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && item.active) ||
        (statusFilter === "INACTIVE" && !item.active);

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const hasFilters = Boolean(search || statusFilter);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
  }

  function openAddModal() {
    revokeBlobUrl(form.previewImage);

    setModalMode("add");
    setForm({
      ...emptyForm,
      active: true,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function openEditModal(item) {
    revokeBlobUrl(form.previewImage);

    setModalMode("edit");
    setForm({
      id: item.id,
      title: item.title,
      link: item.link,
      image: item.image,
      previewImage: "",
      imageFile: null,
      startDate: item.startDate,
      endDate: item.endDate,
      fees: item.fees || "",
      active: item.active,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    revokeBlobUrl(form.previewImage);
    setModalOpen(false);
    setForm(emptyForm);
  }

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    revokeBlobUrl(form.previewImage);

    const imageUrl = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      previewImage: imageUrl,
      imageFile: file,
    }));

    event.target.value = "";
  }

  async function handleSubmitModal() {
    if (!form.title.trim()) {
      setError("Campaign name is required.");
      return;
    }

    if (!form.link.trim()) {
      setError("Campaign link is required.");
      return;
    }

    if (modalMode === "add" && !form.imageFile) {
      setError("Banner image is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("link", form.link.trim());
      payload.append("startDate", form.startDate || "");
      payload.append("endDate", form.endDate || "");
      payload.append("fees", form.fees || "");
      payload.append("bannerType", activeTab);
      payload.append("active", String(form.active));

      if (form.imageFile) {
        payload.append("image", form.imageFile);
      }

      if (modalMode === "edit") {
        await api.put(`/super-admin/banners/${form.id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Banner campaign updated successfully.");
      } else {
        await api.post("/super-admin/banners", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Banner campaign created successfully.");
      }

      closeModal();
      await loadCampaigns({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save banner.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(id) {
    const current = campaigns.find((x) => x.id === id);
    if (!current) return;

    const nextActive = !current.active;

    setCampaignsByTab((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((item) =>
        item.id === id ? { ...item, active: nextActive } : item,
      ),
    }));

    try {
      setTogglingId(id);
      setError("");

      await api.patch(`/super-admin/banners/${id}/toggle`, {
        active: nextActive,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update banner status.",
      );
      await loadCampaigns({ silent: true });
    } finally {
      setTogglingId("");
    }
  }

  function openDelete(item) {
    setDeleteState({
      open: true,
      item,
    });
  }

  function closeDelete() {
    if (deleting) return;

    setDeleteState({
      open: false,
      item: null,
    });
  }

  async function confirmDelete() {
    const id = deleteState?.item?.id;
    if (!id) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      await api.delete(`/super-admin/banners/${id}`);

      setMessage("Banner campaign deleted successfully.");
      closeDelete();
      await loadCampaigns({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete banner.");
    } finally {
      setDeleting(false);
    }
  }

  const activeTabLabel =
    tabs.find((item) => item.key === activeTab)?.label || "Banner";

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
                  KidGage Campaign Center
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Banners
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Manage homepage, desktop, and mobile banner campaigns shown on
                  the public KidGage website.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => loadCampaigns({ silent: true })}
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
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Campaign
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

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">Banner Type</h3>
              <p className="mt-1 text-sm text-slate-500">
                Currently managing: {activeTabLabel}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {tabs.map((tab) => (
                <TabButton
                  key={tab.key}
                  tab={tab}
                  active={activeTab === tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    clearFilters();
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={ImageIcon}
            title="Total Campaigns"
            value={loading ? "..." : stats.total}
            subtitle={activeTabLabel}
            tone="orange"
          />
          <StatCard
            icon={CheckCircle2}
            title="Active"
            value={loading ? "..." : stats.active}
            subtitle="Visible campaigns"
            tone="emerald"
          />
          <StatCard
            icon={Clock3}
            title="Inactive"
            value={loading ? "..." : stats.inactive}
            subtitle="Hidden campaigns"
            tone="slate"
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
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaign title, link, fees, date..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff7a3d]"
              >
                <option value="">All Campaigns</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
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
                {activeTabLabel} Campaigns
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredCampaigns.length} of {campaigns.length}{" "}
                campaigns.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge active />
              <StatusBadge active={false} />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[260px] animate-pulse rounded-[28px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="space-y-4">
              {filteredCampaigns.map((item) => (
                <CampaignCard
                  key={item.id}
                  item={item}
                  toggling={togglingId === item.id}
                  onToggle={() => toggleCampaign(item.id)}
                  onView={() => setViewItem(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => openDelete(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState activeTab={activeTab} onAdd={openAddModal} />
          )}
        </section>
      </div>

      <CampaignModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        saving={saving}
        activeTab={activeTab}
        onClose={closeModal}
        onChange={handleChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmitModal}
      />

      <CampaignDetailsModal
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Campaign"
        message={`This will permanently delete ${
          deleteState?.item?.title || "this campaign"
        }. This action cannot be undone.`}
        confirmText="Delete Campaign"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />
    </main>
  );
}

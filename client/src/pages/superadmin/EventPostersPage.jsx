// client/src/pages/superadmin/EventPostersPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  Upload,
  Search,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { api } from "../../lib/api.js";

const emptyForm = {
  id: "",
  title: "",
  description: "",
  link: "",
  image: "",
  previewImage: "",
  imageFile: null,
  startDate: "",
  endDate: "",
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

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("blob:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  if (value.startsWith("uploads/")) return `${base}/${value}`;
  if (value.includes("/")) return `${base}/${value}`;

  return `${base}/uploads/events/${value}`;
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  return `https://${raw}`;
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

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "No date set";
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
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

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <ImageIcon className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        No event posters found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create your first event poster to show campaigns, seasonal events, or
        featured KidGage announcements.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
      >
        <Plus className="h-4 w-4" />
        Add Event Poster
      </button>
    </div>
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

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d] ${className}`}
    />
  );
}

function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = useState(false);
  const safe = String(text || "").trim();

  if (!safe) {
    return <p className="text-sm text-slate-400">No description added.</p>;
  }

  const isLong = safe.length > 180;
  const shortText = isLong ? `${safe.slice(0, 180).trim()}...` : safe;

  return (
    <div>
      <p className="text-sm leading-7 text-slate-600">
        {expanded ? safe : shortText}
      </p>

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-bold text-[#ff7a3d] hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function EventModal({
  open,
  form,
  saving,
  mode,
  onClose,
  onChange,
  onFileChange,
  onSubmit,
}) {
  const [imgError, setImgError] = useState(false);
  const displayImage = form.previewImage || form.image;

  useEffect(() => {
    setImgError(false);
  }, [displayImage, open]);

  if (!open) return null;

  const title = mode === "edit" ? "Edit Event Poster" : "Add Event Poster";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Event Poster
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Manage event campaign details, poster image, URL, date range, and
              visibility status.
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
            <Field label="Event Name" hint="Required">
              <Input
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="Enter event name"
              />
            </Field>

            <Field label="Event URL" hint="Optional">
              <div className="relative">
                <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.link}
                  onChange={(e) => onChange("link", e.target.value)}
                  placeholder="https://example.com/event"
                  className="pl-11"
                />
              </div>
            </Field>

            <Field label="Description" hint="Required">
              <TextArea
                rows={7}
                value={form.description}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Enter event description"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
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

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Visibility Status
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Active posters can be shown on public pages.
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
            <Field label="Poster Image">
              <label className="group flex min-h-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-slate-50 transition hover:border-[#ff7a3d] hover:bg-orange-50/30">
                {displayImage && !imgError ? (
                  <img
                    src={displayImage}
                    alt="Event preview"
                    className="h-full min-h-[320px] w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="px-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition group-hover:text-[#ff7a3d]">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="mt-4 text-sm font-bold text-slate-700">
                      Click to upload poster
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
                {form.title || "Event title"}
              </div>

              {form.link ? (
                <div className="mt-2 flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold text-[#ff7a3d]">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{form.link}</span>
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge active={form.active} />
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateRange(form.startDate, form.endDate)}
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
                : "Publish Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventDetailsModal({ open, item, onClose }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item?.image, open]);

  if (!open || !item) return null;

  const eventLink = normalizeExternalUrl(item.link);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Event Details
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {item.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge active={item.active} />
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(item.startDate, item.endDate)}
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
                Title
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {item.title}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Event URL
              </div>
              {eventLink ? (
                <a
                  href={eventLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex max-w-full items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-[#ff7a3d] transition hover:bg-orange-100"
                >
                  <LinkIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.link}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ) : (
                <div className="mt-2 text-sm font-semibold text-slate-500">
                  No URL added.
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Description
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                {item.description || "No description."}
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

function EventCard({ item, onToggle, onEdit, onDelete, onView, toggling }) {
  const [imgError, setImgError] = useState(false);
  const eventLink = normalizeExternalUrl(item.link);

  useEffect(() => {
    setImgError(false);
  }, [item.image]);

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-0 xl:grid-cols-[280px_1fr_auto]">
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

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {formatDateRange(item.startDate, item.endDate)}
                </span>

                {eventLink ? (
                  <a
                    href={eventLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#ff7a3d] ring-1 ring-orange-100 transition hover:bg-orange-100"
                  >
                    <LinkIcon className="h-4 w-4 shrink-0" />
                    <span className="max-w-[220px] truncate">{item.link}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : null}
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

          <div className="mt-5">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Description
            </div>
            <DescriptionPreview text={item.description} />
          </div>
        </div>

        <div className="flex border-t border-slate-100 p-4 xl:w-[96px] xl:flex-col xl:border-l xl:border-t-0">
          <button
            type="button"
            onClick={onView}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 xl:flex-none"
            title="View"
            aria-label="View event poster"
          >
            <Eye className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 xl:flex-none"
            title="Edit"
            aria-label="Edit event poster"
          >
            <Pencil className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl text-red-600 transition hover:bg-red-50 xl:flex-none"
            title="Delete"
            aria-label="Delete event poster"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function EventPostersPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [form, setForm] = useState(emptyForm);

  const [viewItem, setViewItem] = useState(null);
  const [deleteState, setDeleteState] = useState({
    open: false,
    item: null,
  });

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const { data } = await api.get("/super-admin/events");
      const rows = Array.isArray(data?.events) ? data.events : [];

      setEvents(
        rows.map((item) => ({
          id: item._id || item.id,
          title: item.title || item.name || "",
          description: item.description || "",
          link: item.link || item.url || "",
          image: normalizeImage(item.image || item.poster || ""),
          startDate: item.startDate ? String(item.startDate).slice(0, 10) : "",
          endDate: item.endDate ? String(item.endDate).slice(0, 10) : "",
          active: Boolean(item.active),
          createdAt: item.createdAt || "",
          updatedAt: item.updatedAt || "",
        })),
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load event posters.");
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    return () => {
      revokeBlobUrl(form.previewImage);
    };
  }, [form.previewImage]);

  const stats = useMemo(() => {
    const total = events.length;
    const active = events.filter((item) => item.active).length;
    const inactive = events.filter((item) => !item.active).length;
    const withLinks = events.filter((item) =>
      String(item.link || "").trim(),
    ).length;

    return {
      total,
      active,
      inactive,
      withLinks,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter((item) => {
      const matchesSearch =
        !q ||
        [item.title, item.description, item.link, item.startDate, item.endDate]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" && item.active) ||
        (statusFilter === "INACTIVE" && !item.active);

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

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
      description: item.description,
      link: item.link || "",
      image: item.image,
      previewImage: "",
      imageFile: null,
      startDate: item.startDate,
      endDate: item.endDate,
      active: item.active,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeModal({ force = false } = {}) {
    if (saving && !force) return;

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

    const preview = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      previewImage: preview,
      imageFile: file,
    }));

    event.target.value = "";
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("Event name is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("link", form.link.trim());
      payload.append("url", form.link.trim());
      payload.append("startDate", form.startDate || "");
      payload.append("endDate", form.endDate || "");
      payload.append("active", String(form.active));

      if (form.imageFile) {
        payload.append("image", form.imageFile);
      }

      if (modalMode === "edit") {
        await api.put(`/super-admin/events/${form.id}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setMessage("Event poster updated successfully.");
      } else {
        await api.post("/super-admin/events", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setMessage("Event poster created successfully.");
      }

      closeModal({ force: true });
      await loadEvents({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save event poster.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    const current = events.find((x) => x.id === id);
    if (!current) return;

    const nextActive = !current.active;

    setEvents((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, active: nextActive } : item,
      ),
    );

    try {
      setTogglingId(id);
      setError("");
      await api.patch(`/super-admin/events/${id}/toggle`, {
        active: nextActive,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update poster status.",
      );
      await loadEvents({ silent: true });
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

      await api.delete(`/super-admin/events/${id}`);

      setMessage("Event poster deleted successfully.");
      closeDelete();
      await loadEvents({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to delete event poster.",
      );
    } finally {
      setDeleting(false);
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
                  KidGage Event Campaigns
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Event Posters
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Create and manage public event poster campaigns for KidGage
                  homepage, activities, seasonal offers, and platform
                  announcements.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => loadEvents({ silent: true })}
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
                  Add Event
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ImageIcon}
            title="Total Posters"
            value={loading ? "..." : stats.total}
            subtitle="All event campaigns"
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
          <StatCard
            icon={LinkIcon}
            title="With URL"
            value={loading ? "..." : stats.withLinks}
            subtitle="Clickable events"
            tone="blue"
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
                  placeholder="Search event name, URL, description, date..."
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
                <option value="">All Posters</option>
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
                All Event Posters
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredEvents.length} of {events.length} posters.
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
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-4">
              {filteredEvents.map((item) => (
                <EventCard
                  key={item.id}
                  item={item}
                  toggling={togglingId === item.id}
                  onToggle={() => handleToggle(item.id)}
                  onView={() => setViewItem(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => openDelete(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState onAdd={openAddModal} />
          )}
        </section>
      </div>

      <EventModal
        open={modalOpen}
        form={form}
        saving={saving}
        mode={modalMode}
        onClose={closeModal}
        onChange={handleChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />

      <EventDetailsModal
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Event Poster"
        message={`This will permanently delete ${
          deleteState?.item?.title || "this event poster"
        }. This action cannot be undone.`}
        confirmText="Delete Poster"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />
    </main>
  );
}

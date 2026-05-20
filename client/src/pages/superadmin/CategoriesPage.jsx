import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  X,
  Search,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Upload,
  RotateCcw,
  ShieldCheck,
  Tags,
  Eye,
  Palette,
  ListOrdered,
} from "lucide-react";
import { api } from "../../lib/api.js";

const ACCENT = "#ff7a3d";

const emptyForm = {
  id: "",
  name: "",
  icon: "",
  emoji: "",
  image: "",
  previewImage: "",
  imageFile: null,
  bg: "#f1f5f9",
  status: "ACTIVE",
  sortOrder: 0,
};

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

  return value;
}

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

function normalizeCategory(item) {
  return {
    id: item._id || item.id,
    name: item.name || "",
    icon: item.icon || "",
    emoji: item.emoji || "🎯",
    image: normalizeImage(item.image || ""),
    bg: item.bg || "#f1f5f9",
    status: String(item.status || "ACTIVE").toUpperCase(),
    sortOrder: Number(item.sortOrder || 0),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function StatusBadge({ value }) {
  const status = String(value || "ACTIVE").toUpperCase();
  const active = status === "ACTIVE";

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

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff7a3d] ${className}`}
    />
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Tags className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        No categories found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Add your first activity category to organize programs across KidGage.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
      >
        <Plus className="h-4 w-4" />
        Add Category
      </button>
    </div>
  );
}

function CategoryDetailsModal({ open, item, onClose }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item?.image, open]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Category Details
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {item.emoji || item.icon || "🎯"} {item.name}
            </h2>
            <div className="mt-3">
              <StatusBadge value={item.status} />
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

        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[340px_1fr]">
          <div
            className="overflow-hidden rounded-[26px] border border-slate-200"
            style={{ backgroundColor: item.bg || "#f1f5f9" }}
          >
            {item.image && !imgError ? (
              <img
                src={item.image}
                alt={item.name}
                className="h-[340px] w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-[340px] w-full items-center justify-center text-7xl">
                {item.emoji || item.icon || "🎯"}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Name
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                {item.name}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Emoji
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {item.emoji || "N/A"}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Sort Order
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {item.sortOrder}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Background
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className="h-8 w-8 rounded-xl border border-slate-200"
                  style={{ backgroundColor: item.bg || "#f1f5f9" }}
                />
                <span className="text-sm font-bold text-slate-900">
                  {item.bg || "#f1f5f9"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Image
              </div>
              <div className="mt-2 break-all text-sm font-bold text-slate-900">
                {item.image || "No image"}
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

function CategoryModal({
  open,
  mode,
  form,
  saving,
  uploading,
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

  const title = mode === "edit" ? "Edit Category" : "Add Category";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Tags className="h-3.5 w-3.5" />
              Program Category
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Manage category name, emoji, visual image, background color,
              status, and sorting order.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-5">
            <Field label="Category Name" hint="Required">
              <Input
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Example: Swimming"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Emoji">
                <Input
                  value={form.emoji}
                  onChange={(e) => onChange("emoji", e.target.value)}
                  placeholder="Example: 🏊"
                />
              </Field>

              <Field label="Icon Fallback">
                <Input
                  value={form.icon}
                  onChange={(e) => onChange("icon", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <Field label="Background Color">
              <div className="flex gap-3">
                <input
                  type="color"
                  value={form.bg || "#f1f5f9"}
                  onChange={(e) => onChange("bg", e.target.value)}
                  className="h-12 w-16 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1"
                />
                <Input
                  value={form.bg}
                  onChange={(e) => onChange("bg", e.target.value)}
                  placeholder="#f1f5f9"
                />
              </div>
            </Field>

            <Field label="Image URL">
              <Input
                value={form.imageFile ? "" : form.image}
                onChange={(e) => onChange("image", e.target.value)}
                placeholder="Paste image URL or upload below"
              />
            </Field>

            <Field label="Upload Image">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-[#ff7a3d] hover:bg-orange-50/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Choose image file
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      PNG, JPG, WEBP supported
                    </div>
                  </div>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                  Browse
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </label>

              {uploading ? (
                <p className="mt-2 text-xs font-semibold text-[#ff7a3d]">
                  Uploading image...
                </p>
              ) : null}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Sort Order">
                <div className="relative">
                  <ListOrdered className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => onChange("sortOrder", e.target.value)}
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => onChange("status", e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
              </Field>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    Visibility Status
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Active categories can be shown on the public website.
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Toggle
                    checked={form.status === "ACTIVE"}
                    onChange={() =>
                      onChange(
                        "status",
                        form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      )
                    }
                    disabled={saving || uploading}
                  />
                  <StatusBadge value={form.status} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <Field label="Preview">
              <div
                className="overflow-hidden rounded-[26px] border border-slate-200"
                style={{ backgroundColor: form.bg || "#f1f5f9" }}
              >
                {displayImage && !imgError ? (
                  <img
                    src={displayImage}
                    alt={form.name || "Preview"}
                    className="h-[320px] w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-7xl">
                    {form.emoji || form.icon || "🎯"}
                  </div>
                )}
              </div>
            </Field>

            <div className="rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Preview Summary
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-3xl">
                  {form.emoji || form.icon || "🎯"}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-lg font-black text-slate-900">
                    {form.name || "Category Name"}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Sort order: {Number(form.sortOrder || 0)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={form.status} />
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                  <Palette className="h-3.5 w-3.5" />
                  {form.bg || "#f1f5f9"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-5 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || uploading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {uploading
              ? "Uploading..."
              : saving
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Add Category"}
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

function CategoryCard({ item, onView, onEdit, onDelete }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [item.image]);

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="relative min-h-[220px]"
        style={{ backgroundColor: item.bg || "#f1f5f9" }}
      >
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-[240px] w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-[240px] w-full items-center justify-center text-7xl">
            {item.emoji || item.icon || "🎯"}
          </div>
        )}

        <div className="absolute left-4 top-4">
          <StatusBadge value={item.status} />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black tracking-tight text-slate-900">
              {item.emoji || item.icon || "🎯"} {item.name}
            </h3>
            <div className="mt-2 text-sm font-semibold text-slate-500">
              Sort order: {item.sortOrder}
            </div>
          </div>

          <span
            className="h-9 w-9 shrink-0 rounded-2xl border border-slate-200"
            style={{ backgroundColor: item.bg || "#f1f5f9" }}
            title={item.bg}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onView(item)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            aria-label={`View ${item.name}`}
          >
            <Eye className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition hover:bg-blue-100"
            aria-label={`Edit ${item.name}`}
          >
            <Pencil className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition hover:bg-red-100"
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const loadCategories = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const { data } = await api.get("/super-admin/categories");
      const rows = Array.isArray(data?.categories) ? data.categories : [];

      setCategories(rows.map(normalizeCategory));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    return () => {
      revokeBlobUrl(form.previewImage);
    };
  }, [form.previewImage]);

  const stats = useMemo(() => {
    return {
      total: categories.length,
      active: categories.filter((item) => item.status === "ACTIVE").length,
      inactive: categories.filter((item) => item.status !== "ACTIVE").length,
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();

    return categories
      .filter((item) => {
        const matchesSearch =
          !q ||
          [item.name, item.emoji, item.icon, item.status, item.bg]
            .join(" ")
            .toLowerCase()
            .includes(q);

        const matchesStatus = !statusFilter || item.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name);
      });
  }, [categories, search, statusFilter]);

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
      status: "ACTIVE",
      sortOrder: categories.length + 1,
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
      name: item.name,
      icon: item.icon || "",
      emoji: item.emoji || "",
      image: item.image || "",
      previewImage: "",
      imageFile: null,
      bg: item.bg || "#f1f5f9",
      status: item.status || "ACTIVE",
      sortOrder: item.sortOrder || 0,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving || uploading) return;

    revokeBlobUrl(form.previewImage);
    setModalOpen(false);
    setForm(emptyForm);
  }

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "image" ? { imageFile: null, previewImage: "" } : {}),
    }));
  }

  async function handleFileChange(event) {
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

    try {
      setUploading(true);
      setError("");

      const payload = new FormData();
      payload.append("image", file);

      const { data } = await api.post(
        "/super-admin/categories/upload",
        payload,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const savedImage = data?.image ? normalizeImage(data.image) : "";

      setForm((prev) => ({
        ...prev,
        image: savedImage,
        imageFile: null,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        name: form.name.trim(),
        icon: String(form.icon || "").trim(),
        emoji: String(form.emoji || "").trim() || "🎯",
        image: form.image ? String(form.image).trim() : "",
        bg: form.bg || "#f1f5f9",
        status: form.status || "ACTIVE",
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (modalMode === "edit") {
        await api.put(`/super-admin/categories/${form.id}`, payload);
        setMessage("Category updated successfully.");
      } else {
        await api.post("/super-admin/categories", payload);
        setMessage("Category created successfully.");
      }

      closeModal();
      await loadCategories({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save category.");
    } finally {
      setSaving(false);
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

      await api.delete(`/super-admin/categories/${id}`);

      setCategories((prev) => prev.filter((item) => item.id !== id));
      setMessage("Category deleted successfully from database.");
      closeDelete();

      await loadCategories({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete category.");
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
                  KidGage Category Center
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  Categories
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Manage platform activity categories, icons, display order,
                  status, and category visuals shown across KidGage.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => loadCategories({ silent: true })}
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
                  Add Category
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

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Tags}
            title="Total Categories"
            value={loading ? "..." : stats.total}
            subtitle="All program types"
            tone="orange"
          />
          <StatCard
            icon={CheckCircle2}
            title="Active"
            value={loading ? "..." : stats.active}
            subtitle="Visible categories"
            tone="emerald"
          />
          <StatCard
            icon={Clock3}
            title="Inactive"
            value={loading ? "..." : stats.inactive}
            subtitle="Hidden categories"
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
                  placeholder="Search category name, emoji, color, status..."
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
                <option value="">All Categories</option>
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
                Program Categories
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredCategories.length} of {categories.length}{" "}
                categories.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge value="ACTIVE" />
              <StatusBadge value="INACTIVE" />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[360px] animate-pulse rounded-[28px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCategories.map((item) => (
                <CategoryCard
                  key={item.id}
                  item={item}
                  onView={setViewItem}
                  onEdit={openEditModal}
                  onDelete={openDelete}
                />
              ))}
            </div>
          ) : (
            <EmptyState onAdd={openAddModal} />
          )}
        </section>
      </div>

      <CategoryModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        saving={saving}
        uploading={uploading}
        onClose={closeModal}
        onChange={handleChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />

      <CategoryDetailsModal
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Category"
        message={`This will permanently delete ${
          deleteState?.item?.name || "this category"
        } from the database. This action cannot be undone.`}
        confirmText="Delete Category"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      />
    </main>
  );
}

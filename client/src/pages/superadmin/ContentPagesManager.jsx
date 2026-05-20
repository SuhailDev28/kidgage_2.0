// client/src/pages/superadmin/ContentPagesManager.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

const EMPTY_FORM = {
  title: "",
  slug: "",
  type: "TERMS",
  excerpt: "",
  content: "",
  active: true,
};

const TYPE_OPTIONS = [
  { value: "TERMS", label: "Terms & Conditions" },
  { value: "PRIVACY", label: "Privacy Policy" },
  { value: "CUSTOM", label: "Custom Page" },
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePage(item, index) {
  return {
    raw: item,
    id: normalizeId(item?._id || item?.id || `page-${index + 1}`),
    title: item?.title || "Untitled Page",
    slug: item?.slug || "",
    type: String(item?.type || "CUSTOM").toUpperCase(),
    excerpt: item?.excerpt || "",
    content: item?.content || "",
    active: item?.active !== false,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TypeBadge({ type }) {
  const text = String(type || "CUSTOM").toUpperCase();

  const className =
    text === "TERMS"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : text === "PRIVACY"
        ? "bg-violet-50 text-violet-700 ring-violet-200"
        : "bg-orange-50 text-orange-700 ring-orange-200";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] ring-1 ${className}`}
    >
      {text.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <FileText className="h-7 w-7" />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-500">{text}</div>
    </div>
  );
}

function PageModal({ open, mode, form, setForm, loading, onClose, onSubmit }) {
  if (!open) return null;

  const isEdit = mode === "edit";

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      slug:
        key === "title" && !isEdit && !prev.slug
          ? slugify(value)
          : key === "slug"
            ? slugify(value)
            : prev.slug,
    }));
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl sm:my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b]">
              <FileText className="h-3.5 w-3.5" />
              Legal Content
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">
              {isEdit ? "Edit Content Page" : "Create Content Page"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage public Terms, Privacy Policy, or custom page content.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 py-5 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Page Title
              </div>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Terms & Conditions"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Slug
              </div>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="terms"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b]"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
            <label className="block">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Page Type
              </div>
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ec7a3b]"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-end">
              <span className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => updateField("active", e.target.checked)}
                  className="h-4 w-4 accent-[#ec7a3b]"
                />
                Active
              </span>
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Short Description
            </div>
            <textarea
              value={form.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              placeholder="Short description shown at top of public page."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b]"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Page Content
            </div>
            <textarea
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              placeholder={`Example:\n1. Acceptance of Terms\nBy accessing KidGage...\n\n2. Bookings and Payments\nBooking availability is subject to...`}
              rows={15}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b]"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white transition hover:brightness-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : isEdit ? "Update Page" : "Create Page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({ page, onClose }) {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-4xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl sm:my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <TypeBadge type={page.type} />
              <StatusBadge active={page.active} />
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-900">
              {page.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">/{page.slug}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {page.excerpt ? (
            <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
              {page.excerpt}
            </div>
          ) : null}

          <div className="whitespace-pre-line text-sm font-medium leading-8 text-slate-700">
            {page.content || "No content added."}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({ page, loading, onCancel, onConfirm }) {
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-xl font-black text-slate-900">
          Delete Content Page
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This will permanently delete “{page.title}”. Continue?
        </p>

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
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentPagesManager() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalState, setModalState] = useState({
    open: false,
    mode: "create",
    id: "",
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [previewPage, setPreviewPage] = useState(null);
  const [deletePage, setDeletePage] = useState(null);

  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/super-admin/content-pages");

      const rows = toArray(
        data?.pages || data?.items || data?.data?.pages || [],
      ).map(normalizePage);

      setPages(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load content pages. Add the backend /api/super-admin/content-pages routes first.",
      );
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const filteredPages = useMemo(() => {
    const q = search.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch =
        !q ||
        [page.title, page.slug, page.type, page.excerpt, page.content]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesType = !typeFilter || page.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [pages, search, typeFilter]);

  function openCreate() {
    setMessage("");
    setError("");
    setForm(EMPTY_FORM);
    setModalState({
      open: true,
      mode: "create",
      id: "",
    });
  }

  function openEdit(page) {
    setMessage("");
    setError("");
    setForm({
      title: page.title || "",
      slug: page.slug || "",
      type: page.type || "CUSTOM",
      excerpt: page.excerpt || "",
      content: page.content || "",
      active: page.active !== false,
    });
    setModalState({
      open: true,
      mode: "edit",
      id: page.id,
    });
  }

  function closeModal() {
    if (actionLoading) return;

    setModalState({
      open: false,
      mode: "create",
      id: "",
    });
    setForm(EMPTY_FORM);
  }

  async function submitPage(e) {
    e.preventDefault();

    const payload = {
      title: String(form.title || "").trim(),
      slug: slugify(form.slug || form.title),
      type: String(form.type || "CUSTOM")
        .trim()
        .toUpperCase(),
      excerpt: String(form.excerpt || "").trim(),
      content: String(form.content || "").trim(),
      active: Boolean(form.active),
    };

    if (!payload.title) {
      setError("Title is required.");
      return;
    }

    if (!payload.slug) {
      setError("Slug is required.");
      return;
    }

    if (!payload.content) {
      setError("Content is required.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      if (modalState.mode === "edit" && modalState.id) {
        await api.put(
          `/super-admin/content-pages/${encodeURIComponent(modalState.id)}`,
          payload,
        );
        setMessage("Content page updated successfully.");
      } else {
        await api.post("/super-admin/content-pages", payload);
        setMessage("Content page created successfully.");
      }

      closeModal();
      await loadPages();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save content page.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete() {
    const id = normalizeId(deletePage?.id);

    if (!id) {
      setError("Invalid page ID.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.delete(`/super-admin/content-pages/${encodeURIComponent(id)}`);

      setMessage("Content page deleted successfully.");
      setDeletePage(null);

      await loadPages();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete content page.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-5 py-6 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
                <FileText className="h-3.5 w-3.5" />
                Content Manager
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Privacy Policy & Terms
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                Create, update, preview, publish, and delete public legal pages
                from the Super Admin dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadPages}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(236,122,59,0.22)] transition hover:brightness-95"
              >
                <Plus className="h-4 w-4" />
                Add Page
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, slug, or content..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ec7a3b]"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Content Pages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredPages.length} of {pages.length} records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[24px] bg-slate-100"
              />
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <EmptyState text="No content pages found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Page
                  </th>
                  <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Type
                  </th>
                  <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </th>
                  <th className="pb-4 pr-5 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Updated
                  </th>
                  <th className="pb-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPages.map((page) => (
                  <tr
                    key={page.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-5 pr-5 align-top">
                      <div className="text-sm font-black text-slate-900">
                        {page.title}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        /{page.slug}
                      </div>
                      {page.excerpt ? (
                        <div className="mt-2 line-clamp-2 max-w-xl text-xs leading-5 text-slate-500">
                          {page.excerpt}
                        </div>
                      ) : null}
                    </td>

                    <td className="py-5 pr-5 align-top">
                      <TypeBadge type={page.type} />
                    </td>

                    <td className="py-5 pr-5 align-top">
                      <StatusBadge active={page.active} />
                    </td>

                    <td className="py-5 pr-5 align-top">
                      <div className="text-sm font-semibold text-slate-700">
                        {formatDate(page.updatedAt || page.createdAt)}
                      </div>
                    </td>

                    <td className="py-5 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPage(page)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                          title="Preview"
                        >
                          <Eye className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(page)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletePage(page)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PageModal
        open={modalState.open}
        mode={modalState.mode}
        form={form}
        setForm={setForm}
        loading={actionLoading}
        onClose={closeModal}
        onSubmit={submitPage}
      />

      <PreviewModal page={previewPage} onClose={() => setPreviewPage(null)} />

      <DeleteDialog
        page={deletePage}
        loading={actionLoading}
        onCancel={() => setDeletePage(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}

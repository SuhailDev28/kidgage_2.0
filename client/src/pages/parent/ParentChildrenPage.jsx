// client/src/pages/parent/ParentChildrenPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Baby,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  X,
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

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
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

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function calculateAge(value) {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function normalizeChild(item, index = 0) {
  const dob = item?.dob || item?.dateOfBirth || item?.birthDate || "";
  const age = Number.isFinite(Number(item?.age))
    ? Number(item.age)
    : calculateAge(dob);

  return {
    raw: item,
    id: normalizeId(item?._id || item?.id || `child-${index + 1}`),
    dbId: normalizeId(item?._id || item?.id || ""),
    fullName: safeText(item?.fullName || item?.name, ""),
    dob: dob || "",
    age,
    gender: safeText(item?.gender, ""),
    schoolName: safeText(item?.schoolName || item?.school, ""),
    notes: safeText(item?.notes || item?.medicalNotes || item?.allergies, ""),
    status: safeText(item?.status, "ACTIVE").toUpperCase(),
    createdAt: item?.createdAt || null,
  };
}

const blankForm = {
  fullName: "",
  dob: "",
  gender: "",
  schoolName: "",
  notes: "",
};

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="mt-3 truncate text-3xl font-black text-slate-900">
            {value}
          </div>
          {helper ? (
            <div className="mt-1 text-sm text-slate-500">{helper}</div>
          ) : null}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ec7a3b]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      {children}
    </label>
  );
}

function ChildFormModal({
  open,
  mode,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[34px]">
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-orange-50/70 to-blue-50 px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
                <Baby className="h-3.5 w-3.5" />
                {mode === "edit" ? "Edit Child" : "Add Child"}
              </div>
              <h3 className="mt-3 break-words text-2xl font-black text-slate-950">
                {mode === "edit"
                  ? "Update child profile"
                  : "Create child profile"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Add your child details to make activity booking faster.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Child Full Name">
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
                placeholder="Enter child name"
                required
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
              />
            </Field>

            <Field label="Date of Birth">
              <input
                type="date"
                value={form.dob}
                onChange={(e) => onChange("dob", e.target.value)}
                required
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
              />
            </Field>

            <Field label="Gender">
              <select
                value={form.gender}
                onChange={(e) => onChange("gender", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            <Field label="School Name">
              <input
                type="text"
                value={form.schoolName}
                onChange={(e) => onChange("schoolName", e.target.value)}
                placeholder="Optional"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes / Medical Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                  placeholder="Allergies, medical notes, preferences..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(236,122,59,0.22)] transition hover:brightness-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Add Child"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  open,
  childName,
  deleting,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[34px] sm:p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-black text-slate-950">
          Delete child profile?
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Are you sure you want to delete <strong>{childName}</strong>? This
          action cannot be undone.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChildCard({ child, onEdit, onDelete }) {
  const ageText =
    child.age === null || child.age === undefined ? "N/A" : `${child.age} yrs`;

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-orange-50 text-[#ec7a3b] ring-1 ring-orange-100">
            <Baby className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-slate-950">
              {child.fullName || "Child"}
            </h3>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                {child.status}
              </span>
              {child.gender ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                  {child.gender}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            title="Edit child"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 transition hover:bg-red-100"
            title="Delete child"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Age
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {ageText}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Date of Birth
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {formatDate(child.dob)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            School
          </div>
          <div className="mt-1 break-words text-sm font-black text-slate-900">
            {child.schoolName || "N/A"}
          </div>
        </div>
        <div className="rounded-2xl bg-orange-50/60 p-3 sm:col-span-2">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">
            Notes
          </div>
          <div className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
            {child.notes || "No notes."}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingChild, setEditingChild] = useState(null);
  const [form, setForm] = useState(blankForm);

  const [deleteState, setDeleteState] = useState({ open: false, child: null });

  const loadChildren = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await api.get("/parent/children");
      const rows = toArray(
        response.data?.children ||
          response.data?.items ||
          response.data?.data ||
          [],
      ).map(normalizeChild);

      setChildren(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load children.",
      );
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const stats = useMemo(() => {
    const total = children.length;
    const active = children.filter((child) => child.status === "ACTIVE").length;
    const avgAge = children.length
      ? children.reduce((sum, child) => sum + Number(child.age || 0), 0) /
        children.length
      : 0;

    return {
      total,
      active,
      avgAge: avgAge ? Math.round(avgAge * 10) / 10 : 0,
    };
  }, [children]);

  const filteredChildren = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return children;

    return children.filter((child) =>
      [
        child.fullName,
        child.gender,
        child.schoolName,
        child.notes,
        child.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [children, search]);

  function clearAlerts() {
    setError("");
    setMessage("");
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateModal() {
    clearAlerts();
    setModalMode("create");
    setEditingChild(null);
    setForm(blankForm);
    setModalOpen(true);
  }

  function openEditModal(child) {
    clearAlerts();
    setModalMode("edit");
    setEditingChild(child);
    setForm({
      fullName: child.fullName || "",
      dob: toInputDate(child.dob),
      gender: child.gender || "",
      schoolName: child.schoolName || "",
      notes: child.notes || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingChild(null);
    setForm(blankForm);
  }

  async function submitChild(e) {
    e.preventDefault();

    const payload = {
      fullName: String(form.fullName || "").trim(),
      name: String(form.fullName || "").trim(),
      dob: form.dob || null,
      gender: String(form.gender || "")
        .trim()
        .toUpperCase(),
      schoolName: String(form.schoolName || "").trim(),
      notes: String(form.notes || "").trim(),
    };

    if (!payload.fullName) {
      setError("Child full name is required.");
      return;
    }

    if (!payload.dob) {
      setError("Date of birth is required.");
      return;
    }

    try {
      setSaving(true);
      clearAlerts();

      if (modalMode === "edit") {
        const childId = normalizeId(editingChild?.dbId || editingChild?.id);
        if (!childId || childId.startsWith("child-")) {
          setError(
            "Cannot update this child because it has no valid database ID.",
          );
          return;
        }

        await api.put(
          `/parent/children/${encodeURIComponent(childId)}`,
          payload,
        );
        setMessage("Child profile updated successfully.");
      } else {
        await api.post("/parent/children", payload);
        setMessage("Child profile added successfully.");
      }

      closeModal();
      await loadChildren({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save child profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(child) {
    clearAlerts();
    setDeleteState({ open: true, child });
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteState({ open: false, child: null });
  }

  async function confirmDelete() {
    const childId = normalizeId(
      deleteState.child?.dbId || deleteState.child?.id,
    );

    if (!childId || childId.startsWith("child-")) {
      setError("Cannot delete this child because it has no valid database ID.");
      closeDeleteModal();
      return;
    }

    try {
      setDeleting(true);
      clearAlerts();
      await api.delete(`/parent/children/${encodeURIComponent(childId)}`);
      setMessage("Child profile deleted successfully.");
      closeDeleteModal();
      await loadChildren({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to delete child profile.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#fff8f4] px-3 py-5 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-white via-orange-50/80 to-blue-50 px-5 py-7 sm:px-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">KidGage Parent Portal</span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Children
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                  Add and manage child profiles used for activity bookings, age
                  eligibility, and academy communication.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => loadChildren({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(236,122,59,0.24)] transition hover:brightness-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Child
                </button>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {message}
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

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Baby}
            label="Total Children"
            value={loading ? "..." : stats.total}
            helper="Saved child profiles"
          />
          <StatCard
            icon={UserRound}
            label="Active"
            value={loading ? "..." : stats.active}
            helper="Ready for booking"
          />
          <StatCard
            icon={CalendarDays}
            label="Average Age"
            value={loading ? "..." : `${stats.avgAge || 0} yrs`}
            helper="Based on date of birth"
          />
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search child name, school, gender, notes..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Child Profiles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredChildren.length} of {children.length} profiles.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-[28px] bg-slate-100"
                />
              ))}
            </div>
          ) : filteredChildren.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredChildren.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  onEdit={() => openEditModal(child)}
                  onDelete={() => openDeleteModal(child)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-orange-200 bg-orange-50/40 px-4 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#ec7a3b] shadow-sm ring-1 ring-orange-100">
                <Baby className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">
                No children found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Add a child profile to start booking KidGage activities.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white transition hover:brightness-95"
              >
                <Plus className="h-4 w-4" />
                Add Child
              </button>
            </div>
          )}
        </div>
      </div>

      <ChildFormModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        saving={saving}
        onChange={updateForm}
        onClose={closeModal}
        onSubmit={submitChild}
      />

      <ConfirmDeleteModal
        open={deleteState.open}
        childName={deleteState.child?.fullName || "this child"}
        deleting={deleting}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

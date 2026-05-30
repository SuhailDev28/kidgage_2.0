// client/src/pages/superadmin/SuperAdminVouchersPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

const EMPTY_FORM = {
  code: "",
  title: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  maxDiscountAmount: "",
  minBookingAmount: "",
  usageLimit: "",
  perUserLimit: "1",
  validFrom: "",
  validTo: "",
  academyId: "",
  activityId: "",
  packageId: "",
  isActive: true,
};

function toInputDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "No limit";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No limit";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value, currency = "QAR") {
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

function normalizeVoucherCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function getVoucherScope(row = {}) {
  if (row.packageId?.title) return `Package: ${row.packageId.title}`;
  if (row.activityId?.title) return `Activity: ${row.activityId.title}`;
  if (row.activityId?.name) return `Activity: ${row.activityId.name}`;
  if (row.academyId?.name) return `Academy: ${row.academyId.name}`;

  return "All academies";
}

function getVoucherStatus(row = {}) {
  const now = new Date();

  if (!row.isActive) {
    return {
      label: "Inactive",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (row.validFrom && now < new Date(row.validFrom)) {
    return {
      label: "Scheduled",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (row.validTo && now > new Date(row.validTo)) {
    return {
      label: "Expired",
      className: "bg-red-50 text-red-700",
    };
  }

  if (
    Number(row.usageLimit || 0) > 0 &&
    Number(row.usedCount || 0) >= Number(row.usageLimit || 0)
  ) {
    return {
      label: "Limit reached",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700",
  };
}

function StatCard({ icon: Icon, title, value, tone = "emerald" }) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : "bg-emerald-50 text-emerald-700";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {value}
          </div>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function VoucherFormModal({
  open,
  form,
  setForm,
  editingVoucher,
  saving,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-3 py-5 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[30px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              <TicketPercent className="h-4 w-4" />
              Voucher Setup
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {editingVoucher ? "Edit Voucher" : "Create Voucher"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create discount coupons for public and parent bookings.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[calc(92vh-118px)] overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Voucher Code
              </label>
              <input
                type="text"
                value={form.code}
                disabled={Boolean(editingVoucher)}
                onChange={(e) =>
                  updateField("code", normalizeVoucherCode(e.target.value))
                }
                placeholder="KIDGAGE20"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold uppercase outline-none transition focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                required
              />
              <div className="mt-1 text-xs font-semibold text-slate-500">
                Code cannot be changed after creation.
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Summer offer"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Discount Type
              </label>
              <select
                value={form.discountType}
                onChange={(e) => updateField("discountType", e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Discount Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={(e) => updateField("discountValue", e.target.value)}
                placeholder={form.discountType === "PERCENTAGE" ? "20" : "50"}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Max Discount Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.maxDiscountAmount}
                onChange={(e) =>
                  updateField("maxDiscountAmount", e.target.value)
                }
                placeholder="0 means no limit"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Minimum Booking Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minBookingAmount}
                onChange={(e) =>
                  updateField("minBookingAmount", e.target.value)
                }
                placeholder="0 means no minimum"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Usage Limit
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.usageLimit}
                onChange={(e) => updateField("usageLimit", e.target.value)}
                placeholder="0 means unlimited"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Per User Limit
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.perUserLimit}
                onChange={(e) => updateField("perUserLimit", e.target.value)}
                placeholder="1"
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Valid From
              </label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => updateField("validFrom", e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Valid To
              </label>
              <input
                type="date"
                value={form.validTo}
                onChange={(e) => updateField("validTo", e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Short internal note or public offer description"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  <span className="block text-sm font-black text-slate-900">
                    Active voucher
                  </span>
                  <span className="block text-xs font-semibold text-slate-500">
                    Public users can apply this voucher while booking.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(22,163,74,0.24)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingVoucher ? "Update Voucher" : "Create Voucher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminVouchersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vouchers, setVouchers] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadVouchers() {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/super-admin/vouchers");

      const rows = Array.isArray(data?.vouchers)
        ? data.vouchers
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

      setVouchers(rows);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load vouchers.",
      );
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVouchers();
  }, []);

  const stats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((row) => getVoucherStatus(row).label === "Active").length;
    const expired = vouchers.filter((row) => getVoucherStatus(row).label === "Expired").length;
    const used = vouchers.reduce(
      (sum, row) => sum + Number(row.usedCount || 0),
      0,
    );

    return { total, active, expired, used };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    const text = String(query || "").trim().toLowerCase();

    return vouchers.filter((row) => {
      const status = getVoucherStatus(row).label.toUpperCase();

      if (statusFilter !== "ALL" && status !== statusFilter) {
        return false;
      }

      if (!text) return true;

      return [
        row.code,
        row.title,
        row.description,
        getVoucherScope(row),
        row.discountType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [vouchers, query, statusFilter]);

  function openCreateModal() {
    setEditingVoucher(null);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function openEditModal(row) {
    setEditingVoucher(row);
    setForm({
      code: row.code || "",
      title: row.title || "",
      description: row.description || "",
      discountType: row.discountType || "PERCENTAGE",
      discountValue: String(row.discountValue || ""),
      maxDiscountAmount: String(row.maxDiscountAmount || ""),
      minBookingAmount: String(row.minBookingAmount || ""),
      usageLimit: String(row.usageLimit || ""),
      perUserLimit: String(row.perUserLimit ?? 1),
      validFrom: toInputDate(row.validFrom),
      validTo: toInputDate(row.validTo),
      academyId: row.academyId?._id || row.academyId || "",
      activityId: row.activityId?._id || row.activityId || "",
      packageId: row.packageId?._id || row.packageId || "",
      isActive: row.isActive !== false,
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function buildPayload() {
    return {
      code: normalizeVoucherCode(form.code),
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      maxDiscountAmount: Number(form.maxDiscountAmount || 0),
      minBookingAmount: Number(form.minBookingAmount || 0),
      usageLimit: Number(form.usageLimit || 0),
      perUserLimit: Number(form.perUserLimit || 0),
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      academyId: form.academyId || null,
      activityId: form.activityId || null,
      packageId: form.packageId || null,
      isActive: Boolean(form.isActive),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.code) {
      setError("Voucher code is required.");
      return;
    }

    if (!["PERCENTAGE", "FIXED"].includes(payload.discountType)) {
      setError("Invalid discount type.");
      return;
    }

    if (payload.discountValue <= 0) {
      setError("Discount value should be greater than zero.");
      return;
    }

    if (payload.discountType === "PERCENTAGE" && payload.discountValue > 100) {
      setError("Percentage discount cannot be more than 100.");
      return;
    }

    if (
      payload.validFrom &&
      payload.validTo &&
      new Date(payload.validFrom) > new Date(payload.validTo)
    ) {
      setError("Valid From date cannot be after Valid To date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingVoucher?._id) {
        await api.patch(`/super-admin/vouchers/${editingVoucher._id}`, payload);
        setMessage("Voucher updated successfully.");
      } else {
        await api.post("/super-admin/vouchers", payload);
        setMessage("Voucher created successfully.");
      }

      setModalOpen(false);
      setEditingVoucher(null);
      setForm(EMPTY_FORM);
      await loadVouchers();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save voucher.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const code = row?.code || "this voucher";

    const ok = window.confirm(`Delete voucher ${code}? This cannot be undone.`);

    if (!ok) return;

    try {
      setError("");
      setMessage("");

      await api.delete(`/super-admin/vouchers/${row._id}`);

      setMessage("Voucher deleted successfully.");
      await loadVouchers();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to delete voucher.",
      );
    }
  }

  async function toggleVoucherStatus(row) {
    try {
      setError("");
      setMessage("");

      await api.patch(`/super-admin/vouchers/${row._id}`, {
        isActive: row.isActive === false,
      });

      setMessage(
        row.isActive === false
          ? "Voucher activated successfully."
          : "Voucher deactivated successfully.",
      );

      await loadVouchers();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to update voucher status.",
      );
    }
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-500 p-6 text-white shadow-[0_24px_70px_rgba(22,163,74,0.24)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-lime-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ring-1 ring-white/20">
              <TicketPercent className="h-4 w-4" />
              Voucher Management
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Vouchers & Coupons
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90">
              Create public booking discount codes, seasonal offers, and limited
              promotions for KidGage users.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadVouchers}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Create Voucher
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TicketPercent} title="Total Vouchers" value={stats.total} />
        <StatCard icon={CheckCircle2} title="Active" value={stats.active} />
        <StatCard icon={AlertCircle} title="Expired" value={stats.expired} tone="red" />
        <StatCard icon={Percent} title="Total Uses" value={stats.used} tone="blue" />
      </div>

      {message ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Voucher List
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage active, scheduled, expired, and limited-use vouchers.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search voucher..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="EXPIRED">Expired</option>
              <option value="LIMIT REACHED">Limit reached</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-4">Voucher</th>
                  <th className="px-4 py-4">Discount</th>
                  <th className="px-4 py-4">Validity</th>
                  <th className="px-4 py-4">Usage</th>
                  <th className="px-4 py-4">Scope</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading vouchers...
                      </div>
                    </td>
                  </tr>
                ) : filteredVouchers.length > 0 ? (
                  filteredVouchers.map((row) => {
                    const status = getVoucherStatus(row);
                    const usageLimit = Number(row.usageLimit || 0);
                    const usedCount = Number(row.usedCount || 0);

                    return (
                      <tr key={row._id} className="align-top hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-950">
                            {row.code}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-600">
                            {row.title || "Untitled voucher"}
                          </div>
                          {row.description ? (
                            <div className="mt-1 line-clamp-2 max-w-[260px] text-xs leading-5 text-slate-500">
                              {row.description}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-black text-slate-900">
                            {row.discountType === "PERCENTAGE"
                              ? `${Number(row.discountValue || 0)}%`
                              : formatMoney(row.discountValue)}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            Min: {formatMoney(row.minBookingAmount)}
                          </div>
                          {Number(row.maxDiscountAmount || 0) > 0 ? (
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Max: {formatMoney(row.maxDiscountAmount)}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                            {formatDate(row.validFrom)}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            to {formatDate(row.validTo)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm font-black text-slate-900">
                            {usedCount} / {usageLimit > 0 ? usageLimit : "∞"}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            Per user:{" "}
                            {Number(row.perUserLimit || 0) > 0
                              ? row.perUserLimit
                              : "∞"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[220px] text-sm font-semibold text-slate-700">
                            {getVoucherScope(row)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleVoucherStatus(row)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                            >
                              {row.isActive === false ? "Activate" : "Disable"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                        <TicketPercent className="h-8 w-8" />
                      </div>
                      <div className="mt-4 text-sm font-black text-slate-900">
                        No vouchers found
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Create your first voucher to offer booking discounts.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <VoucherFormModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        editingVoucher={editingVoucher}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingVoucher(null);
          setForm(EMPTY_FORM);
        }}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
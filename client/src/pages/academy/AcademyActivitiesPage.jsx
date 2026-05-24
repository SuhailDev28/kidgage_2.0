import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  Sparkles,
  FolderOpen,
  Layers3,
  X,
  Upload,
  CopyPlus,
  Package,
  Clock3,
  BadgeCheck,
  CalendarDays,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { getUser } from "../../lib/auth.js";

const BRAND_ORANGE = "#ff7a3d";
const BRAND_ORANGE_DARK = "#ec6f35";
const BRAND_BLUE = "#1877f2";

function makeLocalId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );

  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/${raw}`;
}

function getBestImage(item) {
  return (
    item?.image ||
    item?.bannerImage ||
    item?.banner ||
    item?.thumbnail ||
    item?.coverImage ||
    item?.poster ||
    item?.featuredImage ||
    item?.images?.[0] ||
    item?.media?.image ||
    ""
  );
}

function normalizeModesValue(value) {
  const output = [];

  function pushMode(item) {
    const text = String(item || "").trim();
    if (!text) return;

    const normalized = text.replace(/_/g, " ").replace(/\s+/g, " ").trim();

    if (!normalized) return;

    const upper = normalized.toUpperCase();

    if (upper === "ONLINE") output.push("Online");
    else if (upper === "OFFLINE") output.push("Offline");
    else if (upper === "HYBRID") output.push("Hybrid");
    else if (upper === "BOTH") output.push("Both");
    else output.push(normalized);
  }

  function walk(input) {
    if (Array.isArray(input)) {
      input.forEach(walk);
      return;
    }

    if (typeof input === "string") {
      const trimmed = input.trim();

      if (!trimmed) return;

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          walk(parsed);
          return;
        } catch {
          pushMode(trimmed);
          return;
        }
      }

      if (trimmed.includes(",")) {
        trimmed.split(",").forEach(pushMode);
        return;
      }

      pushMode(trimmed);
      return;
    }

    if (input && typeof input === "object") {
      pushMode(
        input.mode ||
          input.classMode ||
          input.type ||
          input.label ||
          input.name ||
          "",
      );
    }
  }

  walk(value);

  return Array.from(
    new Map(output.map((item) => [item.toLowerCase(), item])).values(),
  );
}

function formatDate(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB");
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);

  if (s && e) return `${s} to ${e}`;
  return s || e || "N/A";
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[26px] border border-dashed border-orange-200 bg-orange-50/35 px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#ff7a3d] shadow-sm ring-1 ring-orange-100">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-600">{text}</div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[20px] ${
                danger
                  ? "bg-red-50 text-red-600"
                  : "bg-orange-50 text-[#ff7a3d]"
              }`}
            >
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#ff7a3d] hover:bg-[#ec6f35]"
            }`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, hint = "" }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-black text-slate-700">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </label>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    >
      {children}
    </select>
  );
}

function Checkbox({ checked, onChange, label, description = "" }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-orange-200 hover:bg-orange-50/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#ff7a3d]"
      />
      <div>
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function ModeChips({ value, maxVisible = 3 }) {
  const list = normalizeModesValue(value);

  if (!list.length) {
    return <span className="text-sm text-slate-500">N/A</span>;
  }

  const visible = list.slice(0, maxVisible);
  const hiddenCount = Math.max(list.length - visible.length, 0);

  return (
    <div className="flex max-w-[240px] flex-wrap gap-2">
      {visible.map((item) => (
        <span
          key={item}
          className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#ff7a3d] ring-1 ring-orange-100"
        >
          {item}
        </span>
      ))}

      {hiddenCount > 0 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          +{hiddenCount} more
        </span>
      ) : null}
    </div>
  );
}

function BookingConfigSummary({ course }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1877f2] ring-1 ring-blue-100">
        {course.packageType || "SESSIONS"}
      </span>

      {Number(course.totalSessions || 0) > 0 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {course.totalSessions} sessions
        </span>
      ) : null}

      {Number(course.totalWeeks || 0) > 0 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {course.totalWeeks} weeks
        </span>
      ) : null}

      {Number(course.sessionsPerWeek || 0) > 0 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {course.sessionsPerWeek}/week
        </span>
      ) : null}

      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
        {course.bookingMode || "BOTH"}
      </span>

      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
        {course.defaultCapacity || 1} / slot
      </span>

      <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
        {course.slotDurationMinutes || 60} min
      </span>
    </div>
  );
}

function getApprovalStatus(course = {}) {
  return String(
    course?.approvalStatus || course?.raw?.approvalStatus || "PENDING_APPROVAL",
  )
    .trim()
    .toUpperCase();
}

function getApprovalMeta(status) {
  if (status === "APPROVED") {
    return {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      icon: BadgeCheck,
      description: "Visible to parents/public",
    };
  }

  if (status === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-red-50 text-red-700 ring-red-100",
      icon: AlertCircle,
      description: "Not visible to parents/public",
    };
  }

  return {
    label: "Pending Approval",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
    icon: Clock3,
    description: "Waiting for Super Admin approval",
  };
}

function ApprovalBadge({ course, compact = false }) {
  const status = getApprovalStatus(course);
  const meta = getApprovalMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.className}`}
      title={meta.description}
    >
      <Icon className="h-3.5 w-3.5" />
      {compact ? meta.label.replace(" Approval", "") : meta.label}
    </span>
  );
}

function PackageSummaryBadges({ items }) {
  const rows = toArray(items);

  if (!rows.length) {
    return <span className="text-sm text-slate-500">No packages</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rows.slice(0, 3).map((item, i) => (
        <span
          key={`${item.title}-${i}`}
          className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#ff7a3d] ring-1 ring-orange-100"
        >
          {item.title || "Untitled"}
        </span>
      ))}

      {rows.length > 3 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          +{rows.length - 3} more
        </span>
      ) : null}
    </div>
  );
}

function SlotSummaryBadges({ items }) {
  const rows = toArray(items);

  if (!rows.length) {
    return <span className="text-sm text-slate-500">No slots</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1877f2] ring-1 ring-blue-100">
        {rows.length} slots
      </span>

      {rows.slice(0, 2).map((item, i) => (
        <span
          key={`${item.date}-${item.startTime}-${i}`}
          className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
        >
          {item.date} · {item.startTime}
        </span>
      ))}
    </div>
  );
}

function PackageEditor({ packages, setPackages }) {
  const blank = {
    _localId: makeLocalId(),
    _serverId: "",
    title: "",
    packageType: "SESSIONS",
    durationValue: "",
    durationUnit: "SESSION",
    sessionCount: "",
    validityDays: "",
    minSelectableSessions: "",
    maxSelectableSessions: "",
    bookingPattern: "BOTH",
    price: "",
    currency: "QAR",
    isDefault: false,
    active: true,
    displayOrder: "",
    description: "",
  };

  function addPackage() {
    setPackages((prev) => [...prev, { ...blank, _localId: makeLocalId() }]);
  }

  function updatePackage(localId, key, value) {
    setPackages((prev) =>
      prev.map((item) =>
        item._localId === localId ? { ...item, [key]: value } : item,
      ),
    );
  }

  function removePackage(localId) {
    setPackages((prev) => prev.filter((item) => item._localId !== localId));
  }

  function setAsDefault(localId) {
    setPackages((prev) =>
      prev.map((item) => ({
        ...item,
        isDefault: item._localId === localId,
      })),
    );
  }

  return (
    <div className="rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-base font-black text-slate-950">
            <Package className="h-5 w-5 text-[#ff7a3d]" />
            Packages Manager
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Add one or more packages for this course.
          </div>
        </div>

        <button
          type="button"
          onClick={addPackage}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] hover:bg-[#ec6f35]"
        >
          <Plus className="h-4 w-4" />
          Add Package
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {packages.length === 0 ? (
          <EmptyState text="No packages added yet." />
        ) : (
          packages.map((pkg, index) => (
            <div
              key={pkg._localId}
              className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#ff7a3d]">
                    {index + 1}
                  </span>
                  Package {index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removePackage(pkg._localId)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Title">
                  <TextInput
                    value={pkg.title}
                    onChange={(e) =>
                      updatePackage(pkg._localId, "title", e.target.value)
                    }
                    placeholder="e.g. 8 Sessions"
                  />
                </Field>

                <Field label="Package Type">
                  <Select
                    value={pkg.packageType}
                    onChange={(e) =>
                      updatePackage(pkg._localId, "packageType", e.target.value)
                    }
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="SESSIONS">SESSIONS</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </Select>
                </Field>

                <Field label="Booking Pattern">
                  <Select
                    value={pkg.bookingPattern}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "bookingPattern",
                        e.target.value,
                      )
                    }
                  >
                    <option value="STRAIGHT">STRAIGHT</option>
                    <option value="FLEXIBLE">FLEXIBLE</option>
                    <option value="BOTH">BOTH</option>
                  </Select>
                </Field>

                <Field label="Duration Value">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.durationValue}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "durationValue",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Duration Unit">
                  <Select
                    value={pkg.durationUnit}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "durationUnit",
                        e.target.value,
                      )
                    }
                  >
                    <option value="MONTH">MONTH</option>
                    <option value="SESSION">SESSION</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </Select>
                </Field>

                <Field label="Session Count">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.sessionCount}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "sessionCount",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Validity Days">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.validityDays}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "validityDays",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Min Selectable Sessions">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.minSelectableSessions}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "minSelectableSessions",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Max Selectable Sessions">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.maxSelectableSessions}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "maxSelectableSessions",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Price">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.price}
                    onChange={(e) =>
                      updatePackage(pkg._localId, "price", e.target.value)
                    }
                  />
                </Field>

                <Field label="Currency">
                  <TextInput
                    value={pkg.currency}
                    onChange={(e) =>
                      updatePackage(pkg._localId, "currency", e.target.value)
                    }
                  />
                </Field>

                <Field label="Display Order">
                  <TextInput
                    type="number"
                    min="0"
                    value={pkg.displayOrder}
                    onChange={(e) =>
                      updatePackage(
                        pkg._localId,
                        "displayOrder",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Description">
                    <TextArea
                      rows={3}
                      value={pkg.description}
                      onChange={(e) =>
                        updatePackage(
                          pkg._localId,
                          "description",
                          e.target.value,
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-3">
                  <Checkbox
                    checked={Boolean(pkg.isDefault)}
                    onChange={() => setAsDefault(pkg._localId)}
                    label="Default package"
                    description="Only one package should be the default selection."
                  />

                  <Checkbox
                    checked={Boolean(pkg.active)}
                    onChange={(checked) =>
                      updatePackage(pkg._localId, "active", checked)
                    }
                    label="Package active"
                    description="Inactive package will not be selectable."
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SlotEditor({ slots, setSlots, packageOptions }) {
  const blank = {
    _localId: makeLocalId(),
    _serverId: "",
    packageRef: "",
    date: "",
    startTime: "",
    endTime: "",
    sessionLabel: "",
    capacity: "1",
    priceOverride: "",
    bookingOpenAt: "",
    bookingCloseAt: "",
    notes: "",
    status: "OPEN",
    active: true,
  };

  const [generator, setGenerator] = useState({
    packageRef: "",
    startDate: "",
    weeks: "4",
    daysOfWeek: [],
    startTime: "16:00",
    endTime: "17:00",
    capacity: "1",
    sessionLabel: "",
  });

  const weekdays = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  function addSlot() {
    setSlots((prev) => [...prev, { ...blank, _localId: makeLocalId() }]);
  }

  function updateSlot(localId, key, value) {
    setSlots((prev) =>
      prev.map((item) =>
        item._localId === localId ? { ...item, [key]: value } : item,
      ),
    );
  }

  function removeSlot(localId) {
    setSlots((prev) => prev.filter((item) => item._localId !== localId));
  }

  function toggleDay(day) {
    setGenerator((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((item) => item !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  function generateWeeklySlots() {
    if (
      !generator.packageRef ||
      !generator.startDate ||
      !generator.daysOfWeek.length
    ) {
      return;
    }

    const baseDate = new Date(generator.startDate);
    const weeks = Math.max(1, Number(generator.weeks || 1));
    const output = [];

    for (let w = 0; w < weeks; w += 1) {
      for (const dayOfWeek of generator.daysOfWeek) {
        const weekStart = new Date(baseDate);
        weekStart.setDate(baseDate.getDate() + w * 7);

        const result = new Date(weekStart);
        const currentDay = result.getDay();
        result.setDate(result.getDate() + (dayOfWeek - currentDay));

        output.push({
          _localId: makeLocalId(),
          _serverId: "",
          packageRef: generator.packageRef,
          date: result.toISOString().slice(0, 10),
          startTime: generator.startTime,
          endTime: generator.endTime,
          sessionLabel: generator.sessionLabel,
          capacity: generator.capacity,
          priceOverride: "",
          bookingOpenAt: "",
          bookingCloseAt: "",
          notes: "",
          status: "OPEN",
          active: true,
        });
      }
    }

    setSlots((prev) => [...prev, ...output]);
  }

  return (
    <div className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50/65 via-white to-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-base font-black text-slate-950">
            <Clock3 className="h-5 w-5 text-[#1877f2]" />
            Slots Manager
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Add manual slots or generate weekly slots in bulk.
          </div>
        </div>

        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1877f2] px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(24,119,242,0.22)] hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Slot
        </button>
      </div>

      <div className="mt-5 rounded-[26px] border border-dashed border-blue-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-black text-slate-950">
          <CopyPlus className="h-4 w-4 text-[#1877f2]" />
          Weekly Slot Generator
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Package">
            <Select
              value={generator.packageRef}
              onChange={(e) =>
                setGenerator((prev) => ({
                  ...prev,
                  packageRef: e.target.value,
                }))
              }
            >
              <option value="">Select package</option>
              {packageOptions.map((pkg) => (
                <option key={pkg._localId} value={pkg._localId}>
                  {pkg.title || "Untitled Package"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Start Date">
            <TextInput
              type="date"
              value={generator.startDate}
              onChange={(e) =>
                setGenerator((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </Field>

          <Field label="Weeks">
            <TextInput
              type="number"
              min="1"
              value={generator.weeks}
              onChange={(e) =>
                setGenerator((prev) => ({ ...prev, weeks: e.target.value }))
              }
            />
          </Field>

          <Field label="Capacity">
            <TextInput
              type="number"
              min="1"
              value={generator.capacity}
              onChange={(e) =>
                setGenerator((prev) => ({ ...prev, capacity: e.target.value }))
              }
            />
          </Field>

          <Field label="Start Time">
            <TextInput
              type="time"
              value={generator.startTime}
              onChange={(e) =>
                setGenerator((prev) => ({ ...prev, startTime: e.target.value }))
              }
            />
          </Field>

          <Field label="End Time">
            <TextInput
              type="time"
              value={generator.endTime}
              onChange={(e) =>
                setGenerator((prev) => ({ ...prev, endTime: e.target.value }))
              }
            />
          </Field>

          <Field label="Session Label">
            <TextInput
              value={generator.sessionLabel}
              onChange={(e) =>
                setGenerator((prev) => ({
                  ...prev,
                  sessionLabel: e.target.value,
                }))
              }
              placeholder="Morning / Evening"
            />
          </Field>

          <div className="flex items-end">
            <button
              type="button"
              onClick={generateWeeklySlots}
              className="h-12 w-full rounded-2xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-slate-800"
            >
              Generate Weekly Slots
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {weekdays.map((day) => {
            const active = generator.daysOfWeek.includes(day.value);

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  active
                    ? "bg-[#1877f2] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {slots.length === 0 ? (
          <EmptyState text="No slots added yet." />
        ) : (
          slots.map((slot, index) => (
            <div
              key={slot._localId}
              className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#1877f2]">
                    {index + 1}
                  </span>
                  Slot {index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removeSlot(slot._localId)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Package">
                  <Select
                    value={slot.packageRef}
                    onChange={(e) =>
                      updateSlot(slot._localId, "packageRef", e.target.value)
                    }
                  >
                    <option value="">Select package</option>
                    {packageOptions.map((pkg) => (
                      <option key={pkg._localId} value={pkg._localId}>
                        {pkg.title || "Untitled Package"}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Date">
                  <TextInput
                    type="date"
                    value={slot.date}
                    onChange={(e) =>
                      updateSlot(slot._localId, "date", e.target.value)
                    }
                  />
                </Field>

                <Field label="Session Label">
                  <TextInput
                    value={slot.sessionLabel}
                    onChange={(e) =>
                      updateSlot(slot._localId, "sessionLabel", e.target.value)
                    }
                  />
                </Field>

                <Field label="Start Time">
                  <TextInput
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      updateSlot(slot._localId, "startTime", e.target.value)
                    }
                  />
                </Field>

                <Field label="End Time">
                  <TextInput
                    type="time"
                    value={slot.endTime}
                    onChange={(e) =>
                      updateSlot(slot._localId, "endTime", e.target.value)
                    }
                  />
                </Field>

                <Field label="Capacity">
                  <TextInput
                    type="number"
                    min="1"
                    value={slot.capacity}
                    onChange={(e) =>
                      updateSlot(slot._localId, "capacity", e.target.value)
                    }
                  />
                </Field>

                <Field label="Price Override">
                  <TextInput
                    type="number"
                    min="0"
                    value={slot.priceOverride}
                    onChange={(e) =>
                      updateSlot(slot._localId, "priceOverride", e.target.value)
                    }
                  />
                </Field>

                <Field label="Booking Open At">
                  <TextInput
                    type="datetime-local"
                    value={slot.bookingOpenAt}
                    onChange={(e) =>
                      updateSlot(slot._localId, "bookingOpenAt", e.target.value)
                    }
                  />
                </Field>

                <Field label="Booking Close At">
                  <TextInput
                    type="datetime-local"
                    value={slot.bookingCloseAt}
                    onChange={(e) =>
                      updateSlot(
                        slot._localId,
                        "bookingCloseAt",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Status">
                  <Select
                    value={slot.status}
                    onChange={(e) =>
                      updateSlot(slot._localId, "status", e.target.value)
                    }
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="FULL">FULL</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </Select>
                </Field>

                <div className="md:col-span-2 xl:col-span-2">
                  <Field label="Notes">
                    <TextArea
                      rows={2}
                      value={slot.notes}
                      onChange={(e) =>
                        updateSlot(slot._localId, "notes", e.target.value)
                      }
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <Checkbox
                    checked={Boolean(slot.active)}
                    onChange={(checked) =>
                      updateSlot(slot._localId, "active", checked)
                    }
                    label="Slot active"
                    description="Inactive slots will not be shown to parents."
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CourseModal({
  open,
  mode = "create",
  form,
  categories,
  imagePreview,
  saving,
  packages,
  setPackages,
  slots,
  setSlots,
  onClose,
  onChange,
  onImageChange,
  onToggleMode,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-7xl overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Sparkles className="h-3.5 w-3.5" />
                KidGage Course Manager
              </div>

              <h3 className="mt-3 text-2xl font-black text-slate-950">
                {mode === "edit" ? "Edit Course" : "Add Course"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create booking-ready academy programs with packages and slot
                setup. New courses are submitted to Super Admin for approval
                before they appear publicly.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-950">
                      Course Information
                    </div>
                    <div className="text-sm text-slate-500">
                      Basic public details shown to parents.
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Course Name">
                    <TextInput
                      value={form.name}
                      onChange={(e) => onChange("name", e.target.value)}
                      placeholder="Enter course name"
                      required
                    />
                  </Field>

                  <Field label="Category">
                    <Select
                      value={form.category}
                      onChange={(e) => onChange("category", e.target.value)}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Start Date">
                    <TextInput
                      type="date"
                      value={form.startDate}
                      onChange={(e) => onChange("startDate", e.target.value)}
                    />
                  </Field>

                  <Field label="End Date">
                    <TextInput
                      type="date"
                      value={form.endDate}
                      onChange={(e) => onChange("endDate", e.target.value)}
                    />
                  </Field>

                  <Field label="Duration Label">
                    <TextInput
                      value={form.durationLabel}
                      onChange={(e) =>
                        onChange("durationLabel", e.target.value)
                      }
                      placeholder="Example: 3 months / 12 weeks"
                    />
                  </Field>

                  <Field label="Fees">
                    <TextInput
                      value={form.fees}
                      onChange={(e) => onChange("fees", e.target.value)}
                      placeholder="Example: 250 QAR"
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Mode of Classes">
                      <div className="flex flex-wrap gap-3">
                        {["Online", "Offline", "Hybrid"].map((item) => {
                          const active = form.modes.includes(item);

                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => onToggleMode(item)}
                              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                                active
                                  ? "bg-[#ff7a3d] text-white shadow-sm"
                                  : "bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Description">
                      <TextArea
                        rows={5}
                        value={form.description}
                        onChange={(e) =>
                          onChange("description", e.target.value)
                        }
                        placeholder="Write a short description about the course..."
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <PackageEditor packages={packages} setPackages={setPackages} />

              <SlotEditor
                slots={slots}
                setSlots={setSlots}
                packageOptions={packages}
              />
            </div>

            <div className="space-y-6 xl:col-span-4">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#1877f2]">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-950">
                      Course Banner
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Upload a clean banner image for this program.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex h-[220px] items-center justify-center overflow-hidden rounded-[26px] border border-dashed border-orange-200 bg-orange-50/30">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Course preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="mx-auto h-8 w-8" />
                      <div className="mt-2 text-sm">No image selected</div>
                    </div>
                  )}
                </div>

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#1877f2] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(24,119,242,0.22)] transition hover:bg-blue-700">
                  <Upload className="h-4 w-4" />
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onImageChange}
                  />
                </label>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-sm">
                <div className="text-sm font-black">Quick Summary</div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                      Packages
                    </div>

                    <div className="mt-2">
                      <PackageSummaryBadges items={packages} />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                      Slots
                    </div>

                    <div className="mt-2">
                      <SlotSummaryBadges items={slots} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-end gap-3 rounded-[26px] border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur">
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
              className="rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] transition hover:bg-[#ec6f35] disabled:opacity-60"
            >
              {saving
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                  ? "Update Course"
                  : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewCourseModal({ open, course, onClose }) {
  if (!open || !course) return null;

  const viewImage = normalizeImage(getBestImage(course));

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-6xl overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Eye className="h-3.5 w-3.5" />
                Course Details
              </div>

              <h3 className="mt-3 text-2xl font-black text-slate-950">
                {course.name}
              </h3>

              <div className="mt-3">
                <ApprovalBadge course={course} />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Review the full academy course details.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50 shadow-sm">
              <div className="flex h-[280px] items-center justify-center bg-orange-50/30">
                {viewImage ? (
                  <img
                    src={viewImage}
                    alt={course.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="mx-auto h-8 w-8" />
                    <div className="mt-2 text-sm">No image available</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-7">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox label="Category" value={course.category || "N/A"} />
              <InfoBox label="Fees" value={course.fees || "N/A"} />
              <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Approval Status
                </div>
                <div className="mt-3">
                  <ApprovalBadge course={course} />
                </div>
                {course.rejectionReason ? (
                  <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {course.rejectionReason}
                  </div>
                ) : null}
              </div>
              <InfoBox
                label="Start Date"
                value={formatDate(course.startDate) || "N/A"}
              />
              <InfoBox
                label="End Date"
                value={formatDate(course.endDate) || "N/A"}
              />

              <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Duration
                </div>
                <div className="mt-2 text-base font-black text-slate-950">
                  {course.durationLabel ||
                    formatDateRange(course.startDate, course.endDate)}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Booking Setup
                </div>
                <div className="mt-3">
                  <BookingConfigSummary course={course} />
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Mode of Classes
                </div>
                <div className="mt-3">
                  <ModeChips value={course.modes} maxVisible={3} />
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Description
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-700">
                  {course.description || "No description available."}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-base font-black text-slate-950">{value}</div>
    </div>
  );
}

const initialForm = {
  id: "",
  name: "",
  category: "",
  startDate: "",
  endDate: "",
  durationLabel: "",
  fees: "",
  description: "",
  modes: [],
  image: null,
  imageUrl: "",
};

export default function AcademyActivitiesPage() {
  const navigate = useNavigate();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [form, setForm] = useState(initialForm);

  const [packages, setPackages] = useState([]);
  const [slots, setSlots] = useState([]);

  const [viewCourse, setViewCourse] = useState(null);

  const [deleteState, setDeleteState] = useState({
    open: false,
    courseId: "",
    courseName: "",
  });

  const academyName = user?.academyName || "KidGage Academy";

  const imagePreview = useMemo(() => {
    if (form.image) return URL.createObjectURL(form.image);
    return normalizeImage(form.imageUrl);
  }, [form.image, form.imageUrl]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function resetForm() {
    setForm(initialForm);
    setPackages([]);
    setSlots([]);
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMode(value) {
    setForm((prev) => ({
      ...prev,
      modes: prev.modes.includes(value)
        ? prev.modes.filter((item) => item !== value)
        : [...prev.modes, value],
    }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, image: file }));
  }

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [activitiesRes, categoriesRes] = await Promise.allSettled([
        api.get("/academy/activities"),
        api.get("/academy/categories"),
      ]);

      const activityRows =
        activitiesRes.status === "fulfilled"
          ? toArray(
              activitiesRes.value?.data?.activities ||
                activitiesRes.value?.data?.courses ||
                activitiesRes.value?.data?.items ||
                [],
            )
          : [];

      const categoryRows =
        categoriesRes.status === "fulfilled"
          ? toArray(categoriesRes.value?.data?.categories || [])
          : [];

      const normalizedCourses = activityRows.map((item, index) => {
        const bookingConfig = item?.bookingConfig || {};
        const bestImage = getBestImage(item);

        return {
          raw: item,
          id: item?._id || item?.id || `course-${index + 1}`,
          _id: item?._id || item?.id || "",
          name: item?.title || item?.name || "Untitled Course",
          title: item?.title || item?.name || "Untitled Course",
          category:
            item?.categoryName ||
            item?.category?.name ||
            item?.category ||
            "N/A",
          startDate: item?.startDate || item?.dateFrom || "",
          endDate: item?.endDate || item?.dateTo || "",
          durationLabel:
            item?.durationLabel ||
            item?.duration ||
            formatDateRange(
              item?.startDate || item?.dateFrom,
              item?.endDate || item?.dateTo,
            ),
          description: item?.description || "",
          fees: item?.fees || item?.price || item?.basePrice || "",
          modes: normalizeModesValue(
            item?.modes || item?.classModes || item?.modeOfClasses || [],
          ),
          image: bestImage,
          packageType:
            item?.packageType || bookingConfig?.packageType || "SESSIONS",
          totalSessions: toNumber(
            item?.totalSessions ??
              item?.sessionCount ??
              bookingConfig?.totalSessions,
            0,
          ),
          totalWeeks: toNumber(
            item?.totalWeeks ?? item?.weekCount ?? bookingConfig?.totalWeeks,
            0,
          ),
          sessionsPerWeek: toNumber(
            item?.sessionsPerWeek ?? bookingConfig?.sessionsPerWeek,
            0,
          ),
          bookingMode:
            item?.bookingMode || bookingConfig?.bookingMode || "BOTH",
          slotDurationMinutes: toNumber(
            item?.slotDurationMinutes ?? bookingConfig?.slotDurationMinutes,
            60,
          ),
          defaultCapacity: toNumber(
            item?.defaultCapacity ??
              item?.capacity ??
              bookingConfig?.defaultCapacity,
            1,
          ),
          allowWaitlist: Boolean(
            item?.allowWaitlist ?? bookingConfig?.allowWaitlist,
          ),
          approvalStatus: String(
            item?.approvalStatus || "PENDING_APPROVAL",
          ).toUpperCase(),
          approvalRequestedAt: item?.approvalRequestedAt || null,
          approvedAt: item?.approvedAt || null,
          approvedBy: item?.approvedBy || null,
          rejectedAt: item?.rejectedAt || null,
          rejectedBy: item?.rejectedBy || null,
          rejectionReason: item?.rejectionReason || "",
          isApproved:
            String(item?.approvalStatus || "").toUpperCase() === "APPROVED",
          isPendingApproval:
            String(item?.approvalStatus || "PENDING_APPROVAL").toUpperCase() ===
            "PENDING_APPROVAL",
          isRejected:
            String(item?.approvalStatus || "").toUpperCase() === "REJECTED",
          visibleToPublic:
            String(item?.status || "").toUpperCase() === "PUBLISHED" &&
            String(item?.approvalStatus || "").toUpperCase() === "APPROVED",
        };
      });

      const normalizedCategories = categoryRows.map((item, index) => ({
        id: item?._id || item?.id || `category-${index + 1}`,
        name: item?.name || item?.title || "Untitled Category",
      }));

      setCourses(normalizedCourses);
      setCategories(normalizedCategories);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load courses.");
      setCourses([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return courses;

    return courses.filter((item) => {
      return (
        String(item.name || "")
          .toLowerCase()
          .includes(q) ||
        String(item.category || "")
          .toLowerCase()
          .includes(q) ||
        String(item.description || "")
          .toLowerCase()
          .includes(q) ||
        String(item.packageType || "")
          .toLowerCase()
          .includes(q) ||
        String(item.bookingMode || "")
          .toLowerCase()
          .includes(q) ||
        String(getApprovalMeta(getApprovalStatus(item)).label || "")
          .toLowerCase()
          .includes(q) ||
        String(item.approvalStatus || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [courses, search]);

  const publishedCount = courses.length;
  const approvedCount = courses.filter(
    (course) => getApprovalStatus(course) === "APPROVED",
  ).length;
  const pendingApprovalCount = courses.filter(
    (course) => getApprovalStatus(course) === "PENDING_APPROVAL",
  ).length;
  const rejectedCount = courses.filter(
    (course) => getApprovalStatus(course) === "REJECTED",
  ).length;
  const bookingReadyCount = courses.filter(
    (course) => Number(course.totalSessions || 0) > 0 || course.bookingMode,
  ).length;

  function openCreateModal() {
    setModalMode("create");
    resetForm();
    setModalOpen(true);
  }

  async function openEditModal(course) {
    try {
      setError("");
      setMessage("");
      setModalMode("edit");

      const [packagesRes, slotsRes] = await Promise.all([
        api.get(`/academy/activities/${course.id}/packages`),
        api.get(`/academy/activities/${course.id}/slots`),
      ]);

      const packageRows = toArray(packagesRes?.data?.packages);
      const slotRows = toArray(slotsRes?.data?.slots);

      const normalizedPackages = packageRows.map((pkg) => ({
        _localId: makeLocalId(),
        _serverId: pkg._id || pkg.id || "",
        title: pkg.title || "",
        packageType: pkg.packageType || "SESSIONS",
        durationValue: String(pkg.durationValue || ""),
        durationUnit: pkg.durationUnit || "SESSION",
        sessionCount: String(pkg.sessionCount || ""),
        validityDays: String(pkg.validityDays || ""),
        minSelectableSessions: String(pkg.minSelectableSessions || ""),
        maxSelectableSessions: String(pkg.maxSelectableSessions || ""),
        bookingPattern: pkg.bookingPattern || pkg.bookingMode || "BOTH",
        price: String(pkg.price || ""),
        currency: pkg.currency || "QAR",
        isDefault: Boolean(pkg.isDefault),
        active: Boolean(pkg.active ?? true),
        displayOrder: String(pkg.displayOrder || ""),
        description: pkg.description || "",
      }));

      const packageServerToLocal = new Map();

      normalizedPackages.forEach((pkg) => {
        if (pkg._serverId) {
          packageServerToLocal.set(String(pkg._serverId), pkg._localId);
        }
      });

      const normalizedSlots = slotRows.map((slot) => ({
        _localId: makeLocalId(),
        _serverId: slot._id || slot.id || "",
        packageRef:
          packageServerToLocal.get(
            String(slot.packageId?._id || slot.packageId || ""),
          ) || "",
        date: slot.date ? new Date(slot.date).toISOString().slice(0, 10) : "",
        startTime: slot.startTime || "",
        endTime: slot.endTime || "",
        sessionLabel: slot.sessionLabel || "",
        capacity: String(slot.capacity || 1),
        priceOverride:
          slot.priceOverride === null || slot.priceOverride === undefined
            ? ""
            : String(slot.priceOverride),
        bookingOpenAt: slot.bookingOpenAt
          ? new Date(slot.bookingOpenAt).toISOString().slice(0, 16)
          : "",
        bookingCloseAt: slot.bookingCloseAt
          ? new Date(slot.bookingCloseAt).toISOString().slice(0, 16)
          : "",
        notes: slot.notes || "",
        status: slot.status || "OPEN",
        active: Boolean(slot.active ?? true),
      }));

      setForm({
        id: course.id,
        name: course.name || "",
        category: course.category || "",
        startDate: course.startDate
          ? new Date(course.startDate).toISOString().slice(0, 10)
          : "",
        endDate: course.endDate
          ? new Date(course.endDate).toISOString().slice(0, 10)
          : "",
        durationLabel: course.durationLabel || "",
        fees: course.fees || "",
        description: course.description || "",
        modes: normalizeModesValue(course.modes),
        image: null,
        imageUrl: course.image || "",
      });

      setPackages(normalizedPackages);
      setSlots(normalizedSlots);
      setModalOpen(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load course details.",
      );
    }
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const activityPayload = new FormData();

      activityPayload.append("name", form.name);
      activityPayload.append("title", form.name);
      activityPayload.append("category", form.category);
      activityPayload.append("categoryName", form.category);
      activityPayload.append("startDate", form.startDate);
      activityPayload.append("endDate", form.endDate);
      activityPayload.append("durationLabel", form.durationLabel);
      activityPayload.append("fees", form.fees);
      activityPayload.append("description", form.description);
      activityPayload.append("modes", JSON.stringify(form.modes));

      form.modes.forEach((mode) => {
        activityPayload.append("modes[]", mode);
      });

      if (form.image) {
        activityPayload.append("image", form.image);
      }

      const firstPackage = packages[0] || null;
      const firstSlot = slots[0] || null;

      activityPayload.append(
        "packageType",
        firstPackage?.packageType || "SESSIONS",
      );
      activityPayload.append(
        "totalSessions",
        String(firstPackage?.sessionCount || 0),
      );
      activityPayload.append(
        "sessionCount",
        String(firstPackage?.sessionCount || 0),
      );
      activityPayload.append(
        "totalWeeks",
        String(
          firstPackage?.durationUnit === "MONTH"
            ? firstPackage?.durationValue || 0
            : 0,
        ),
      );
      activityPayload.append(
        "bookingMode",
        firstPackage?.bookingPattern || "BOTH",
      );
      activityPayload.append("slotDurationMinutes", "60");
      activityPayload.append(
        "defaultCapacity",
        String(firstSlot?.capacity || 1),
      );
      activityPayload.append("capacity", String(firstSlot?.capacity || 1));
      activityPayload.append("allowWaitlist", "false");

      activityPayload.append(
        "bookingConfig",
        JSON.stringify({
          packageType: firstPackage?.packageType || "SESSIONS",
          totalSessions: toNumber(firstPackage?.sessionCount, 0),
          totalWeeks:
            String(firstPackage?.durationUnit || "").toUpperCase() === "MONTH"
              ? toNumber(firstPackage?.durationValue, 0)
              : 0,
          sessionsPerWeek: 0,
          bookingMode: firstPackage?.bookingPattern || "BOTH",
          slotDurationMinutes: 60,
          defaultCapacity: toNumber(firstSlot?.capacity, 1),
          allowWaitlist: false,
        }),
      );

      let activityId = form.id;

      if (modalMode === "edit" && form.id) {
        const { data } = await api.put(
          `/academy/activities/${form.id}`,
          activityPayload,
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        activityId = data?.activity?._id || data?.activity?.id || form.id;
      } else {
        const { data } = await api.post(
          "/academy/activities",
          activityPayload,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        activityId = data?.activity?._id || data?.activity?.id;
      }

      if (!activityId) {
        throw new Error("Activity save failed");
      }

      if (modalMode === "edit") {
        const existingSlotsRes = await api.get(
          `/academy/activities/${activityId}/slots`,
        );
        const existingSlots = toArray(existingSlotsRes?.data?.slots);

        for (const slot of existingSlots) {
          await api.delete(`/academy/slots/${slot._id || slot.id}`);
        }

        const existingPackagesRes = await api.get(
          `/academy/activities/${activityId}/packages`,
        );
        const existingPackages = toArray(existingPackagesRes?.data?.packages);

        for (const pkg of existingPackages) {
          await api.delete(`/academy/packages/${pkg._id || pkg.id}`);
        }
      }

      const packageIdMap = new Map();

      for (let i = 0; i < packages.length; i += 1) {
        const pkg = packages[i];

        if (!String(pkg.title || "").trim()) continue;

        const { data } = await api.post(
          `/academy/activities/${activityId}/packages`,
          {
            title: pkg.title,
            packageType: pkg.packageType || "SESSIONS",
            durationValue: toNumber(pkg.durationValue, 0),
            durationUnit: pkg.durationUnit || "SESSION",
            sessionCount: toNumber(pkg.sessionCount, 0),
            validityDays: toNumber(pkg.validityDays, 0),
            minSelectableSessions: toNumber(pkg.minSelectableSessions, 0),
            maxSelectableSessions: toNumber(pkg.maxSelectableSessions, 0),
            bookingPattern: pkg.bookingPattern || "BOTH",
            bookingMode: pkg.bookingPattern || "BOTH",
            price: toNumber(pkg.price, 0),
            currency: pkg.currency || "QAR",
            isDefault: Boolean(pkg.isDefault),
            active: Boolean(pkg.active ?? true),
            displayOrder:
              String(pkg.displayOrder || "").trim() === ""
                ? i
                : toNumber(pkg.displayOrder, i),
            description: pkg.description || "",
          },
        );

        const realId = data?.package?._id || data?.package?.id;

        if (realId) {
          packageIdMap.set(pkg._localId, realId);
        }
      }

      for (const slot of slots) {
        const realPackageId = packageIdMap.get(slot.packageRef);

        if (!realPackageId) continue;
        if (!slot.date || !slot.startTime || !slot.endTime) continue;

        await api.post(`/academy/activities/${activityId}/slots`, {
          packageId: realPackageId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          sessionLabel: slot.sessionLabel || "",
          capacity: toNumber(slot.capacity, 1),
          priceOverride:
            String(slot.priceOverride || "").trim() === ""
              ? null
              : toNumber(slot.priceOverride, 0),
          bookingOpenAt: slot.bookingOpenAt || null,
          bookingCloseAt: slot.bookingCloseAt || null,
          notes: slot.notes || "",
          status: slot.status || "OPEN",
          active: Boolean(slot.active ?? true),
        });
      }

      setMessage(
        modalMode === "edit"
          ? "Course updated successfully. Approval status remains controlled by Super Admin."
          : "Course submitted for Super Admin approval. It will be visible to parents only after approval.",
      );

      closeModal();
      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save course.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(course) {
    setDeleteState({
      open: true,
      courseId: course.id || course._id,
      courseName: course.name || course.title || "Course",
    });
  }

  function closeDeleteDialog() {
    setDeleteState({
      open: false,
      courseId: "",
      courseName: "",
    });
  }

  async function confirmDelete() {
    if (!deleteState.courseId) return;

    try {
      setError("");
      setMessage("");
      setDeleting(true);

      await api.delete(`/academy/activities/${deleteState.courseId}`);

      setCourses((prev) =>
        prev.filter(
          (course) => String(course.id) !== String(deleteState.courseId),
        ),
      );

      setMessage("Course deleted successfully from database.");
      closeDeleteDialog();

      await loadData({ silent: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete course from database.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#fff8f4] px-4 py-5 text-slate-950 md:px-8 md:py-6">
      <section className="relative overflow-hidden rounded-[36px] border border-orange-100 bg-gradient-to-br from-white via-orange-50/80 to-blue-50 p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />

        <div className="relative grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">KidGage Program Management</span>
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Courses
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Manage academy courses, booking packages, and available slots in a
              parent-friendly KidGage workflow.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              <StatMini
                icon={BookOpen}
                label="Courses"
                value={courses.length}
                color="text-[#ff7a3d]"
                bg="bg-orange-50"
              />
              <StatMini
                icon={Layers3}
                label="Categories"
                value={categories.length}
                color="text-[#1877f2]"
                bg="bg-blue-50"
              />
              <StatMini
                icon={BadgeCheck}
                label="Approved"
                value={approvedCount}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <StatMini
                icon={Clock3}
                label="Pending"
                value={pendingApprovalCount}
                color="text-amber-600"
                bg="bg-amber-50"
              />
              <StatMini
                icon={AlertCircle}
                label="Rejected"
                value={rejectedCount}
                color="text-red-600"
                bg="bg-red-50"
              />
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses, package type, booking mode..."
                className="h-14 w-full rounded-[22px] border border-white bg-white pl-12 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none ring-1 ring-orange-100 transition placeholder:text-slate-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-[26px] border border-white bg-white/90 p-4 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="truncate text-base font-black text-slate-950">
                  {academyName}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#ff7a3d]" />
                    {toNumber(publishedCount)} courses
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-600" />
                    {toNumber(pendingApprovalCount)} pending
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-[#1877f2]" />
                    {toNumber(categories.length)} categories
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <button
                  type="button"
                  onClick={() => loadData({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60 sm:w-auto"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.25)] transition hover:bg-[#ec6f35] sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add Course
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-950">
              Programs Offered
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Courses with booking-ready package and slot configuration.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-700 ring-1 ring-amber-100">
            <ShieldCheck className="h-4 w-4" />
            Super Admin Approval Required
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-[26px] bg-slate-100"
              />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <EmptyState text="No courses found." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1320px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Banner
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Name
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Approval
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Duration
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Booking Setup
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Class Modes
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Category
                    </th>
                    <th className="pb-4 text-sm font-black text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCourses.map((course) => {
                    const tableImage = normalizeImage(getBestImage(course));

                    return (
                      <tr
                        key={course.id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-orange-50/25"
                      >
                        <td className="py-5 pr-5">
                          <div className="flex h-28 w-44 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-orange-50/30">
                            {tableImage ? (
                              <img
                                src={tableImage}
                                alt={course.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="text-center text-slate-400">
                                <ImageIcon className="mx-auto h-6 w-6" />
                                <div className="mt-1 text-xs">No image</div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="max-w-[220px] text-sm font-black text-slate-950">
                            {course.name}
                          </div>

                          {course.fees ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              <Wallet className="h-3.5 w-3.5" />
                              {course.fees}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <ApprovalBadge course={course} />
                          {course.rejectionReason ? (
                            <div className="mt-2 max-w-[220px] text-xs font-semibold text-red-600">
                              {course.rejectionReason}
                            </div>
                          ) : null}
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="max-w-[220px] text-sm font-semibold text-slate-700">
                            {course.durationLabel ||
                              formatDateRange(course.startDate, course.endDate)}
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="max-w-[320px]">
                            <BookingConfigSummary course={course} />
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <div className="max-w-[240px]">
                            <ModeChips value={course.modes} maxVisible={3} />
                          </div>
                        </td>

                        <td className="py-5 pr-5 align-top">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                            <FolderOpen className="h-4 w-4 text-[#1877f2]" />
                            {course.category}
                          </span>
                        </td>

                        <td className="py-5 align-top">
                          <div className="flex items-center gap-2">
                            <IconButton
                              title="View"
                              onClick={() => setViewCourse(course)}
                            >
                              <Eye className="h-5 w-5" />
                            </IconButton>

                            <IconButton
                              title="Edit"
                              variant="blue"
                              onClick={() => openEditModal(course)}
                            >
                              <Pencil className="h-5 w-5" />
                            </IconButton>

                            <IconButton
                              title="Packages & Slots"
                              variant="orange"
                              onClick={() =>
                                navigate(
                                  `/academy/activities/${course.id}/manage`,
                                )
                              }
                            >
                              <Package className="h-5 w-5" />
                            </IconButton>

                            <IconButton
                              title="Delete"
                              variant="red"
                              onClick={() => openDeleteDialog(course)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 xl:hidden">
              {filteredCourses.map((course) => {
                const tableImage = normalizeImage(getBestImage(course));

                return (
                  <div
                    key={course.id}
                    className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-orange-50/30">
                      <div className="flex h-44 items-center justify-center">
                        {tableImage ? (
                          <img
                            src={tableImage}
                            alt={course.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImageIcon className="mx-auto h-6 w-6" />
                            <div className="mt-1 text-xs">No image</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-lg font-black text-slate-950">
                          {course.name}
                        </div>
                        <ApprovalBadge course={course} compact />
                      </div>

                      {course.rejectionReason ? (
                        <div className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                          {course.rejectionReason}
                        </div>
                      ) : null}

                      <div className="mt-2 text-sm font-medium text-slate-500">
                        {course.durationLabel ||
                          formatDateRange(course.startDate, course.endDate)}
                      </div>

                      <div className="mt-3">
                        <BookingConfigSummary course={course} />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewCourse(course)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5 text-sm font-black text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(course)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-50 px-3 py-2.5 text-sm font-black text-[#1877f2]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/academy/activities/${course.id}/manage`)
                          }
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]"
                        >
                          <Clock3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteDialog(course)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <CourseModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        categories={categories}
        imagePreview={imagePreview}
        saving={saving}
        packages={packages}
        setPackages={setPackages}
        slots={slots}
        setSlots={setSlots}
        onClose={closeModal}
        onChange={updateForm}
        onImageChange={handleImageChange}
        onToggleMode={toggleMode}
        onSubmit={handleSubmit}
      />

      <ViewCourseModal
        open={Boolean(viewCourse)}
        course={viewCourse}
        onClose={() => setViewCourse(null)}
      />

      <ConfirmDialog
        open={deleteState.open}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteState.courseName}"? This will delete it from the database with its packages and slots.`}
        confirmText="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}

function StatMini({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="rounded-[24px] border border-white bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bg} ${color}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="text-2xl font-black text-slate-950">{value}</div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, title, onClick, variant = "slate" }) {
  const classes = {
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    blue: "bg-blue-50 text-[#1877f2] hover:bg-blue-100",
    orange: "bg-orange-50 text-[#ff7a3d] hover:bg-orange-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition ${
        classes[variant] || classes.slate
      }`}
    >
      {children}
    </button>
  );
}

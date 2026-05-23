import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Package,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Clock3,
  Layers3,
  CheckCircle2,
  CopyPlus,
  CalendarPlus,
  Repeat,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysYmd(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstUsableNumber(values = [], fallback = 0) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return fallback;
}

function getAgeRangeFromSource(source = {}, fallback = {}) {
  const fallbackMin = firstUsableNumber(
    [fallback.minAge, fallback.minimumAge, fallback.ageFrom, fallback.fromAge],
    0,
  );

  const fallbackMax = firstUsableNumber(
    [fallback.maxAge, fallback.maximumAge, fallback.ageTo, fallback.toAge],
    18,
  );

  return {
    minAge: firstUsableNumber(
      [
        source?.minAge,
        source?.minimumAge,
        source?.ageFrom,
        source?.fromAge,
        source?.ageMin,
      ],
      fallbackMin,
    ),
    maxAge: firstUsableNumber(
      [
        source?.maxAge,
        source?.maximumAge,
        source?.ageTo,
        source?.toAge,
        source?.ageMax,
      ],
      fallbackMax,
    ),
  };
}

function formatAgeRange(minAge, maxAge) {
  const min = Number(minAge || 0);
  const max = Number(maxAge || 0);

  if (min && max) return `${min}-${max} years`;
  if (min) return `${min}+ years`;
  if (max) return `Up to ${max} years`;
  return "All ages";
}

function normalizePackage(item, index = 0, activityFallback = null) {
  const ageRange = getAgeRangeFromSource(item, activityFallback || {});

  return {
    ...item,
    id: item?.id || item?._id || `package-${index + 1}`,
    _id: item?._id || item?.id || "",
    title: item?.title || "Untitled Package",
    packageType: item?.packageType || "SESSIONS",
    durationValue: item?.durationValue || 0,
    durationUnit: item?.durationUnit || "SESSION",
    sessionCount: item?.sessionCount || 0,
    validityDays: item?.validityDays || 0,
    minSelectableSessions: item?.minSelectableSessions || 0,
    maxSelectableSessions: item?.maxSelectableSessions || 0,
    bookingMode: item?.bookingMode || item?.bookingPattern || "BOTH",
    bookingPattern: item?.bookingPattern || item?.bookingMode || "BOTH",
    description: item?.description || "",
    price: item?.price || 0,
    currency: item?.currency || "QAR",
    minAge: ageRange.minAge,
    maxAge: ageRange.maxAge,
    ageGroup: item?.ageGroup || item?.ageRange || item?.ageLabel || "",
    isDefault: Boolean(item?.isDefault),
    active: item?.active !== false,
    displayOrder: item?.displayOrder || 0,
  };
}

function normalizeSlot(item, index = 0) {
  const capacity = toNumber(item?.capacity, 0);
  const bookedCount = toNumber(item?.bookedCount, 0);

  return {
    ...item,
    id: item?.id || item?._id || `slot-${index + 1}`,
    _id: item?._id || item?.id || "",
    packageId: item?.packageId?._id || item?.packageId || "",
    date: item?.date || null,
    startTime: item?.startTime || "",
    endTime: item?.endTime || "",
    sessionLabel: item?.sessionLabel || "",
    capacity,
    bookedCount,
    waitlistCount: toNumber(item?.waitlistCount, 0),
    availableCount:
      item?.availableCount !== undefined
        ? toNumber(item.availableCount, Math.max(0, capacity - bookedCount))
        : Math.max(0, capacity - bookedCount),
    priceOverride:
      item?.priceOverride === null || item?.priceOverride === undefined
        ? null
        : item.priceOverride,
    bookingOpenAt: item?.bookingOpenAt || null,
    bookingCloseAt: item?.bookingCloseAt || null,
    notes: item?.notes || "",
    status: item?.status || "OPEN",
    active: item?.active !== false,
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB");
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {right || null}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint = "" }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </label>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 ${className}`}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-300 ${className}`}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-slate-300 ${className}`}
    >
      {children}
    </select>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeneratorModeButton({ active, icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {subtitle}
          </div>
        </div>
      </div>
    </button>
  );
}

function PackageModal({
  open,
  mode,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {mode === "edit" ? "Edit Package" : "Add Package"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Configure package pricing, session count, validity, booking
              mode, and child age eligibility.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Package Title">
              <TextInput
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="Example: 8 Sessions"
                required
              />
            </Field>

            <Field label="Package Type">
              <Select
                value={form.packageType}
                onChange={(e) => onChange("packageType", e.target.value)}
              >
                <option value="SESSIONS">SESSIONS</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="CUSTOM">CUSTOM</option>
              </Select>
            </Field>

            <Field label="Duration Value">
              <TextInput
                type="number"
                min="0"
                value={form.durationValue}
                onChange={(e) => onChange("durationValue", e.target.value)}
                placeholder="8"
              />
            </Field>

            <Field label="Duration Unit">
              <Select
                value={form.durationUnit}
                onChange={(e) => onChange("durationUnit", e.target.value)}
              >
                <option value="SESSION">SESSION</option>
                <option value="MONTH">MONTH</option>
                <option value="CUSTOM">CUSTOM</option>
              </Select>
            </Field>

            <Field label="Session Count">
              <TextInput
                type="number"
                min="0"
                value={form.sessionCount}
                onChange={(e) => onChange("sessionCount", e.target.value)}
                placeholder="8"
              />
            </Field>

            <Field label="Validity Days">
              <TextInput
                type="number"
                min="0"
                value={form.validityDays}
                onChange={(e) => onChange("validityDays", e.target.value)}
                placeholder="30"
              />
            </Field>

            <Field label="Min Selectable Sessions">
              <TextInput
                type="number"
                min="0"
                value={form.minSelectableSessions}
                onChange={(e) =>
                  onChange("minSelectableSessions", e.target.value)
                }
                placeholder="0"
              />
            </Field>

            <Field label="Max Selectable Sessions">
              <TextInput
                type="number"
                min="0"
                value={form.maxSelectableSessions}
                onChange={(e) =>
                  onChange("maxSelectableSessions", e.target.value)
                }
                placeholder="8"
              />
            </Field>

            <Field label="Booking Mode">
              <Select
                value={form.bookingMode}
                onChange={(e) => onChange("bookingMode", e.target.value)}
              >
                <option value="STRAIGHT">STRAIGHT</option>
                <option value="FLEXIBLE">FLEXIBLE</option>
                <option value="BOTH">BOTH</option>
              </Select>
            </Field>

            <Field label="Price">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => onChange("price", e.target.value)}
                placeholder="250"
              />
            </Field>

            <Field label="Currency">
              <TextInput
                value={form.currency}
                onChange={(e) => onChange("currency", e.target.value)}
                placeholder="QAR"
              />
            </Field>

            <Field
              label="Minimum Child Age"
              hint="Smallest child age allowed to book this package."
            >
              <TextInput
                type="number"
                min="0"
                value={form.minAge}
                onChange={(e) => onChange("minAge", e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field
              label="Maximum Child Age"
              hint="Largest child age allowed to book this package."
            >
              <TextInput
                type="number"
                min="0"
                value={form.maxAge}
                onChange={(e) => onChange("maxAge", e.target.value)}
                placeholder="18"
              />
            </Field>

            <Field label="Display Order">
              <TextInput
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => onChange("displayOrder", e.target.value)}
                placeholder="0"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <TextArea
                  rows={4}
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  placeholder="Short package description"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-5 md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.isDefault)}
                  onChange={(e) => onChange("isDefault", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Default package
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(e) => onChange("active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                  ? "Update Package"
                  : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SlotModal({ open, mode, form, saving, onClose, onChange, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {mode === "edit" ? "Edit Slot" : "Add Slot"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a single booking slot for the selected package.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Date">
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => onChange("date", e.target.value)}
                required
              />
            </Field>

            <Field label="Session Label">
              <TextInput
                value={form.sessionLabel}
                onChange={(e) => onChange("sessionLabel", e.target.value)}
                placeholder="Morning / Evening"
              />
            </Field>

            <Field label="Start Time">
              <TextInput
                type="time"
                value={form.startTime}
                onChange={(e) => onChange("startTime", e.target.value)}
                required
              />
            </Field>

            <Field label="End Time">
              <TextInput
                type="time"
                value={form.endTime}
                onChange={(e) => onChange("endTime", e.target.value)}
                required
              />
            </Field>

            <Field label="Capacity">
              <TextInput
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => onChange("capacity", e.target.value)}
                placeholder="1"
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="FULL">FULL</option>
                <option value="CLOSED">CLOSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </Field>

            <Field label="Price Override">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.priceOverride}
                onChange={(e) => onChange("priceOverride", e.target.value)}
                placeholder="Optional"
              />
            </Field>

            <Field label="Waitlist Count">
              <TextInput
                type="number"
                min="0"
                value={form.waitlistCount}
                onChange={(e) => onChange("waitlistCount", e.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Booking Open At">
              <TextInput
                type="datetime-local"
                value={form.bookingOpenAt}
                onChange={(e) => onChange("bookingOpenAt", e.target.value)}
              />
            </Field>

            <Field label="Booking Close At">
              <TextInput
                type="datetime-local"
                value={form.bookingCloseAt}
                onChange={(e) => onChange("bookingCloseAt", e.target.value)}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes">
                <TextArea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => onChange("notes", e.target.value)}
                  placeholder="Optional notes"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(e) => onChange("active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                  ? "Update Slot"
                  : "Create Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkSlotModal({
  open,
  form,
  saving,
  onClose,
  onChange,
  onToggleDay,
  onToggleMonthDay,
  onTimeSlotChange,
  onAddTimeSlot,
  onRemoveTimeSlot,
  onSubmit,
}) {
  if (!open) return null;

  const weekDays = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
  ];

  const monthDays = Array.from({ length: 31 }, (_, index) => index + 1);

  const modeTitle =
    form.generationMode === "DAILY"
      ? "Daily Slot Generator"
      : form.generationMode === "MONTHLY"
        ? "Monthly Slot Generator"
        : "Weekly Slot Generator";

  const modeSubtitle =
    form.generationMode === "DAILY"
      ? "Generate slots for every day inside the selected date range."
      : form.generationMode === "MONTHLY"
        ? "Generate slots on selected month dates like 1st, 15th, or 30th."
        : "Generate slots on selected weekdays across the date range.";

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-5xl rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-slate-900">{modeTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">{modeSubtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <GeneratorModeButton
              active={form.generationMode === "DAILY"}
              icon={CalendarDays}
              title="Daily"
              subtitle="Every date in range"
              onClick={() => onChange("generationMode", "DAILY")}
            />

            <GeneratorModeButton
              active={form.generationMode === "WEEKLY"}
              icon={Repeat}
              title="Weekly"
              subtitle="Selected weekdays"
              onClick={() => onChange("generationMode", "WEEKLY")}
            />

            <GeneratorModeButton
              active={form.generationMode === "MONTHLY"}
              icon={CalendarPlus}
              title="Monthly"
              subtitle="Selected month days"
              onClick={() => onChange("generationMode", "MONTHLY")}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Generation Type">
              <Select
                value={form.generationMode}
                onChange={(e) => onChange("generationMode", e.target.value)}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </Select>
            </Field>

            <Field label="Default Status">
              <Select
                value={form.status}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
              </Select>
            </Field>

            <Field label="Start Date">
              <TextInput
                type="date"
                value={form.startDate}
                onChange={(e) => onChange("startDate", e.target.value)}
                required
              />
            </Field>

            <Field label="End Date">
              <TextInput
                type="date"
                value={form.endDate}
                onChange={(e) => onChange("endDate", e.target.value)}
                required
              />
            </Field>

            {form.generationMode === "WEEKLY" ? (
              <div className="md:col-span-2">
                <Field label="Days of Week">
                  <div className="flex flex-wrap gap-3">
                    {weekDays.map((day) => {
                      const active = form.daysOfWeek.includes(day.value);

                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => onToggleDay(day.value)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            ) : null}

            {form.generationMode === "MONTHLY" ? (
              <div className="md:col-span-2">
                <Field
                  label="Days of Month"
                  hint="Example: choose 1 and 15 to create slots on the 1st and 15th of every month in the selected range."
                >
                  <div className="flex flex-wrap gap-2">
                    {monthDays.map((day) => {
                      const active = form.daysOfMonth.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => onToggleMonthDay(day)}
                          className={`h-10 w-10 rounded-full text-sm font-semibold transition ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            ) : null}

            {form.generationMode === "DAILY" ? (
              <div className="md:col-span-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  Daily mode will generate slots for every date between start
                  date and end date.
                </div>
              </div>
            ) : null}

            <Field label="Default Capacity">
              <TextInput
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => onChange("capacity", e.target.value)}
                placeholder="1"
              />
            </Field>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Time Slots
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Add one or more recurring time rows.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAddTimeSlot}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Time Row
                </button>
              </div>

              <div className="space-y-4">
                {toArray(form.timeSlots).map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_1.2fr_auto]"
                  >
                    <TextInput
                      type="time"
                      value={item.startTime}
                      onChange={(e) =>
                        onTimeSlotChange(index, "startTime", e.target.value)
                      }
                    />

                    <TextInput
                      type="time"
                      value={item.endTime}
                      onChange={(e) =>
                        onTimeSlotChange(index, "endTime", e.target.value)
                      }
                    />

                    <TextInput
                      value={item.sessionLabel}
                      onChange={(e) =>
                        onTimeSlotChange(index, "sessionLabel", e.target.value)
                      }
                      placeholder="Morning / Evening"
                    />

                    <button
                      type="button"
                      onClick={() => onRemoveTimeSlot(index)}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Generating..."
                : form.generationMode === "DAILY"
                  ? "Generate Daily Slots"
                  : form.generationMode === "MONTHLY"
                    ? "Generate Monthly Slots"
                    : "Generate Weekly Slots"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const initialPackageForm = {
  id: "",
  title: "",
  packageType: "SESSIONS",
  durationValue: "0",
  durationUnit: "SESSION",
  sessionCount: "0",
  validityDays: "0",
  minSelectableSessions: "0",
  maxSelectableSessions: "0",
  bookingMode: "BOTH",
  description: "",
  price: "0",
  currency: "QAR",
  minAge: "0",
  maxAge: "18",
  isDefault: false,
  active: true,
  displayOrder: "0",
};

const initialSlotForm = {
  id: "",
  date: "",
  startTime: "",
  endTime: "",
  sessionLabel: "",
  capacity: "1",
  waitlistCount: "0",
  priceOverride: "",
  bookingOpenAt: "",
  bookingCloseAt: "",
  notes: "",
  status: "OPEN",
  active: true,
};

const initialBulkForm = {
  generationMode: "WEEKLY",
  startDate: todayYmd(),
  endDate: addDaysYmd(28),
  daysOfWeek: [1, 3, 5],
  daysOfMonth: [1, 15],
  capacity: "1",
  status: "OPEN",
  timeSlots: [
    { startTime: "16:00", endTime: "17:00", sessionLabel: "Batch 1" },
  ],
};

export default function ActivityPackagesSlotsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [activity, setActivity] = useState(null);

  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [packages, setPackages] = useState([]);
  const [slots, setSlots] = useState([]);

  const [selectedPackageId, setSelectedPackageId] = useState("");

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageModalMode, setPackageModalMode] = useState("create");
  const [packageForm, setPackageForm] = useState(initialPackageForm);

  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [slotModalMode, setSlotModalMode] = useState("create");
  const [slotForm, setSlotForm] = useState(initialSlotForm);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(initialBulkForm);

  const [deleteState, setDeleteState] = useState({
    open: false,
    type: "",
    id: "",
    title: "",
  });

  const selectedPackage = useMemo(() => {
    return (
      packages.find((item) => String(item.id) === String(selectedPackageId)) ||
      null
    );
  }, [packages, selectedPackageId]);

  async function loadActivity() {
    const { data } = await api.get(`/academy/activities/${id}`);
    const nextActivity = data?.activity || null;

    setActivity(nextActivity);

    return nextActivity;
  }

  async function loadPackages(silent = false, activityFallback = activity) {
    try {
      if (!silent) setPackagesLoading(true);

      const { data } = await api.get(`/academy/activities/${id}/packages`);
      const rows = toArray(data?.packages).map((item, index) =>
        normalizePackage(item, index, activityFallback),
      );

      setPackages(rows);

      setSelectedPackageId((prev) => {
        if (prev && rows.some((x) => String(x.id) === String(prev))) {
          return prev;
        }

        return rows[0]?.id || "";
      });
    } finally {
      if (!silent) setPackagesLoading(false);
    }
  }

  async function loadSlots(packageId, silent = false) {
    try {
      if (!silent) setSlotsLoading(true);

      const params = {};
      if (packageId) params.packageId = packageId;

      const { data } = await api.get(`/academy/activities/${id}/slots`, {
        params,
      });

      setSlots(toArray(data?.slots).map(normalizeSlot));
    } finally {
      if (!silent) setSlotsLoading(false);
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const nextActivity = await loadActivity();
      await loadPackages(true, nextActivity);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load activity data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!selectedPackageId) {
      setSlots([]);
      return;
    }

    loadSlots(selectedPackageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackageId, id]);

  function openCreatePackage() {
    setPackageModalMode("create");
    const courseAgeRange = getAgeRangeFromSource(activity);

    setPackageForm({
      ...initialPackageForm,
      currency: activity?.currency || "QAR",
      bookingMode: activity?.bookingMode || "BOTH",
      minAge: String(courseAgeRange.minAge),
      maxAge: String(courseAgeRange.maxAge),
      sessionCount: String(activity?.totalSessions || 0),
      maxSelectableSessions: String(activity?.totalSessions || 0),
    });
    setPackageModalOpen(true);
  }

  function openEditPackage(item) {
    setPackageModalMode("edit");
    setPackageForm({
      id: item.id,
      title: item.title || "",
      packageType: item.packageType || "SESSIONS",
      durationValue: String(item.durationValue || 0),
      durationUnit: item.durationUnit || "SESSION",
      sessionCount: String(item.sessionCount || 0),
      validityDays: String(item.validityDays || 0),
      minSelectableSessions: String(item.minSelectableSessions || 0),
      maxSelectableSessions: String(item.maxSelectableSessions || 0),
      bookingMode: item.bookingMode || item.bookingPattern || "BOTH",
      description: item.description || "",
      price: String(item.price || 0),
      currency: item.currency || "QAR",
      minAge: String(item.minAge ?? 0),
      maxAge: String(item.maxAge ?? 18),
      isDefault: Boolean(item.isDefault),
      active: item.active !== false,
      displayOrder: String(item.displayOrder || 0),
    });
    setPackageModalOpen(true);
  }

  function openCreateSlot() {
    if (!selectedPackageId) {
      setError("Please create or select a package first.");
      return;
    }

    setSlotModalMode("create");
    setSlotForm({
      ...initialSlotForm,
      date: todayYmd(),
      capacity: String(activity?.defaultCapacity || 1),
    });
    setSlotModalOpen(true);
  }

  function openEditSlot(item) {
    setSlotModalMode("edit");
    setSlotForm({
      id: item.id,
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      sessionLabel: item.sessionLabel || "",
      capacity: String(item.capacity || 1),
      waitlistCount: String(item.waitlistCount || 0),
      priceOverride:
        item.priceOverride === null || item.priceOverride === undefined
          ? ""
          : String(item.priceOverride),
      bookingOpenAt: item.bookingOpenAt
        ? new Date(item.bookingOpenAt).toISOString().slice(0, 16)
        : "",
      bookingCloseAt: item.bookingCloseAt
        ? new Date(item.bookingCloseAt).toISOString().slice(0, 16)
        : "",
      notes: item.notes || "",
      status: item.status || "OPEN",
      active: item.active !== false,
    });
    setSlotModalOpen(true);
  }

  function openBulkGenerate(mode = "WEEKLY") {
    if (!selectedPackageId) {
      setError("Please create or select a package first.");
      return;
    }

    let nextEndDate = addDaysYmd(28);
    let nextDaysOfWeek = [1, 3, 5];
    let nextDaysOfMonth = [1, 15];

    if (mode === "DAILY") {
      nextEndDate = addDaysYmd(30);
      nextDaysOfWeek = [];
      nextDaysOfMonth = [];
    }

    if (mode === "WEEKLY") {
      nextEndDate = addDaysYmd(28);
      nextDaysOfWeek = [1, 3, 5];
      nextDaysOfMonth = [];
    }

    if (mode === "MONTHLY") {
      nextEndDate = addDaysYmd(90);
      nextDaysOfWeek = [];
      nextDaysOfMonth = [1, 15];
    }

    setBulkForm((prev) => ({
      ...prev,
      generationMode: mode,
      startDate: prev.startDate || todayYmd(),
      endDate: prev.endDate || nextEndDate,
      daysOfWeek: nextDaysOfWeek.length ? nextDaysOfWeek : prev.daysOfWeek,
      daysOfMonth: nextDaysOfMonth.length ? nextDaysOfMonth : prev.daysOfMonth,
      capacity: String(activity?.defaultCapacity || prev.capacity || 1),
    }));

    setBulkOpen(true);
  }

  async function handlePackageSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        title: packageForm.title,
        packageType: packageForm.packageType,
        durationValue: toNumber(packageForm.durationValue, 0),
        durationUnit: packageForm.durationUnit,
        sessionCount: toNumber(packageForm.sessionCount, 0),
        validityDays: toNumber(packageForm.validityDays, 0),
        minSelectableSessions: toNumber(packageForm.minSelectableSessions, 0),
        maxSelectableSessions: toNumber(packageForm.maxSelectableSessions, 0),
        bookingMode: packageForm.bookingMode,
        bookingPattern: packageForm.bookingMode,
        description: packageForm.description,
        price: toNumber(packageForm.price, 0),
        currency: packageForm.currency || "QAR",
        minAge: toNumber(packageForm.minAge, 0),
        maxAge: toNumber(packageForm.maxAge, 18),
        isDefault: Boolean(packageForm.isDefault),
        active: Boolean(packageForm.active),
        displayOrder: toNumber(packageForm.displayOrder, 0),
      };

      if (payload.minAge > payload.maxAge) {
        setError("Maximum child age must be greater than or equal to minimum child age.");
        return;
      }

      if (packageModalMode === "edit" && packageForm.id) {
        await api.put(`/academy/packages/${packageForm.id}`, payload);
        setMessage("Package updated successfully.");
      } else {
        await api.post(`/academy/activities/${id}/packages`, payload);
        setMessage("Package created successfully.");
      }

      setPackageModalOpen(false);
      await loadPackages(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save package.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlotSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        packageId: selectedPackageId,
        date: slotForm.date,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        sessionLabel: slotForm.sessionLabel,
        capacity: toNumber(slotForm.capacity, 1),
        waitlistCount: toNumber(slotForm.waitlistCount, 0),
        priceOverride:
          slotForm.priceOverride === ""
            ? null
            : toNumber(slotForm.priceOverride, 0),
        bookingOpenAt: slotForm.bookingOpenAt || null,
        bookingCloseAt: slotForm.bookingCloseAt || null,
        notes: slotForm.notes,
        status: slotForm.status,
        active: Boolean(slotForm.active),
      };

      if (slotModalMode === "edit" && slotForm.id) {
        await api.put(`/academy/slots/${slotForm.id}`, payload);
        setMessage("Slot updated successfully.");
      } else {
        await api.post(`/academy/activities/${id}/slots`, payload);
        setMessage("Slot created successfully.");
      }

      setSlotModalOpen(false);
      await loadSlots(selectedPackageId, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save slot.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedPackageId) {
        setError("Please select a package first.");
        return;
      }

      if (!bulkForm.startDate || !bulkForm.endDate) {
        setError("Please select start date and end date.");
        return;
      }

      if (bulkForm.generationMode === "WEEKLY" && !bulkForm.daysOfWeek.length) {
        setError("Please select at least one weekday.");
        return;
      }

      if (
        bulkForm.generationMode === "MONTHLY" &&
        !bulkForm.daysOfMonth.length
      ) {
        setError("Please select at least one day of month.");
        return;
      }

      const validTimeSlots = toArray(bulkForm.timeSlots).filter(
        (item) => item.startTime && item.endTime,
      );

      if (!validTimeSlots.length) {
        setError("Please add at least one valid time row.");
        return;
      }

      const payload = {
        packageId: selectedPackageId,
        generationMode: bulkForm.generationMode,
        startDate: bulkForm.startDate,
        endDate: bulkForm.endDate,
        daysOfWeek:
          bulkForm.generationMode === "WEEKLY" ? bulkForm.daysOfWeek : [],
        daysOfMonth:
          bulkForm.generationMode === "MONTHLY" ? bulkForm.daysOfMonth : [],
        capacity: toNumber(bulkForm.capacity, activity?.defaultCapacity || 1),
        status: bulkForm.status,
        active: true,
        timeSlots: validTimeSlots.map((item) => ({
          startTime: item.startTime,
          endTime: item.endTime,
          sessionLabel: item.sessionLabel,
          capacity: toNumber(
            item.capacity ?? bulkForm.capacity,
            activity?.defaultCapacity || 1,
          ),
          status: bulkForm.status,
          active: true,
        })),
      };

      const { data } = await api.post(
        `/academy/activities/${id}/slots/bulk-generate`,
        payload,
      );

      setMessage(
        data?.message
          ? `${data.message}${
              data?.createdCount ? ` (${data.createdCount} created)` : ""
            }${
              data?.skippedExistingCount
                ? ` · ${data.skippedExistingCount} skipped`
                : ""
            }`
          : "Slots generated successfully.",
      );

      setBulkOpen(false);
      await loadSlots(selectedPackageId, true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to generate slots.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(type, item) {
    setDeleteState({
      open: true,
      type,
      id: item.id,
      title: item.title || item.sessionLabel || item.startTime || "item",
    });
  }

  async function confirmDelete() {
    try {
      setError("");
      setMessage("");

      if (deleteState.type === "package") {
        await api.delete(`/academy/packages/${deleteState.id}`);
        setMessage("Package deleted successfully.");
        await loadPackages(true);
      } else if (deleteState.type === "slot") {
        await api.delete(`/academy/slots/${deleteState.id}`);
        setMessage("Slot deleted successfully.");
        await loadSlots(selectedPackageId, true);
      }

      setDeleteState({
        open: false,
        type: "",
        id: "",
        title: "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete item.");
    }
  }

  function toggleBulkDay(day) {
    setBulkForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  function toggleBulkMonthDay(day) {
    setBulkForm((prev) => ({
      ...prev,
      daysOfMonth: prev.daysOfMonth.includes(day)
        ? prev.daysOfMonth.filter((d) => d !== day)
        : [...prev.daysOfMonth, day].sort((a, b) => a - b),
    }));
  }

  function updateBulkTimeSlot(index, key, value) {
    setBulkForm((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addBulkTimeSlot() {
    setBulkForm((prev) => ({
      ...prev,
      timeSlots: [
        ...prev.timeSlots,
        { startTime: "16:00", endTime: "17:00", sessionLabel: "" },
      ],
    }));
  }

  function removeBulkTimeSlot(index) {
    setBulkForm((prev) => ({
      ...prev,
      timeSlots:
        prev.timeSlots.length <= 1
          ? prev.timeSlots
          : prev.timeSlots.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return (
      <div className="w-full bg-slate-50 px-5 py-5 md:px-8 md:py-6">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 px-5 py-5 md:px-8 md:py-6">
      <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1">
            <button
              type="button"
              onClick={() => navigate("/academy/activities")}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </button>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              {activity?.title || activity?.name || "Activity"}
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              Manage packages and booking slots for this activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadPackages();
                if (selectedPackageId) loadSlots(selectedPackageId);
              }}
              disabled={packagesLoading || slotsLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  packagesLoading || slotsLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreatePackage}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Package
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <SectionCard
            title="Packages"
            subtitle="Pricing plans and booking modes for this activity."
            right={
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                <Package className="h-3.5 w-3.5" />
                {packages.length} total
              </span>
            }
          >
            {packagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <EmptyState text="No packages created yet." />
            ) : (
              <div className="space-y-3">
                {packages.map((item) => {
                  const active = String(selectedPackageId) === String(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPackageId(item.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        active
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-bold text-slate-900">
                              {item.title}
                            </div>

                            {item.isDefault ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                                Default
                              </span>
                            ) : null}

                            {!item.active ? (
                              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                                Inactive
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                              {item.packageType}
                            </span>

                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                              {item.sessionCount || 0} sessions
                            </span>

                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                              {item.bookingMode ||
                                item.bookingPattern ||
                                "BOTH"}
                            </span>

                            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                              Age {item.ageGroup || formatAgeRange(item.minAge, item.maxAge)}
                            </span>
                          </div>

                          <div className="mt-3 text-sm text-slate-500">
                            {item.currency} {Number(item.price || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {active ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditPackage(item);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              askDelete("package", item);
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-700 ring-1 ring-slate-200 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-7">
          <SectionCard
            title="Slots Manager"
            subtitle={
              selectedPackage
                ? `Booking slots for package: ${selectedPackage.title}`
                : "Select a package to manage its slots."
            }
            right={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openBulkGenerate("DAILY")}
                  disabled={!selectedPackageId}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  <CalendarDays className="h-4 w-4" />
                  Daily Generator
                </button>

                <button
                  type="button"
                  onClick={() => openBulkGenerate("WEEKLY")}
                  disabled={!selectedPackageId}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  <CopyPlus className="h-4 w-4" />
                  Weekly Generator
                </button>

                <button
                  type="button"
                  onClick={() => openBulkGenerate("MONTHLY")}
                  disabled={!selectedPackageId}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Monthly Generator
                </button>

                <button
                  type="button"
                  onClick={openCreateSlot}
                  disabled={!selectedPackageId}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Add Slot
                </button>
              </div>
            }
          >
            {!selectedPackageId ? (
              <EmptyState text="Select a package first to view slots." />
            ) : slotsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <EmptyState text="No slots created yet for this package." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Date
                      </th>
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Time
                      </th>
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Label
                      </th>
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Capacity
                      </th>
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Availability
                      </th>
                      <th className="pb-4 pr-4 text-sm font-semibold text-slate-500">
                        Status
                      </th>
                      <th className="pb-4 text-sm font-semibold text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {slots.map((slot) => (
                      <tr
                        key={slot.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-4 pr-4 text-sm font-semibold text-slate-900">
                          {formatDate(slot.date)}
                        </td>

                        <td className="py-4 pr-4 text-sm text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-slate-400" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </td>

                        <td className="py-4 pr-4 text-sm text-slate-700">
                          {slot.sessionLabel || "—"}
                        </td>

                        <td className="py-4 pr-4 text-sm text-slate-700">
                          {slot.capacity}
                        </td>

                        <td className="py-4 pr-4 text-sm text-slate-700">
                          <div>{slot.availableCount} left</div>
                          <div className="text-xs text-slate-400">
                            booked {slot.bookedCount}
                          </div>
                        </td>

                        <td className="py-4 pr-4 text-sm">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {slot.status}
                          </span>
                        </td>

                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditSlot(slot)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => askDelete("slot", slot)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Layers3 className="h-4 w-4" />
            Total Packages
          </div>

          <div className="mt-3 text-3xl font-black text-slate-900">
            {packages.length}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Total Slots
          </div>

          <div className="mt-3 text-3xl font-black text-slate-900">
            {slots.length}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Package className="h-4 w-4" />
            Selected Package
          </div>

          <div className="mt-3 text-lg font-black text-slate-900">
            {selectedPackage?.title || "None"}
          </div>

          {selectedPackage ? (
            <div className="mt-2 text-sm text-slate-500">
              {selectedPackage.sessionCount || 0} sessions ·{" "}
              {selectedPackage.bookingMode ||
                selectedPackage.bookingPattern ||
                "BOTH"} · Age{" "}
              {selectedPackage.ageGroup ||
                formatAgeRange(selectedPackage.minAge, selectedPackage.maxAge)}
            </div>
          ) : null}
        </div>
      </div>

      <PackageModal
        open={packageModalOpen}
        mode={packageModalMode}
        form={packageForm}
        saving={saving}
        onClose={() => setPackageModalOpen(false)}
        onChange={(key, value) =>
          setPackageForm((prev) => ({ ...prev, [key]: value }))
        }
        onSubmit={handlePackageSubmit}
      />

      <SlotModal
        open={slotModalOpen}
        mode={slotModalMode}
        form={slotForm}
        saving={saving}
        onClose={() => setSlotModalOpen(false)}
        onChange={(key, value) =>
          setSlotForm((prev) => ({ ...prev, [key]: value }))
        }
        onSubmit={handleSlotSubmit}
      />

      <BulkSlotModal
        open={bulkOpen}
        form={bulkForm}
        saving={saving}
        onClose={() => setBulkOpen(false)}
        onChange={(key, value) =>
          setBulkForm((prev) => ({ ...prev, [key]: value }))
        }
        onToggleDay={toggleBulkDay}
        onToggleMonthDay={toggleBulkMonthDay}
        onTimeSlotChange={updateBulkTimeSlot}
        onAddTimeSlot={addBulkTimeSlot}
        onRemoveTimeSlot={removeBulkTimeSlot}
        onSubmit={handleBulkSubmit}
      />

      <ConfirmDialog
        open={deleteState.open}
        title={`Delete ${deleteState.type === "package" ? "Package" : "Slot"}`}
        message={`Are you sure you want to delete "${deleteState.title}"?`}
        confirmText="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() =>
          setDeleteState({ open: false, type: "", id: "", title: "" })
        }
      />
    </div>
  );
}

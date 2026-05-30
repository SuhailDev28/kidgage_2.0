// client/src/pages/public/ActivityDetailsPage.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Clock3,
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Building2,
  User2,
  ShieldCheck,
  Layers3,
  Route,
  Shuffle,
  X,
  CreditCard,
  Banknote,
  TicketPercent,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api, publicApi } from "../../lib/api.js";
import { getToken, getUser } from "../../lib/auth.js";

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;
  return `${base}/uploads/${raw}`;
}

function toCurrency(value, currency = "QAR") {
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

function formatAgeRange(minAge, maxAge, fallback = "All ages") {
  const min = Number(minAge || 0);
  const max = Number(maxAge || 0);

  if (min && max) return `${min}-${max} years`;
  if (min) return `${min}+ years`;
  if (max) return `Up to ${max} years`;

  return fallback;
}

function pickFirstValue(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function getCourseAgeMeta(course = {}) {
  const ageGroupText = pickFirstValue(course, [
    "ageGroup",
    "ageRange",
    "age",
    "ages",
    "ageLabel",
    "ageGroupLabel",
    "targetAge",
    "targetAgeGroup",
  ]);

  const minAge = Number(
    pickFirstValue(course, [
      "minAge",
      "minimumAge",
      "ageFrom",
      "fromAge",
      "ageMin",
      "min_age",
    ]) || 0,
  );

  const maxAge = Number(
    pickFirstValue(course, [
      "maxAge",
      "maximumAge",
      "ageTo",
      "toAge",
      "ageMax",
      "max_age",
    ]) || 0,
  );

  return {
    minAge: Number.isFinite(minAge) ? minAge : 0,
    maxAge: Number.isFinite(maxAge) ? maxAge : 0,
    label: String(ageGroupText || "").trim(),
  };
}

function getCourseAgeGroupLabel(course = {}) {
  const meta = getCourseAgeMeta(course);

  return formatAgeRange(meta.minAge, meta.maxAge, meta.label || "All ages");
}

function toDateInputValue(date) {
  if (!date) return "";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getDobConstraintsFromCourse(course = {}) {
  const { minAge, maxAge } = getCourseAgeMeta(course);
  const today = new Date();

  let min = "";
  let max = "";

  if (maxAge > 0) {
    const earliestDob = new Date(today);
    earliestDob.setFullYear(today.getFullYear() - maxAge - 1);
    earliestDob.setDate(earliestDob.getDate() + 1);
    min = toDateInputValue(earliestDob);
  }

  if (minAge > 0) {
    const latestDob = new Date(today);
    latestDob.setFullYear(today.getFullYear() - minAge);
    max = toDateInputValue(latestDob);
  }

  return { min, max };
}

function getPackageAgeMeta(pkg = {}, fallbackCourse = {}) {
  const packageMeta = getCourseAgeMeta(pkg);
  const courseMeta = getCourseAgeMeta(fallbackCourse);

  const hasPackageAge =
    packageMeta.minAge > 0 ||
    packageMeta.maxAge > 0 ||
    Boolean(packageMeta.label);

  if (hasPackageAge) {
    return packageMeta;
  }

  return courseMeta;
}

function getPackageAgeLimitLabel(pkg = {}, fallbackCourse = {}) {
  const meta = getPackageAgeMeta(pkg, fallbackCourse);

  return formatAgeRange(meta.minAge, meta.maxAge, meta.label || "All ages");
}

function getDobConstraintsFromPackage(pkg = {}, fallbackCourse = {}) {
  const meta = getPackageAgeMeta(pkg, fallbackCourse);
  const today = new Date();

  let min = "";
  let max = "";

  if (meta.maxAge > 0) {
    const earliestDob = new Date(today);
    earliestDob.setFullYear(today.getFullYear() - meta.maxAge - 1);
    earliestDob.setDate(earliestDob.getDate() + 1);
    min = toDateInputValue(earliestDob);
  }

  if (meta.minAge > 0) {
    const latestDob = new Date(today);
    latestDob.setFullYear(today.getFullYear() - meta.minAge);
    max = toDateInputValue(latestDob);
  }

  return { min, max };
}

function calculateAgeFromDob(dob) {
  if (!dob) return null;

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function getChildDob(child = {}) {
  return pickFirstValue(child, [
    "dob",
    "dateOfBirth",
    "birthDate",
    "birthday",
    "childDob",
  ]);
}

function getChildAge(child = {}) {
  const rawAge = pickFirstValue(child, [
    "age",
    "childAge",
    "currentAge",
  ]);

  const age = Number(rawAge);

  if (Number.isFinite(age) && age >= 0) {
    return age;
  }

  return calculateAgeFromDob(getChildDob(child));
}

function isAgeNumberAllowedForPackage(age, pkg = {}, fallbackCourse = {}) {
  if (!Number.isFinite(Number(age))) {
    return {
      ok: false,
      age: null,
      message: "Child age is missing or invalid.",
    };
  }

  const safeAge = Number(age);
  const meta = getPackageAgeMeta(pkg, fallbackCourse);

  if (meta.minAge > 0 && safeAge < meta.minAge) {
    return {
      ok: false,
      age: safeAge,
      message: `Child age ${safeAge} is below the selected package age limit: ${getPackageAgeLimitLabel(
        pkg,
        fallbackCourse,
      )}.`,
    };
  }

  if (meta.maxAge > 0 && safeAge > meta.maxAge) {
    return {
      ok: false,
      age: safeAge,
      message: `Child age ${safeAge} is above the selected package age limit: ${getPackageAgeLimitLabel(
        pkg,
        fallbackCourse,
      )}.`,
    };
  }

  return { ok: true, age: safeAge, message: "" };
}

function isAgeAllowedForPackage(dob, pkg = {}, fallbackCourse = {}) {
  const age = calculateAgeFromDob(dob);

  if (age === null) {
    return {
      ok: false,
      age: null,
      message: "Child date of birth is missing or invalid.",
    };
  }

  const meta = getPackageAgeMeta(pkg, fallbackCourse);

  if (meta.minAge > 0 && age < meta.minAge) {
    return {
      ok: false,
      age,
      message: `Child age ${age} is below the selected package age limit: ${getPackageAgeLimitLabel(
        pkg,
        fallbackCourse,
      )}.`,
    };
  }

  if (meta.maxAge > 0 && age > meta.maxAge) {
    return {
      ok: false,
      age,
      message: `Child age ${age} is above the selected package age limit: ${getPackageAgeLimitLabel(
        pkg,
        fallbackCourse,
      )}.`,
    };
  }

  return { ok: true, age, message: "" };
}

function formatDateLabel(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthTitle(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function startDayOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1).getDay();
}

function getPackageSessionCount(item) {
  const sessionCount = Number(item?.sessionCount || 0);
  if (sessionCount > 0) return sessionCount;

  const maxSelectable = Number(item?.maxSelectableSessions || 0);
  if (maxSelectable > 0) return maxSelectable;

  const durationUnit = String(item?.durationUnit || "").toUpperCase();
  const durationValue = Number(item?.durationValue || 0);

  if (durationUnit === "SESSION" && durationValue > 0) return durationValue;

  if (durationUnit === "MONTH" && durationValue > 0) {
    return Number(item?.sessionsPerMonth || item?.totalSessions || 1) || 1;
  }

  return 1;
}

function normalizeBookingMode(value) {
  const v = String(value || "").toUpperCase();

  if (v === "STRAIGHT") return "STRAIGHT";
  if (v === "SEQUENTIAL") return "STRAIGHT";
  if (v === "FLEXIBLE") return "FLEXIBLE";
  if (v === "BOTH") return "BOTH";

  return "BOTH";
}

function getDateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getSlotDateKey(slot) {
  return getDateKey(slot?.slotDate || slot?.date);
}

function getSlotDateTime(slot) {
  const dateKey = getSlotDateKey(slot);
  const time = String(slot?.startTime || "00:00").trim();
  const [hh = "0", mm = "0"] = time.split(":");

  return new Date(
    `${dateKey}T${String(hh).padStart(2, "0")}:${String(mm).padStart(
      2,
      "0",
    )}:00`,
  );
}

function sortFlexibleSelections(items) {
  return [...items].sort((a, b) => {
    const ad = getSlotDateTime(a).getTime();
    const bd = getSlotDateTime(b).getTime();

    if (ad !== bd) return ad - bd;

    return String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

function normalizeAvailableSlot(slot, fallbackDate = "") {
  return {
    ...slot,
    slotDate: slot?.slotDate || slot?.date || fallbackDate,
  };
}

function isSlotAvailable(slot) {
  return (
    slot &&
    !slot?.isFull &&
    slot?.active !== false &&
    String(slot?.status || "OPEN").toUpperCase() === "OPEN" &&
    Number(slot?.availableCount || 0) > 0
  );
}

function kidgagePrimaryButtonClass(disabled = false) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3",
    "text-sm sm:text-base font-bold text-white transition-all duration-200",
    "shadow-[0_12px_30px_rgba(22,163,74,0.22)]",
    disabled
      ? "cursor-not-allowed bg-slate-300 shadow-none"
      : "bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99]",
  ].join(" ");
}

function kidgageOutlineButtonClass(disabled = false) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3",
    "text-sm font-bold transition-all duration-200",
    disabled
      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
      : "border border-slate-200 bg-white text-slate-700 hover:border-[#16A34A] hover:bg-emerald-50 hover:text-[#16A34A]",
  ].join(" ");
}

function extractId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?._id || value?.id || "");
}

function extractBookingId(data) {
  return (
    extractId(data?.booking) ||
    extractId(data?.bookingId) ||
    extractId(data?.item) ||
    extractId(data?.data?.booking) ||
    extractId(data?.data?.bookingId) ||
    ""
  );
}

function extractGuestToken(data) {
  return (
    data?.guestToken ||
    data?.guestPaymentToken ||
    data?.booking?.guestPaymentToken ||
    data?.data?.guestToken ||
    data?.data?.guestPaymentToken ||
    data?.data?.booking?.guestPaymentToken ||
    ""
  );
}

function buildMyFatoorahEmbedUrl(bookingId, guestToken = "") {
  const safeBookingId = String(bookingId || "").trim();

  if (!safeBookingId) return "";

  const params = new URLSearchParams();

  if (guestToken) {
    params.set("guestToken", guestToken);
  }

  const query = params.toString();

  return `/payment/myfatoorah/${safeBookingId}${query ? `?${query}` : ""}`;
}

function buildBookingSuccessUrl(bookingId, guestToken = "") {
  const safeBookingId = String(bookingId || "").trim();

  if (!safeBookingId) return "";

  const params = new URLSearchParams();

  if (guestToken) {
    params.set("guestToken", guestToken);
  }

  const query = params.toString();

  return `/payment/success/${safeBookingId}${query ? `?${query}` : ""}`;
}

function PackageCard({ item, active, onClick, currency, fallbackCourse }) {
  const sessionCount = getPackageSessionCount(item);
  const ageLimitLabel = getPackageAgeLimitLabel(item, fallbackCourse || {});

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-[#16A34A] bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">{item.title}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            {item.packageType}
          </div>
        </div>

        {active ? <CheckCircle2 className="h-5 w-5 text-[#16A34A]" /> : null}
      </div>

      <div className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {toCurrency(item.price, item.currency || currency)}
      </div>

      <div className="mt-2 text-sm leading-6 text-slate-500">
        {item.description ||
          (String(item.durationUnit || "").toUpperCase() === "MONTH"
            ? `${item.durationValue} month package`
            : String(item.durationUnit || "").toUpperCase() === "SESSION"
              ? `${item.durationValue || item.sessionCount} session package`
              : "Custom package")}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {sessionCount} session{sessionCount > 1 ? "s" : ""}
        </span>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          Age {ageLimitLabel}
        </span>
      </div>
    </button>
  );
}

function ModeCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-[#16A34A] bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            active ? "bg-[#16A34A] text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function PaymentMethodCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition ${
        active
          ? "border-[#16A34A] bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            active ? "bg-[#16A34A] text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function SchedulePickerModal({
  open,
  onClose,
  visibleMonth,
  setVisibleMonth,
  datesMap,
  selectedDate,
  onSelectDate,
  loadingDates,
  loadingSlots,
  loadingSequence,
  slots,
  bookingMode,
  selectedPackage,
  selectedSlot,
  selectedSlotIds,
  onSelectSlot,
  onConfirm,
  selectedCount,
  maxSelectable,
  straightPreview = [],
  confirming = false,
}) {
  if (!open) return null;

  const firstDayIndex = startDayOfMonth(visibleMonth);
  const totalDays = getDaysInMonth(visibleMonth);
  const cells = [];

  for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        day,
        12,
        0,
        0,
        0,
      ),
    );
  }

  function getKey(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const confirmDisabled =
    confirming ||
    loadingSlots ||
    loadingSequence ||
    (bookingMode === "STRAIGHT"
      ? !selectedSlot?._id
      : Number(selectedCount || 0) === 0);

  const progressPercent =
    maxSelectable > 0
      ? Math.min(
          100,
          Math.round((Number(selectedCount || 0) / maxSelectable) * 100),
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="flex max-h-[94vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_34px_100px_rgba(15,23,42,0.34)]">
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#16A34A] px-4 py-5 sm:px-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#16A34A]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-12 h-48 w-48 rounded-full bg-lime-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-50 ring-1 ring-white/10 sm:text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                KidGage Schedule Picker
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Select Date, Slot & Time
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/80">
                {bookingMode === "STRAIGHT"
                  ? "Choose one starting date and time. KidGage will build the remaining session sequence only when you confirm."
                  : "Choose dates and times until all package sessions are selected."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10 sm:block">
                {selectedPackage?.title || "Package"}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close schedule picker"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[430px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-center">
                  <div className="text-lg font-black text-slate-950">
                    {monthTitle(visibleMonth)}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">
                    Pick an available date
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth(
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 hover:text-[#16A34A]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1.5">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="pb-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
                  >
                    {day}
                  </div>
                ))}

                {cells.map((cell, index) => {
                  if (!cell) {
                    return <div key={`empty-${index}`} className="h-[62px]" />;
                  }

                  const key = getKey(cell);
                  const availability = datesMap[key];
                  const available = Boolean(availability?.isAvailable);
                  const isSelected = selectedDate === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!available || loadingDates}
                      onClick={() => onSelectDate(key)}
                      className={`relative flex h-[62px] flex-col items-center justify-center rounded-2xl border px-1 text-center transition ${
                        !available || loadingDates
                          ? "cursor-not-allowed border-slate-100 bg-white/60 text-slate-300"
                          : isSelected
                            ? "border-[#16A34A] bg-[#16A34A] text-white shadow-[0_14px_28px_rgba(22,163,74,0.30)]"
                            : "border-slate-200 bg-white text-slate-800 hover:border-[#16A34A] hover:bg-emerald-50"
                      }`}
                    >
                      <span className="text-base font-black">
                        {cell.getDate()}
                      </span>

                      <span className="mt-0.5 text-[9px] font-bold">
                        {available
                          ? `${availability?.slotCount || 0} slot${
                              availability?.slotCount > 1 ? "s" : ""
                            }`
                          : "Closed"}
                      </span>

                      {available && !isSelected ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#16A34A]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {loadingDates ? (
                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                  Loading available dates...
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-[26px] border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[#16A34A]">
                    Session Progress
                  </div>
                  <div className="mt-2 text-xl font-black text-slate-950">
                    {selectedCount} / {maxSelectable}
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#16A34A] shadow-sm">
                  <Clock3 className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-3 text-xs font-semibold leading-5 text-emerald-700">
                {bookingMode === "STRAIGHT"
                  ? "Straight mode builds the full session sequence when you confirm."
                  : "Flexible mode allows multiple dates and times."}
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Available Time Slots
                </div>

                <h4 className="mt-1 text-xl font-black text-slate-950">
                  {selectedDate
                    ? formatDateLabel(selectedDate)
                    : "Select a date"}
                </h4>
              </div>

              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                {bookingMode === "STRAIGHT"
                  ? "Auto Sequence"
                  : "Flexible Slots"}
              </div>
            </div>

            {!selectedDate ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-[#16A34A]">
                  <CalendarDays className="h-8 w-8" />
                </div>

                <div className="mt-5 text-lg font-black text-slate-900">
                  Choose a date first
                </div>

                <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Available time slots will appear here immediately after you
                  select a date from the calendar.
                </div>
              </div>
            ) : (
              <>
                {bookingMode === "FLEXIBLE" ? (
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-[#16A34A]">
                    Selected {selectedCount} of {maxSelectable} sessions for
                    this package.
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-[#16A34A]">
                    Choose a starting time. The full sequence will be built when
                    you click confirm.
                  </div>
                )}

                {loadingSlots || loadingSequence ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
                    {loadingSequence
                      ? "Building automatic session sequence..."
                      : "Loading available slots..."}
                  </div>
                ) : null}

                {!loadingSlots && slots.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                      <Clock3 className="h-7 w-7" />
                    </div>

                    <div className="mt-4 text-sm font-black text-slate-900">
                      No slots found
                    </div>

                    <div className="mt-1 text-sm leading-6 text-slate-500">
                      Try another available date from the calendar.
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  {!loadingSlots &&
                    slots.map((slot) => {
                      const activeStraight =
                        bookingMode === "STRAIGHT" &&
                        String(selectedSlot?._id || "") === String(slot._id);

                      const activeFlexible =
                        bookingMode === "FLEXIBLE" &&
                        selectedSlotIds.includes(String(slot._id));

                      const active = activeStraight || activeFlexible;
                      const unavailable = !isSlotAvailable(slot);

                      return (
                        <button
                          key={slot._id}
                          type="button"
                          disabled={
                            unavailable || confirming || loadingSequence
                          }
                          onClick={() => onSelectSlot(slot)}
                          className={`relative overflow-hidden rounded-[24px] border p-4 text-left transition ${
                            unavailable
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                              : active
                                ? "border-[#16A34A] bg-emerald-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-[#16A34A] hover:shadow-sm"
                          }`}
                        >
                          {active ? (
                            <div className="absolute right-3 top-3 text-[#16A34A]">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          ) : null}

                          <div className="pr-8">
                            <div className="text-base font-black text-slate-950">
                              {slot.sessionLabel || "Session"}
                            </div>

                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-black text-slate-800 ring-1 ring-slate-200">
                              <Clock3 className="h-4 w-4 text-[#16A34A]" />
                              {slot.startTime} - {slot.endTime}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  unavailable
                                    ? "bg-red-50 text-red-600"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {unavailable
                                  ? "Unavailable"
                                  : `${slot.availableCount} left`}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                Capacity {slot.capacity}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {bookingMode === "STRAIGHT" &&
                selectedSlot?._id &&
                straightPreview.length === 0 &&
                !loadingSequence ? (
                  <div className="mt-5 rounded-[26px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                    Starting slot selected. Click Confirm Date & Time to build
                    the full automatic session sequence.
                  </div>
                ) : null}

                {bookingMode === "STRAIGHT" && straightPreview.length > 0 ? (
                  <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-950">
                          Auto-selected Sequence
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {straightPreview.length} sessions selected by KidGage
                        </div>
                      </div>

                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>

                    <div className="mt-4 space-y-2">
                      {straightPreview.map((slot, index) => (
                        <div
                          key={`${slot._id}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-slate-200"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-slate-900">
                              Session {index + 1}
                            </div>
                            <div className="text-slate-500">
                              {formatDateLabel(slot.slotDate || slot.date)}
                            </div>
                          </div>

                          <div className="shrink-0 text-right font-black text-slate-800">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm font-semibold text-slate-500">
            {selectedDate
              ? `Selected date: ${formatDateLabel(selectedDate)}`
              : "No date selected yet"}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className={kidgageOutlineButtonClass(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={kidgagePrimaryButtonClass(confirmDisabled)}
            >
              {confirming || loadingSequence
                ? "Building sequence..."
                : bookingMode === "STRAIGHT"
                  ? "Confirm Date & Time"
                  : Number(selectedCount || 0) >= Number(maxSelectable || 0)
                    ? "Confirm All Slots"
                    : "Confirm & Add More"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestBookingForm({
  guestParentName,
  setGuestParentName,
  guestParentEmail,
  setGuestParentEmail,
  guestParentPhone,
  setGuestParentPhone,
  guestChildName,
  setGuestChildName,
  guestChildDob,
  setGuestChildDob,
  guestChildGender,
  setGuestChildGender,
  guestNotes,
  setGuestNotes,
  onSignIn,
  courseAgeLabel = "All ages",
  dobMin = "",
  dobMax = "",
}) {
  return (
    <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">Book as guest</div>
          <div className="text-sm text-slate-500">
            You can continue without signing in.
          </div>
        </div>

        <button
          type="button"
          onClick={onSignIn}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Sign in instead
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Parent full name"
          value={guestParentName}
          onChange={(e) => setGuestParentName(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A]"
        />

        <input
          type="email"
          placeholder="Parent email"
          value={guestParentEmail}
          onChange={(e) => setGuestParentEmail(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A]"
        />

        <input
          type="text"
          placeholder="Parent phone"
          value={guestParentPhone}
          onChange={(e) => setGuestParentPhone(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A] sm:col-span-2"
        />

        <input
          type="text"
          placeholder="Child full name"
          value={guestChildName}
          onChange={(e) => setGuestChildName(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A]"
        />

        <div>
          <input
            type="date"
            value={guestChildDob}
            min={dobMin || undefined}
            max={dobMax || undefined}
            onChange={(e) => setGuestChildDob(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A]"
          />
          <div className="mt-1 text-xs font-semibold text-slate-500">
            Package age limit: {courseAgeLabel}
          </div>
        </div>

        <select
          value={guestChildGender}
          onChange={(e) => setGuestChildGender(e.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#16A34A] sm:col-span-2"
        >
          <option value="">Select child gender</option>
          <option value="BOY">Boy</option>
          <option value="GIRL">Girl</option>
        </select>
      </div>

      <textarea
        placeholder="Notes (optional)"
        value={guestNotes}
        onChange={(e) => setGuestNotes(e.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#16A34A]"
      />
    </div>
  );
}

export default function ActivityDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const token = getToken();
  const user = getUser();
  const userRole = String(user?.role || "").toUpperCase();

  const isParentLoggedIn = Boolean(token) && userRole === "PARENT";
  const useGuestMode = !isParentLoggedIn;

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [activity, setActivity] = useState(null);
  const [academy, setAcademy] = useState(null);
  const [packages, setPackages] = useState([]);

  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [bookingMode, setBookingMode] = useState("STRAIGHT");
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStraightSlots, setSelectedStraightSlots] = useState([]);

  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [dateRows, setDateRows] = useState([]);
  const [slots, setSlots] = useState([]);

  const monthDatesCacheRef = useRef(new Map());
  const daySlotsCacheRef = useRef(new Map());
  const sequenceRequestRef = useRef(0);

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");

  const [selectedFlexibleSlots, setSelectedFlexibleSlots] = useState([]);

  const [draftFlexibleSlots, setDraftFlexibleSlots] = useState([]);
  const [draftStraightStartSlot, setDraftStraightStartSlot] = useState(null);
  const [draftStraightSequence, setDraftStraightSequence] = useState([]);

  const [guestParentName, setGuestParentName] = useState("");
  const [guestParentEmail, setGuestParentEmail] = useState("");
  const [guestParentPhone, setGuestParentPhone] = useState("");
  const [guestChildName, setGuestChildName] = useState("");
  const [guestChildDob, setGuestChildDob] = useState("");
  const [guestChildGender, setGuestChildGender] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherPricing, setVoucherPricing] = useState(null);

  const selectedPackage = useMemo(() => {
    return (
      packages.find((item) => String(extractId(item)) === String(selectedPackageId)) ||
      null
    );
  }, [packages, selectedPackageId]);

  const packageSessionCount = useMemo(() => {
    return getPackageSessionCount(selectedPackage);
  }, [selectedPackage]);

  const activityBookingMode = useMemo(() => {
    return normalizeBookingMode(activity?.bookingMode);
  }, [activity]);

  const datesMap = useMemo(() => {
    const map = {};

    dateRows.forEach((row) => {
      map[row.date] = row;
    });

    return map;
  }, [dateRows]);

  const coverImage = useMemo(() => {
    return normalizeImage(
      activity?.coverImage ||
        activity?.image ||
        activity?.bannerImage ||
        activity?.images?.[0] ||
        academy?.coverImage ||
        "",
    );
  }, [activity, academy]);

  const packageAgeLabel = useMemo(() => {
    return getPackageAgeLimitLabel(selectedPackage || {}, activity || {});
  }, [selectedPackage, activity]);

  const guestDobConstraints = useMemo(() => {
    return getDobConstraintsFromPackage(selectedPackage || {}, activity || {});
  }, [selectedPackage, activity]);

  const currentDateSelectedSlotIds = useMemo(() => {
    const source =
      bookingMode === "FLEXIBLE" && scheduleOpen
        ? draftFlexibleSlots
        : selectedFlexibleSlots;

    return source
      .filter((slot) => getSlotDateKey(slot) === selectedDate)
      .map((slot) => String(extractId(slot)));
  }, [
    bookingMode,
    scheduleOpen,
    draftFlexibleSlots,
    selectedFlexibleSlots,
    selectedDate,
  ]);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const { data } = await publicApi.get(
          `/activities/${slug}/booking-data`,
        );

        if (!active) return;

        const nextActivity = data?.activity || null;
        const nextAcademy = data?.academy || nextActivity?.academy || null;
        const nextPackages = Array.isArray(data?.packages) ? data.packages : [];

        setActivity(nextActivity);
        setAcademy(nextAcademy);
        setPackages(nextPackages);

        const defaultPackage =
          nextPackages.find((item) => item.isDefault) ||
          nextPackages[0] ||
          null;

        setSelectedPackageId(defaultPackage ? String(extractId(defaultPackage)) : "");

        const nextMode = normalizeBookingMode(nextActivity?.bookingMode);

        if (nextMode === "STRAIGHT") setBookingMode("STRAIGHT");
        else if (nextMode === "FLEXIBLE") setBookingMode("FLEXIBLE");
        else setBookingMode("STRAIGHT");
      } catch (err) {
        if (!active) return;

        setError(err?.response?.data?.message || "Failed to load activity.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      if (!token || userRole !== "PARENT") {
        if (!active) return;

        setChildren([]);
        setSelectedChildId("");
        return;
      }

      try {
        setChildrenLoading(true);

        const { data } = await api.get("/parent/children");

        if (!active) return;

        const rows = Array.isArray(data?.children) ? data.children : [];

        setChildren(rows);

        setSelectedChildId((prev) => {
          if (
            prev &&
            rows.some((child) => String(extractId(child)) === String(prev))
          ) {
            return prev;
          }

          return rows[0] ? String(extractId(rows[0])) : "";
        });
      } catch {
        if (!active) return;

        setChildren([]);
        setSelectedChildId("");
      } finally {
        if (active) setChildrenLoading(false);
      }
    }

    loadChildren();

    return () => {
      active = false;
    };
  }, [token, userRole]);

  function resetVoucherState() {
    setVoucherCode("");
    setVoucherError("");
    setAppliedVoucher(null);
    setVoucherPricing(null);
  }

  function resetScheduleState() {
    setSelectedDate("");
    setSelectedSlot(null);
    setSelectedStraightSlots([]);
    setSelectedFlexibleSlots([]);
    setDraftFlexibleSlots([]);
    setDraftStraightStartSlot(null);
    setDraftStraightSequence([]);
    setDateRows([]);
    setSlots([]);
    monthDatesCacheRef.current.clear();
    daySlotsCacheRef.current.clear();
    setScheduleOpen(false);
  }

  async function loadMonthDates(monthDate, force = false) {
    const month = formatMonthKey(monthDate);
    const cacheKey = `${selectedPackageId}:${month}`;

    if (!force && monthDatesCacheRef.current.has(cacheKey)) {
      const cachedRows = monthDatesCacheRef.current.get(cacheKey);
      setDateRows(cachedRows);
      return cachedRows;
    }

    const { data } = await publicApi.get(
      `/activities/${slug}/available-dates`,
      {
        params: {
          packageId: selectedPackageId,
          month,
        },
      },
    );

    const rows = Array.isArray(data?.dates) ? data.dates : [];
    monthDatesCacheRef.current.set(cacheKey, rows);
    setDateRows(rows);

    return rows;
  }

  async function openSchedulePicker() {
    if (!selectedPackageId) {
      setError("Please select a package first.");
      return;
    }

    try {
      setScheduleOpen(true);
      setCalendarLoading(true);
      setError("");
      setMessage("");

      if (bookingMode === "FLEXIBLE") {
        setDraftFlexibleSlots(selectedFlexibleSlots);
      } else {
        setDraftStraightStartSlot(selectedSlot);
        setDraftStraightSequence(selectedStraightSlots);
      }

      await loadMonthDates(visibleMonth);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load available dates.",
      );
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function refreshDatesForMonth() {
      if (!scheduleOpen || !selectedPackageId) return;

      try {
        setCalendarLoading(true);

        const rows = await loadMonthDates(visibleMonth);

        if (!active) return;

        setDateRows(rows);
      } catch {
        if (!active) return;

        setDateRows([]);
      } finally {
        if (active) setCalendarLoading(false);
      }
    }

    refreshDatesForMonth();

    return () => {
      active = false;
    };
  }, [scheduleOpen, selectedPackageId, visibleMonth, slug]);

  async function fetchSlotsForDate(dateKey, force = false) {
    const cacheKey = `${selectedPackageId}:${dateKey}`;

    if (!force && daySlotsCacheRef.current.has(cacheKey)) {
      return daySlotsCacheRef.current.get(cacheKey);
    }

    const { data } = await publicApi.get(`/activities/${slug}/slots`, {
      params: {
        packageId: selectedPackageId,
        date: dateKey,
      },
    });

    const rows = Array.isArray(data?.slots) ? data.slots : [];
    daySlotsCacheRef.current.set(cacheKey, rows);

    return rows;
  }

  async function buildStraightSequence(
    startSlot,
    requiredCount,
    initialDaySlots = [],
  ) {
    const safeRequired = Number(requiredCount || 0);

    if (!startSlot?._id || safeRequired <= 0) return [];

    const startDateKey = getSlotDateKey(startSlot);
    if (!startDateKey) return [];

    const normalizedStartSlot = normalizeAvailableSlot(startSlot, startDateKey);
    const selected = [];
    const selectedIds = new Set();
    let startFound = false;

    function appendAvailableSlots(daySlots, dateKey) {
      const ordered = (Array.isArray(daySlots) ? daySlots : [])
        .filter(isSlotAvailable)
        .map((slot) => normalizeAvailableSlot(slot, dateKey))
        .sort((a, b) => getSlotDateTime(a) - getSlotDateTime(b));

      for (const slot of ordered) {
        const slotId = String(slot._id || "");
        if (!slotId || selectedIds.has(slotId)) continue;

        if (!startFound) {
          if (slotId !== String(normalizedStartSlot._id)) continue;
          startFound = true;
        }

        selected.push(slot);
        selectedIds.add(slotId);

        if (selected.length >= safeRequired) break;
      }
    }

    appendAvailableSlots(
      initialDaySlots.length ? initialDaySlots : [normalizedStartSlot],
      startDateKey,
    );

    if (selected.length >= safeRequired) return selected;

    const monthKeys = [];
    const cursor = new Date(`${startDateKey}T12:00:00`);
    cursor.setDate(1);

    for (let i = 0; i < 8; i += 1) {
      monthKeys.push(formatMonthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthRows = await Promise.all(
      monthKeys.map(async (month) => {
        const cacheKey = `${selectedPackageId}:${month}`;

        if (monthDatesCacheRef.current.has(cacheKey)) {
          return monthDatesCacheRef.current.get(cacheKey);
        }

        const { data } = await publicApi.get(
          `/activities/${slug}/available-dates`,
          {
            params: {
              packageId: selectedPackageId,
              month,
            },
          },
        );

        const rows = Array.isArray(data?.dates) ? data.dates : [];
        monthDatesCacheRef.current.set(cacheKey, rows);

        return rows;
      }),
    );

    const orderedDates = monthRows
      .flat()
      .filter(
        (row) => row?.isAvailable && row?.date && row.date >= startDateKey,
      )
      .map((row) => row.date)
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => a.localeCompare(b));

    const remainingDates = orderedDates.filter((date) => date !== startDateKey);

    for (let i = 0; i < remainingDates.length; i += 6) {
      const batchDates = remainingDates.slice(i, i + 6);
      const batchSlots = await Promise.all(
        batchDates.map(async (dateKey) => {
          const rows = await fetchSlotsForDate(dateKey);
          return { dateKey, rows };
        }),
      );

      batchSlots
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        .forEach(({ dateKey, rows }) => {
          if (selected.length < safeRequired)
            appendAvailableSlots(rows, dateKey);
        });

      if (selected.length >= safeRequired) return selected;
    }

    return selected;
  }

  async function handleSelectDate(dateKey) {
    setSelectedDate(dateKey);

    try {
      setSlotsLoading(true);
      setSequenceLoading(false);
      setError("");
      setMessage("");

      const nextSlots = await fetchSlotsForDate(dateKey);
      setSlots(nextSlots);

      if (bookingMode === "FLEXIBLE") {
        setDraftFlexibleSlots((prev) =>
          prev.length ? prev : selectedFlexibleSlots,
        );
        return;
      }

      setDraftStraightStartSlot(null);
      setDraftStraightSequence([]);

      const firstAvailableSlot = nextSlots
        .filter(isSlotAvailable)
        .map((slot) => normalizeAvailableSlot(slot, dateKey))
        .sort((a, b) => getSlotDateTime(a) - getSlotDateTime(b))[0];

      if (firstAvailableSlot?._id) {
        setDraftStraightStartSlot(firstAvailableSlot);
        setMessage(
          "First available time selected. Tap Confirm Date & Time to build the full sequence, or choose another time.",
        );
      } else {
        setError("No available open slot found for this date.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load slots.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
      setSequenceLoading(false);
    }
  }

  function handleSelectPackage(id) {
    setSelectedPackageId(String(id));

    if (activityBookingMode === "STRAIGHT") setBookingMode("STRAIGHT");
    else if (activityBookingMode === "FLEXIBLE") setBookingMode("FLEXIBLE");
    else setBookingMode("STRAIGHT");

    resetVoucherState();
    resetScheduleState();
  }

  function handleModeChange(nextMode) {
    setBookingMode(nextMode);
    resetScheduleState();
  }

  function handleSelectSlot(slot) {
    if (bookingMode === "STRAIGHT") {
      const normalizedSlot = normalizeAvailableSlot(slot, selectedDate);

      setError("");
      setMessage(
        "Starting slot selected. Click Confirm Date & Time to build the full session sequence.",
      );
      setDraftStraightStartSlot(normalizedSlot);
      setDraftStraightSequence([]);

      return;
    }

    const slotId = String(slot._id);

    setDraftFlexibleSlots((prev) => {
      const exists = prev.some((item) => String(item._id) === slotId);

      if (exists) {
        return sortFlexibleSelections(
          prev.filter((item) => String(item._id) !== slotId),
        );
      }

      if (prev.length >= packageSessionCount) return prev;

      const next = [...prev, normalizeAvailableSlot(slot, selectedDate)];

      return sortFlexibleSelections(next);
    });
  }

  function handleCloseSchedulePicker() {
    setScheduleOpen(false);
  }

  async function handleConfirmScheduleSelection() {
    if (bookingMode === "STRAIGHT") {
      if (!draftStraightStartSlot?._id) {
        setError("Please select a valid starting slot first.");
        return;
      }

      try {
        setSequenceLoading(true);
        setError("");
        setMessage("");

        const requestId = sequenceRequestRef.current + 1;
        sequenceRequestRef.current = requestId;

        const sequence = await buildStraightSequence(
          draftStraightStartSlot,
          packageSessionCount,
          slots,
        );

        if (requestId !== sequenceRequestRef.current) return;

        setDraftStraightSequence(sequence);

        if (sequence.length < packageSessionCount) {
          setError(
            `Unable to auto-select ${packageSessionCount} sessions from this starting slot.`,
          );
          return;
        }

        setSelectedSlot(draftStraightStartSlot);
        setSelectedStraightSlots(sequence);
        setScheduleOpen(false);
        setMessage(`${sequence.length} sessions selected successfully.`);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Failed to build automatic session sequence.",
        );
      } finally {
        setSequenceLoading(false);
      }

      return;
    }

    if (!draftFlexibleSlots.length) {
      setError("Please select at least one slot.");
      return;
    }

    const nextSelectedSlots = sortFlexibleSelections(draftFlexibleSlots);

    setSelectedFlexibleSlots(nextSelectedSlots);
    setSelectedDate("");
    setSlots([]);

    if (nextSelectedSlots.length < packageSessionCount) {
      setMessage(
        `${nextSelectedSlots.length} of ${packageSessionCount} sessions selected. Choose another date and time.`,
      );
      return;
    }

    setScheduleOpen(false);
    setMessage(
      `All ${packageSessionCount} sessions selected. You can now continue.`,
    );
  }

  function removeFlexibleSlot(slotId) {
    setSelectedFlexibleSlots((prev) =>
      prev.filter((item) => String(item._id) !== String(slotId)),
    );
  }

  function handleProceedAuth() {
    navigate("/login", {
      state: {
        redirectTo: location.pathname,
      },
      replace: false,
    });
  }

  async function handleApplyVoucher() {
    const cleanCode = String(voucherCode || "").trim().toUpperCase();

    if (!selectedPackageId) {
      setVoucherError("Please select a package before applying a voucher.");
      return;
    }

    if (!cleanCode) {
      setVoucherError("Please enter a voucher code.");
      return;
    }

    try {
      setVoucherLoading(true);
      setVoucherError("");
      setError("");
      setMessage("");

      const { data } = await publicApi.post("/vouchers/apply", {
        code: cleanCode,
        packageId: selectedPackageId,
        academyId: activity?.academyId || academy?._id || academy?.id || null,
        activityId: activity?._id || activity?.id || null,
        subtotalAmount: summaryPrice,
        parentUserId: isParentLoggedIn ? user?._id || user?.id || null : null,
      });

      setAppliedVoucher(data?.voucher || null);
      setVoucherPricing(data?.pricing || null);
      setVoucherCode(data?.voucher?.code || cleanCode);
      setMessage(data?.message || "Voucher applied successfully.");
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherPricing(null);
      setVoucherError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to apply voucher.",
      );
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setVoucherCode("");
    setVoucherError("");
    setAppliedVoucher(null);
    setVoucherPricing(null);
    setMessage("Voucher removed.");
  }

  async function handleBookNow() {
    if (!selectedPackageId) {
      setError("Please select a package.");
      return;
    }

    if (bookingMode === "STRAIGHT" && !selectedSlot?._id) {
      setError("Please select a starting slot for straight booking.");
      return;
    }

    if (bookingMode === "STRAIGHT" && !selectedStraightSlots.length) {
      setError("Please confirm the straight booking sequence.");
      return;
    }

    if (
      bookingMode === "FLEXIBLE" &&
      selectedFlexibleSlots.length !== packageSessionCount
    ) {
      setError(
        `Please select exactly ${packageSessionCount} sessions for this package.`,
      );
      return;
    }

    if (isParentLoggedIn) {
      if (!selectedChildId) {
        setError("Please select a child before confirming booking.");
        return;
      }

      const selectedChild = children.find(
        (child) => String(child._id || child.id || "") === String(selectedChildId),
      );

      const selectedChildAge = getChildAge(selectedChild || {});
      const ageCheck = isAgeNumberAllowedForPackage(
        selectedChildAge,
        selectedPackage || {},
        activity || {},
      );

      if (!ageCheck.ok) {
        setError(
          ageCheck.message ||
            `Child age does not match the selected package age limit: ${packageAgeLabel}.`,
        );
        return;
      }
    } else {
      if (!guestParentName.trim()) {
        setError("Parent full name is required.");
        return;
      }

      if (!guestParentEmail.trim()) {
        setError("Parent email is required.");
        return;
      }

      if (!guestParentPhone.trim()) {
        setError("Parent phone is required.");
        return;
      }

      if (!guestChildName.trim()) {
        setError("Child full name is required.");
        return;
      }

      if (!guestChildDob) {
        setError("Child date of birth is required.");
        return;
      }

      if (guestDobConstraints.min && guestChildDob < guestDobConstraints.min) {
        setError(`Child age does not match the selected package age limit: ${packageAgeLabel}.`);
        return;
      }

      if (guestDobConstraints.max && guestChildDob > guestDobConstraints.max) {
        setError(`Child age does not match the selected package age limit: ${packageAgeLabel}.`);
        return;
      }

      if (!guestChildGender) {
        setError("Child gender is required.");
        return;
      }
    }

    try {
      setBookingLoading(true);
      setError("");
      setMessage("");

      const basePayload =
        bookingMode === "STRAIGHT"
          ? {
              packageId: selectedPackageId,
              bookingMode: "STRAIGHT",
              slotId: extractId(selectedSlot),
              slotIds: selectedStraightSlots.map((slot) => extractId(slot)),
            }
          : {
              packageId: selectedPackageId,
              bookingMode: "FLEXIBLE",
              slotIds: selectedFlexibleSlots.map((slot) => extractId(slot)),
            };

      if (isParentLoggedIn) {
        const bookingPayload = {
          activityId: activity._id,
          ...basePayload,
          childId: selectedChildId,
          amount: payablePrice,
          subtotalAmount: summaryPrice,
          discountAmount: appliedDiscount,
          totalAmount: payablePrice,
          voucherCode: appliedVoucher?.code || "",
          currency,
          paymentMethod,
          receiver: "KIDGAGE",
          paymentReceiver: "KIDGAGE",
          academyId: activity?.academyId || academy?._id || academy?.id || null,
          packageId: selectedPackageId,
        };

        const { data: bookingData } = await api.post(
          "/parent/bookings",
          bookingPayload,
        );

        const bookingId = extractBookingId(bookingData);

        if (!bookingId) {
          setMessage(
            bookingData?.message ||
              "Booking created successfully, but payment could not be initialized because booking ID was missing.",
          );
          return;
        }

        if (paymentMethod === "ONLINE") {
          navigate(buildMyFatoorahEmbedUrl(bookingId));
          return;
        }

        const { data: paymentData } = await api.post("/payments/create", {
          bookingId,
          amount: payablePrice,
          subtotalAmount: summaryPrice,
          discountAmount: appliedDiscount,
          totalAmount: payablePrice,
          voucherCode: appliedVoucher?.code || "",
          currency,
          paymentMethod: "CASH",
          receiver: "KIDGAGE",
          paymentReceiver: "KIDGAGE",
          academyId: activity?.academyId || academy?._id || academy?.id || null,
          activityId: activity?._id || activity?.id || null,
          packageId: selectedPackageId,
          childId: selectedChildId,
        });

        const parentSuccessUrl = buildBookingSuccessUrl(bookingId);

        if (parentSuccessUrl) {
          navigate(parentSuccessUrl, { replace: true });
          return;
        }

        setMessage(
          paymentData?.message ||
            bookingData?.message ||
            "Booking created successfully. Cash payment is pending confirmation by KidGage.",
        );

        return;
      }

      const guestPayload = {
        ...basePayload,
        guestParent: {
          fullName: guestParentName.trim(),
          email: guestParentEmail.trim(),
          phone: guestParentPhone.trim(),
        },
        guestChild: {
          fullName: guestChildName.trim(),
          dob: guestChildDob,
          gender: guestChildGender,
        },
        notes: guestNotes.trim(),
        amount: payablePrice,
        subtotalAmount: summaryPrice,
        discountAmount: appliedDiscount,
        totalAmount: payablePrice,
        voucherCode: appliedVoucher?.code || "",
        currency,
        paymentMethod,
        receiver: "KIDGAGE",
        paymentReceiver: "KIDGAGE",
        academyId: activity?.academyId || academy?._id || academy?.id || null,
        activityId: activity?._id || activity?.id || null,
        packageId: selectedPackageId,
      };

      const { data: guestData } = await publicApi.post(
        `/activities/${slug}/guest-booking`,
        guestPayload,
      );

      const guestBookingId = extractBookingId(guestData);
      const guestToken = extractGuestToken(guestData);

      if (!guestBookingId) {
        setMessage(
          guestData?.message ||
            "Guest booking created successfully, but payment could not be initialized because booking ID was missing.",
        );
        return;
      }

      if (paymentMethod === "ONLINE") {
        navigate(buildMyFatoorahEmbedUrl(guestBookingId, guestToken));
        return;
      }

      const guestSuccessUrl = buildBookingSuccessUrl(
        guestBookingId,
        guestToken,
      );

      if (guestSuccessUrl) {
        navigate(guestSuccessUrl, { replace: true });
        return;
      }

      setMessage(
        guestData?.message ||
          "Guest booking created successfully. Cash payment is pending confirmation by KidGage.",
      );
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to create booking.";

      setError(serverMessage);
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="container-main py-8 sm:py-10 md:py-14">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="h-[360px] animate-pulse rounded-[30px] bg-slate-100 sm:h-[460px]" />
          <div className="space-y-5">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (!activity) {
    return (
      <section className="container-main py-12">
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-700">
          {error || "Activity not found."}
        </div>
      </section>
    );
  }

  const currency = selectedPackage?.currency || activity?.currency || "QAR";
  const summaryPrice = Number(
    selectedPackage?.price || activity?.basePrice || 0,
  );

  const appliedDiscount = appliedVoucher
    ? Number(voucherPricing?.discountAmount || 0)
    : 0;

  const payablePrice = appliedVoucher
    ? Math.max(0, Number(voucherPricing?.totalAmount || 0))
    : summaryPrice;

  const canShowStraight =
    activityBookingMode === "STRAIGHT" || activityBookingMode === "BOTH";
  const canShowFlexible =
    activityBookingMode === "FLEXIBLE" || activityBookingMode === "BOTH";

  const confirmBookingDisabled =
    bookingLoading ||
    !selectedPackageId ||
    (isParentLoggedIn && !selectedChildId) ||
    (useGuestMode &&
      (!guestParentName.trim() ||
        !guestParentEmail.trim() ||
        !guestParentPhone.trim() ||
        !guestChildName.trim() ||
        !guestChildDob ||
        !guestChildGender)) ||
    (bookingMode === "STRAIGHT" &&
      (!selectedSlot?._id || !selectedStraightSlots.length)) ||
    (bookingMode === "FLEXIBLE" &&
      selectedFlexibleSlots.length !== packageSessionCount);

  return (
    <>
      <section className="container-main py-8 sm:py-10 md:py-14">
        <div className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-[280px] bg-slate-100 sm:h-[380px] lg:h-[520px]">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={activity.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  No image available
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 backdrop-blur">
                {activity?.categoryName ||
                  activity?.category?.name ||
                  "Activity"}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#16A34A]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  KidGage Verified Listing
                </div>

                {academy?.name ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Building2 className="h-3.5 w-3.5" />
                    {academy.name}
                  </div>
                ) : null}
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {activity.title}
              </h1>

              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {activity.description ||
                  activity.shortDescription ||
                  "Discover a structured kids activity program with flexible package options and slot-based scheduling."}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Users className="h-4 w-4" />
                    Age limit
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {packageAgeLabel}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <GraduationCap className="h-4 w-4" />
                    Skill level
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {activity.skillLevel || "All"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <MapPin className="h-4 w-4" />
                    Venue
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {activity.venueName ||
                      activity.venueAddress ||
                      academy?.address ||
                      academy?.city ||
                      "Doha, Qatar"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {message ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Select package
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the plan that best fits your child’s activity journey.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {packages.length > 0 ? (
                  packages.map((item) => (
                    <PackageCard
                      key={extractId(item)}
                      item={item}
                      active={selectedPackageId === String(extractId(item))}
                      onClick={() => handleSelectPackage(extractId(item))}
                      currency={currency}
                      fallbackCourse={activity}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                    No packages available for this activity.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Booking mode
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose how you want to use the sessions in this package.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {canShowStraight ? (
                  <ModeCard
                    active={bookingMode === "STRAIGHT"}
                    onClick={() => handleModeChange("STRAIGHT")}
                    icon={Route}
                    title="Straight line booking"
                    desc="Choose one starting date and time. KidGage will auto-build the remaining sessions when you confirm."
                  />
                ) : null}

                {canShowFlexible ? (
                  <ModeCard
                    active={bookingMode === "FLEXIBLE"}
                    onClick={() => handleModeChange("FLEXIBLE")}
                    icon={Shuffle}
                    title="Random slot booking"
                    desc="Pick sessions manually from available slots across multiple dates."
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Schedule selection
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {bookingMode === "STRAIGHT"
                      ? "Pick one starting date and time. The remaining sessions will be auto-selected after confirmation."
                      : "Select dates and times until all package sessions are selected."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openSchedulePicker}
                  disabled={!selectedPackageId}
                  className={kidgagePrimaryButtonClass(!selectedPackageId)}
                >
                  <CalendarDays className="h-4 w-4" />
                  {bookingMode === "FLEXIBLE"
                    ? "Choose dates & times"
                    : "Choose date & time"}
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Selected package
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {selectedPackage?.title || "Not selected"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Booking mode
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {bookingMode === "STRAIGHT"
                      ? "Straight line booking"
                      : "Random slot booking"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Session count
                  </div>
                  <div className="mt-2 text-base font-bold text-slate-900">
                    {packageSessionCount} session
                    {packageSessionCount > 1 ? "s" : ""}
                  </div>
                </div>

                {bookingMode === "STRAIGHT" ? (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Selected date
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-900">
                        {selectedDate
                          ? formatDateLabel(selectedDate)
                          : "Not selected"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Starting slot
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-900">
                        {selectedSlot
                          ? `${selectedSlot.sessionLabel || "Session"} · ${
                              selectedSlot.startTime
                            } - ${selectedSlot.endTime}`
                          : "Not selected"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Auto-selected sequence
                      </div>
                      <div className="mt-2 text-base font-bold text-slate-900">
                        {selectedStraightSlots.length
                          ? `${selectedStraightSlots.length} sessions selected`
                          : "No sequence confirmed"}
                      </div>
                    </div>

                    {selectedStraightSlots.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="space-y-2">
                          {selectedStraightSlots.map((slot, index) => (
                            <div
                              key={`${slot._id}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  Session {index + 1}
                                </div>
                                <div className="text-slate-500">
                                  {formatDateLabel(slot.slotDate || slot.date)}
                                </div>
                              </div>
                              <div className="shrink-0 font-medium text-slate-700">
                                {slot.startTime} - {slot.endTime}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedDate ? (
                      <button
                        type="button"
                        onClick={() => handleSelectDate(selectedDate)}
                        className={kidgageOutlineButtonClass(false)}
                      >
                        <Clock3 className="h-4 w-4" />
                        Recheck available slots
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Selected sessions
                    </div>
                    <div className="mt-2 text-base font-bold text-slate-900">
                      {selectedFlexibleSlots.length} of {packageSessionCount}{" "}
                      selected
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bookingMode === "FLEXIBLE" ? (
              <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Selected session cart
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Your chosen sessions can span multiple dates.
                    </p>
                  </div>

                  <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#16A34A]">
                    {selectedFlexibleSlots.length}/{packageSessionCount}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedFlexibleSlots.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                      No session slots selected yet.
                    </div>
                  ) : (
                    selectedFlexibleSlots.map((slot, index) => (
                      <div
                        key={slot._id}
                        className="flex items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-white p-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900">
                            Session {index + 1}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {slot.sessionLabel || "Session"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {formatDateLabel(slot.slotDate || slot.date)}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFlexibleSlot(slot._id)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                          aria-label="Remove slot"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#16A34A]" />
                <h2 className="text-xl font-black text-slate-900">
                  Order summary
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {activity.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedPackage?.title || "Package not selected"}
                    </div>
                  </div>

                  <div className="text-right text-sm font-bold text-slate-900">
                    {toCurrency(summaryPrice, currency)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-slate-400" />
                    {packageSessionCount} session
                    {packageSessionCount > 1 ? "s" : ""} included
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    {bookingMode === "STRAIGHT"
                      ? selectedStraightSlots.length
                        ? `${selectedStraightSlots.length} sessions auto-selected`
                        : "No starting slot selected"
                      : `${selectedFlexibleSlots.length} of ${packageSessionCount} session slots selected`}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {activity.venueName ||
                      academy?.address ||
                      academy?.city ||
                      "Doha, Qatar"}
                  </div>
                </div>

                {isParentLoggedIn ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Select child
                    </label>

                    <div className="relative">
                      <User2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        value={selectedChildId}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#16A34A]"
                      >
                        <option value="">
                          {childrenLoading
                            ? "Loading children..."
                            : "Choose a child"}
                        </option>

                        {children.map((child) => (
                          <option key={child._id} value={child._id}>
                            {child.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <GuestBookingForm
                    guestParentName={guestParentName}
                    setGuestParentName={setGuestParentName}
                    guestParentEmail={guestParentEmail}
                    setGuestParentEmail={setGuestParentEmail}
                    guestParentPhone={guestParentPhone}
                    setGuestParentPhone={setGuestParentPhone}
                    guestChildName={guestChildName}
                    setGuestChildName={setGuestChildName}
                    guestChildDob={guestChildDob}
                    setGuestChildDob={setGuestChildDob}
                    guestChildGender={guestChildGender}
                    setGuestChildGender={setGuestChildGender}
                    guestNotes={guestNotes}
                    setGuestNotes={setGuestNotes}
                    courseAgeLabel={packageAgeLabel}
                    dobMin={guestDobConstraints.min}
                    dobMax={guestDobConstraints.max}
                    onSignIn={handleProceedAuth}
                  />
                )}

                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-900">
                      Payment method
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Choose how you want to pay KidGage.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PaymentMethodCard
                      active={paymentMethod === "ONLINE"}
                      onClick={() => setPaymentMethod("ONLINE")}
                      icon={CreditCard}
                      title="Online payment"
                      desc="Pay securely now using MyFatoorah."
                    />

                    <PaymentMethodCard
                      active={paymentMethod === "CASH"}
                      onClick={() => setPaymentMethod("CASH")}
                      icon={Banknote}
                      title="Cash payment"
                      desc="Reserve now and pay cash. KidGage will confirm payment manually."
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
                      <TicketPercent className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900">
                        Voucher / Coupon
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">
                        Apply a valid KidGage voucher to get a discount on this
                        booking.
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={voucherCode}
                          disabled={voucherLoading || Boolean(appliedVoucher)}
                          onChange={(e) => {
                            setVoucherCode(e.target.value.toUpperCase());
                            setVoucherError("");
                          }}
                          placeholder="Enter voucher code"
                          className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold uppercase tracking-[0.08em] outline-none transition focus:border-[#16A34A] disabled:bg-slate-100 disabled:text-slate-500"
                        />

                        {appliedVoucher ? (
                          <button
                            type="button"
                            onClick={handleRemoveVoucher}
                            className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherLoading || !selectedPackageId}
                            className={kidgagePrimaryButtonClass(
                              voucherLoading || !selectedPackageId,
                            )}
                          >
                            {voucherLoading ? "Applying..." : "Apply"}
                          </button>
                        )}
                      </div>

                      {voucherError ? (
                        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                          {voucherError}
                        </div>
                      ) : null}

                      {appliedVoucher ? (
                        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                          Voucher {appliedVoucher.code} applied. You saved{" "}
                          {toCurrency(appliedDiscount, currency)}.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Subtotal
                    </span>
                    <span className="text-sm font-black text-slate-800">
                      {toCurrency(summaryPrice, currency)}
                    </span>
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-700">
                        Voucher discount
                      </span>
                      <span className="text-sm font-black text-emerald-700">
                        -{toCurrency(appliedDiscount, currency)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-base font-semibold text-slate-500">
                      Total
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {toCurrency(payablePrice, currency)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={confirmBookingDisabled}
                  onClick={handleBookNow}
                  className={kidgagePrimaryButtonClass(confirmBookingDisabled)}
                >
                  {bookingLoading
                    ? "Creating booking..."
                    : paymentMethod === "ONLINE"
                      ? "Confirm booking & pay online"
                      : "Confirm booking with cash payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SchedulePickerModal
        open={scheduleOpen}
        onClose={handleCloseSchedulePicker}
        visibleMonth={visibleMonth}
        setVisibleMonth={setVisibleMonth}
        datesMap={datesMap}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        loadingDates={calendarLoading}
        loadingSlots={slotsLoading}
        loadingSequence={sequenceLoading}
        slots={slots}
        bookingMode={bookingMode}
        selectedPackage={selectedPackage}
        packageSessionCount={packageSessionCount}
        selectedSlot={draftStraightStartSlot}
        selectedSlotIds={currentDateSelectedSlotIds}
        onSelectSlot={handleSelectSlot}
        onConfirm={handleConfirmScheduleSelection}
        selectedCount={
          bookingMode === "FLEXIBLE"
            ? draftFlexibleSlots.length
            : draftStraightSequence.length
        }
        maxSelectable={packageSessionCount}
        straightPreview={draftStraightSequence}
        confirming={sequenceLoading}
      />
    </>
  );
}

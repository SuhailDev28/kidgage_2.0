// client/src/pages/superadmin/ChildrenPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Baby,
  Building2,
  ClipboardList,
  Download,
  Eye,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  return String(value || "").trim();
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function initials(name = "C") {
  const parts = String(name || "C")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(name || "C")
    .slice(0, 1)
    .toUpperCase();
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

function formatDateTime(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value, currency = "QAR") {
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

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadCsv(filename, rows) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function calculateAgeFromDob(dob) {
  if (!dob) return "";

  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age < 0 ? "" : age;
}

function pickAcademyName(item) {
  return (
    item?.academyId?.name ||
    item?.academy?.name ||
    item?.academyName ||
    item?.academySnapshot?.name ||
    item?.primaryAcademyName ||
    "Academy"
  );
}

function pickChildName(item) {
  return (
    item?.fullName ||
    item?.name ||
    item?.childName ||
    item?.profile?.fullName ||
    item?.profile?.name ||
    item?.guestChild?.fullName ||
    item?.guestChild?.name ||
    item?.guestChildSnapshot?.fullName ||
    item?.guestChildSnapshot?.name ||
    item?.childSnapshot?.fullName ||
    item?.childSnapshot?.name ||
    "Child"
  );
}

function pickParentName(item) {
  return (
    item?.parentId?.fullName ||
    item?.parentId?.name ||
    item?.parentName ||
    item?.parent?.fullName ||
    item?.parent?.name ||
    item?.guestParent?.fullName ||
    item?.guestParent?.name ||
    item?.guestParentSnapshot?.fullName ||
    item?.guestParentSnapshot?.name ||
    "Parent"
  );
}

function pickParentEmail(item) {
  return (
    item?.parentId?.email ||
    item?.parentEmail ||
    item?.email ||
    item?.userEmail ||
    item?.guestParent?.email ||
    item?.guestParentSnapshot?.email ||
    ""
  );
}

function pickParentPhone(item) {
  return (
    item?.parentId?.phone ||
    item?.parentPhone ||
    item?.phone ||
    item?.mobile ||
    item?.guestParent?.phone ||
    item?.guestParent?.mobile ||
    item?.guestParentSnapshot?.phone ||
    ""
  );
}

function pickEmailFromParent(parent) {
  return (
    parent?.email ||
    parent?.parentEmail ||
    parent?.userEmail ||
    parent?.customerEmail ||
    parent?.guestParent?.email ||
    parent?.profile?.email ||
    ""
  );
}

function pickPhoneFromParent(parent) {
  return (
    parent?.phone ||
    parent?.mobile ||
    parent?.parentPhone ||
    parent?.whatsapp ||
    parent?.guestParent?.phone ||
    parent?.profile?.phone ||
    ""
  );
}

function normalizeStatus(value) {
  return String(value || "ACTIVE")
    .trim()
    .toUpperCase();
}

function normalizeSource(value, fallback = "WEB") {
  return String(value || fallback)
    .trim()
    .toUpperCase();
}

function normalizeGender(value) {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  if (["BOY", "MALE", "M"].includes(text)) return "BOY";
  if (["GIRL", "FEMALE", "F"].includes(text)) return "GIRL";

  return text || "N/A";
}

function normalizeBooking(item) {
  const childId = normalizeId(
    item?.childId?._id ||
      item?.childId?.id ||
      item?.childId ||
      item?.userId?._id ||
      item?.userId?.id ||
      item?.userId ||
      "",
  );

  const parentId = normalizeId(
    item?.parentId?._id || item?.parentId?.id || item?.parentId || "",
  );

  const guestChild =
    item?.guestChild || item?.guestChildSnapshot || item?.childSnapshot || null;

  const guestParent =
    item?.guestParent ||
    item?.guestParentSnapshot ||
    item?.parentSnapshot ||
    null;

  const childName =
    item?.childId?.fullName ||
    item?.childId?.name ||
    item?.childName ||
    guestChild?.fullName ||
    guestChild?.name ||
    item?.childSnapshot?.fullName ||
    "Child";

  const childGender =
    item?.childId?.gender ||
    item?.gender ||
    guestChild?.gender ||
    item?.childSnapshot?.gender ||
    "";

  const childAge =
    item?.childId?.age ||
    item?.childAge ||
    guestChild?.age ||
    item?.childSnapshot?.age ||
    calculateAgeFromDob(guestChild?.dob || item?.childId?.dob || item?.dob);

  const parentName =
    item?.parentId?.fullName ||
    item?.parentId?.name ||
    item?.parentName ||
    guestParent?.fullName ||
    guestParent?.name ||
    "Parent";

  const parentEmail =
    item?.parentId?.email ||
    item?.parentEmail ||
    item?.email ||
    item?.userEmail ||
    guestParent?.email ||
    "";

  const parentPhone =
    item?.parentId?.phone ||
    item?.parentPhone ||
    item?.phone ||
    guestParent?.phone ||
    guestParent?.mobile ||
    "";

  return {
    raw: item,

    id: normalizeId(item?._id || item?.id || ""),

    childId,
    childName,
    childAge,
    childGender,

    parentId,
    parentName,
    parentEmail: String(parentEmail || "")
      .trim()
      .toLowerCase(),
    parentPhone,

    isGuestBooking: Boolean(
      item?.isGuestBooking ||
      item?.bookingSource === "GUEST" ||
      (!childId && guestChild),
    ),

    guestChild,
    guestParent,

    bookingNo:
      item?.bookingNo || item?.referenceNo || item?.invoiceNo || item?._id,

    activityName:
      item?.activityId?.title ||
      item?.activityId?.name ||
      item?.activityName ||
      item?.courseName ||
      item?.activitySnapshot?.title ||
      "Activity",

    packageName:
      item?.packageId?.title ||
      item?.packageName ||
      item?.packageSnapshot?.title ||
      "Package",

    status: item?.bookingStatus || item?.status || "PENDING",
    paymentStatus: item?.paymentStatus || "PENDING",

    finalAmount:
      item?.finalAmount ||
      item?.subtotalAmount ||
      item?.baseAmount ||
      item?.amount ||
      item?.totalAmount ||
      item?.packageSnapshot?.price ||
      0,

    currency: item?.currency || item?.packageSnapshot?.currency || "QAR",

    academyName: pickAcademyName(item),

    academyId: normalizeId(
      item?.academyId?._id || item?.academyId?.id || item?.academyId || "",
    ),

    createdAt: item?.createdAt || null,
    firstSessionDate: item?.firstSessionDate || null,
    lastSessionDate: item?.lastSessionDate || null,
  };
}

function normalizeChild(item, index, bookingMap = new Map()) {
  const id = normalizeId(item?._id || item?.id || item?.userId || "");
  const name = pickChildName(item);
  const parentName = pickParentName(item);
  const parentEmail = pickParentEmail(item);
  const parentPhone = pickParentPhone(item);
  const academyName = pickAcademyName(item);

  const mappedBookings =
    bookingMap.get(id) ||
    bookingMap.get(`${name}|${String(parentEmail).toLowerCase()}`) ||
    bookingMap.get(`${name}|${parentPhone}`) ||
    item?.bookings ||
    [];

  const bookingsCount =
    Number(item?.bookingsCount || item?.bookingCount || 0) ||
    toArray(mappedBookings).length;

  const totalSpend =
    Number(item?.totalSpend || item?.totalAmount || item?.revenue || 0) ||
    toArray(mappedBookings).reduce((sum, booking) => {
      return sum + Number(booking.finalAmount || booking.amount || 0);
    }, 0);

  return {
    raw: item,
    id: id || `child-${index + 1}`,
    dbId: id,

    name,
    age:
      item?.age ||
      item?.childAge ||
      item?.profile?.age ||
      calculateAgeFromDob(item?.dob || item?.dateOfBirth),
    dob: item?.dob || item?.dateOfBirth || "",
    gender: normalizeGender(item?.gender || item?.profile?.gender),

    parentName,
    parentEmail,
    parentPhone,

    academyName,
    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        item?.academy?.id ||
        "",
    ),

    status: normalizeStatus(item?.status || item?.accountStatus),
    source: normalizeSource(item?.source || item?.signupSource, "WEB"),

    city: item?.city || item?.location || item?.address?.city || "",
    address: item?.address?.line1 || item?.address || "",

    bookingsCount,
    totalSpend,
    currency: item?.currency || "QAR",

    lastBookingAt:
      item?.lastBookingAt ||
      item?.lastBookingDate ||
      toArray(mappedBookings)?.[0]?.createdAt ||
      null,

    createdAt: item?.createdAt || item?.registeredAt || null,
    bookings: toArray(mappedBookings),

    isGuestChild: Boolean(item?.isGuestChild),
  };
}

function createGuestChildrenFromBookings(
  bookingRows = [],
  existingChildren = [],
) {
  const existingKeys = new Set();

  existingChildren.forEach((child) => {
    const childId = normalizeId(child.dbId || child.id);
    const email = String(child.parentEmail || "")
      .trim()
      .toLowerCase();
    const phone = String(child.parentPhone || "").trim();
    const name = String(child.name || "").trim();

    if (childId) existingKeys.add(`id:${childId}`);
    if (name && email) existingKeys.add(`name-email:${name}|${email}`);
    if (name && phone) existingKeys.add(`name-phone:${name}|${phone}`);
  });

  const grouped = new Map();

  bookingRows.forEach((booking) => {
    const isGuest = Boolean(booking.isGuestBooking || !booking.childId);
    if (!isGuest) return;

    const childName = String(booking.childName || "").trim();
    const parentEmail = String(booking.parentEmail || "")
      .trim()
      .toLowerCase();
    const parentPhone = String(booking.parentPhone || "").trim();

    if (!childName || childName === "Child") return;

    const key = parentEmail
      ? `name-email:${childName}|${parentEmail}`
      : parentPhone
        ? `name-phone:${childName}|${parentPhone}`
        : `name:${childName}`;

    if (existingKeys.has(key)) return;

    const current = grouped.get(key) || {
      _id: `guest-${key}`,
      id: `guest-${key}`,
      fullName: childName,
      name: childName,
      age: booking.childAge || "",
      gender: booking.childGender || "",
      status: "ACTIVE",
      source: "GUEST",
      academyName: booking.academyName || "Academy",
      academyId: booking.academyId || "",
      parentName: booking.parentName || "Guest Parent",
      parentEmail,
      parentPhone,
      createdAt: booking.createdAt || null,
      lastBookingAt: booking.createdAt || null,
      bookingsCount: 0,
      totalSpend: 0,
      currency: booking.currency || "QAR",
      bookings: [],
      isGuestChild: true,
    };

    current.bookings.push(booking);
    current.bookingsCount += 1;
    current.totalSpend += Number(booking.finalAmount || 0);

    if (
      booking.createdAt &&
      (!current.lastBookingAt ||
        new Date(booking.createdAt).getTime() >
          new Date(current.lastBookingAt).getTime())
    ) {
      current.lastBookingAt = booking.createdAt;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values());
}

function StatusBadge({ value }) {
  const text = String(value || "N/A").toUpperCase();

  const classes = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    VERIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
    SUSPENDED: "bg-red-50 text-red-700 ring-red-100",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
    FAILED: "bg-red-50 text-red-700 ring-red-100",
    WEB: "bg-blue-50 text-blue-700 ring-blue-100",
    GUEST: "bg-violet-50 text-violet-700 ring-violet-100",
    ADMIN: "bg-slate-100 text-slate-700 ring-slate-200",
    MOBILE: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    BOY: "bg-blue-50 text-blue-700 ring-blue-100",
    GIRL: "bg-pink-50 text-pink-700 ring-pink-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        classes[text] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {text}
    </span>
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100 ${className}`}
    >
      {children}
    </select>
  );
}

function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-orange-100/60 blur-2xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-500">{label}</div>

          <div className="mt-3 break-words text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </div>

          {subtitle ? (
            <div className="mt-2 break-words text-sm font-medium leading-5 text-slate-400">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
        <Baby className="h-7 w-7" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function ChildAvatar({ child }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff7a3d] text-sm font-black text-white shadow-sm">
      {initials(child.name)}
    </div>
  );
}

function ChildViewModal({ open, child, onClose }) {
  if (!open || !child) return null;

  const rows = [
    ["Child Name", child.name],
    ["Age", child.age ? `${child.age} years` : "N/A"],
    ["Date of Birth", formatDate(child.dob)],
    ["Gender", child.gender || "N/A"],
    ["Parent", child.parentName || "N/A"],
    ["Parent Email", child.parentEmail || "N/A"],
    ["Parent Phone", child.parentPhone || "N/A"],
    ["Academy", child.academyName],
    ["City", child.city || "N/A"],
    ["Address", child.address || "N/A"],
    ["Status", child.status],
    ["Source", child.source],
    ["Bookings", child.bookingsCount || 0],
    ["Total Spend", money(child.totalSpend, child.currency)],
    ["Last Booking", formatDateTime(child.lastBookingAt)],
    ["Registered", formatDateTime(child.createdAt)],
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-6xl rounded-[30px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-4">
            <ChildAvatar child={child} />

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d]">
                <Eye className="h-3.5 w-3.5" />
                {child.isGuestChild
                  ? "Guest Child Profile"
                  : "Child CRM Profile"}
              </div>

              <h3 className="mt-3 break-words text-2xl font-black text-slate-900">
                {child.name}
              </h3>

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge value={child.status} />
                <StatusBadge value={child.source} />
                <StatusBadge value={child.gender} />
              </div>

              <p className="mt-2 text-sm font-medium text-slate-500">
                Parent: {child.parentName || "N/A"}
              </p>
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

        <div className="grid gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-2 break-words text-sm font-bold text-slate-900">
                    {value || "N/A"}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
              <h4 className="text-lg font-black text-slate-900">
                Recent Bookings
              </h4>

              <div className="mt-4 space-y-3">
                {toArray(child.bookings).length ? (
                  toArray(child.bookings)
                    .slice(0, 8)
                    .map((booking, index) => (
                      <div
                        key={booking.id || index}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {booking.bookingNo || "Booking"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {booking.activityName} · {booking.packageName}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {formatDateTime(booking.createdAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <StatusBadge value={booking.status} />
                            <StatusBadge value={booking.paymentStatus} />
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                              {money(booking.finalAmount, booking.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <EmptyState text="No recent bookings found for this child." />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-black text-slate-900">
                Parent Contact
              </h4>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Parent Name
                  </div>
                  <div className="mt-2 break-words text-sm font-black text-slate-900">
                    {child.parentName || "N/A"}
                  </div>
                </div>

                {child.parentEmail ? (
                  <a
                    href={`mailto:${child.parentEmail}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:text-[#ff7a3d]"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                ) : null}

                {child.parentPhone ? (
                  <a
                    href={`tel:${child.parentPhone}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white transition hover:bg-[#ec6f35]"
                  >
                    <Phone className="h-4 w-4" />
                    Call Parent
                  </a>
                ) : null}

                {!child.parentEmail && !child.parentPhone ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
                    No parent contact details available.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-black text-slate-900">Academy</h4>

              <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="break-words text-sm font-black text-slate-900">
                      {child.academyName}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {child.city || "Qatar"}
                    </div>
                  </div>
                </div>
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

export default function SuperAdminChildrenPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [children, setChildren] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");

  const [viewChild, setViewChild] = useState(null);

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [childrenRes, parentsRes, academiesRes, bookingsRes] =
        await Promise.allSettled([
          api.get("/super-admin/children"),
          api.get("/super-admin/parents"),
          api.get("/super-admin/academies"),
          api.get("/super-admin/bookings"),
        ]);

      const bookingRows =
        bookingsRes.status === "fulfilled"
          ? toArray(
              bookingsRes.value?.data?.bookings ||
                bookingsRes.value?.data?.items ||
                bookingsRes.value?.data?.enquiries ||
                [],
            ).map(normalizeBooking)
          : [];

      const bookingMap = new Map();

      bookingRows.forEach((booking) => {
        if (booking.childId) {
          const current = bookingMap.get(booking.childId) || [];
          bookingMap.set(booking.childId, [...current, booking]);
        }

        if (booking.childName && booking.parentEmail) {
          const key = `${booking.childName}|${booking.parentEmail}`;
          const current = bookingMap.get(key) || [];
          bookingMap.set(key, [...current, booking]);
        }

        if (booking.childName && booking.parentPhone) {
          const key = `${booking.childName}|${booking.parentPhone}`;
          const current = bookingMap.get(key) || [];
          bookingMap.set(key, [...current, booking]);
        }
      });

      let childRows =
        childrenRes.status === "fulfilled"
          ? toArray(
              childrenRes.value?.data?.children ||
                childrenRes.value?.data?.users ||
                childrenRes.value?.data?.items ||
                [],
            )
          : [];

      if (!childRows.length && parentsRes.status === "fulfilled") {
        const parentRows = toArray(
          parentsRes.value?.data?.parents ||
            parentsRes.value?.data?.users ||
            parentsRes.value?.data?.items ||
            [],
        );

        childRows = parentRows.flatMap((parent) => {
          const parentChildren = toArray(
            parent?.children ||
              parent?.childrens ||
              parent?.kids ||
              parent?.students ||
              parent?.childIds ||
              parent?.childrenSnapshot ||
              [],
          );

          return parentChildren.map((child) => ({
            ...child,
            parentId: parent,
            parentName: pickParentName(parent),
            parentEmail: pickEmailFromParent(parent),
            parentPhone: pickPhoneFromParent(parent),
            academyId: parent?.academyId || parent?.academy || null,
            academyName: pickAcademyName(parent),
            source: parent?.source || parent?.signupSource || "WEB",
            status: child?.status || parent?.status || "ACTIVE",
            createdAt: child?.createdAt || parent?.createdAt || null,
          }));
        });
      }

      const normalizedRegisteredChildren = childRows.map((item, index) =>
        normalizeChild(item, index, bookingMap),
      );

      const guestChildRows = createGuestChildrenFromBookings(
        bookingRows,
        normalizedRegisteredChildren,
      );

      const normalizedGuestChildren = guestChildRows.map((item, index) =>
        normalizeChild(
          item,
          normalizedRegisteredChildren.length + index,
          bookingMap,
        ),
      );

      const academyRows =
        academiesRes.status === "fulfilled"
          ? toArray(
              academiesRes.value?.data?.academies ||
                academiesRes.value?.data?.items ||
                [],
            )
          : [];

      setBookings(bookingRows);

      setChildren([
        ...normalizedRegisteredChildren,
        ...normalizedGuestChildren,
      ]);

      setAcademies(
        academyRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `academy-${index + 1}`),
          name: safeText(item?.name || item?.academyName, "Academy"),
        })),
      );

      if (
        childrenRes.status === "rejected" &&
        parentsRes.status === "rejected" &&
        !bookingRows.length
      ) {
        throw new Error(
          childrenRes.reason?.response?.data?.message ||
            "Failed to load children.",
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load children CRM data.",
      );
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const uniqueAcademies = useMemo(() => {
    const set = new Set();

    children.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A") {
        set.add(item.academyName);
      }
    });

    academies.forEach((item) => {
      if (item.name) set.add(item.name);
    });

    return [...set].sort();
  }, [children, academies]);

  const filteredChildren = useMemo(() => {
    const q = search.trim().toLowerCase();

    return children.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.name,
          item.gender,
          item.age,
          item.parentName,
          item.parentEmail,
          item.parentPhone,
          item.academyName,
          item.city,
          item.status,
          item.source,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !academyFilter ||
        String(item.academyName).toLowerCase() ===
          String(academyFilter).toLowerCase();

      const matchesGender =
        !genderFilter ||
        String(item.gender).toUpperCase() ===
          String(genderFilter).toUpperCase();

      const matchesStatus =
        !statusFilter ||
        String(item.status).toUpperCase() ===
          String(statusFilter).toUpperCase();

      const matchesSource =
        !sourceFilter ||
        String(item.source).toUpperCase() ===
          String(sourceFilter).toUpperCase();

      const matchesEngagement =
        !engagementFilter ||
        (engagementFilter === "HAS_BOOKINGS" && item.bookingsCount > 0) ||
        (engagementFilter === "NO_BOOKINGS" && item.bookingsCount === 0) ||
        (engagementFilter === "HIGH_VALUE" && item.totalSpend >= 500);

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesGender &&
        matchesStatus &&
        matchesSource &&
        matchesEngagement
      );
    });
  }, [
    children,
    search,
    academyFilter,
    genderFilter,
    statusFilter,
    sourceFilter,
    engagementFilter,
  ]);

  const stats = useMemo(() => {
    const total = children.length;
    const active = children.filter((item) => item.status === "ACTIVE").length;
    const withBookings = children.filter(
      (item) => item.bookingsCount > 0,
    ).length;

    const guestChildren = children.filter(
      (item) => item.source === "GUEST",
    ).length;

    const totalSpend = children.reduce(
      (sum, item) => sum + Number(item.totalSpend || 0),
      0,
    );

    return {
      total,
      active,
      withBookings,
      guestChildren,
      totalSpend,
    };
  }, [children]);

  function clearFilters() {
    setSearch("");
    setAcademyFilter("");
    setGenderFilter("");
    setStatusFilter("");
    setSourceFilter("");
    setEngagementFilter("");
  }

  function exportChildrenCsv() {
    const rows = filteredChildren.map((child) => ({
      "Child Name": child.name,
      Age: child.age || "",
      Gender: child.gender || "",
      "Date of Birth": formatDate(child.dob),
      "Parent Name": child.parentName || "",
      "Parent Email": child.parentEmail || "",
      "Parent Phone": child.parentPhone || "",
      Academy: child.academyName || "",
      City: child.city || "",
      Status: child.status || "",
      Source: child.source || "",
      Bookings: child.bookingsCount || 0,
      "Total Spend": child.totalSpend || 0,
      Currency: child.currency || "QAR",
      "Last Booking": formatDateTime(child.lastBookingAt),
      Registered: formatDateTime(child.createdAt),
      "Guest Child": child.isGuestChild ? "YES" : "NO",
    }));

    downloadCsv("kidgage-children-crm.csv", rows);
  }

  return (
    <div className="w-full overflow-x-hidden bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-5 md:px-8 md:py-6">
      <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 shadow-sm sm:p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              KidGage Super Admin
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
              Children CRM
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 md:text-base">
              Manage registered and guest children across all academies with
              parent details, booking history, activity engagement, spend, and
              academy insights.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <button
              type="button"
              onClick={exportChildrenCsv}
              disabled={!filteredChildren.length}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-black text-[#ff7a3d] transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => loadData({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35] disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Baby}
            label="Total Children"
            value={loading ? "..." : stats.total}
            subtitle="Registered + guest"
          />

          <StatCard
            icon={UserRound}
            label="Active Children"
            value={loading ? "..." : stats.active}
            subtitle="Active child records"
          />

          <StatCard
            icon={ClipboardList}
            label="Booked Children"
            value={loading ? "..." : stats.withBookings}
            subtitle="Children with bookings"
          />

          <StatCard
            icon={Users}
            label="Guest Children"
            value={loading ? "..." : stats.guestChildren}
            subtitle="Guest booking profiles"
          />

          <StatCard
            icon={Wallet}
            label="Total Spend"
            value={loading ? "..." : money(stats.totalSpend, "QAR")}
            subtitle="Estimated booking value"
          />
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_220px_160px_170px_170px_210px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search child, parent, email, phone, academy..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <Select
            value={academyFilter}
            onChange={(e) => setAcademyFilter(e.target.value)}
          >
            <option value="">All Academies</option>
            {uniqueAcademies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All Gender</option>
            <option value="BOY">BOY</option>
            <option value="GIRL">GIRL</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PENDING">PENDING</option>
          </Select>

          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="WEB">WEB</option>
            <option value="GUEST">GUEST</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MOBILE">MOBILE</option>
          </Select>

          <Select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value)}
          >
            <option value="">All Engagement</option>
            <option value="HAS_BOOKINGS">Has Bookings</option>
            <option value="NO_BOOKINGS">No Bookings</option>
            <option value="HIGH_VALUE">High Value</option>
          </Select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Child Records</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Showing {filteredChildren.length} of {children.length} records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredChildren.length === 0 ? (
          <EmptyState text="No child records found." />
        ) : (
          <>
            <div className="hidden overflow-x-auto 2xl:block">
              <table className="w-full min-w-[1500px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Child
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Parent
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Academy
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Bookings
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Spend
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Status
                    </th>
                    <th className="pb-4 text-sm font-black text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredChildren.map((child) => (
                    <tr
                      key={child.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-5 pr-5 align-top">
                        <div className="flex items-center gap-4">
                          <ChildAvatar child={child} />
                          <div className="min-w-0">
                            <div className="max-w-[240px] break-words text-sm font-black text-slate-900">
                              {child.name}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {child.age ? `${child.age} years` : "Age N/A"} ·{" "}
                              {child.gender || "N/A"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusBadge value={child.source} />
                              <StatusBadge value={child.gender} />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-black text-slate-900">
                          {child.parentName}
                        </div>

                        <div className="mt-2 space-y-1 text-xs font-medium text-slate-500">
                          {child.parentEmail ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {child.parentEmail}
                            </div>
                          ) : null}

                          {child.parentPhone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {child.parentPhone}
                            </div>
                          ) : null}

                          {!child.parentEmail && !child.parentPhone
                            ? "N/A"
                            : null}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-black text-[#ff7a3d]">
                          <Building2 className="h-4 w-4" />
                          {child.academyName}
                        </div>

                        {child.city ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {child.city}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-black text-slate-900">
                          {child.bookingsCount || 0}
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-500">
                          Last: {formatDate(child.lastBookingAt)}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-black text-slate-900">
                          {money(child.totalSpend, child.currency)}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <StatusBadge value={child.status} />
                      </td>

                      <td className="py-5 align-top">
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewChild(child)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-orange-50 hover:text-[#ff7a3d]"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 2xl:hidden">
              {filteredChildren.map((child) => (
                <div
                  key={child.id}
                  className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <ChildAvatar child={child} />

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-900">
                          {child.name}
                        </h3>

                        <div className="mt-1 text-xs font-medium text-slate-500">
                          {child.age ? `${child.age} years` : "Age N/A"} ·{" "}
                          {child.gender || "N/A"}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <StatusBadge value={child.status} />
                          <StatusBadge value={child.source} />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewChild(child)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff7a3d]"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Parent
                      </div>
                      <div className="mt-1 break-words text-sm font-black text-slate-900">
                        {child.parentName || "N/A"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Academy
                      </div>
                      <div className="mt-1 break-words text-sm font-black text-slate-900">
                        {child.academyName}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Bookings
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {child.bookingsCount || 0}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Spend
                      </div>
                      <div className="mt-1 break-words text-sm font-black text-slate-900">
                        {money(child.totalSpend, child.currency)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewChild(child)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white transition hover:bg-[#ec6f35]"
                  >
                    <Eye className="h-4 w-4" />
                    View Child Profile
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <ChildViewModal
        open={Boolean(viewChild)}
        child={viewChild}
        onClose={() => setViewChild(null)}
      />
    </div>
  );
}

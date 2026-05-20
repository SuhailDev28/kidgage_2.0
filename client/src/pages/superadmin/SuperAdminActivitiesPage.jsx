// client/src/pages/superadmin/SuperAdminActivitiesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

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

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function formatDateRange(start, end) {
  const s = start ? formatDate(start) : "";
  const e = end ? formatDate(end) : "";

  if (s && e) return `${s} to ${e}`;
  return s || e || "N/A";
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value || "").trim();
  if (!raw) return "";

  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .trim()
    .replace(/\/api\/?$/, "");

  const base = apiBase || FALLBACK_API_ORIGIN;

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/${raw}`;
}

function pickAcademyName(item) {
  return (
    item?.academyId?.name ||
    item?.academy?.name ||
    item?.academyName ||
    item?.academySnapshot?.name ||
    "Academy"
  );
}

function pickCategoryName(item) {
  return (
    item?.categoryId?.name ||
    item?.category?.name ||
    item?.categoryName ||
    item?.category ||
    "N/A"
  );
}

function pickImage(item) {
  return (
    item?.image ||
    item?.bannerImage ||
    item?.coverImage ||
    item?.thumbnail ||
    item?.poster ||
    item?.featuredImage ||
    item?.images?.[0] ||
    ""
  );
}

function normalizeActivity(item, index) {
  const id = normalizeId(item?._id || item?.id || "");
  const bookingConfig = item?.bookingConfig || {};
  const price = toNumber(item?.price ?? item?.basePrice ?? item?.fees, 0);

  return {
    raw: item,
    id: id || `activity-${index + 1}`,
    dbId: id,

    academyId: normalizeId(
      item?.academyId?._id ||
        item?.academyId?.id ||
        item?.academyId ||
        item?.academy?._id ||
        item?.academy?.id ||
        "",
    ),
    academyName: pickAcademyName(item),

    name: safeText(item?.title || item?.name, "Untitled Activity"),
    slug: item?.slug || "",
    categoryName: pickCategoryName(item),

    image: pickImage(item),

    shortDescription: item?.shortDescription || "",
    description: item?.description || "",

    status: String(item?.status || "PUBLISHED").toUpperCase(),

    city: item?.city || "",
    country: item?.country || "Qatar",
    venueName: item?.venueName || "",
    venueAddress: item?.venueAddress || "",

    startDate:
      item?.startDate || item?.dateFrom || item?.bookingStartDate || "",
    endDate: item?.endDate || item?.dateTo || item?.bookingEndDate || "",

    price,
    basePrice: toNumber(item?.basePrice ?? item?.price ?? item?.fees, price),
    currency: item?.currency || "QAR",
    fees: item?.fees || "",

    packageType: item?.packageType || bookingConfig?.packageType || "SESSIONS",
    totalSessions: toNumber(
      item?.totalSessions ?? item?.sessionCount ?? bookingConfig?.totalSessions,
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
    bookingMode: item?.bookingMode || bookingConfig?.bookingMode || "BOTH",
    defaultCapacity: toNumber(
      item?.defaultCapacity ?? item?.capacity ?? bookingConfig?.defaultCapacity,
      1,
    ),
    slotDurationMinutes: toNumber(
      item?.slotDurationMinutes ?? bookingConfig?.slotDurationMinutes,
      60,
    ),

    minAge: item?.minAge ?? "",
    maxAge: item?.maxAge ?? "",
    gender: item?.gender || "ALL",
    skillLevel: item?.skillLevel || "ALL",

    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function StatusBadge({ value }) {
  const text = String(value || "N/A").toUpperCase();

  const classes = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
    CLOSED: "bg-red-50 text-red-700 ring-red-100",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ring-1 sm:text-xs ${
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-500">{label}</div>
          <div className="mt-2 break-words text-2xl font-black tracking-tight text-slate-900 sm:mt-3 sm:text-3xl xl:text-4xl">
            {value}
          </div>
          {subtitle ? (
            <div className="mt-2 text-xs font-medium leading-5 text-slate-400 sm:text-sm">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
        <BookOpen className="h-7 w-7" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

function ActivityImage({ activity, className = "h-20 w-28" }) {
  const image = normalizeImage(activity.image);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${className}`}
    >
      {image ? (
        <img
          src={image}
          alt={activity.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <ImageIcon className="h-6 w-6 text-slate-400" />
      )}
    </div>
  );
}

function InfoPill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function ActivityViewModal({ open, activity, onClose }) {
  if (!open || !activity) return null;

  const rows = [
    ["Academy", activity.academyName],
    ["Activity", activity.name],
    ["Category", activity.categoryName],
    ["Status", activity.status],
    ["Duration", formatDateRange(activity.startDate, activity.endDate)],
    ["Price", money(activity.price, activity.currency)],
    ["Package Type", activity.packageType],
    ["Booking Mode", activity.bookingMode],
    ["Total Sessions", activity.totalSessions || "N/A"],
    ["Total Weeks", activity.totalWeeks || "N/A"],
    ["Sessions / Week", activity.sessionsPerWeek || "N/A"],
    ["Slot Duration", `${activity.slotDurationMinutes || 60} minutes`],
    ["Default Capacity", activity.defaultCapacity || "N/A"],
    ["Age Group", `${activity.minAge || "N/A"} - ${activity.maxAge || "N/A"}`],
    ["Gender", activity.gender],
    ["Skill Level", activity.skillLevel],
    ["City", activity.city || "N/A"],
    ["Venue", activity.venueName || activity.venueAddress || "N/A"],
  ];

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-6xl rounded-[26px] border border-slate-200 bg-white shadow-2xl sm:my-8 sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] sm:text-xs">
              <Eye className="h-3.5 w-3.5" />
              Activity Details
            </div>

            <h3 className="mt-3 text-xl font-black text-slate-900 sm:text-2xl">
              {activity.name}
            </h3>

            <p className="mt-1 text-sm font-medium text-slate-500">
              {activity.academyName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 sm:h-11 sm:w-11"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div>
            <ActivityImage
              activity={activity}
              className="h-[210px] w-full sm:h-[280px]"
            />

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Description
              </div>
              <div className="mt-2 text-sm leading-7 text-slate-700">
                {activity.description ||
                  activity.shortDescription ||
                  "No description available."}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {rows.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
                  {label}
                </div>
                <div className="mt-2 break-words text-sm font-bold text-slate-900">
                  {value || "N/A"}
                </div>
              </div>
            ))}
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

export default function SuperAdminActivitiesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activities, setActivities] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [packageTypeFilter, setPackageTypeFilter] = useState("");

  const [viewActivity, setViewActivity] = useState(null);

  async function loadData({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [activitiesRes, academiesRes, categoriesRes] =
        await Promise.allSettled([
          api.get("/super-admin/activities"),
          api.get("/super-admin/academies"),
          api.get("/super-admin/categories"),
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

      const academyRows =
        academiesRes.status === "fulfilled"
          ? toArray(
              academiesRes.value?.data?.academies ||
                academiesRes.value?.data?.items ||
                [],
            )
          : [];

      const categoryRows =
        categoriesRes.status === "fulfilled"
          ? toArray(categoriesRes.value?.data?.categories || [])
          : [];

      setActivities(activityRows.map(normalizeActivity));

      setAcademies(
        academyRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `academy-${index + 1}`),
          name: safeText(item?.name || item?.academyName, "Academy"),
        })),
      );

      setCategories(
        categoryRows.map((item, index) => ({
          id: normalizeId(item?._id || item?.id || `category-${index + 1}`),
          name: safeText(item?.name || item?.title, "Category"),
        })),
      );

      if (activitiesRes.status === "rejected") {
        throw new Error(
          activitiesRes.reason?.response?.data?.message ||
            "Failed to load super admin activities.",
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load activities.",
      );
      setActivities([]);
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

    activities.forEach((item) => {
      if (item.academyName && item.academyName !== "N/A") {
        set.add(item.academyName);
      }
    });

    academies.forEach((item) => {
      if (item.name) set.add(item.name);
    });

    return [...set].sort();
  }, [activities, academies]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();

    activities.forEach((item) => {
      if (item.categoryName && item.categoryName !== "N/A") {
        set.add(item.categoryName);
      }
    });

    categories.forEach((item) => {
      if (item.name) set.add(item.name);
    });

    return [...set].sort();
  }, [activities, categories]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();

    return activities.filter((item) => {
      const matchesSearch =
        !q ||
        [
          item.academyName,
          item.name,
          item.slug,
          item.categoryName,
          item.status,
          item.packageType,
          item.bookingMode,
          item.city,
          item.venueName,
          item.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesAcademy =
        !academyFilter ||
        String(item.academyName).toLowerCase() ===
          String(academyFilter).toLowerCase();

      const matchesCategory =
        !categoryFilter ||
        String(item.categoryName).toLowerCase() ===
          String(categoryFilter).toLowerCase();

      const matchesStatus =
        !statusFilter ||
        String(item.status).toUpperCase() ===
          String(statusFilter).toUpperCase();

      const matchesPackageType =
        !packageTypeFilter ||
        String(item.packageType).toUpperCase() ===
          String(packageTypeFilter).toUpperCase();

      return (
        matchesSearch &&
        matchesAcademy &&
        matchesCategory &&
        matchesStatus &&
        matchesPackageType
      );
    });
  }, [
    activities,
    search,
    academyFilter,
    categoryFilter,
    statusFilter,
    packageTypeFilter,
  ]);

  const stats = useMemo(() => {
    const total = activities.length;

    const published = activities.filter(
      (item) => String(item.status).toUpperCase() === "PUBLISHED",
    ).length;

    const academiesCount = new Set(
      activities.map((item) => item.academyName).filter(Boolean),
    ).size;

    const categoriesCount = new Set(
      activities.map((item) => item.categoryName).filter(Boolean),
    ).size;

    const totalValue = activities.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0,
    );

    return {
      total,
      published,
      academiesCount,
      categoriesCount,
      totalValue,
    };
  }, [activities]);

  function clearFilters() {
    setSearch("");
    setAcademyFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    setPackageTypeFilter("");
  }

  return (
    <div className="w-full overflow-x-hidden bg-slate-50 px-3 py-4 text-slate-900 sm:px-4 sm:py-5 md:px-8 md:py-6">
      <section className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/40 p-4 shadow-sm sm:rounded-[30px] sm:p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              KidGage Super Admin
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Activities
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 md:text-base">
              Monitor all activities, courses, packages, categories, pricing,
              booking configuration, and academy coverage from one workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData({ silent: true })}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35] disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={BookOpen}
            label="Total Activities"
            value={loading ? "..." : stats.total}
            subtitle="Across all academies"
          />

          <StatCard
            icon={BadgeCheck}
            label="Published"
            value={loading ? "..." : stats.published}
            subtitle="Visible programs"
          />

          <StatCard
            icon={Building2}
            label="Academies"
            value={loading ? "..." : stats.academiesCount}
            subtitle="With activities"
          />

          <StatCard
            icon={FolderOpen}
            label="Categories"
            value={loading ? "..." : stats.categoriesCount}
            subtitle="Used by activities"
          />

          <StatCard
            icon={Wallet}
            label="Total Base Value"
            value={loading ? "..." : money(stats.totalValue, "QAR")}
            subtitle="Estimated listed price"
          />
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_220px_180px_180px_auto]">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity, academy, category, booking mode..."
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="CLOSED">CLOSED</option>
          </Select>

          <Select
            value={packageTypeFilter}
            onChange={(e) => setPackageTypeFilter(e.target.value)}
          >
            <option value="">All Packages</option>
            <option value="SESSIONS">SESSIONS</option>
            <option value="MONTHLY">MONTHLY</option>
            <option value="CUSTOM">CUSTOM</option>
          </Select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 md:col-span-2 xl:col-span-1"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[30px] sm:p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              All Activities
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Showing {filteredActivities.length} of {activities.length}{" "}
              records.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <EmptyState text="No activities found." />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1320px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Activity
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Academy
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Category
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Duration
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Booking Setup
                    </th>
                    <th className="pb-4 pr-5 text-sm font-black text-slate-500">
                      Price
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
                  {filteredActivities.map((activityItem) => (
                    <tr
                      key={activityItem.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="py-5 pr-5 align-top">
                        <div className="flex items-center gap-4">
                          <ActivityImage activity={activityItem} />
                          <div className="min-w-0">
                            <div className="max-w-[250px] text-sm font-black text-slate-900">
                              {activityItem.name}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {activityItem.slug || "No slug"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <InfoPill className="bg-orange-50 text-[#ff7a3d]">
                          <Building2 className="h-4 w-4" />
                          {activityItem.academyName}
                        </InfoPill>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <InfoPill className="bg-slate-100 text-slate-700">
                          <FolderOpen className="h-4 w-4 text-slate-400" />
                          {activityItem.categoryName}
                        </InfoPill>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-bold text-slate-900">
                          {formatDateRange(
                            activityItem.startDate,
                            activityItem.endDate,
                          )}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {activityItem.city || activityItem.country || "Qatar"}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="flex max-w-[300px] flex-wrap gap-2">
                          <InfoPill className="bg-blue-50 text-blue-700">
                            {activityItem.packageType}
                          </InfoPill>
                          <InfoPill className="bg-emerald-50 text-emerald-700">
                            {activityItem.bookingMode}
                          </InfoPill>
                          <InfoPill className="bg-amber-50 text-amber-700">
                            {activityItem.defaultCapacity} / slot
                          </InfoPill>
                          <InfoPill className="bg-violet-50 text-violet-700">
                            {activityItem.slotDurationMinutes} min
                          </InfoPill>
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <div className="text-sm font-black text-slate-900">
                          {money(activityItem.price, activityItem.currency)}
                        </div>
                      </td>

                      <td className="py-5 pr-5 align-top">
                        <StatusBadge value={activityItem.status} />
                      </td>

                      <td className="py-5 align-top">
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewActivity(activityItem)}
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

            <div className="grid gap-4 xl:hidden">
              {filteredActivities.map((activityItem) => (
                <div
                  key={activityItem.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <ActivityImage
                      activity={activityItem}
                      className="h-44 w-full sm:h-28 sm:w-36"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={activityItem.status} />
                        <InfoPill className="bg-orange-50 text-[#ff7a3d]">
                          {activityItem.packageType}
                        </InfoPill>
                      </div>

                      <h3 className="mt-3 text-lg font-black leading-snug text-slate-900">
                        {activityItem.name}
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {activityItem.academyName}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                          <FolderOpen className="h-3.5 w-3.5" />
                          {activityItem.categoryName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Duration
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {formatDateRange(
                          activityItem.startDate,
                          activityItem.endDate,
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Price
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {money(activityItem.price, activityItem.currency)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
                      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Booking Setup
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <InfoPill className="bg-emerald-50 text-emerald-700">
                          {activityItem.bookingMode}
                        </InfoPill>
                        <InfoPill className="bg-amber-50 text-amber-700">
                          {activityItem.defaultCapacity} / slot
                        </InfoPill>
                        <InfoPill className="bg-violet-50 text-violet-700">
                          {activityItem.slotDurationMinutes} min
                        </InfoPill>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewActivity(activityItem)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-black text-white transition hover:bg-[#ec6f35]"
                  >
                    <Eye className="h-4 w-4" />
                    View Activity
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <ActivityViewModal
        open={Boolean(viewActivity)}
        activity={viewActivity}
        onClose={() => setViewActivity(null)}
      />
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Search,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Layers3,
  Users,
  Clock3,
  Activity,
  Building2,
  BadgeCheck,
  TrendingUp,
  Settings,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { getUser } from "../../lib/auth.js";
import { useNavigate } from "react-router-dom";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDateRange(start, end) {
  if (!start && !end) return "N/A";

  const format = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB");
  };

  const s = format(start);
  const e = format(end);

  if (s && e) return `${s} to ${e}`;
  return s || e || "N/A";
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

function getInitials(name = "") {
  const raw = String(name || "A").trim();
  if (!raw) return "A";

  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return raw.slice(0, 1).toUpperCase();
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();

  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .trim()
    .replace(/\/api\/?$/, "");

  const base = apiBase || FALLBACK_API_ORIGIN;

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/academies/${raw}`;
}

function normalizeStatus(value, fallback = "PENDING") {
  return String(value || fallback)
    .trim()
    .toUpperCase();
}

function StatusPill({ value }) {
  const status = normalizeStatus(value);

  const map = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-100",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
    DRAFT: "bg-slate-50 text-slate-700 ring-slate-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
    FAILED: "bg-rose-50 text-rose-700 ring-rose-100",
    INACTIVE: "bg-slate-50 text-slate-500 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
        map[status] || map.PENDING
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, bg, loading }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          {loading ? (
            <div className="mt-4 h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <h3 className={`mt-3 text-4xl font-black tracking-tight ${color}`}>
              {value}
            </h3>
          )}

          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className={`rounded-2xl p-3 ${bg}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function WidgetCard({ title, subtitle, children, action, onAction }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            {action}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
  accent = "blue",
}) {
  const accentMap = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            accentMap[accent] || accentMap.blue
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900">
            {title}
          </div>
          <div className="truncate text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function TableShell({ columns, rows, emptyText, renderRow, loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {columns.map((col) => (
              <th
                key={col}
                className="pb-4 pr-4 text-sm font-semibold text-slate-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map(renderRow)
          ) : (
            <tr>
              <td colSpan={columns.length} className="pt-4">
                <EmptyState text={emptyText} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AcademyDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    bookings: 0,
    categories: 0,
    courses: 0,
    enquiries: 0,
  });

  const [courses, setCourses] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");

  async function loadDashboard({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const results = await Promise.allSettled([
        api.get("/academy/activities"),
        api.get("/academy/bookings"),
        api.get("/academy/categories"),
        api.get("/academy/enquiries"),
        api.get("/academy/profile"),
      ]);

      const activitiesRes =
        results[0].status === "fulfilled" ? results[0].value : null;
      const bookingsRes =
        results[1].status === "fulfilled" ? results[1].value : null;
      const categoriesRes =
        results[2].status === "fulfilled" ? results[2].value : null;
      const enquiriesRes =
        results[3].status === "fulfilled" ? results[3].value : null;
      const profileRes =
        results[4].status === "fulfilled" ? results[4].value : null;

      const failedCount = results.filter(
        (item) => item.status === "rejected",
      ).length;

      const profileData =
        profileRes?.data?.academy || profileRes?.data?.profile || null;

      const activityItems = toArray(
        activitiesRes?.data?.activities ||
          activitiesRes?.data?.courses ||
          activitiesRes?.data?.items ||
          [],
      );

      const courseRows = activityItems.map((item, index) => ({
        id: item?._id || item?.id || `course-${index + 1}`,
        name: safeText(item?.title || item?.name, "Untitled Course"),
        category: safeText(
          item?.categoryName || item?.category?.name || item?.category,
          "N/A",
        ),
        startDate:
          item?.startDate ||
          item?.dateFrom ||
          item?.bookingStartDate ||
          item?.createdAt ||
          "",
        endDate: item?.endDate || item?.dateTo || item?.bookingEndDate || "",
        status: item?.status || "PUBLISHED",
        price: toNumber(item?.price || item?.basePrice || item?.fees, 0),
        currency: item?.currency || "QAR",
      }));

      const bookingItems = toArray(bookingsRes?.data?.bookings || []);

      const bookingRows = bookingItems.map((item, index) => ({
        id: item?._id || item?.id || `booking-${index + 1}`,
        email: safeText(
          item?.userEmail ||
            item?.email ||
            item?.parentEmail ||
            item?.customerEmail ||
            item?.guestParent?.email,
          "N/A",
        ),
        courseName: safeText(
          item?.courseName ||
            item?.activityName ||
            item?.course?.name ||
            item?.activity?.name ||
            item?.activitySnapshot?.title,
          "N/A",
        ),
        sessions:
          item?.sessions ||
          item?.noOfSessions ||
          item?.numberOfSessions ||
          item?.totalSessions ||
          item?.packageSnapshot?.sessionCount ||
          item?.packageSnapshot?.durationValue ||
          0,
        status:
          item?.bookingStatus ||
          item?.status ||
          item?.paymentStatus ||
          "PENDING",
        paymentStatus: item?.paymentStatus || "PENDING",
        createdAt: item?.createdAt || null,
      }));

      const enquirySource = toArray(
        enquiriesRes?.data?.enquiries ||
          enquiriesRes?.data?.bookings ||
          bookingsRes?.data?.bookings ||
          [],
      );

      const enquiryRows = enquirySource.map((item, index) => ({
        id: item?._id || item?.id || `enquiry-${index + 1}`,
        email: safeText(
          item?.userEmail ||
            item?.email ||
            item?.parentEmail ||
            item?.customerEmail ||
            item?.guestParent?.email,
          "N/A",
        ),
        courseName: safeText(
          item?.courseName ||
            item?.activityName ||
            item?.course?.name ||
            item?.activity?.name ||
            item?.activitySnapshot?.title,
          "N/A",
        ),
        sessions:
          item?.sessions ||
          item?.noOfSessions ||
          item?.numberOfSessions ||
          item?.totalSessions ||
          item?.packageSnapshot?.sessionCount ||
          item?.packageSnapshot?.durationValue ||
          0,
        status:
          item?.bookingStatus ||
          item?.status ||
          item?.paymentStatus ||
          "PENDING",
        createdAt: item?.createdAt || null,
      }));

      const categoriesCount = toNumber(
        categoriesRes?.data?.count ??
          toArray(categoriesRes?.data?.categories).length ??
          profileData?.categoriesCount,
        0,
      );

      const coursesCount = toNumber(
        activitiesRes?.data?.count ?? courseRows.length,
        courseRows.length,
      );

      const bookingsCount = toNumber(
        bookingsRes?.data?.count ?? bookingRows.length,
        bookingRows.length,
      );

      const enquiriesCount = toNumber(
        enquiriesRes?.data?.count ?? enquiryRows.length,
        enquiryRows.length,
      );

      setProfile(profileData);
      setCourses(courseRows);
      setBookings(bookingRows);
      setEnquiries(enquiryRows);
      setStats({
        bookings: bookingsCount,
        categories: categoriesCount,
        courses: coursesCount,
        enquiries: enquiriesCount,
      });

      if (
        !activitiesRes &&
        !bookingsRes &&
        !categoriesRes &&
        !enquiriesRes &&
        !profileRes
      ) {
        throw new Error("Unable to load academy dashboard");
      }

      if (failedCount > 0) {
        setError(
          "Dashboard loaded, but some sections could not be refreshed. Please check backend routes if data looks incomplete.",
        );
      }
    } catch {
      setError("Some academy dashboard data could not be loaded.");

      setProfile({
        academyName: user?.academyName || "Aspire Sports Academy",
        name: user?.academyName || "Aspire Sports Academy",
        slug: user?.academyCode || "",
        academyLogo: user?.academyLogo || "",
        logo: user?.academyLogo || "",
      });

      setStats({
        bookings: 0,
        categories: 0,
        courses: 0,
        enquiries: 0,
      });

      setCourses([]);
      setBookings([]);
      setEnquiries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        String(item.status || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [courses, search]);

  const filteredEnquiries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enquiries;

    return enquiries.filter((item) => {
      return (
        String(item.email || "")
          .toLowerCase()
          .includes(q) ||
        String(item.courseName || "")
          .toLowerCase()
          .includes(q) ||
        String(item.status || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [enquiries, search]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [bookings]);

  const academyName =
    profile?.academyName ||
    profile?.name ||
    user?.academyName ||
    "Aspire Sports Academy";

  const academyCode =
    profile?.slug ||
    user?.academyCode ||
    String(user?._id || user?.id || "").slice(-6) ||
    "565443";

  const academyLogo = normalizeImage(
    profile?.academyLogo || profile?.logo || user?.academyLogo || "",
  );

  const academyStatus = profile?.status || "ACTIVE";

  const statsCards = [
    {
      title: "Total Bookings",
      value: stats.bookings,
      subtitle: "Bookings received for courses",
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Categories",
      value: stats.categories,
      subtitle: "Linked activity categories",
      icon: Layers3,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Courses",
      value: stats.courses,
      subtitle: "Published programs and offers",
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Enquiries",
      value: stats.enquiries,
      subtitle: "Parent and student requests",
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="w-full bg-slate-50 px-4 py-5 text-slate-900 md:px-8 md:py-6">
      <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/50 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#ff7a3d]">
              <Sparkles className="h-3.5 w-3.5" />
              Academy Workspace
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Academy Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Manage your courses, bookings, student enquiries, packages, slots,
              and academy operations from one clean workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <Building2 className="h-4 w-4 text-blue-600" />
                {academyName}
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                <StatusPill value={academyStatus} />
              </span>

              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                <Activity className="h-4 w-4 text-violet-600" />
                ID: {academyCode}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 2xl:w-auto 2xl:min-w-[540px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses, enquiries, status..."
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-600 text-white shadow-sm">
                  {academyLogo ? (
                    <img
                      src={academyLogo}
                      alt={academyName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-sm font-black">
                      {getInitials(academyName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-slate-900">
                    {academyName}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    Academy ID: {academyCode}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing || loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {statsCards.map((item) => (
          <StatCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <div className="2xl:col-span-7">
          <WidgetCard
            title="Courses / Programs"
            subtitle="Your academy’s published courses and schedule range."
            action="Manage"
            onAction={() => navigate("/academy/activities")}
          >
            <TableShell
              loading={loading}
              columns={["Course", "Category", "Duration", "Status"]}
              rows={filteredCourses}
              emptyText={
                search
                  ? "No matching courses found."
                  : "No courses found. Add your first course from Courses."
              }
              renderRow={(row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="py-5 pr-4">
                    <div className="text-sm font-bold text-slate-900">
                      {row.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.price > 0
                        ? `${row.currency} ${row.price}`
                        : "Price not set"}
                    </div>
                  </td>

                  <td className="py-5 pr-4 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-slate-400" />
                      {row.category}
                    </span>
                  </td>

                  <td className="py-5 pr-4 text-sm text-slate-700">
                    {formatDateRange(row.startDate, row.endDate)}
                  </td>

                  <td className="py-5 text-sm text-slate-700">
                    <StatusPill value={row.status} />
                  </td>
                </tr>
              )}
            />
          </WidgetCard>
        </div>

        <div className="2xl:col-span-5">
          <WidgetCard
            title="Student Enquiries"
            subtitle="Recent parent and student interest coming into the academy."
            action="Review"
            onAction={() => navigate("/academy/bookings")}
          >
            <TableShell
              loading={loading}
              columns={["User Email", "Course", "Sessions", "Status"]}
              rows={filteredEnquiries}
              emptyText={
                search ? "No matching enquiries found." : "No enquiries found."
              }
              renderRow={(row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="py-5 pr-4 text-sm text-slate-900">
                    {row.email}
                  </td>

                  <td className="py-5 pr-4 text-sm text-slate-700">
                    {row.courseName}
                  </td>

                  <td className="py-5 pr-4 text-sm font-semibold text-slate-900">
                    {row.sessions}
                  </td>

                  <td className="py-5 text-sm text-slate-700">
                    <StatusPill value={row.status} />
                  </td>
                </tr>
              )}
            />
          </WidgetCard>
        </div>
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-2">
        <WidgetCard
          title="Quick Actions"
          subtitle="Move quickly through key academy workflows."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              icon={BookOpen}
              title="Manage Courses"
              subtitle="Add or update academy programs"
              onClick={() => navigate("/academy/activities")}
              accent="blue"
            />
            <QuickAction
              icon={CalendarDays}
              title="View Bookings"
              subtitle="Track registrations and schedules"
              onClick={() => navigate("/academy/bookings")}
              accent="amber"
            />
            <QuickAction
              icon={Users}
              title="Student Enquiries"
              subtitle="Review new lead submissions"
              onClick={() => navigate("/academy/bookings")}
              accent="emerald"
            />
            <QuickAction
              icon={Settings}
              title="Academy Settings"
              subtitle="Update profile and preferences"
              onClick={() => navigate("/academy/settings")}
              accent="violet"
            />
          </div>
        </WidgetCard>

        <WidgetCard
          title="Academy Snapshot"
          subtitle="Quick overview of your current academy status."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  Total Courses
                </div>
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : stats.courses}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Live academy programs
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  Total Bookings
                </div>
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : stats.bookings}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Booking records collected
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  Categories
                </div>
                <Layers3 className="h-5 w-5 text-violet-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : stats.categories}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Activity group coverage
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  Visible Enquiries
                </div>
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : filteredEnquiries.length}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Current search result queue
              </div>
            </div>
          </div>
        </WidgetCard>
      </section>

      <section className="mt-6">
        <WidgetCard
          title="Recent Bookings"
          subtitle="Latest booking activity received by your academy."
          action="Open Bookings"
          onAction={() => navigate("/academy/bookings")}
        >
          <TableShell
            loading={loading}
            columns={["Parent / Email", "Course", "Created", "Status"]}
            rows={recentBookings}
            emptyText="No recent bookings available."
            renderRow={(row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="py-5 pr-4 text-sm font-semibold text-slate-900">
                  {row.email}
                </td>

                <td className="py-5 pr-4 text-sm text-slate-700">
                  {row.courseName}
                </td>

                <td className="py-5 pr-4 text-sm text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    {formatDateTime(row.createdAt)}
                  </span>
                </td>

                <td className="py-5 text-sm text-slate-700">
                  <StatusPill value={row.status} />
                </td>
              </tr>
            )}
          />
        </WidgetCard>
      </section>
    </div>
  );
}

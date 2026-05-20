// client/src/pages/superadmin/DashboardPage.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Baby,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Landmark,
  Newspaper,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";

const KIDGAGE_ORANGE = "rgb(255, 122, 61)";
const KIDGAGE_ORANGE_HOVER = "rgb(236, 105, 45)";

const BRAND = {
  primary: KIDGAGE_ORANGE,
  primaryHex: "#ff7a3d",
  secondary: "#ffd84d",
  sage: "#a8bb8d",
  dark: "#0f172a",
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatDate(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function normalizeAcademy(item) {
  return {
    id: item?._id || item?.id || "",
    name: item?.name || "Untitled Academy",
    city: item?.city || item?.location || "Doha",
    status: String(item?.status || "INACTIVE").toUpperCase(),
    activitiesCount: toNumber(
      item?.activitiesCount || item?.activityCount || 0,
    ),
    branchesCount: toNumber(item?.branchesCount || item?.branchCount || 0),
    createdAt: item?.createdAt || "",
    featured: Boolean(item?.featured || item?.isFeatured),
  };
}

function normalizeRegistration(item) {
  return {
    id: item?._id || item?.id || "",
    academyName: item?.academyName || item?.name || "Untitled Academy",
    city: item?.location || item?.city || "Doha",
    status: String(item?.status || "PENDING").toUpperCase(),
    createdAt: item?.createdAt || "",
    fullName: item?.fullName || item?.contactName || "-",
    email: item?.email || "-",
    phone: item?.phone || "",
  };
}

function normalizeDashboardSummary(data = {}) {
  const payload = data?.data || data?.summary || data || {};

  return {
    totalBookings: toNumber(
      payload.totalBookings || payload.bookingsCount || 0,
    ),
    totalParents: toNumber(payload.totalParents || payload.parentsCount || 0),
    totalChildren: toNumber(
      payload.totalChildren || payload.childrenCount || 0,
    ),
    totalPayments: toNumber(
      payload.totalPayments || payload.paymentsCount || 0,
    ),
    paidCollected: toNumber(
      payload.paidCollected || payload.totalCollected || 0,
    ),
    pendingPayments: toNumber(
      payload.pendingPayments || payload.pendingPaymentsCount || 0,
    ),
    readySettlementAmount: toNumber(payload.readySettlementAmount || 0),
    settlementsCount: toNumber(payload.settlementsCount || 0),
  };
}

function StatusBadge({ value }) {
  const normalized = String(value || "N/A").toUpperCase();

  const map = {
    APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CANCELED: "bg-red-50 text-red-700 ring-red-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",
    SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ring-1 ${
        map[normalized] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ text, icon: Icon = Sparkles }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}
function StatCard({ item }) {
  const Icon = item.icon;

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
        style={{ backgroundColor: item.glow }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {item.title}
          </p>

          <h3 className="mt-3 break-words text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
            {item.value}
          </h3>

          <p className="mt-2 break-words text-sm font-medium leading-5 text-slate-500">
            {item.sub}
          </p>
        </div>

        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: item.bg,
            color: item.color,
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function WidgetCard({
  title,
  subtitle,
  children,
  action,
  onAction,
  icon: Icon,
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-white to-orange-50/50 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[rgb(255,122,61)]">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}

            <div className="min-w-0">
              <h3 className="text-xl font-black tracking-tight text-slate-950">
                {title}
              </h3>

              {subtitle ? (
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {action ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              {action}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-5">{children}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
  tone = "orange",
}) {
  const tones = {
    orange: {
      bg: "bg-orange-50",
      text: "text-[rgb(255,122,61)]",
      ring: "group-hover:ring-orange-100",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "group-hover:ring-emerald-100",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "group-hover:ring-blue-100",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "group-hover:ring-amber-100",
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-600",
      ring: "group-hover:ring-violet-100",
    },
    slate: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      ring: "group-hover:ring-slate-100",
    },
  };

  const current = tones[tone] || tones.orange;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md hover:ring-4 ${current.ring}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${current.bg} ${current.text}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-950">
            {title}
          </div>
          <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {subtitle}
          </div>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
    </button>
  );
}

function MiniMetric({ label, value, helper, icon: Icon, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[rgb(255,122,61)]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-500">{label}</div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          <div className="mt-2 text-sm font-medium leading-5 text-slate-500">
            {helper}
          </div>
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

function DashboardInitialSkeleton() {
  return (
    <div className="space-y-6">
      <section className="h-64 animate-pulse rounded-[34px] bg-white" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[28px] bg-white"
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="h-96 animate-pulse rounded-[30px] bg-white xl:col-span-7" />
        <div className="h-96 animate-pulse rounded-[30px] bg-white xl:col-span-5" />
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [academies, setAcademies] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState(normalizeDashboardSummary());

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setAcademies([]);
        setRegistrations([]);
        setSummary(normalizeDashboardSummary());
      }

      setError("");

      const [academiesRes, registrationsRes, paymentSummaryRes] =
        await Promise.all([
          api.get("/super-admin/academies"),
          api.get("/super-admin/academy-registrations"),
          api
            .get("/super-admin/payments-dashboard")
            .catch(() => ({ data: {} })),
        ]);

      const academyRows = toArray(
        academiesRes?.data?.academies ||
          academiesRes?.data?.items ||
          academiesRes?.data?.data?.academies,
      ).map(normalizeAcademy);

      const registrationRows = toArray(
        registrationsRes?.data?.registrations ||
          registrationsRes?.data?.items ||
          registrationsRes?.data?.data?.registrations,
      ).map(normalizeRegistration);

      setAcademies(academyRows);
      setRegistrations(registrationRows);
      setSummary(normalizeDashboardSummary(paymentSummaryRes?.data || {}));
      setHasLoadedOnce(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load dashboard data.",
      );

      if (!silent) {
        setAcademies([]);
        setRegistrations([]);
        setSummary(normalizeDashboardSummary());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const academyStats = useMemo(() => {
    const total = academies.length;
    const active = academies.filter((item) => item.status === "ACTIVE").length;
    const suspended = academies.filter(
      (item) => item.status === "SUSPENDED",
    ).length;

    const totalPrograms = academies.reduce(
      (sum, item) => sum + Number(item.activitiesCount || 0),
      0,
    );

    const totalBranches = academies.reduce(
      (sum, item) => sum + Number(item.branchesCount || 0),
      0,
    );

    const featured = academies.filter((item) => item.featured).length;

    const pendingApprovals = registrations.filter(
      (item) => item.status === "PENDING",
    ).length;

    const approvedRequests = registrations.filter(
      (item) => item.status === "APPROVED",
    ).length;

    const rejectedRequests = registrations.filter(
      (item) => item.status === "REJECTED",
    ).length;

    const conversionRate =
      registrations.length > 0
        ? Math.round((approvedRequests / registrations.length) * 100)
        : 0;

    return {
      total,
      active,
      suspended,
      totalPrograms,
      totalBranches,
      featured,
      pendingApprovals,
      approvedRequests,
      rejectedRequests,
      conversionRate,
    };
  }, [academies, registrations]);

  const stats = useMemo(
    () => [
      {
        title: "Academies",
        value: academyStats.total,
        sub: `${academyStats.pendingApprovals} pending approval`,
        icon: Building2,
        color: "#2563eb",
        bg: "#eff6ff",
        glow: "rgba(37, 99, 235, 0.16)",
      },
      {
        title: "Live",
        value: academyStats.active,
        sub: "Approved and accessible",
        icon: CheckCircle2,
        color: "#059669",
        bg: "#ecfdf5",
        glow: "rgba(5, 150, 105, 0.16)",
      },
      {
        title: "Programs",
        value: academyStats.totalPrograms,
        sub: "Across all providers",
        icon: Activity,
        color: KIDGAGE_ORANGE,
        bg: "#fff7ed",
        glow: "rgba(255, 122, 61, 0.18)",
      },
      {
        title: "Bookings",
        value: summary.totalBookings,
        sub: "Total booking records",
        icon: CalendarDays,
        color: "#7c3aed",
        bg: "#f5f3ff",
        glow: "rgba(124, 58, 237, 0.16)",
      },
      {
        title: "Collected",
        value: money(summary.paidCollected),
        sub: "Confirmed paid volume",
        icon: Wallet,
        color: "#0f766e",
        bg: "#f0fdfa",
        glow: "rgba(15, 118, 110, 0.16)",
      },
      {
        title: "Settlements",
        value: summary.settlementsCount,
        sub: `${money(summary.readySettlementAmount)} ready`,
        icon: Landmark,
        color: "#ca8a04",
        bg: "#fefce8",
        glow: "rgba(202, 138, 4, 0.16)",
      },
    ],
    [academyStats, summary],
  );

  const recentAcademies = useMemo(() => {
    return [...academies]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [academies]);

  const recentRequests = useMemo(() => {
    return [...registrations]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [registrations]);

  const pendingRequests = useMemo(() => {
    return registrations
      .filter((item) => item.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [registrations]);

  const showInitialLoading = loading && !hasLoadedOnce;

  async function approveRequest(id) {
    if (!id) return;

    try {
      setActionLoadingId(`approve-${id}`);
      setError("");

      await api.patch(`/super-admin/academy-registrations/${id}/approve`);
      await loadDashboard({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function rejectRequest(id) {
    if (!id) return;

    const reason =
      window.prompt("Enter rejection reason. Leave empty if not needed.", "") ||
      "";

    try {
      setActionLoadingId(`reject-${id}`);
      setError("");

      await api.patch(`/super-admin/academy-registrations/${id}/reject`, {
        reason,
      });

      await loadDashboard({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject request.");
    } finally {
      setActionLoadingId("");
    }
  }

  if (showInitialLoading) {
    return <DashboardInitialSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-orange-100 bg-white shadow-sm">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-100/80 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-72 rounded-full bg-yellow-100/70 blur-3xl" />
        <div className="absolute left-10 top-10 hidden h-20 w-20 rounded-full border border-orange-100 lg:block" />

        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[rgb(255,122,61)] ring-1 ring-orange-100">
              <Sparkles className="h-3.5 w-3.5" />
              KidGage Control Center
            </div>

            <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              Manage KidGage operations from one place.
            </h1>

            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-500 sm:text-base">
              Track provider onboarding, platform operations, parent bookings,
              revenue, settlements, and content visibility across KidGage.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate("/super-admin/requests")}
                style={{
                  backgroundColor: KIDGAGE_ORANGE,
                  boxShadow: "0 14px 30px rgba(255, 122, 61, 0.28)",
                }}
                className="inline-flex items-center justify-center gap-3 rounded-[22px] px-8 py-4 text-base font-extrabold text-white transition hover:brightness-95"
              >
                Review Requests
                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/super-admin/payments")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Payment Center
                <CreditCard className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => loadDashboard({ silent: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-500">
                  Today&apos;s focus
                </div>
                <div className="mt-1 text-2xl font-black text-slate-950">
                  {academyStats.pendingApprovals} pending
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[rgb(255,122,61)]">
                <ShieldCheck className="h-7 w-7" />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600">
                    Active academies
                  </span>
                  <span className="text-lg font-black text-slate-950">
                    {academyStats.active}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600">
                    Approved requests
                  </span>
                  <span className="text-lg font-black text-slate-950">
                    {academyStats.approvedRequests}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-600">
                    Onboarding conversion
                  </span>
                  <span className="text-lg font-black text-slate-950">
                    {academyStats.conversionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <WidgetCard
            icon={FileText}
            title="Pending Approval Requests"
            subtitle="New academy provider submissions waiting for super admin review."
            action="Manage"
            onAction={() => navigate("/super-admin/requests")}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-slate-950">
                            {row.academyName}
                          </div>
                          <StatusBadge value={row.status} />
                        </div>

                        <div className="mt-2 text-sm font-medium text-slate-500">
                          {row.city} • Submitted {formatDate(row.createdAt)}
                        </div>

                        <div className="mt-2 text-sm font-semibold text-slate-600">
                          {row.fullName} • {row.email}
                        </div>

                        {row.phone ? (
                          <div className="mt-1 text-xs font-medium text-slate-500">
                            {row.phone}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => approveRequest(row.id)}
                          disabled={actionLoadingId === `approve-${row.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {actionLoadingId === `approve-${row.id}`
                            ? "Approving..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectRequest(row.id)}
                          disabled={actionLoadingId === `reject-${row.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" />
                          {actionLoadingId === `reject-${row.id}`
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                text="No pending approval requests right now."
              />
            )}
          </WidgetCard>
        </div>

        <div className="xl:col-span-5">
          <WidgetCard
            icon={Clock3}
            title="Recent Provider Registrations"
            subtitle="Latest academy onboarding forms received."
            action="View all"
            onAction={() => navigate("/super-admin/requests")}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : recentRequests.length > 0 ? (
              <div className="space-y-3">
                {recentRequests.map((academy) => (
                  <button
                    key={academy.id}
                    type="button"
                    onClick={() => navigate("/super-admin/requests")}
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">
                        {academy.academyName}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-500">
                        {academy.city} • {formatDate(academy.createdAt)}
                      </div>
                    </div>

                    <StatusBadge value={academy.status} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState text="No recent registrations found." />
            )}
          </WidgetCard>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <WidgetCard
            icon={Building2}
            title="Recently Added Academies"
            subtitle="Newest academies currently available on KidGage."
            action="Manage"
            onAction={() => navigate("/super-admin/academies")}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : recentAcademies.length > 0 ? (
              <div className="space-y-3">
                {recentAcademies.map((academy) => (
                  <button
                    key={academy.id}
                    type="button"
                    onClick={() =>
                      navigate(`/super-admin/academies/${academy.id}`)
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">
                        {academy.name}
                      </div>
                      <div className="mt-1 truncate text-sm font-medium text-slate-500">
                        {academy.city} • {formatDate(academy.createdAt)}
                      </div>
                    </div>

                    <StatusBadge value={academy.status} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState text="No academies available yet." />
            )}
          </WidgetCard>
        </div>

        <div className="xl:col-span-7">
          <WidgetCard
            icon={BarChart3}
            title="Approval Workflow Summary"
            subtitle="Current provider registration breakdown."
            action="Open requests"
            onAction={() => navigate("/super-admin/requests")}
          >
            {loading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <MiniMetric
                  label="Pending"
                  value={academyStats.pendingApprovals}
                  helper="Waiting for review"
                  icon={Clock3}
                  tone="amber"
                />

                <MiniMetric
                  label="Approved"
                  value={academyStats.approvedRequests}
                  helper="Converted to academy accounts"
                  icon={CheckCircle2}
                  tone="emerald"
                />

                <MiniMetric
                  label="Rejected"
                  value={academyStats.rejectedRequests}
                  helper="Declined submissions"
                  icon={XCircle}
                  tone="red"
                />
              </div>
            )}
          </WidgetCard>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard
          icon={Sparkles}
          title="Quick Actions"
          subtitle="Jump straight into high-priority KidGage admin workflows."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction
              icon={Building2}
              title="Manage Academies"
              subtitle="Edit academy info, logo, status"
              onClick={() => navigate("/super-admin/academies")}
              tone="blue"
            />

            <QuickAction
              icon={FileText}
              title="Review Requests"
              subtitle="Approve or reject providers"
              onClick={() => navigate("/super-admin/requests")}
              tone="amber"
            />

            <QuickAction
              icon={CalendarDays}
              title="Bookings"
              subtitle="Monitor parent bookings"
              onClick={() => navigate("/super-admin/bookings")}
              tone="orange"
            />

            <QuickAction
              icon={CreditCard}
              title="Payments"
              subtitle="KidGage central payments"
              onClick={() => navigate("/super-admin/payments")}
              tone="emerald"
            />

            <QuickAction
              icon={Landmark}
              title="Settlements"
              subtitle="Academy payout tracking"
              onClick={() => navigate("/super-admin/settlements")}
              tone="violet"
            />

            <QuickAction
              icon={Settings}
              title="Platform Settings"
              subtitle="Branding, logo, colors"
              onClick={() => navigate("/super-admin/settings")}
              tone="slate"
            />

            <QuickAction
              icon={ImageIcon}
              title="Homepage Banners"
              subtitle="Campaigns and promotions"
              onClick={() => navigate("/super-admin/banners")}
              tone="violet"
            />

            <QuickAction
              icon={Newspaper}
              title="News & Blogs"
              subtitle="Manage public content"
              onClick={() => navigate("/super-admin/blogs")}
              tone="emerald"
            />

            <QuickAction
              icon={Tags}
              title="Categories"
              subtitle="Top activities and labels"
              onClick={() => navigate("/super-admin/categories")}
              tone="blue"
            />

            <QuickAction
              icon={Users}
              title="Parents"
              subtitle="View parent accounts"
              onClick={() => navigate("/super-admin/parents")}
              tone="orange"
            />
          </div>
        </WidgetCard>

        <WidgetCard
          icon={Banknote}
          title="Platform Snapshot"
          subtitle="High-level operational metrics for KidGage."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniMetric
              label="Featured Academies"
              value={academyStats.featured}
              helper="Highlighted on website"
              icon={Sparkles}
              tone="orange"
            />

            <MiniMetric
              label="Total Branches"
              value={academyStats.totalBranches}
              helper="Across registered academies"
              icon={Building2}
              tone="blue"
            />

            <MiniMetric
              label="Parents"
              value={summary.totalParents}
              helper="Registered parent accounts"
              icon={Users}
              tone="emerald"
            />

            <MiniMetric
              label="Children"
              value={summary.totalChildren}
              helper="Child profiles created"
              icon={Baby}
              tone="violet"
            />

            <MiniMetric
              label="Pending Payments"
              value={summary.pendingPayments}
              helper="Awaiting payment confirmation"
              icon={Clock3}
              tone="amber"
            />

            <MiniMetric
              label="Suspended Academies"
              value={academyStats.suspended}
              helper="Require admin review"
              icon={ShieldCheck}
              tone="red"
            />
          </div>
        </WidgetCard>
      </section>
    </div>
  );
}

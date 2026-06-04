// client/src/pages/superadmin/ActivityApprovalsPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { usePublicSettings } from "../../context/PublicSettingsProvider.jsx";

const FALLBACK_THEME = {
  siteName: "KidGage",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
  lightPrimaryColor: "#ec7a3b",
  lightSecondaryColor: "#ffd84d",
  darkPrimaryColor: "#ec7a3b",
  darkSecondaryColor: "#ffd84d",
};

const STATUS_META = {
  PENDING_APPROVAL: {
    label: "Pending Approval",
    shortLabel: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock3,
  },
  APPROVED: {
    label: "Approved",
    shortLabel: "Approved",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    shortLabel: "Rejected",
    className: "bg-red-50 text-red-700 ring-red-200",
    icon: XCircle,
  },
};

function hexToRgba(hex, opacity = 1) {
  const value = String(hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(236, 122, 59, ${opacity})`;
  }

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getTheme(settings = {}) {
  const safeSettings = settings || {};

  const primaryColor =
    safeSettings.lightPrimaryColor ||
    safeSettings.primaryColor ||
    safeSettings.brandColor ||
    FALLBACK_THEME.primaryColor;

  const secondaryColor =
    safeSettings.lightSecondaryColor ||
    safeSettings.secondaryColor ||
    safeSettings.accentColor ||
    FALLBACK_THEME.secondaryColor;

  const siteName = safeSettings.siteName || FALLBACK_THEME.siteName;

  return {
    siteName,
    primaryColor,
    secondaryColor,
    primarySoft: hexToRgba(primaryColor, 0.12),
    primaryMedium: hexToRgba(primaryColor, 0.22),
    primaryStrong: hexToRgba(primaryColor, 0.92),
    secondarySoft: hexToRgba(secondaryColor, 0.2),
    secondaryStrong: hexToRgba(secondaryColor, 0.9),
  };
}

function getAssetBase() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "").trim();
  if (!apiBase) return "";
  return apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function normalizeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  const base = getAssetBase();

  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  if (raw.startsWith("/")) return `${base}${raw}`;

  return `${base}/${raw}`;
}

function money(value, currency = "QAR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "QAR",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${
      currency || "QAR"
    }`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityImage(activity) {
  return (
    activity?.image ||
    activity?.coverImage ||
    activity?.bannerImage ||
    activity?.images?.[0] ||
    ""
  );
}

function getAcademy(activity) {
  return activity?.academyId || activity?.academy || {};
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING_APPROVAL;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${meta.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, active, theme }) {
  return (
    <div
      className="relative overflow-hidden rounded-[26px] border bg-white p-5 shadow-sm"
      style={{
        borderColor: active ? theme.primaryMedium : "rgba(226,232,240,1)",
      }}
    >
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full"
        style={{
          background: active ? theme.primarySoft : "rgba(248,250,252,1)",
        }}
      />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-3xl font-black text-slate-950">
            {value}
          </div>
        </div>

        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: active ? theme.primarySoft : "rgba(241,245,249,1)",
            color: active ? theme.primaryColor : "rgb(100,116,139)",
          }}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ status, theme }) {
  const label =
    status === "ALL"
      ? "approval"
      : String(status || "")
          .toLowerCase()
          .replace("_", " ")
          .replace("_", " ");

  return (
    <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
        style={{
          background: theme.primarySoft,
          color: theme.primaryColor,
        }}
      >
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-950">
        No {label} requests found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Activity approval requests from academies will appear here when they
        submit or update courses.
      </p>
    </div>
  );
}

export default function ActivityApprovalsPage() {
  const publicSettingsContext = usePublicSettings?.() || {};
  const settings =
    publicSettingsContext?.settings ||
    publicSettingsContext?.publicSettings ||
    publicSettingsContext ||
    {};

  const theme = useMemo(() => getTheme(settings), [settings]);

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadApprovals() {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (status && status !== "ALL") params.status = status;

      const { data } = await api.get("/super-admin/activity-approvals", {
        params,
      });

      const nextRows = Array.isArray(data?.activities)
        ? data.activities
        : Array.isArray(data?.requests)
          ? data.requests
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setRows(nextRows);
    } catch (err) {
      setRows([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load activity approvals",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((activity) => {
      const academy = getAcademy(activity);

      return [
        activity?.title,
        activity?.name,
        activity?.categoryName,
        activity?.category,
        academy?.name,
        academy?.email,
        activity?.city,
        activity?.currency,
        activity?.approvalStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query]);

  const counts = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter(
      (item) => item?.approvalStatus === "PENDING_APPROVAL",
    ).length;
    const approved = rows.filter(
      (item) => item?.approvalStatus === "APPROVED",
    ).length;
    const rejected = rows.filter(
      (item) => item?.approvalStatus === "REJECTED",
    ).length;

    return { total, pending, approved, rejected };
  }, [rows]);

  async function approveActivity(activity) {
    const id = activity?._id || activity?.id;
    if (!id) return;

    try {
      setActionLoadingId(id);
      setError("");
      setSuccess("");

      const { data } = await api.patch(
        `/super-admin/activity-approvals/${id}/approve`,
      );

      setSuccess(data?.message || "Activity approved successfully");
      await loadApprovals();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to approve activity",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function rejectActivity(activity) {
    const id = activity?._id || activity?.id;
    if (!id) return;

    const reason = window.prompt(
      "Reason for rejection. This will be visible to the academy.",
      activity?.rejectionReason || "",
    );

    if (reason === null) return;

    try {
      setActionLoadingId(id);
      setError("");
      setSuccess("");

      const { data } = await api.patch(
        `/super-admin/activity-approvals/${id}/reject`,
        {
          reason: String(reason || "").trim(),
        },
      );

      setSuccess(data?.message || "Activity rejected successfully");
      await loadApprovals();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to reject activity",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <div
      className="min-h-screen space-y-6 rounded-[28px] p-0 sm:p-1"
      style={{
        "--kg-primary": theme.primaryColor,
        "--kg-secondary": theme.secondaryColor,
      }}
    >
      <section
        className="relative overflow-hidden rounded-[34px] border bg-white shadow-sm"
        style={{
          borderColor: theme.primaryMedium,
          background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${hexToRgba(
            theme.primaryColor,
            0.92,
          )} 42%, ${hexToRgba(theme.secondaryColor, 0.96)} 100%)`,
        }}
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/20 blur-2xl" />

        <div className="relative p-6 sm:p-8 lg:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white ring-1 ring-white/30 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {theme.siteName} Super Admin
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Activity Approvals
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/85 sm:text-base">
                Review academy-submitted courses before they become visible to
                parents and public booking pages.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <button
                type="button"
                onClick={loadApprovals}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Loaded"
          value={counts.total}
          icon={Layers3}
          active
          theme={theme}
        />
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon={Clock3}
          active={status === "PENDING_APPROVAL"}
          theme={theme}
        />
        <MetricCard
          label="Approved"
          value={counts.approved}
          icon={CheckCircle2}
          active={status === "APPROVED"}
          theme={theme}
        />
        <MetricCard
          label="Rejected"
          value={counts.rejected}
          icon={XCircle}
          active={status === "REJECTED"}
          theme={theme}
        />
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["PENDING_APPROVAL", "Pending"],
              ["APPROVED", "Approved"],
              ["REJECTED", "Rejected"],
              ["ALL", "All"],
            ].map(([value, label]) => {
              const active = status === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className="rounded-2xl px-4 py-2.5 text-sm font-black transition hover:-translate-y-0.5"
                  style={{
                    background: active ? theme.primaryColor : theme.primarySoft,
                    color: active ? "#ffffff" : theme.primaryColor,
                    boxShadow: active
                      ? `0 14px 30px ${hexToRgba(theme.primaryColor, 0.24)}`
                      : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div
            className="flex min-w-0 items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 xl:w-[420px]"
            style={{
              borderColor: theme.primaryMedium,
            }}
          >
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search activity, academy, category..."
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-[30px] border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState status={status} theme={theme} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredRows.map((activity) => {
            const id = activity?._id || activity?.id;
            const academy = getAcademy(activity);
            const image = normalizeImage(getActivityImage(activity));
            const isBusy = actionLoadingId === id;
            const isPending = activity?.approvalStatus === "PENDING_APPROVAL";
            const activityTitle =
              activity?.title || activity?.name || "Untitled Activity";

            return (
              <article
                key={id}
                className="group overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="relative h-56 overflow-hidden bg-slate-100 md:h-auto md:w-56 md:shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt={activityTitle}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primarySoft}, ${theme.secondarySoft})`,
                          color: theme.primaryColor,
                        }}
                      >
                        <GraduationCap className="h-12 w-12" />
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      <StatusBadge status={activity?.approvalStatus} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black"
                        style={{
                          background: theme.secondarySoft,
                          color: "#7c4a03",
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {activity?.status || "PUBLISHED"}
                      </span>

                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Review Card
                      </span>
                    </div>

                    <h2 className="mt-4 line-clamp-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                      {activityTitle}
                    </h2>

                    <div className="mt-4 grid gap-2.5 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-bold">
                          {academy?.name || "Academy"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-bold">
                          {activity?.categoryName ||
                            activity?.category ||
                            "Uncategorized"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-bold">
                          {money(
                            activity?.price || activity?.basePrice,
                            activity?.currency || "QAR",
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-bold">
                          Requested {formatDate(activity?.approvalRequestedAt)}
                        </span>
                      </div>
                    </div>

                    {activity?.rejectionReason ? (
                      <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                        Rejection reason: {activity.rejectionReason}
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={isBusy || !isPending}
                        onClick={() => approveActivity(activity)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isBusy ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !isPending}
                        onClick={() => rejectActivity(activity)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {isBusy ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </button>
                    </div>

                    {!isPending ? (
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-black text-slate-500">
                        <Eye className="h-4 w-4" />
                        Action disabled because this activity is already{" "}
                        {STATUS_META[activity?.approvalStatus]?.shortLabel ||
                          "reviewed"}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
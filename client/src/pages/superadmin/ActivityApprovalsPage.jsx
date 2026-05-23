// client/src/pages/superadmin/ActivityApprovalsPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  XCircle,
  Building2,
  Tag,
  Banknote,
  CalendarDays,
  Eye,
} from "lucide-react";
import { api } from "../../lib/api.js";

const STATUS_META = {
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Clock3,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 ring-red-200",
    icon: XCircle,
  },
};

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
    return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ${currency || "QAR"}`;
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

function EmptyState({ status }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-950">
        No {status === "ALL" ? "" : status.toLowerCase().replace("_", " ")} requests found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Activity approval requests from academies will appear here when they submit or update courses.
      </p>
    </div>
  );
}

export default function ActivityApprovalsPage() {
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-xl">
        <div className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.28),transparent_35%)]" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
                <Clock3 className="h-4 w-4" />
                Super Admin Review
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Activity Approvals
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Review academy-submitted courses before they become visible to parents and public booking pages.
              </p>
            </div>

            <button
              type="button"
              onClick={loadApprovals}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Loaded", counts.total],
          ["Pending", counts.pending],
          ["Approved", counts.approved],
          ["Rejected", counts.rejected],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {label}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                  className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:w-[380px]">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              placeholder="Search activity, academy, category..."
            />
          </div>
        </div>
      </div>

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
              className="h-64 animate-pulse rounded-[28px] bg-white shadow-sm"
            />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState status={status} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRows.map((activity) => {
            const id = activity?._id || activity?.id;
            const academy = getAcademy(activity);
            const image = normalizeImage(getActivityImage(activity));
            const isBusy = actionLoadingId === id;
            const isPending = activity?.approvalStatus === "PENDING_APPROVAL";

            return (
              <article
                key={id}
                className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="h-48 bg-slate-100 sm:h-auto sm:w-52 sm:shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt={activity?.title || "Activity"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Eye className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <StatusBadge status={activity?.approvalStatus} />

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        {activity?.status || "PUBLISHED"}
                      </span>
                    </div>

                    <h2 className="mt-4 line-clamp-2 text-xl font-black text-slate-950">
                      {activity?.title || activity?.name || "Untitled Activity"}
                    </h2>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {academy?.name || "Academy"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {activity?.categoryName ||
                            activity?.category ||
                            "Uncategorized"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {money(
                            activity?.price || activity?.basePrice,
                            activity?.currency || "QAR",
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          Requested {formatDate(activity?.approvalRequestedAt)}
                        </span>
                      </div>
                    </div>

                    {activity?.rejectionReason ? (
                      <div className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                        Rejection reason: {activity.rejectionReason}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={isBusy || !isPending}
                        onClick={() => approveActivity(activity)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || !isPending}
                        onClick={() => rejectActivity(activity)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

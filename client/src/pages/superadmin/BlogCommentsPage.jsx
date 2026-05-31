import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SPAM"];

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  SPAM: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_ICONS = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  SPAM: ShieldAlert,
};

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBlogSlug(comment) {
  return (
    comment?.blogSlug ||
    comment?.blogId?.slug ||
    comment?.blogId?._id ||
    comment?.blogId ||
    ""
  );
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${
        STATUS_STYLES[status] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}

function StatCard({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-[#ec7a3b] bg-orange-50"
          : "border-slate-200 bg-white hover:border-orange-200"
      }`}
    >
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-[#0f172a]">{value}</div>
    </button>
  );
}

export default function BlogCommentsPage() {
  const [comments, setComments] = useState([]);
  const [counts, setCounts] = useState({
    ALL: 0,
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SPAM: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  async function loadComments(pageValue = pagination.page) {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: pageValue,
        limit: pagination.limit,
      };

      if (status !== "ALL") {
        params.status = status;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const res = await api.get("/super-admin/blog-comments", { params });

      setComments(Array.isArray(res?.data?.comments) ? res.data.comments : []);
      setCounts(res?.data?.counts || {});
      setPagination(
        res?.data?.pagination || {
          page: pageValue,
          limit: 20,
          total: 0,
          pages: 1,
        },
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load blog comments. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, debouncedSearch]);

  async function updateStatus(commentId, nextStatus) {
    try {
      setActionLoadingId(commentId);
      setError("");

      await api.patch(`/super-admin/blog-comments/${commentId}/status`, {
        status: nextStatus,
      });

      await loadComments(pagination.page);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to update comment status. Please try again.",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  async function deleteComment(commentId) {
    const confirmed = window.confirm(
      "Delete this comment permanently? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(commentId);
      setError("");

      await api.delete(`/super-admin/blog-comments/${commentId}`);

      await loadComments(pagination.page);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to delete comment. Please try again.",
      );
    } finally {
      setActionLoadingId("");
    }
  }

  const pageInfo = useMemo(() => {
    const total = Number(pagination.total || 0);
    const page = Number(pagination.page || 1);
    const limit = Number(pagination.limit || 20);

    if (!total) return "No comments found";

    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return `Showing ${from} - ${to} of ${total}`;
  }, [pagination]);

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#ec7a3b] via-[#f97316] to-[#ffd84d] p-6 text-white shadow-[0_24px_70px_rgba(236,122,59,0.25)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur">
                <MessageCircle size={18} />
                Blog Comment Center
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Blog Comments
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/90 sm:text-base">
                Read, review, approve, reject, mark spam, or delete comments
                submitted from public blog detail pages.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadComments(pagination.page)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#ec7a3b] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_OPTIONS.map((item) => (
            <StatCard
              key={item}
              label={item === "ALL" ? "Total Comments" : item}
              value={counts?.[item] || 0}
              active={status === item}
              onClick={() => setStatus(item)}
            />
          ))}
        </div>

        <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, blog, message..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#ec7a3b] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    status === item
                      ? "bg-[#ec7a3b] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-[#ec7a3b]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-[#0f172a]">
                All Submitted Comments
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {pageInfo}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-3xl bg-slate-100"
                />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#ec7a3b]">
                <MessageCircle size={34} />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#0f172a]">
                No comments found
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Comments submitted from blog detail pages will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {comments.map((comment) => {
                const blogSlug = getBlogSlug(comment);
                const isBusy = actionLoadingId === comment._id;

                return (
                  <div
                    key={comment._id}
                    className="grid gap-5 p-5 transition hover:bg-slate-50/70 xl:grid-cols-[1fr_260px]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={comment.status} />

                        {Number(comment.rating || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-700">
                            <Star size={14} fill="currentColor" />
                            {comment.rating}/5
                          </span>
                        ) : null}

                        <span className="text-xs font-bold text-slate-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-lg font-black text-[#0f172a]">
                          {safeText(comment.name)}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {safeText(comment.email)}
                        </p>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-7 text-slate-700">
                        {safeText(comment.message)}
                      </div>

                      <div className="mt-4 rounded-2xl bg-orange-50 p-4">
                        <div className="text-xs font-black uppercase tracking-wide text-[#ec7a3b]">
                          Blog
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm font-black text-[#0f172a]">
                          {safeText(
                            comment.blogTitle || comment.blogId?.title,
                            "Untitled Blog",
                          )}
                        </div>

                        {blogSlug ? (
                          <Link
                            to={`/blogs/${blogSlug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#ec7a3b] hover:underline"
                          >
                            <Eye size={15} />
                            View Blog
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 xl:items-stretch xl:justify-center">
                      <button
                        type="button"
                        disabled={isBusy || comment.status === "APPROVED"}
                        onClick={() => updateStatus(comment._id, "APPROVED")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 size={17} />
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || comment.status === "REJECTED"}
                        onClick={() => updateStatus(comment._id, "REJECTED")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle size={17} />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={isBusy || comment.status === "SPAM"}
                        onClick={() => updateStatus(comment._id, "SPAM")}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldAlert size={17} />
                        Spam
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => deleteComment(comment._id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination.pages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => loadComments(pagination.page - 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => loadComments(pagination.page + 1)}
                  className="rounded-xl bg-[#ec7a3b] px-4 py-2 text-sm font-black text-white transition hover:bg-[#d9682f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
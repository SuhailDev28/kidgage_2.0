// client/src/pages/shared/NotificationsPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  Inbox,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";

const KIDGAGE_PRIMARY = "#ec7a3b";
const KIDGAGE_SECONDARY = "#ffd84d";
const SUPER_ADMIN_PRIMARY = "#2563eb";

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Read", value: "READ" },
];

const CATEGORY_OPTIONS = [
  { label: "All Categories", value: "ALL" },
  { label: "System", value: "SYSTEM" },
  { label: "Booking", value: "BOOKING" },
  { label: "Payment", value: "PAYMENT" },
  { label: "Registration", value: "REGISTRATION" },
  { label: "Academy", value: "ACADEMY" },
  { label: "Activity", value: "ACTIVITY" },
  { label: "Event", value: "EVENT" },
  { label: "Blog", value: "BLOG" },
  { label: "Content", value: "CONTENT" },
  { label: "Settlement", value: "SETTLEMENT" },
  { label: "Approval", value: "APPROVAL" },
  { label: "Message", value: "MESSAGE" },
];

const PRIORITY_OPTIONS = [
  { label: "All Priority", value: "ALL" },
  { label: "Low", value: "LOW" },
  { label: "Normal", value: "NORMAL" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

function normalizeUpper(value = "", fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();

  return text || fallback;
}

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }

  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  return { r: 236, g: 122, b: 59 };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRoleFromPath(pathname = "") {
  if (pathname.startsWith("/super-admin")) {
    return {
      label: "Super Admin",
      eyebrow: "Platform Control",
      homeUrl: "/super-admin/dashboard",
      notificationsUrl: "/super-admin/notifications",
      primaryColor: SUPER_ADMIN_PRIMARY,
      secondaryColor: "#7c3aed",
    };
  }

  if (pathname.startsWith("/academy")) {
    return {
      label: "Academy",
      eyebrow: "Academy Updates",
      homeUrl: "/academy/dashboard",
      notificationsUrl: "/academy/notifications",
      primaryColor: KIDGAGE_PRIMARY,
      secondaryColor: KIDGAGE_SECONDARY,
    };
  }

  if (pathname.startsWith("/parent")) {
    return {
      label: "Parent",
      eyebrow: "Parent Updates",
      homeUrl: "/parent/dashboard",
      notificationsUrl: "/parent/notifications",
      primaryColor: KIDGAGE_PRIMARY,
      secondaryColor: KIDGAGE_SECONDARY,
    };
  }

  return {
    label: "User",
    eyebrow: "KidGage Updates",
    homeUrl: "/",
    notificationsUrl: "/notifications",
    primaryColor: KIDGAGE_PRIMARY,
    secondaryColor: KIDGAGE_SECONDARY,
  };
}

function getCategoryIcon(category = "") {
  const value = normalizeUpper(category, "SYSTEM");

  const icons = {
    SYSTEM: "⚙️",
    BOOKING: "🎟️",
    PAYMENT: "💳",
    REGISTRATION: "📝",
    ACADEMY: "🏫",
    ACTIVITY: "🎯",
    EVENT: "🎈",
    BLOG: "📰",
    CONTENT: "📄",
    SETTLEMENT: "🏦",
    APPROVAL: "✅",
    MESSAGE: "💬",
  };

  return icons[value] || "🔔";
}

function getNotificationColor(category = "", priority = "") {
  const p = normalizeUpper(priority);
  const c = normalizeUpper(category);

  if (p === "URGENT") return "#dc2626";
  if (p === "HIGH") return "#ef4444";
  if (c === "BOOKING") return "#2563eb";
  if (c === "PAYMENT") return "#16a34a";
  if (c === "APPROVAL") return "#9333ea";
  if (c === "SETTLEMENT") return "#0f766e";
  if (c === "REGISTRATION") return "#ec7a3b";
  if (c === "ACADEMY") return "#7c3aed";
  if (c === "ACTIVITY") return "#0891b2";
  if (c === "EVENT") return "#db2777";
  if (c === "BLOG" || c === "CONTENT") return "#ca8a04";
  if (c === "MESSAGE") return "#0284c7";
  if (c === "SYSTEM") return "#475569";

  return "#64748b";
}

function getPriorityClass(priority = "") {
  const value = normalizeUpper(priority, "NORMAL");

  if (value === "URGENT") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (value === "HIGH") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  if (value === "LOW") {
    return "bg-slate-50 text-slate-500 ring-slate-100";
  }

  return "bg-sky-50 text-sky-700 ring-sky-100";
}

function formatDateTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function EmptyState({ status, onReset, primaryColor }) {
  const label =
    status === "UNREAD"
      ? "No unread notifications"
      : status === "READ"
        ? "No read notifications"
        : "No notifications yet";

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-dashed border-orange-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-orange-100/70" />
      <div className="absolute -right-10 bottom-8 h-28 w-28 rounded-full bg-yellow-100/80" />
      <div className="absolute left-12 bottom-12 text-3xl opacity-30">🎈</div>
      <div className="absolute right-14 top-12 text-3xl opacity-30">⭐</div>

      <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-orange-50 text-[#ec7a3b] ring-8 ring-orange-100/60">
        <Inbox className="h-9 w-9" />
      </div>

      <h3 className="relative mt-6 text-xl font-black text-slate-950">
        {label}
      </h3>

      <p className="relative mx-auto mt-3 max-w-md text-sm font-medium leading-7 text-slate-500">
        Booking updates, payment alerts, approval requests, academy messages,
        and KidGage system updates will appear here.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="relative mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ backgroundColor: primaryColor }}
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </button>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 h-10 w-full animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function NotificationCard({
  item,
  primaryColor,
  actionLoading,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onOpen,
}) {
  const id = item?._id || item?.id;
  const category = normalizeUpper(item?.category, "SYSTEM");
  const priority = normalizeUpper(item?.priority, "NORMAL");
  const type = normalizeUpper(item?.type);
  const source = normalizeUpper(item?.source);
  const color = getNotificationColor(category, priority);
  const isRead = Boolean(item?.isRead);

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-[30px] border bg-white p-5 shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
        isRead ? "border-slate-100" : "border-orange-200",
      ].join(" ")}
    >
      {!isRead ? (
        <div
          className="absolute inset-y-6 left-0 w-1.5 rounded-r-full"
          style={{ backgroundColor: primaryColor }}
        />
      ) : null}

      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-50 transition group-hover:bg-orange-50" />

      <div className="relative flex gap-4">
        <div
          className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] text-2xl shadow-sm ring-4 ring-white"
          style={{
            backgroundColor: rgba(color, 0.12),
            color,
          }}
        >
          <span>{getCategoryIcon(category)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide"
              style={{
                backgroundColor: rgba(color, 0.1),
                color,
              }}
            >
              {category}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${getPriorityClass(
                priority,
              )}`}
            >
              {priority}
            </span>

            {!isRead ? (
              <span
                className="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                New
              </span>
            ) : (
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-400 ring-1 ring-slate-100">
                Read
              </span>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 sm:text-lg">
                {item?.title || "Notification"}
              </h3>

              <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-600">
                {item?.message || "You have a new KidGage update."}
              </p>
            </div>

            {!isRead ? (
              <span
                className="mt-2 h-3 w-3 shrink-0 rounded-full ring-4"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 0 0 4px ${rgba(primaryColor, 0.12)}`,
                }}
              />
            ) : null}
          </div>

          {(type || source) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {type ? (
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-100">
                  {type}
                </span>
              ) : null}

              {source ? (
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-100">
                  {source}
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatRelativeTime(item?.createdAt)}
              </span>

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <span>{formatDateTime(item?.createdAt)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {item?.actionUrl ? (
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {isRead ? (
                <button
                  type="button"
                  onClick={() => onMarkUnread(id)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Mark unread
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onMarkRead(id)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark read
                </button>
              )}

              <button
                type="button"
                onClick={() => onDelete(id)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const roleInfo = useMemo(
    () => getRoleFromPath(location.pathname),
    [location.pathname],
  );

  const primaryColor = roleInfo.primaryColor;

  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({
        ...prev,
        page: 1,
      }));
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  async function loadNotifications(nextPage = pagination.page) {
    try {
      setLoading(true);
      setError("");

      const data = await api.notifications({
        page: nextPage,
        limit: pagination.limit,
        status,
        category,
        priority,
        search,
      });

      const rows = Array.isArray(data?.notifications)
        ? data.notifications
        : Array.isArray(data?.items)
          ? data.items
          : [];

      const nextStats = {
        total: Number(data?.stats?.total || 0),
        unread: Number(data?.stats?.unread || data?.unreadCount || 0),
        read: Number(data?.stats?.read || 0),
      };

      setNotifications(rows);
      setUnreadCount(Number(data?.unreadCount || nextStats.unread || 0));
      setStats(nextStats);

      setPagination({
        page: Number(data?.pagination?.page || data?.page || nextPage || 1),
        limit: Number(
          data?.pagination?.limit || data?.limit || pagination.limit || 12,
        ),
        total: Number(
          data?.pagination?.total || data?.total || rows.length || 0,
        ),
        pages: Number(data?.pagination?.pages || data?.pages || 1),
      });
    } catch (err) {
      setError(
        err?.message || "Failed to load notifications. Please try again.",
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, priority, search]);

  async function refreshCurrentPage() {
    await loadNotifications(pagination.page);
  }

  async function markRead(id) {
    if (!id) return;

    try {
      setActionLoading(true);
      setError("");

      const data = await api.markNotificationRead(id);

      setNotifications((prev) =>
        prev.map((item) =>
          String(item?._id || item?.id) === String(id)
            ? {
                ...item,
                isRead: true,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
        setStats((prev) => ({
          ...prev,
          unread: data.unreadCount,
          read: Math.max(
            Number(prev.total || 0) - Number(data.unreadCount || 0),
            0,
          ),
        }));
      } else {
        setUnreadCount((prev) => Math.max(Number(prev || 0) - 1, 0));
        setStats((prev) => ({
          ...prev,
          unread: Math.max(Number(prev.unread || 0) - 1, 0),
          read: Number(prev.read || 0) + 1,
        }));
      }

      if (status === "UNREAD") {
        setNotifications((prev) =>
          prev.filter((item) => String(item?._id || item?.id) !== String(id)),
        );

        setPagination((prev) => ({
          ...prev,
          total: Math.max(Number(prev.total || 0) - 1, 0),
        }));
      }
    } catch (err) {
      setError(err?.message || "Failed to mark notification as read.");
    } finally {
      setActionLoading(false);
    }
  }

  async function markUnread(id) {
    if (!id) return;

    try {
      setActionLoading(true);
      setError("");

      const data = await api.markNotificationUnread(id);

      setNotifications((prev) =>
        prev.map((item) =>
          String(item?._id || item?.id) === String(id)
            ? {
                ...item,
                isRead: false,
                readAt: null,
              }
            : item,
        ),
      );

      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
        setStats((prev) => ({
          ...prev,
          unread: data.unreadCount,
          read: Math.max(
            Number(prev.total || 0) - Number(data.unreadCount || 0),
            0,
          ),
        }));
      } else {
        setUnreadCount((prev) => Number(prev || 0) + 1);
        setStats((prev) => ({
          ...prev,
          unread: Number(prev.unread || 0) + 1,
          read: Math.max(Number(prev.read || 0) - 1, 0),
        }));
      }

      if (status === "READ") {
        setNotifications((prev) =>
          prev.filter((item) => String(item?._id || item?.id) !== String(id)),
        );

        setPagination((prev) => ({
          ...prev,
          total: Math.max(Number(prev.total || 0) - 1, 0),
        }));
      }
    } catch (err) {
      setError(err?.message || "Failed to mark notification as unread.");
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllRead() {
    try {
      setActionLoading(true);
      setError("");

      await api.markAllNotificationsRead();

      setUnreadCount(0);
      setStats((prev) => ({
        ...prev,
        unread: 0,
        read: Number(prev.total || 0),
      }));

      if (status === "UNREAD") {
        setNotifications([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          pages: 1,
          page: 1,
        }));
      } else {
        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            isRead: true,
            readAt: item.readAt || new Date().toISOString(),
          })),
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to mark all notifications as read.");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteNotification(id) {
    if (!id) return;

    const current = notifications.find(
      (item) => String(item?._id || item?.id) === String(id),
    );

    const confirmed = window.confirm(
      "Delete this notification? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      const data = await api.deleteNotification(id);

      setNotifications((prev) =>
        prev.filter((item) => String(item?._id || item?.id) !== String(id)),
      );

      setPagination((prev) => ({
        ...prev,
        total: Math.max(Number(prev.total || 0) - 1, 0),
      }));

      setStats((prev) => ({
        total: Math.max(Number(prev.total || 0) - 1, 0),
        unread: current?.isRead
          ? Number(prev.unread || 0)
          : Math.max(Number(prev.unread || 0) - 1, 0),
        read: current?.isRead
          ? Math.max(Number(prev.read || 0) - 1, 0)
          : Number(prev.read || 0),
      }));

      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else if (current && !current.isRead) {
        setUnreadCount((prev) => Math.max(Number(prev || 0) - 1, 0));
      }
    } catch (err) {
      setError(err?.message || "Failed to delete notification.");
    } finally {
      setActionLoading(false);
    }
  }

  async function openNotification(item) {
    const id = item?._id || item?.id;
    const actionUrl = String(item?.actionUrl || "").trim();

    if (!item?.isRead && id) {
      await markRead(id);
    }

    if (!actionUrl) return;

    if (actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
      window.open(actionUrl, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(actionUrl);
  }

  function resetFilters() {
    setStatus("ALL");
    setCategory("ALL");
    setPriority("ALL");
    setSearchInput("");
    setSearch("");
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }

  function goToPage(nextPage) {
    const safePage = Math.min(
      Math.max(Number(nextPage || 1), 1),
      Number(pagination.pages || 1),
    );

    setPagination((prev) => ({
      ...prev,
      page: safePage,
    }));

    loadNotifications(safePage);
  }

  const summaryText = useMemo(() => {
    const total = Number(pagination.total || 0);

    if (total === 0) return "No notifications found";

    return `${total} notification${total === 1 ? "" : "s"} found`;
  }, [pagination.total]);

  const hasActiveFilters = useMemo(() => {
    return (
      status !== "ALL" ||
      category !== "ALL" ||
      priority !== "ALL" ||
      searchInput.trim()
    );
  }, [status, category, priority, searchInput]);

  return (
    <section className="min-h-[calc(100vh-88px)] bg-[#fff8f1] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-sm">
          <div
            className="absolute inset-0 opacity-95"
            style={{
              background:
                roleInfo.label === "Super Admin"
                  ? `linear-gradient(135deg, ${primaryColor}, #111827)`
                  : `linear-gradient(135deg, ${KIDGAGE_PRIMARY}, #ff9f43 48%, ${KIDGAGE_SECONDARY})`,
            }}
          />

          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-white/20" />
          <div className="absolute right-10 top-10 hidden text-6xl opacity-60 md:block">
            🎈
          </div>
          <div className="absolute bottom-8 left-1/2 hidden text-5xl opacity-40 md:block">
            ⭐
          </div>

          <div className="relative z-10 grid gap-6 p-6 text-white md:p-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {roleInfo.eyebrow}
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Notifications
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-white/85 md:text-base">
                Stay updated with bookings, online payments, academy approvals,
                parent messages, settlement alerts, and KidGage platform
                updates.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                    Total
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {stats.total || 0}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                    Unread
                  </div>
                  <div className="mt-1 text-2xl font-black">{unreadCount}</div>
                </div>

                <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                    Read
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {stats.read || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white/20 p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#ec7a3b] shadow-sm">
                  <Bell className="h-8 w-8" />
                </div>

                <div>
                  <div className="text-sm font-bold text-white/75">
                    Notification Inbox
                  </div>
                  <div className="mt-1 text-3xl font-black">{unreadCount}</div>
                  <div className="text-xs font-bold uppercase tracking-wide text-white/70">
                    Waiting for review
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-8 bg-[radial-gradient(circle_at_20px_-2px,#fff8f1_20px,transparent_21px)] bg-[length:58px_58px] bg-repeat-x" />
        </div>

        <div className="mt-6 rounded-[30px] border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => {
                const active = status === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatus(tab.value);
                      setPagination((prev) => ({
                        ...prev,
                        page: 1,
                      }));
                    }}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                      active
                        ? "text-white shadow-sm"
                        : "bg-orange-50 text-slate-600 hover:bg-orange-100"
                    }`}
                    style={{
                      backgroundColor: active ? primaryColor : undefined,
                      boxShadow: active
                        ? `0 12px 24px ${rgba(primaryColor, 0.22)}`
                        : undefined,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative md:w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search notifications..."
                  className="h-12 w-full rounded-2xl border border-orange-100 bg-[#fff8f1] pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:bg-white"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                  }}
                />
              </div>

              <div className="relative md:w-[215px]">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPagination((prev) => ({
                      ...prev,
                      page: 1,
                    }));
                  }}
                  className="h-12 w-full appearance-none rounded-2xl border border-orange-100 bg-[#fff8f1] pl-11 pr-4 text-sm font-black text-slate-600 outline-none transition focus:bg-white"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                  }}
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative md:w-[190px]">
                <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setPagination((prev) => ({
                      ...prev,
                      page: 1,
                    }));
                  }}
                  className="h-12 w-full appearance-none rounded-2xl border border-orange-100 bg-[#fff8f1] pl-11 pr-4 text-sm font-black text-slate-600 outline-none transition focus:bg-white"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                  }}
                >
                  {PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={refreshCurrentPage}
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 text-sm font-black text-slate-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={markAllRead}
                disabled={actionLoading || unreadCount <= 0}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                style={{ backgroundColor: primaryColor }}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm ring-1 ring-orange-100">
            {summaryText}
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50"
            >
              <X className="h-4 w-4" />
              Reset filters
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        <div className="mt-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <NotificationSkeleton key={item} />
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((item) => (
                <NotificationCard
                  key={item?._id || item?.id}
                  item={item}
                  primaryColor={primaryColor}
                  actionLoading={actionLoading}
                  onMarkRead={markRead}
                  onMarkUnread={markUnread}
                  onDelete={deleteNotification}
                  onOpen={openNotification}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              status={status}
              onReset={
                hasActiveFilters
                  ? resetFilters
                  : () => loadNotifications(pagination.page)
              }
              primaryColor={primaryColor}
            />
          )}
        </div>

        {pagination.pages > 1 ? (
          <div className="mt-7 flex flex-col gap-3 rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-black text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => goToPage(pagination.page - 1)}
                className="rounded-2xl bg-orange-50 px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() => goToPage(pagination.page + 1)}
                className="rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

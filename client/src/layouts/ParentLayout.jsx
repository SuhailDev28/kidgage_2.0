// client/src/layouts/ParentLayout.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Baby,
  CalendarDays,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCircle2,
  X,
  ChevronRight,
  Bell,
  Heart,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout, getUser } from "../lib/auth.js";
import { api, publicApi } from "../lib/api.js";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

const DEFAULT_THEME = {
  siteName: "KidGage",
  tagline: "Parent Portal",
  logo: "",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
};

function getApiOrigin() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  return apiBase || FALLBACK_API_ORIGIN;
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const base = getApiOrigin();

  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return raw;
}

function normalizeSettingsPayload(data) {
  const settings =
    data?.settings ||
    data?.data?.settings ||
    data?.data ||
    data?.appSettings ||
    data ||
    {};

  return {
    siteName: settings.siteName || DEFAULT_THEME.siteName,
    tagline: settings.tagline || DEFAULT_THEME.tagline,
    logo: normalizeImage(settings.logo || ""),
    primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
  };
}

function getInitials(name = "Parent") {
  const initials = String(name || "Parent")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "P";
}

function formatNotificationTime(value) {
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

function getNotificationColor(category = "", priority = "") {
  const p = String(priority || "").toUpperCase();
  const c = String(category || "").toUpperCase();

  if (p === "URGENT" || p === "HIGH") return "#dc2626";
  if (c === "BOOKING") return "#2563eb";
  if (c === "PAYMENT") return "#16a34a";
  if (c === "APPROVAL") return "#9333ea";
  if (c === "SETTLEMENT") return "#0f766e";
  if (c === "REGISTRATION") return "#ea580c";
  if (c === "ACADEMY") return "#7c3aed";
  if (c === "ACTIVITY") return "#0891b2";
  if (c === "EVENT") return "#db2777";
  if (c === "BLOG" || c === "CONTENT") return "#ca8a04";
  if (c === "MESSAGE") return "#0284c7";
  if (c === "SYSTEM") return "#475569";

  return "#64748b";
}

const navItems = [
  { label: "Dashboard", to: "/parent/dashboard", icon: Home },
  { label: "Bookings", to: "/parent/bookings", icon: CalendarDays },
  { label: "Children", to: "/parent/children", icon: Baby },
  { label: "Payments", to: "/parent/payments", icon: CreditCard },
  { label: "Notifications", to: "/parent/notifications", icon: Bell },
  { label: "Profile", to: "/parent/profile", icon: UserCircle2 },
  { label: "Settings", to: "/parent/settings", icon: Settings },
];

function NotificationBell({ primaryColor }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  async function loadNotifications() {
    try {
      setLoading(true);

      const [countRes, listRes] = await Promise.all([
        api.notificationUnreadCount(),
        api.notifications({
          status: "UNREAD",
          limit: 6,
        }),
      ]);

      setUnreadCount(Number(countRes?.count || countRes?.unreadCount || 0));

      const rows = Array.isArray(listRes?.notifications)
        ? listRes.notifications
        : Array.isArray(listRes?.items)
          ? listRes.items
          : [];

      setNotifications(rows);
    } catch {
      setUnreadCount(0);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notification) {
    const id = notification?._id || notification?.id;
    if (!id) return;

    try {
      const data = await api.markNotificationRead(id);

      setNotifications((prev) =>
        prev.filter((item) => String(item?._id || item?.id) !== String(id)),
      );

      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else {
        setUnreadCount((prev) => Math.max(Number(prev || 0) - 1, 0));
      }

      const actionUrl = String(notification?.actionUrl || "").trim();

      if (actionUrl) {
        setOpen(false);

        if (
          actionUrl.startsWith("http://") ||
          actionUrl.startsWith("https://")
        ) {
          window.open(actionUrl, "_blank", "noopener,noreferrer");
        } else {
          navigate(actionUrl);
        }
      }
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications([]);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadNotifications();

    const timer = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
        aria-label="Notifications"
        onClick={() => {
          setOpen((prev) => !prev);
          loadNotifications();
        }}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white ring-2 ring-white"
            style={{ backgroundColor: primaryColor }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : (
          <span
            className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full ring-2 ring-white"
            style={{ backgroundColor: primaryColor }}
          />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />

          <div className="absolute right-0 z-50 mt-3 w-[340px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:w-[390px]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-base font-black text-slate-950">
                  Notifications
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${
                        unreadCount === 1 ? "" : "s"
                      }`
                    : "No unread notifications"}
                </div>
              </div>

              <button
                type="button"
                onClick={markAllRead}
                disabled={!unreadCount}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" />
                Read all
              </button>
            </div>

            <div className="max-h-[390px] overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-[82px] animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((item) => {
                    const color = getNotificationColor(
                      item?.category,
                      item?.priority,
                    );

                    return (
                      <button
                        key={item?._id || item?.id}
                        type="button"
                        onClick={() => markAsRead(item)}
                        className="group flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className="mt-1 h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-black text-slate-950">
                            {item?.title || "Notification"}
                          </span>

                          <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {item?.message || "You have a new update."}
                          </span>

                          <span className="mt-2 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {formatNotificationTime(item?.createdAt)}
                            </span>

                            {item?.actionUrl ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 transition group-hover:text-slate-700">
                                Open
                                <ExternalLink className="h-3.5 w-3.5" />
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ec7a3b]">
                    <MessageCircle className="h-6 w-6" />
                  </div>

                  <div className="mt-4 text-sm font-black text-slate-900">
                    All caught up
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Booking confirmations, payment updates, and activity alerts
                    will appear here.
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/parent/notifications");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:opacity-95"
                style={{ backgroundColor: primaryColor }}
              >
                View all notifications
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function ParentLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [logoFailed, setLogoFailed] = useState(false);

  const user = useMemo(() => getUser?.() || {}, []);
  const parentName = user?.fullName || user?.name || "Parent";
  const parentEmail = user?.email || "";

  const activePage = useMemo(() => {
    const found = navItems.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`),
    );

    return found?.label || "Parent Portal";
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const endpoints = [
        () => publicApi.get("/settings"),
        () => api.get("/public/settings"),
      ];

      for (const request of endpoints) {
        try {
          const res = await request();

          if (!mounted) return;

          const nextTheme = normalizeSettingsPayload(res.data);
          setTheme(nextTheme);
          setLogoFailed(false);
          return;
        } catch {
          // Try next endpoint.
        }
      }

      if (mounted) {
        setTheme(DEFAULT_THEME);
        setLogoFailed(false);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const showLogo = Boolean(theme.logo && !logoFailed);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[88px] items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => navigate("/parent/dashboard")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 text-[#ec7a3b]">
              {showLogo ? (
                <img
                  src={theme.logo}
                  alt={theme.siteName}
                  className="h-full w-full object-contain p-1.5"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Heart className="h-7 w-7" />
              )}
            </div>

            <div className="min-w-0">
              <div className="truncate text-xl font-black tracking-tight text-slate-900">
                {theme.siteName}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                {theme.tagline || "Parent Portal"}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mb-5 rounded-[24px] bg-gradient-to-br from-orange-50 to-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#ec7a3b] shadow-sm">
                {getInitials(parentName)}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-900">
                  {parentName}
                </div>
                <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                  {parentEmail || "Parent account"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-600">
              Book activities, manage children, and track payment status from
              one place.
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      isActive
                        ? "bg-[#ec7a3b] text-white shadow-[0_14px_30px_rgba(236,122,59,0.22)]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>

                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 group-hover:text-slate-500"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-[290px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[88px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  {activePage}
                </h1>
                <p className="mt-0.5 hidden text-sm font-medium text-slate-500 sm:block">
                  Manage your bookings, children, and payments.
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 justify-center px-4 xl:flex">
              <div className="relative w-full max-w-2xl">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bookings, academies, activities..."
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <NotificationBell primaryColor={theme.primaryColor} />

              <button
                type="button"
                onClick={() => navigate("/parent/profile")}
                className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50 sm:flex"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-[#ec7a3b]">
                  {getInitials(parentName)}
                </div>

                <div className="min-w-0 text-left">
                  <div className="max-w-[150px] truncate text-sm font-black text-slate-900">
                    {parentName}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    Parent
                  </div>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-88px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

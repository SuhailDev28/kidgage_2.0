// client/src/layouts/AcademyLayout.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  UserCircle2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageCircle,
  Landmark,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../lib/auth.js";
import { api, publicApi } from "../lib/api.js";

const SIDEBAR_KEY = "kidgage_academy_sidebar_collapsed";
const FALLBACK_API_ORIGIN = "http://localhost:5001";

const DEFAULT_THEME = {
  siteName: "kidgage",
  logo: "",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
};

function readInitialCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value || "").trim();
  if (!raw) return "";

  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");

  const base = apiBase || FALLBACK_API_ORIGIN;

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/${raw}`;
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

function getInitials(name = "K") {
  const words = String(name || "K")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "K";

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function readLocalBrandSettings() {
  try {
    return {
      siteName:
        localStorage.getItem("kidgage_site_name") ||
        localStorage.getItem("kg_site_name") ||
        localStorage.getItem("siteName") ||
        localStorage.getItem("ra_site_name") ||
        DEFAULT_THEME.siteName,

      logo:
        localStorage.getItem("kidgage_logo") ||
        localStorage.getItem("kg_logo") ||
        localStorage.getItem("siteLogo") ||
        localStorage.getItem("ra_admin_logo") ||
        "",

      primaryColor:
        localStorage.getItem("kidgage_primary_color") ||
        localStorage.getItem("primaryColor") ||
        DEFAULT_THEME.primaryColor,

      secondaryColor:
        localStorage.getItem("kidgage_secondary_color") ||
        localStorage.getItem("secondaryColor") ||
        DEFAULT_THEME.secondaryColor,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

function pickBrandFromResponse(data = {}) {
  const settings =
    data?.settings ||
    data?.siteSettings ||
    data?.generalSettings ||
    data?.branding ||
    data?.brand ||
    data?.data ||
    data ||
    {};

  return {
    siteName:
      settings?.siteName ||
      settings?.appName ||
      settings?.brandName ||
      settings?.name ||
      settings?.title ||
      DEFAULT_THEME.siteName,

    logo:
      settings?.logo ||
      settings?.siteLogo ||
      settings?.brandLogo ||
      settings?.headerLogo ||
      settings?.appLogo ||
      settings?.mainLogo ||
      "",

    primaryColor:
      settings?.primaryColor ||
      settings?.menuLinkActiveColor ||
      settings?.themeColor ||
      DEFAULT_THEME.primaryColor,

    secondaryColor:
      settings?.secondaryColor ||
      settings?.menuLinkHoverColor ||
      settings?.accentColor ||
      DEFAULT_THEME.secondaryColor,
  };
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

function useSuperAdminBrand() {
  const [brand, setBrand] = useState(() => readLocalBrandSettings());

  useEffect(() => {
    let active = true;

    async function loadBrand() {
      const endpoints = ["/settings", "/site-settings"];

      for (const endpoint of endpoints) {
        try {
          const { data } = await publicApi.get(endpoint);
          const nextBrand = pickBrandFromResponse(data);

          if (!active) return;

          setBrand((prev) => ({
            siteName:
              nextBrand.siteName || prev.siteName || DEFAULT_THEME.siteName,
            logo: nextBrand.logo || prev.logo || "",
            primaryColor:
              nextBrand.primaryColor ||
              prev.primaryColor ||
              DEFAULT_THEME.primaryColor,
            secondaryColor:
              nextBrand.secondaryColor ||
              prev.secondaryColor ||
              DEFAULT_THEME.secondaryColor,
          }));

          return;
        } catch {
          // Try next endpoint.
        }
      }

      if (active) {
        setBrand(readLocalBrandSettings());
      }
    }

    loadBrand();

    return () => {
      active = false;
    };
  }, []);

  return brand;
}

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
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
        aria-label="Notifications"
        onClick={() => {
          setOpen((prev) => !prev);
          loadNotifications();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = primaryColor;
          e.currentTarget.style.backgroundColor = rgba(primaryColor, 0.1);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "";
          e.currentTarget.style.backgroundColor = "";
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
            className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
            style={{ backgroundColor: primaryColor }}
          />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />

          <div className="absolute right-0 z-[80] mt-3 w-[340px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:w-[390px]">
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
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      color: primaryColor,
                      backgroundColor: rgba(primaryColor, 0.1),
                    }}
                  >
                    <MessageCircle className="h-6 w-6" />
                  </div>

                  <div className="mt-4 text-sm font-black text-slate-900">
                    All caught up
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    New bookings, parent enquiries, payment updates, settlement
                    updates, and activity alerts will appear here.
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/academy/notifications");
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

function SidebarItem({
  icon: Icon,
  label,
  active = false,
  onClick,
  collapsed = false,
  danger = false,
  brand,
}) {
  const primaryColor = brand?.primaryColor || DEFAULT_THEME.primaryColor;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      title={collapsed ? label : undefined}
      className={`group relative z-30 flex w-full items-center rounded-2xl text-left transition ${
        collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"
      } ${
        danger
          ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          : active
            ? ""
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      style={
        active && !danger
          ? {
              color: primaryColor,
              backgroundColor: rgba(primaryColor, 0.1),
            }
          : undefined
      }
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
          active
            ? "text-white shadow-sm"
            : danger
              ? "bg-rose-50 text-rose-600 group-hover:bg-white"
              : "bg-slate-100 text-slate-500 group-hover:bg-white"
        }`}
        style={
          active && !danger
            ? {
                backgroundColor: primaryColor,
              }
            : undefined
        }
      >
        <Icon className="h-5 w-5" />
      </span>

      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>

          <ChevronRight
            className={`h-4 w-4 transition ${
              danger
                ? "text-rose-300 group-hover:text-rose-500"
                : active
                  ? ""
                  : "text-slate-300 group-hover:text-slate-500"
            }`}
            style={
              active && !danger
                ? {
                    color: primaryColor,
                  }
                : undefined
            }
          />
        </>
      ) : null}
    </button>
  );
}

function BrandLogo({ logo, siteName, collapsed = false, brand }) {
  const normalizedLogo = normalizeImage(logo);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [normalizedLogo]);

  if (normalizedLogo && !failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${
          collapsed ? "h-12 w-12" : "h-12 w-12"
        }`}
      >
        <img
          src={normalizedLogo}
          alt={siteName || "KidGage"}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
      style={{
        backgroundColor: brand?.primaryColor || DEFAULT_THEME.primaryColor,
      }}
    >
      <span className="text-sm font-black">{getInitials(siteName)}</span>
    </div>
  );
}

function BrandBlock({ collapsed = false, brand }) {
  const siteName = brand?.siteName || DEFAULT_THEME.siteName;

  return (
    <div
      className={`flex items-center ${
        collapsed ? "justify-center" : "gap-3 px-2"
      }`}
    >
      <BrandLogo
        logo={brand?.logo}
        siteName={siteName}
        collapsed={collapsed}
        brand={brand}
      />

      {!collapsed ? (
        <div className="min-w-0">
          <div className="truncate text-[28px] font-black tracking-tight text-slate-900">
            {siteName}
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Academy
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AcademyTopbar({ brand, onOpenMobile }) {
  const location = useLocation();

  const primaryColor = brand?.primaryColor || DEFAULT_THEME.primaryColor;

  const pageTitle = useMemo(() => {
    const pathname = location.pathname;

    if (pathname.startsWith("/academy/activities")) return "Courses";
    if (pathname.startsWith("/academy/bookings")) return "Bookings";
    if (pathname.startsWith("/academy/attendance")) return "Attendance";
    if (pathname.startsWith("/academy/settlements")) return "Settlements";
    if (pathname.startsWith("/academy/notifications")) return "Notifications";
    if (pathname.startsWith("/academy/profile")) return "Profile";
    if (pathname.startsWith("/academy/settings")) return "Settings";

    return "Dashboard";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-h-[64px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobile}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition xl:hidden"
            aria-label="Open menu"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = primaryColor;
              e.currentTarget.style.backgroundColor = rgba(primaryColor, 0.1);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {pageTitle}
            </h1>
            <p className="mt-0.5 hidden text-sm font-medium text-slate-500 sm:block">
              Manage academy courses, bookings, attendance, settlements,
              profile, and notifications.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <NotificationBell primaryColor={primaryColor} />
        </div>
      </div>
    </header>
  );
}

function SidebarContent({
  onClose,
  collapsed = false,
  onToggleCollapse,
  brand,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;
  const primaryColor = brand?.primaryColor || DEFAULT_THEME.primaryColor;

  const navItems = useMemo(
    () => [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: "/academy/dashboard",
        active: pathname === "/academy/dashboard" || pathname === "/academy",
      },
      {
        icon: BookOpen,
        label: "Courses",
        path: "/academy/activities",
        active: pathname.startsWith("/academy/activities"),
      },
      {
        icon: CalendarDays,
        label: "Bookings",
        path: "/academy/bookings",
        active: pathname.startsWith("/academy/bookings"),
      },
      {
        icon: ClipboardCheck,
        label: "Attendance",
        path: "/academy/attendance",
        active: pathname.startsWith("/academy/attendance"),
      },
      {
        icon: Landmark,
        label: "Settlements",
        path: "/academy/settlements",
        active: pathname.startsWith("/academy/settlements"),
      },
      {
        icon: Bell,
        label: "Notifications",
        path: "/academy/notifications",
        active: pathname.startsWith("/academy/notifications"),
      },
      {
        icon: UserCircle2,
        label: "Profile",
        path: "/academy/profile",
        active: pathname.startsWith("/academy/profile"),
      },
      {
        icon: Settings,
        label: "Settings",
        path: "/academy/settings",
        active: pathname.startsWith("/academy/settings"),
      },
    ],
    [pathname],
  );

  function go(path) {
    onClose?.();
    navigate(path);
  }

  function handleLogout() {
    onClose?.();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div>
        <div className="flex items-center justify-between gap-3">
          <BrandBlock collapsed={collapsed} brand={brand} />

          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition xl:inline-flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = primaryColor;
                e.currentTarget.style.backgroundColor = rgba(primaryColor, 0.1);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "";
                e.currentTarget.style.backgroundColor = "";
              }}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          ) : null}
        </div>

        <div className="mt-8 space-y-2">
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              active={item.active}
              collapsed={collapsed}
              brand={brand}
              onClick={() => go(item.path)}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 pt-5">
        <SidebarItem
          icon={LogOut}
          label="Logout"
          collapsed={collapsed}
          danger
          brand={brand}
          onClick={handleLogout}
        />
      </div>
    </div>
  );
}

export default function AcademyLayout() {
  const brand = useSuperAdminBrand();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // ignore localStorage errors
      }

      return next;
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          <aside className="absolute left-0 top-0 h-full w-[310px] max-w-[86vw] overflow-y-auto bg-white px-5 py-6 shadow-2xl">
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarContent
              brand={brand}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div
        className="grid min-h-screen grid-cols-1 transition-all duration-300 xl:grid-cols-[var(--academy-sidebar-width)_minmax(0,1fr)]"
        style={{
          "--academy-sidebar-width": collapsed ? "96px" : "280px",
        }}
      >
        <aside
          className={`relative z-30 hidden border-r border-slate-200 bg-white py-6 xl:block ${
            collapsed ? "px-4" : "px-5"
          }`}
        >
          <SidebarContent
            brand={brand}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>

        <main className="relative z-10 min-w-0">
          <AcademyTopbar
            brand={brand}
            onOpenMobile={() => setMobileOpen(true)}
          />

          <Outlet />
        </main>
      </div>
    </div>
  );
}
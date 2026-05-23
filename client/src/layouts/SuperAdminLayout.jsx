// client/src/layouts/SuperAdminLayout.jsx

import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Rocket,
  Building2,
  MapPinned,
  Activity,
  CalendarDays,
  Users,
  Baby,
  UserCog,
  CreditCard,
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Settings,
  ClipboardList,
  Tags,
  Image as ImageIcon,
  Newspaper,
  BarChart3,
  ShieldCheck,
  LogOut,
  Menu,
  Search,
  ChevronLeft,
  ChevronDown,
  FileText,
  Landmark,
  Award,
  X,
} from "lucide-react";
import { api } from "../lib/api.js";

const SUPER_ADMIN_SIDEBAR_KEY = "kidgage_super_admin_sidebar_collapsed";

const DEFAULT_SETTINGS = {
  siteName: "KidGage",
  tagline: "Super Admin",
  logo: "",
  favicon: "",
  primaryColor: "#2563eb",
  secondaryColor: "#6d28d9",
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/super-admin/dashboard" },
  { label: "Onboarding", icon: Rocket, to: "/super-admin/onboarding" },

  {
    label: "CRM",
    icon: Users,
    children: [
      { label: "Parents", icon: Users, to: "/super-admin/parents" },
      { label: "Children", icon: Baby, to: "/super-admin/children" },
    ],
  },

  {
    label: "Academy Management",
    icon: Building2,
    children: [
      { label: "Academies", icon: Building2, to: "/super-admin/academies" },
      { label: "Branches", icon: MapPinned, to: "/super-admin/branches" },
      { label: "Activities", icon: Activity, to: "/super-admin/activities" },
      {
        label: "Activity Approvals",
        icon: ClipboardList,
        to: "/super-admin/activity-approvals",
      },
      { label: "Staff", icon: UserCog, to: "/super-admin/staff" },
    ],
  },

  {
    label: "Booking Management",
    icon: CalendarDays,
    children: [
      { label: "Bookings", icon: CalendarDays, to: "/super-admin/bookings" },
      { label: "Payments", icon: CreditCard, to: "/super-admin/payments" },
      { label: "Settlements", icon: Landmark, to: "/super-admin/settlements" },
    ],
  },

  {
    label: "Content Management",
    icon: Newspaper,
    children: [
      { label: "Events", icon: FileText, to: "/super-admin/events" },
      { label: "Blogs", icon: Newspaper, to: "/super-admin/blogs" },
      { label: "Banners", icon: ImageIcon, to: "/super-admin/banners" },
      { label: "Categories", icon: Tags, to: "/super-admin/categories" },
      {
        label: "Certificate Templates",
        icon: Award,
        to: "/super-admin/certificate-templates",
      },
      {
        label: "Legal Content",
        icon: FileText,
        to: "/super-admin/content-pages",
      },
    ],
  },

  {
    label: "Operations",
    icon: ClipboardList,
    children: [
      {
        label: "Approval Requests",
        icon: ClipboardList,
        to: "/super-admin/requests",
      },
      {
        label: "Notifications",
        icon: Bell,
        to: "/super-admin/notifications",
      },
      { label: "Reports", icon: BarChart3, to: "/super-admin/reports" },
      { label: "Audit Logs", icon: ShieldCheck, to: "/super-admin/logs" },
    ],
  },

  { label: "Settings", icon: Settings, to: "/super-admin/settings" },
];

function readInitialCollapsed() {
  try {
    return localStorage.getItem(SUPER_ADMIN_SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

function getAssetBase() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "").trim();

  if (!apiBase) return "";

  return apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const base = getAssetBase();

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  if (!base) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/settings/${raw}`;
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

  return { r: 37, g: 99, b: 235 };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getInitials(name = "KidGage") {
  const words = String(name || "KidGage")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "KG";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0]?.[0] || ""}${words[1]?.[0] || ""}`.toUpperCase();
}

function clearAuthAndLogout() {
  try {
    localStorage.removeItem("kidgage_token");
    localStorage.removeItem("kidgage_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    // ignore
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
}

function normalizeSettings(row = {}) {
  return {
    siteName: row.siteName || DEFAULT_SETTINGS.siteName,
    tagline: row.tagline || DEFAULT_SETTINGS.tagline,
    logo: row.logo || "",
    favicon: row.favicon || "",
    primaryColor: row.primaryColor || DEFAULT_SETTINGS.primaryColor,
    secondaryColor: row.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
  };
}

function flattenNavItems(items = []) {
  return items.flatMap((item) => {
    if (Array.isArray(item.children) && item.children.length > 0) {
      return item.children;
    }

    return item.to ? [item] : [];
  });
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

function usePlatformSettings() {
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setSettingsLoading(true);

        const { data } = await api.get("/super-admin/settings");
        const row = data?.settings || data || {};
        const nextSettings = normalizeSettings(row);

        if (!active) return;

        setSettings(nextSettings);

        try {
          if (nextSettings.favicon) {
            const faviconUrl = normalizeImage(nextSettings.favicon);
            let link = document.querySelector("link[rel='icon']");

            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.head.appendChild(link);
            }

            link.href = faviconUrl;
          }

          if (nextSettings.siteName) {
            document.title = `${nextSettings.siteName} | Super Admin`;
          }
        } catch {
          // ignore browser DOM errors
        }
      } catch {
        if (!active) return;
        setSettings(DEFAULT_SETTINGS);
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  return {
    settings: settings || DEFAULT_SETTINGS,
    settingsLoading,
  };
}

function BrandSkeleton({ collapsed = false }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-[18px] bg-slate-100" />

      {!collapsed ? (
        <div className="min-w-0">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      ) : null}
    </div>
  );
}

function BrandMark({ collapsed = false, settings, settingsLoading }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const primary = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const logoUrl = normalizeImage(settings.logo);
  const siteName = settings.siteName || DEFAULT_SETTINGS.siteName;
  const tagline = settings.tagline || DEFAULT_SETTINGS.tagline;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  if (settingsLoading) {
    return <BrandSkeleton collapsed={collapsed} />;
  }

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white text-slate-700 ring-1 ring-slate-200">
        {logoUrl && !logoFailed ? (
          <img
            src={logoUrl}
            alt={siteName}
            className="h-full w-full object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-sm font-black text-white"
            style={{ backgroundColor: primary }}
          >
            {getInitials(siteName)}
          </div>
        )}
      </div>

      {!collapsed ? (
        <div className="min-w-0">
          <div className="truncate text-2xl font-black tracking-tight text-slate-900">
            {siteName}
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {tagline}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarLink({ item, collapsed, onClick, primaryColor }) {
  const location = useLocation();
  const Icon = item.icon;

  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  const isChildActive = hasChildren
    ? item.children.some((child) => location.pathname.startsWith(child.to))
    : false;

  const isDirectActive = item.to
    ? location.pathname.startsWith(item.to)
    : false;

  const isActive = isDirectActive || isChildActive;

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            if (collapsed) return;
            setOpen((prev) => !prev);
          }}
          className={[
            "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
            collapsed ? "justify-center" : "",
            isActive
              ? "text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          ].join(" ")}
          style={{
            backgroundColor: isActive ? primaryColor : undefined,
            boxShadow: isActive
              ? `0 12px 24px ${rgba(primaryColor, 0.22)}`
              : undefined,
          }}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-5 w-5 shrink-0" />

          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-left">
                {item.label}
              </span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </>
          ) : null}
        </button>

        {!collapsed && open ? (
          <div className="mt-2 space-y-1 pl-4">
            {item.children.map((child) => {
              const ChildIcon = child.icon;

              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={onClick}
                  className={({ isActive }) =>
                    [
                      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive
                      ? rgba(primaryColor, 0.12)
                      : undefined,
                    color: isActive ? primaryColor : undefined,
                  })}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
          collapsed ? "justify-center" : "",
          isActive
            ? "text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        ].join(" ")
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? primaryColor : undefined,
        boxShadow: isActive
          ? `0 12px 24px ${rgba(primaryColor, 0.22)}`
          : undefined,
      })}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

function Sidebar({
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  settings,
  settingsLoading,
}) {
  const primaryColor = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(SUPER_ADMIN_SIDEBAR_KEY, String(next));
      } catch {
        // ignore
      }

      return next;
    });
  }

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
        />
      ) : null}

      <aside
        className={[
          "fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-300",
          collapsed ? "w-[92px]" : "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
            <BrandMark
              collapsed={collapsed}
              settings={settings}
              settingsLoading={settingsLoading}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:block"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft
                  className={`h-5 w-5 transition-transform ${
                    collapsed ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!collapsed ? (
              <div
                className="mb-4 rounded-[22px] p-4"
                style={{
                  background: `linear-gradient(135deg, ${rgba(
                    primaryColor,
                    0.1,
                  )}, ${rgba(primaryColor, 0.04)})`,
                }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-[0.14em]"
                  style={{ color: primaryColor }}
                >
                  Platform Control
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  Manage CRM, academies, bookings, payments, content,
                  operations, and platform settings.
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {navItems.map((item) => (
                <SidebarLink
                  key={item.to || item.label}
                  item={item}
                  collapsed={collapsed}
                  primaryColor={primaryColor}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 p-4">
            <button
              type="button"
              onClick={() => {
                clearAuthAndLogout();
                window.location.href = "/login";
              }}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-600 transition hover:bg-red-50 hover:text-red-600 ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed ? (
                <span className="text-sm font-medium">Logout</span>
              ) : null}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function NotificationBell({ primaryColor }) {
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="relative shrink-0">
      <button
        type="button"
        className="relative rounded-2xl bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 sm:p-3"
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
            className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />

          <div className="fixed inset-x-3 top-[74px] z-40 max-h-[calc(100vh-92px)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[390px] sm:rounded-[26px]">
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Bell className="h-6 w-6" />
                  </div>

                  <div className="mt-4 text-sm font-black text-slate-900">
                    All caught up
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    New bookings, payments, approvals, and platform updates will
                    appear here.
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/super-admin/notifications");
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

function Topbar({ setMobileOpen, settings, settingsLoading }) {
  const location = useLocation();
  const [logoFailed, setLogoFailed] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const primary = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const logoUrl = normalizeImage(settings.logo);
  const siteName = settings.siteName || DEFAULT_SETTINGS.siteName;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    const current = flattenNavItems(navItems)
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => location.pathname.startsWith(item.to));

    return current?.label || "Dashboard";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="px-3 py-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3 lg:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="shrink-0 rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black text-slate-900 sm:text-xl lg:text-2xl">
                {pageTitle}
              </h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block lg:text-sm">
                Manage your platform from one place
              </p>
            </div>
          </div>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3 lg:flex-1">
            <div className="hidden max-w-2xl flex-1 lg:block">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Search academies, bookings, parents, activities..."
                />
              </div>
            </div>

            <button
              type="button"
              className="inline-flex rounded-2xl bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 lg:hidden"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              aria-label="Toggle search"
            >
              {mobileSearchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            <NotificationBell primaryColor={primary} />

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:px-3 sm:py-2">
              {settingsLoading ? (
                <>
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100 sm:h-11 sm:w-11" />
                  <div className="hidden md:block">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-black text-slate-700 ring-1 ring-slate-200 sm:h-11 sm:w-11">
                    {logoUrl && !logoFailed ? (
                      <img
                        src={logoUrl}
                        alt={siteName}
                        className="h-full w-full object-contain"
                        onError={() => setLogoFailed(true)}
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {getInitials(siteName)}
                      </div>
                    )}
                  </div>

                  <div className="hidden md:block">
                    <div className="text-sm font-semibold text-slate-900">
                      Super Admin
                    </div>
                    <div className="max-w-[160px] truncate text-xs text-slate-500">
                      {siteName} Platform
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="mt-3 lg:hidden">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                autoFocus
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Search academies, bookings, parents..."
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default function SuperAdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);

  const { settings, settingsLoading } = usePlatformSettings();

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        settings={settings}
        settingsLoading={settingsLoading}
      />

      <div
        className={`min-w-0 transition-all duration-300 ${
          collapsed ? "lg:pl-[92px]" : "lg:pl-[280px]"
        }`}
      >
        <Topbar
          setMobileOpen={setMobileOpen}
          settings={settings}
          settingsLoading={settingsLoading}
        />

        <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

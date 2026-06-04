// client/src/components/mobile/MobileBottomNav.jsx

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  Landmark,
  LayoutDashboard,
  Settings,
  UserRound,
  BookOpen,
} from "lucide-react";

const ROLE_ITEMS = {
  parent: [
    { label: "Home", to: "/parent/dashboard", icon: Home },
    { label: "Bookings", to: "/parent/bookings", icon: CalendarDays },
    { label: "Payments", to: "/parent/payments", icon: CreditCard },
    { label: "Alerts", to: "/parent/notifications", icon: Bell },
    { label: "Profile", to: "/parent/profile", icon: UserRound },
  ],

  academy: [
    { label: "Home", to: "/academy/dashboard", icon: LayoutDashboard },
    { label: "Courses", to: "/academy/activities", icon: BookOpen },
    { label: "Bookings", to: "/academy/bookings", icon: CalendarDays },
    { label: "Payments", to: "/academy/settlements", icon: Landmark },
    { label: "Settings", to: "/academy/settings", icon: Settings },
  ],

  superadmin: [
    { label: "Home", to: "/super-admin/dashboard", icon: LayoutDashboard },
    { label: "Academies", to: "/super-admin/academies", icon: Building2 },
    {
      label: "Approvals",
      to: "/super-admin/activity-approvals",
      icon: BookOpen,
    },
    { label: "Alerts", to: "/super-admin/notifications", icon: Bell },
    { label: "Settings", to: "/super-admin/settings", icon: Settings },
  ],
};

function normalizeRole(role = "parent") {
  const value = String(role || "parent").toLowerCase();

  if (value === "super-admin" || value === "super_admin") return "superadmin";
  if (value === "academy") return "academy";

  return "parent";
}

function isRouteActive(pathname, to) {
  if (to === "/") return pathname === "/";

  return pathname === to || pathname.startsWith(`${to}/`);
}

function safeColor(value) {
  const color = String(value || "").trim();

  if (!color) return "#ec7a3b";

  return color;
}

export default function MobileBottomNav({
  role = "parent",
  primaryColor = "#ec7a3b",
}) {
  const location = useLocation();
  const normalizedRole = normalizeRole(role);
  const items = ROLE_ITEMS[normalizedRole] || ROLE_ITEMS.parent;
  const activeColor = safeColor(primaryColor);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden"
      aria-label={`${normalizedRole} mobile app navigation`}
    >
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_-14px_45px_rgba(15,23,42,0.13),0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1 p-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(location.pathname, item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={[
                  "group relative flex min-w-0 flex-col items-center justify-center",
                  "rounded-[23px] px-1 py-2.5 text-[10px] font-black",
                  "transition duration-200 active:scale-95",
                  active
                    ? "text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${activeColor}, #ff9b63)`,
                        boxShadow: `0 12px 26px ${activeColor}33`,
                      }
                    : undefined
                }
              >
                {active ? (
                  <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/90" />
                ) : null}

                <span
                  className={[
                    "relative mb-1 flex h-7 w-7 items-center justify-center rounded-2xl",
                    "transition duration-200",
                    active
                      ? "bg-white/20"
                      : "bg-transparent group-hover:bg-white",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-5 w-5 transition duration-200",
                      active
                        ? "stroke-[2.8] text-white"
                        : "stroke-[2.15] text-slate-500 group-hover:text-slate-950",
                    ].join(" ")}
                  />

                  {item.label === "Alerts" && active ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: activeColor }}
                      />
                    </span>
                  ) : null}
                </span>

                <span className="max-w-full truncate leading-none">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-slate-950/10 to-transparent" />
    </nav>
  );
}
// client/src/components/mobile/MobileBottomNav.jsx

import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  CalendarDays,
  CreditCard,
  Bell,
  UserRound,
  LayoutDashboard,
  Building2,
  ClipboardList,
  Settings,
} from "lucide-react";

const parentItems = [
  { label: "Home", to: "/parent/dashboard", icon: Home },
  { label: "Bookings", to: "/parent/bookings", icon: CalendarDays },
  { label: "Payments", to: "/parent/payments", icon: CreditCard },
  { label: "Alerts", to: "/parent/notifications", icon: Bell },
  { label: "Profile", to: "/parent/profile", icon: UserRound },
];

const academyItems = [
  { label: "Home", to: "/academy/dashboard", icon: LayoutDashboard },
  { label: "Activities", to: "/academy/activities", icon: ClipboardList },
  { label: "Bookings", to: "/academy/bookings", icon: CalendarDays },
  { label: "Branch", to: "/academy/branches", icon: Building2 },
  { label: "Settings", to: "/academy/settings", icon: Settings },
];

const superAdminItems = [
  { label: "Home", to: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Academies", to: "/super-admin/academies", icon: Building2 },
  { label: "Approvals", to: "/super-admin/activity-approvals", icon: ClipboardList },
  { label: "Alerts", to: "/super-admin/notifications", icon: Bell },
  { label: "Settings", to: "/super-admin/settings", icon: Settings },
];

function getItems(role) {
  if (role === "academy") return academyItems;
  if (role === "superadmin") return superAdminItems;
  return parentItems;
}

export default function MobileBottomNav({ role = "parent" }) {
  const items = getItems(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={[
                      "mb-1 h-5 w-5 transition",
                      isActive ? "stroke-[2.6]" : "stroke-[2]",
                    ].join(" ")}
                  />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
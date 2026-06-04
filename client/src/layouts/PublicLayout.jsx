// client/src/layouts/PublicLayout.jsx

import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Newspaper,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { Header } from "../components/common/Header.jsx";
import { Footer } from "../components/common/Footer.jsx";
import { usePwaMode } from "../hooks/usePwaMode.js";

const publicBottomNavItems = [
  {
    label: "Home",
    to: "/",
    icon: Home,
  },
  {
    label: "Explore",
    to: "/activities",
    icon: Search,
  },
  {
    label: "Blogs",
    to: "/blogs",
    icon: Newspaper,
  },
  {
    label: "Contact",
    to: "/contact",
    icon: MessageCircle,
  },
  {
    label: "Login",
    to: "/login",
    icon: UserRound,
  },
];

function PublicBottomNav() {
  const location = useLocation();

  return (
    <nav className="app-bottom-nav lg:hidden">
      <div className="app-bottom-nav-inner">
        {publicBottomNavItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname === item.to ||
                location.pathname.startsWith(`${item.to}/`);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="app-bottom-nav-item"
              style={{
                color: isActive ? "var(--kg-secondary)" : "#64748b",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--kg-secondary) 12%, white)"
                  : "transparent",
              }}
            >
              <span
                className="app-bottom-nav-icon"
                style={{
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--kg-secondary) 16%, white)"
                    : "transparent",
                }}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "stroke-[2.8]" : "stroke-[2]"
                  }`}
                />
              </span>

              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function PublicLayout() {
  const isPwaMode = usePwaMode();

  return (
    <div className="app-shell min-h-screen overflow-x-hidden bg-white text-[#0f172a]">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className={`flex-1 ${isPwaMode ? "pb-app-nav lg:pb-0" : ""}`}>
          <Outlet />
        </main>

        <div className={isPwaMode ? "pb-app-nav lg:pb-0" : ""}>
          <Footer />
        </div>

        {isPwaMode ? <PublicBottomNav /> : null}
      </div>
    </div>
  );
}
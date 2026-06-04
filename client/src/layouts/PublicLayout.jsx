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

function isRouteActive(pathname, to) {
  if (to === "/") return pathname === "/";

  return pathname === to || pathname.startsWith(`${to}/`);
}

function PublicBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 lg:hidden"
      aria-label="Public mobile app navigation"
    >
      <div className="pointer-events-auto mx-auto max-w-md overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_-14px_45px_rgba(15,23,42,0.13),0_12px_35px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1 p-1.5">
          {publicBottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(location.pathname, item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={[
                  "group relative flex min-w-0 flex-col items-center justify-center",
                  "rounded-[23px] px-1 py-2.5 text-[10px] font-black",
                  "transition duration-200 active:scale-95",
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, var(--kg-secondary, #ec7a3b), #ff9b63)",
                        boxShadow:
                          "0 12px 26px rgba(236, 122, 59, 0.22)",
                      }
                    : undefined
                }
              >
                {isActive ? (
                  <span className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/90" />
                ) : null}

                <span
                  className={[
                    "relative mb-1 flex h-7 w-7 items-center justify-center rounded-2xl",
                    "transition duration-200",
                    isActive
                      ? "bg-white/20"
                      : "bg-transparent group-hover:bg-white",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-5 w-5 transition duration-200",
                      isActive
                        ? "stroke-[2.8] text-white"
                        : "stroke-[2.15] text-slate-500 group-hover:text-slate-950",
                    ].join(" ")}
                  />
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
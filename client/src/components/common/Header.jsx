// client/src/components/public/Header.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePublicSettings } from "../../context/PublicSettingsProvider.jsx";

function getAssetBase() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "").trim();

  if (!apiBase) return "";

  return apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function normalizeImage(value, version = "") {
  if (!value) return "";

  const raw = String(value).trim();
  const base = getAssetBase();

  let finalUrl = "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    finalUrl = raw;
  } else if (!base) {
    finalUrl = raw.startsWith("/") ? raw : `/${raw}`;
  } else if (raw.startsWith("/")) {
    finalUrl = `${base}${raw}`;
  } else if (raw.startsWith("uploads/")) {
    finalUrl = `${base}/${raw}`;
  } else {
    finalUrl = `${base}/uploads/settings/${raw}`;
  }

  if (!version) return finalUrl;

  return `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
    version,
  )}`;
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

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function BrandMark({ logo = "", siteName = "KidGage", version = "", theme }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoSrc = normalizeImage(logo, version);

  useEffect(() => {
    setImageFailed(false);
  }, [logo, version]);

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(15,23,42,0.06)]"
        style={{
          backgroundColor:
            logoSrc && !imageFailed ? "#ffffff" : theme.primaryColor,
        }}
      >
        {logoSrc && !imageFailed ? (
          <img
            src={logoSrc}
            alt={siteName}
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="text-sm font-black tracking-tight text-white">
            {getInitials(siteName)}
          </span>
        )}
      </div>

      <div className="text-[28px] font-black tracking-tight text-[#0f172a]">
        {siteName}
      </div>
    </div>
  );
}

function IconBadge({ accent = "blue", label, theme }) {
  const accentMap = {
    green: "#22c55e",
    yellow: "#eab308",
    orange: theme.primaryColor,
    blue: "#2563eb",
  };

  const color = accentMap[accent] || theme.primaryColor;

  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black"
      style={{
        color,
        backgroundColor: rgba(color, 0.12),
      }}
    >
      {label}
    </div>
  );
}

function LoginMenu({ open, onClose, theme, siteName }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#0f172a]/35 backdrop-blur-[4px]" />

      <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 md:pt-28">
        <div
          ref={panelRef}
          className="relative w-full max-w-[430px] overflow-hidden rounded-[30px] border border-white/20 bg-white text-[#0f172a] shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        >
          <div
            className="absolute right-0 top-0 h-20 w-20 rounded-bl-[28px]"
            style={{ backgroundColor: theme.secondaryColor }}
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-light text-slate-900 shadow-sm transition hover:bg-slate-50"
            aria-label="Close"
          >
            ×
          </button>

          <div className="px-6 pb-7 pt-8">
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"
              style={{
                color: theme.primaryColor,
                backgroundColor: rgba(theme.primaryColor, 0.1),
              }}
            >
              Profile
            </div>

            <h3 className="mt-4 text-3xl font-black text-[#0f172a]">
              Login to {siteName}
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#64748b]">
              Access your parent, academy, or business account and continue
              managing programs with ease.
            </p>

            <Link
              to="/login"
              onClick={onClose}
              className="mt-6 flex items-center gap-4 rounded-[22px] border border-[rgba(15,23,42,0.06)] bg-[#f8fbff] px-4 py-4 transition hover:shadow-sm"
            >
              <IconBadge accent="blue" label="U" theme={theme} />
              <div>
                <div className="text-[17px] font-bold text-[#0f172a]">
                  Sign In
                </div>
                <div className="text-sm text-[#64748b]">
                  Access parent or admin account
                </div>
              </div>
            </Link>

            <div className="mt-7 border-t border-slate-200 pt-7">
              <h4 className="text-2xl font-black text-[#0f172a]">Business</h4>

              <Link
                to="/login"
                onClick={onClose}
                className="mt-4 flex items-start gap-4 rounded-[22px] border border-transparent px-4 py-4 transition hover:border-[rgba(15,23,42,0.06)] hover:bg-[#f8fbff]"
              >
                <IconBadge accent="green" label="AM" theme={theme} />
                <div>
                  <div className="text-[17px] font-bold text-[#0f172a]">
                    Activity Manager
                  </div>
                  <p className="mt-1 max-w-[250px] text-sm leading-6 text-[#64748b]">
                    Manage activities, campaigns, branches, and bookings.
                  </p>
                </div>
              </Link>

              <div className="my-2 h-px bg-slate-200" />

              <Link
                to="/provider-joining-form"
                onClick={onClose}
                className="flex items-start gap-4 rounded-[22px] border border-transparent px-4 py-4 transition hover:border-[rgba(15,23,42,0.06)] hover:bg-[#f8fbff]"
              >
                <IconBadge accent="orange" label="GS" theme={theme} />
                <div>
                  <div className="text-[17px] font-bold text-[#0f172a]">
                    Get Started
                  </div>
                  <p className="mt-1 max-w-[250px] text-sm leading-6 text-[#64748b]">
                    Register your academy and join the {siteName} network.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function NavLinkItem({ item, active, theme, mobile = false }) {
  const [hovered, setHovered] = useState(false);

  const color = active
    ? theme.menuLinkActiveColor
    : hovered
      ? theme.menuLinkHoverColor
      : theme.menuLinkColor;

  const backgroundColor = active
    ? theme.menuLinkActiveBg
    : hovered
      ? rgba(theme.menuLinkHoverColor, 0.08)
      : "transparent";

  return (
    <Link
      to={item.to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`font-semibold transition ${
        mobile
          ? "rounded-[16px] px-4 py-3 text-sm"
          : "rounded-full px-4 py-2.5 text-sm"
      }`}
      style={{
        color,
        backgroundColor,
      }}
    >
      {item.label}
    </Link>
  );
}

export function Header() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { settings } = usePublicSettings();
  const location = useLocation();

  const navItems = [
    { label: "Academies", to: "/academies" },
    { label: "Activities", to: "/activities" },
    { label: "Events", to: "/events" },
    { label: "Blogs", to: "/blogs" },
  ];

  useEffect(() => {
    setLoginOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  function isActive(path) {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  }

  const theme = useMemo(() => {
    const primaryColor =
      settings?.primaryColor || settings?.menuLinkActiveColor || "#2563eb";

    const secondaryColor =
      settings?.secondaryColor || settings?.menuLinkHoverColor || "#facc15";

    return {
      primaryColor,
      secondaryColor,
      menuLinkColor: settings?.menuLinkColor || "#475569",
      menuLinkHoverColor: settings?.menuLinkHoverColor || primaryColor,
      menuLinkActiveColor: settings?.menuLinkActiveColor || primaryColor,
      menuLinkActiveBg: settings?.menuLinkActiveBg || rgba(primaryColor, 0.1),
    };
  }, [settings]);

  const brand = {
    siteName: settings?.siteName || "KidGage",
    logo: settings?.logo || "",
    version: settings?.logoUpdatedAt || settings?.updatedAt || "",
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/30 bg-[#f8fbff]/90 backdrop-blur-xl">
        <div className="container-main py-4">
          <div className="flex items-center justify-between gap-4 rounded-[26px] bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-[rgba(15,23,42,0.05)] md:px-5">
            <Link to="/" className="shrink-0">
              <BrandMark
                logo={brand.logo}
                siteName={brand.siteName}
                version={brand.version}
                theme={theme}
              />
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <NavLinkItem
                  key={item.to}
                  item={item}
                  active={isActive(item.to)}
                  theme={theme}
                />
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold transition"
                style={{
                  color: theme.menuLinkColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.menuLinkHoverColor;
                  e.currentTarget.style.backgroundColor = rgba(
                    theme.menuLinkHoverColor,
                    0.08,
                  );
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.menuLinkColor;
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Login
              </button>

              <Link
                to="/register"
                className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
                style={{
                  backgroundColor: theme.primaryColor,
                  boxShadow: `0 12px 24px ${rgba(theme.primaryColor, 0.22)}`,
                }}
              >
                Register
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="rounded-full p-2.5 text-[#0f172a] transition hover:bg-slate-50 md:hidden"
                aria-label="Menu"
              >
                <span className="text-xl font-bold">☰</span>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="mt-3 md:hidden">
              <div className="flex flex-col gap-2 rounded-[24px] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(15,23,42,0.05)]">
                {navItems.map((item) => (
                  <NavLinkItem
                    key={item.to}
                    item={item}
                    active={isActive(item.to)}
                    theme={theme}
                    mobile
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <LoginMenu
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        theme={theme}
        siteName={brand.siteName}
      />
    </>
  );
}

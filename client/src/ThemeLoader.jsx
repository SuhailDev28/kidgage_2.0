import { useEffect } from "react";
import { publicApi } from "./lib/api.js";

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;
  return `${base}/uploads/settings/${raw}`;
}

function setCssVar(name, value) {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
}

function upsertMeta({ name, property, content }) {
  if (!content) return;

  let selector = "";
  if (name) selector = `meta[name="${name}"]`;
  if (property) selector = `meta[property="${property}"]`;

  let element = document.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    if (name) element.setAttribute("name", name);
    if (property) element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function ensureThemeColor(content) {
  if (!content) return;

  let element = document.querySelector('meta[name="theme-color"]');

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", "theme-color");
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function ensureFavicon(href) {
  if (!href) return;

  let icon =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]');

  if (!icon) {
    icon = document.createElement("link");
    icon.setAttribute("rel", "icon");
    document.head.appendChild(icon);
  }

  icon.setAttribute("href", href);
}

export default function ThemeLoader() {
  useEffect(() => {
    let active = true;

    async function loadTheme() {
      try {
        const res = await publicApi.get("/settings");
        if (!active) return;

        const settings = res?.data?.settings || {};

        const siteName = settings.siteName || "KidGage";
        const primaryColor = settings.primaryColor || "#2563eb";
        const secondaryColor = settings.secondaryColor || "#6d28d9";
        const metaTitle = settings.metaTitle || siteName;
        const metaDescription =
          settings.metaDescription || settings.tagline || "";
        const favicon = normalizeImage(settings.favicon || "");

        setCssVar("--kg-blue", primaryColor);
        setCssVar("--kg-orange", secondaryColor);

        setCssVar("--kg-primary", primaryColor);
        setCssVar("--kg-secondary", secondaryColor);

        setCssVar("--kg-link", primaryColor);
        setCssVar("--kg-button", primaryColor);
        setCssVar("--kg-button-alt", secondaryColor);

        document.title = metaTitle;

        upsertMeta({ name: "description", content: metaDescription });
        upsertMeta({ property: "og:title", content: metaTitle });
        upsertMeta({ property: "og:description", content: metaDescription });
        upsertMeta({ property: "og:site_name", content: siteName });

        ensureThemeColor(primaryColor);

        if (favicon) {
          ensureFavicon(favicon);
        }

        document.documentElement.setAttribute("data-theme-loaded", "true");
      } catch (error) {
        console.error("Failed to load theme settings:", error);
      }
    }

    loadTheme();

    return () => {
      active = false;
    };
  }, []);

  return null;
}

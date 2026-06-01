// client/src/main.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { PublicSettingsProvider, usePublicSettings } from "./context/PublicSettingsProvider.jsx";
import { AppRouter } from "./app/router.jsx";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt.jsx";
import PwaInstallButton from "./components/PwaInstallButton.jsx";
import "./index.css";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

function getApiOrigin() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  return apiBase || FALLBACK_API_ORIGIN;
}

function normalizeAssetUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const base = getApiOrigin();

  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/settings/${raw}`;
}

function upsertMetaByName(name, content) {
  if (!name || !content) return;

  let element = document.querySelector(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertMetaByProperty(property, content) {
  if (!property || !content) return;

  let element = document.querySelector(`meta[property="${property}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertLink(rel, href, extraAttrs = {}) {
  if (!rel || !href) return;

  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);

  Object.entries(extraAttrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      element.setAttribute(key, value);
    }
  });
}

function PublicHeadManager() {
  const contextValue = usePublicSettings();

  const settings =
    contextValue?.settings ||
    contextValue?.publicSettings ||
    contextValue?.data ||
    contextValue ||
    {};

  useEffect(() => {
    const siteName = String(settings.siteName || "KidGage").trim();
    const description = String(
      settings.metaDescription ||
        settings.tagline ||
        "KidGage is a kids activity booking platform for parents to find academies, select activities, and book available slots.",
    ).trim();

    const themeColor = String(
      settings.primaryColor || settings.themeColor || "#AEC4A0",
    ).trim();

    const faviconUrl = normalizeAssetUrl(settings.favicon) || "/favicon.ico";

    const pwaLogoUrl =
      normalizeAssetUrl(settings.pwaLogo) ||
      normalizeAssetUrl(settings.logo) ||
      "/pwa-512x512.png";

    const title = String(settings.metaTitle || siteName || "KidGage").trim();

    document.title = title;

    upsertMetaByName("description", description);
    upsertMetaByName("theme-color", themeColor);

    upsertMetaByName("apple-mobile-web-app-title", siteName);

    upsertMetaByProperty("og:title", siteName);
    upsertMetaByProperty("og:description", description);
    upsertMetaByProperty("og:image", pwaLogoUrl);

    upsertMetaByName("twitter:title", siteName);
    upsertMetaByName("twitter:description", description);
    upsertMetaByName("twitter:image", pwaLogoUrl);

    upsertLink("icon", faviconUrl);
    upsertLink("apple-touch-icon", pwaLogoUrl);

    upsertLink("manifest", "/api/public/manifest.webmanifest", {
      crossorigin: "use-credentials",
    });
  }, [settings]);

  return null;
}

function RootApp() {
  return (
    <PublicSettingsProvider>
      <PublicHeadManager />
      <AppRouter />
      <PwaUpdatePrompt />
      <PwaInstallButton />
    </PublicSettingsProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <BrowserRouter>
        <RootApp />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
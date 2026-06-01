import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { publicApi } from "../lib/api.js";

const PublicSettingsContext = createContext({
  settings: null,
  loading: true,
  refreshSettings: async () => {},
});

const defaultSettings = {
  siteName: "KidGage",
  tagline: "Discover the best kids activities in Qatar",

  logo: "",
  favicon: "",
  pwaLogo: "",

  logoUpdatedAt: null,
  faviconUpdatedAt: null,
  pwaLogoUpdatedAt: null,

  primaryColor: "#2563eb",
  secondaryColor: "#6d28d9",

  menuLinkColor: "#475569",
  menuLinkHoverColor: "#ec7a3b",
  menuLinkActiveColor: "#ec7a3b",
  menuLinkActiveBg: "#fff4ec",

  contactEmail: "",
  contactPhone: "",
  whatsapp: "",
  website: "",
  address: "",

  footerDescription:
    "Book activities for kids across trusted academies and help parents discover enriching experiences with confidence, clarity, and joy.",
  footerCopyright: "© KidGage. All rights reserved.",

  metaTitle: "KidGage | Kids Activities Booking Platform",
  metaDescription:
    "Book activities, programs, and events for children across trusted academies.",

  instagram: "",
  facebook: "",
  linkedin: "",
  youtube: "",
  tiktok: "",

  allowProviderRegistration: true,
  allowParentRegistration: true,

  showBlogs: true,
  showEvents: true,
  showTopBrands: true,
  showTopActivities: true,

  maintenanceMode: false,
  maintenanceMessage: "We are updating KidGage. Please check back shortly.",

  updatedAt: null,
};

function normalizeSettings(value = {}) {
  return {
    ...defaultSettings,
    ...value,

    siteName: value.siteName || defaultSettings.siteName,
    tagline: value.tagline || defaultSettings.tagline,

    logo: value.logo || "",
    favicon: value.favicon || "",
    pwaLogo: value.pwaLogo || "",

    logoUpdatedAt: value.logoUpdatedAt || value.updatedAt || null,
    faviconUpdatedAt: value.faviconUpdatedAt || value.updatedAt || null,
    pwaLogoUpdatedAt: value.pwaLogoUpdatedAt || value.updatedAt || null,

    primaryColor: value.primaryColor || defaultSettings.primaryColor,
    secondaryColor: value.secondaryColor || defaultSettings.secondaryColor,

    menuLinkColor: value.menuLinkColor || defaultSettings.menuLinkColor,
    menuLinkHoverColor:
      value.menuLinkHoverColor || defaultSettings.menuLinkHoverColor,
    menuLinkActiveColor:
      value.menuLinkActiveColor || defaultSettings.menuLinkActiveColor,
    menuLinkActiveBg: value.menuLinkActiveBg || defaultSettings.menuLinkActiveBg,

    contactEmail: value.contactEmail || "",
    contactPhone: value.contactPhone || "",
    whatsapp: value.whatsapp || "",
    website: value.website || "",
    address: value.address || "",

    footerDescription:
      value.footerDescription || defaultSettings.footerDescription,
    footerCopyright: value.footerCopyright || defaultSettings.footerCopyright,

    metaTitle: value.metaTitle || defaultSettings.metaTitle,
    metaDescription: value.metaDescription || defaultSettings.metaDescription,

    instagram: value.instagram || "",
    facebook: value.facebook || "",
    linkedin: value.linkedin || "",
    youtube: value.youtube || "",
    tiktok: value.tiktok || "",

    allowProviderRegistration: value.allowProviderRegistration !== false,
    allowParentRegistration: value.allowParentRegistration !== false,

    showBlogs: value.showBlogs !== false,
    showEvents: value.showEvents !== false,
    showTopBrands: value.showTopBrands !== false,
    showTopActivities: value.showTopActivities !== false,

    maintenanceMode: Boolean(value.maintenanceMode),
    maintenanceMessage:
      value.maintenanceMessage || defaultSettings.maintenanceMessage,

    updatedAt: value.updatedAt || null,
  };
}

export function PublicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    try {
      setLoading(true);

      const res = await publicApi.get("/settings");
      const nextSettings = res?.data?.settings || {};

      setSettings(normalizeSettings(nextSettings));
    } catch (error) {
      console.error("Failed to load public settings:", error);
      setSettings((prev) => normalizeSettings(prev));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSettings();
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refreshSettings,
    }),
    [settings, loading],
  );

  return (
    <PublicSettingsContext.Provider value={value}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext);
}
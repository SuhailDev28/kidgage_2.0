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
  logoUpdatedAt: null,
  primaryColor: "#2563eb",
  secondaryColor: "#6d28d9",
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

export function PublicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  async function refreshSettings() {
    try {
      setLoading(true);
      const res = await publicApi.get("/settings");
      const nextSettings = res?.data?.settings || {};
      setSettings((prev) => ({
        ...prev,
        ...nextSettings,
      }));
    } catch (error) {
      console.error("Failed to load public settings:", error);
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

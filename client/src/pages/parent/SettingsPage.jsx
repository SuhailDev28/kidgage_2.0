// client/src/pages/parent/SettingsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  Moon,
  Sun,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { logout, getUser } from "../../lib/auth.js";

const STORAGE_KEY = "kidgage_parent_settings";

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  smsNotifications: false,
  bookingUpdates: true,
  paymentUpdates: true,
  promotionUpdates: false,
  darkMode: false,
  compactCards: false,
  privacyMode: false,
};

function readLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore localStorage errors
  }
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ec7a3b]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-base font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
          checked ? "bg-[#ec7a3b]" : "bg-slate-200"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function ParentSettingsPage() {
  const navigate = useNavigate();

  const user = useMemo(() => getUser?.() || {}, []);
  const parentName = user?.fullName || user?.name || "Parent";
  const parentEmail = user?.email || "";

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateSetting(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const local = readLocalSettings();
      setSettings(local);

      try {
        const res = await api.get("/parent/settings");
        const serverSettings =
          res.data?.settings || res.data?.parentSettings || res.data || {};

        setSettings({
          ...DEFAULT_SETTINGS,
          ...local,
          ...serverSettings,
        });
      } catch {
        // Local settings are enough if backend endpoint is not ready.
      }
    } catch {
      setSettings(readLocalSettings());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      saveLocalSettings(settings);

      try {
        await api.patch("/parent/settings", settings);
      } catch {
        // Keep local save even if backend endpoint is unavailable.
      }

      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function resetLocalSettings() {
    const next = DEFAULT_SETTINGS;
    setSettings(next);
    saveLocalSettings(next);
    setMessage("Settings reset to default.");
    setError("");
  }

  return (
    <section className="px-3 py-5 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-5 py-7 sm:px-7">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-orange-100/70 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
                  <Settings className="h-3.5 w-3.5" />
                  Parent Settings
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                  Settings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage notifications, privacy, display preferences, and
                  account actions for {parentName}.
                </p>
              </div>

              <button
                type="button"
                onClick={loadSettings}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <SectionCard
              title="Notifications"
              description="Choose how KidGage should notify you about bookings and payments."
            >
              <ToggleRow
                icon={Mail}
                title="Email Notifications"
                description="Receive important booking and account updates by email."
                checked={settings.emailNotifications}
                onChange={(value) => updateSetting("emailNotifications", value)}
              />

              <ToggleRow
                icon={Smartphone}
                title="SMS Notifications"
                description="Receive urgent updates on your phone when available."
                checked={settings.smsNotifications}
                onChange={(value) => updateSetting("smsNotifications", value)}
              />

              <ToggleRow
                icon={Bell}
                title="Booking Updates"
                description="Notify me when bookings are confirmed, changed, or cancelled."
                checked={settings.bookingUpdates}
                onChange={(value) => updateSetting("bookingUpdates", value)}
              />

              <ToggleRow
                icon={CreditCardIcon}
                title="Payment Updates"
                description="Notify me about payment confirmations, pending payments, and receipts."
                checked={settings.paymentUpdates}
                onChange={(value) => updateSetting("paymentUpdates", value)}
              />

              <ToggleRow
                icon={Bell}
                title="Promotions"
                description="Receive occasional offers and academy activity recommendations."
                checked={settings.promotionUpdates}
                onChange={(value) => updateSetting("promotionUpdates", value)}
              />
            </SectionCard>

            <SectionCard
              title="Display Preferences"
              description="Customize the parent portal experience on this device."
            >
              <ToggleRow
                icon={settings.darkMode ? Moon : Sun}
                title="Dark Mode Preference"
                description="Save your dark mode preference for future UI support."
                checked={settings.darkMode}
                onChange={(value) => updateSetting("darkMode", value)}
              />

              <ToggleRow
                icon={Settings}
                title="Compact Cards"
                description="Show bookings and payments in a more compact layout where supported."
                checked={settings.compactCards}
                onChange={(value) => updateSetting("compactCards", value)}
              />

              <ToggleRow
                icon={ShieldCheck}
                title="Privacy Mode"
                description="Hide sensitive payment details in supported views."
                checked={settings.privacyMode}
                onChange={(value) => updateSetting("privacyMode", value)}
              />
            </SectionCard>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-900">
                Account Summary
              </h2>

              <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Parent
                </div>
                <div className="mt-2 text-base font-black text-slate-900">
                  {parentName}
                </div>
                <div className="mt-1 break-words text-sm font-medium text-slate-500">
                  {parentEmail || "No email"}
                </div>
              </div>

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(236,122,59,0.22)] transition hover:brightness-95 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </button>

              <button
                type="button"
                onClick={resetLocalSettings}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Defaults
              </button>
            </div>

            <div className="rounded-[30px] border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-xl font-black text-red-900">
                Account Actions
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-700">
                You can safely log out from this device. Account deletion should
                be handled by support or admin approval.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreditCardIcon(props) {
  return <Smartphone {...props} />;
}

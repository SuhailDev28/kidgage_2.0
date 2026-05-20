import React, { useEffect, useMemo, useState } from "react";
import {
  Save,
  RefreshCw,
  Settings2,
  Image as ImageIcon,
  Globe,
  Phone,
  Mail,
  Palette,
  ShieldCheck,
  Search,
  Wrench,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";

const initialForm = {
  siteName: "KidGage",
  tagline: "Discover the best kids activities in Qatar",

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

  logo: null,
  favicon: null,
  logoUrl: "",
  faviconUrl: "",
};

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/settings/${raw}`;
}

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (!clean) return { r: 37, g: 99, b: 235 };

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

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  primaryColor = "#2563eb",
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: rgba(primaryColor, 0.12),
            color: primaryColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black tracking-tight text-slate-900">
            {title}
          </h3>

          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${className}`}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${className}`}
    />
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-16 shrink-0 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1"
        />
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  primaryColor = "#2563eb",
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-4 text-left transition"
      style={{
        borderColor: checked ? rgba(primaryColor, 0.25) : "#e2e8f0",
        backgroundColor: checked ? rgba(primaryColor, 0.08) : "#f8fafc",
      }}
    >
      <div>
        <div className="text-sm font-bold text-slate-900">{label}</div>
        {description ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>

      <div
        className="relative h-7 w-12 shrink-0 rounded-full transition"
        style={{
          backgroundColor: checked ? primaryColor : "#cbd5e1",
        }}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>
    </button>
  );
}

function UploadBox({
  title,
  preview,
  fileName,
  accept,
  onChange,
  secondaryColor = "#6d28d9",
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {preview ? (
            <img
              src={preview}
              alt={title}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">
            PNG, JPG, SVG or ICO supported where applicable.
          </div>

          {fileName ? (
            <div className="mt-2 truncate text-xs font-medium text-slate-600">
              {fileName}
            </div>
          ) : null}

          <label
            className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition"
            style={{ backgroundColor: secondaryColor }}
          >
            <Upload className="h-4 w-4" />
            Upload file
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={onChange}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const logoPreview = useMemo(
    () =>
      form.logo ? URL.createObjectURL(form.logo) : normalizeImage(form.logoUrl),
    [form.logo, form.logoUrl],
  );

  const faviconPreview = useMemo(
    () =>
      form.favicon
        ? URL.createObjectURL(form.favicon)
        : normalizeImage(form.faviconUrl),
    [form.favicon, form.faviconUrl],
  );

  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      if (faviconPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(faviconPreview);
      }
    };
  }, [logoPreview, faviconPreview]);

  async function loadSettings({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");
      setMessage("");

      const res = await api.get("/super-admin/settings");
      const data = res?.data?.settings || res?.data || {};

      setForm((prev) => ({
        ...prev,

        siteName: data.siteName || initialForm.siteName,
        tagline: data.tagline || initialForm.tagline,

        primaryColor: data.primaryColor || initialForm.primaryColor,
        secondaryColor: data.secondaryColor || initialForm.secondaryColor,

        menuLinkColor: data.menuLinkColor || initialForm.menuLinkColor,
        menuLinkHoverColor:
          data.menuLinkHoverColor || initialForm.menuLinkHoverColor,
        menuLinkActiveColor:
          data.menuLinkActiveColor || initialForm.menuLinkActiveColor,
        menuLinkActiveBg: data.menuLinkActiveBg || initialForm.menuLinkActiveBg,

        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        whatsapp: data.whatsapp || "",
        website: data.website || "",
        address: data.address || "",

        footerDescription:
          data.footerDescription || initialForm.footerDescription,
        footerCopyright: data.footerCopyright || initialForm.footerCopyright,

        metaTitle: data.metaTitle || initialForm.metaTitle,
        metaDescription: data.metaDescription || initialForm.metaDescription,

        instagram: data.instagram || "",
        facebook: data.facebook || "",
        youtube: data.youtube || "",
        tiktok: data.tiktok || "",

        allowProviderRegistration:
          data.allowProviderRegistration ??
          initialForm.allowProviderRegistration,
        allowParentRegistration:
          data.allowParentRegistration ?? initialForm.allowParentRegistration,

        showBlogs: data.showBlogs ?? initialForm.showBlogs,
        showEvents: data.showEvents ?? initialForm.showEvents,
        showTopBrands: data.showTopBrands ?? initialForm.showTopBrands,
        showTopActivities:
          data.showTopActivities ?? initialForm.showTopActivities,

        maintenanceMode: data.maintenanceMode ?? initialForm.maintenanceMode,
        maintenanceMessage:
          data.maintenanceMessage || initialForm.maintenanceMessage,

        logo: null,
        favicon: null,
        logoUrl: data.logo || "",
        faviconUrl: data.favicon || "",
      }));
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load settings right now.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, logo: file }));
  }

  function onFaviconChange(e) {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, favicon: file }));
  }

  async function handleSave(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = new FormData();

      payload.append("siteName", form.siteName);
      payload.append("tagline", form.tagline);

      payload.append("primaryColor", form.primaryColor);
      payload.append("secondaryColor", form.secondaryColor);

      payload.append("menuLinkColor", form.menuLinkColor);
      payload.append("menuLinkHoverColor", form.menuLinkHoverColor);
      payload.append("menuLinkActiveColor", form.menuLinkActiveColor);
      payload.append("menuLinkActiveBg", form.menuLinkActiveBg);

      payload.append("contactEmail", form.contactEmail);
      payload.append("contactPhone", form.contactPhone);
      payload.append("whatsapp", form.whatsapp);
      payload.append("website", form.website);
      payload.append("address", form.address);

      payload.append("footerDescription", form.footerDescription);
      payload.append("footerCopyright", form.footerCopyright);

      payload.append("metaTitle", form.metaTitle);
      payload.append("metaDescription", form.metaDescription);

      payload.append("instagram", form.instagram);
      payload.append("facebook", form.facebook);
      payload.append("youtube", form.youtube);
      payload.append("tiktok", form.tiktok);

      payload.append(
        "allowProviderRegistration",
        String(form.allowProviderRegistration),
      );
      payload.append(
        "allowParentRegistration",
        String(form.allowParentRegistration),
      );

      payload.append("showBlogs", String(form.showBlogs));
      payload.append("showEvents", String(form.showEvents));
      payload.append("showTopBrands", String(form.showTopBrands));
      payload.append("showTopActivities", String(form.showTopActivities));

      payload.append("maintenanceMode", String(form.maintenanceMode));
      payload.append("maintenanceMessage", form.maintenanceMessage);

      if (form.logo) payload.append("logo", form.logo);
      if (form.favicon) payload.append("favicon", form.favicon);

      const res = await api.put("/super-admin/settings", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res?.data?.settings || {};

      setForm((prev) => ({
        ...prev,
        ...updated,
        logo: null,
        favicon: null,
        logoUrl: updated.logo || prev.logoUrl,
        faviconUrl: updated.favicon || prev.faviconUrl,
      }));

      setMessage("Settings updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        </div>
        <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section
        className="rounded-[32px] border border-slate-200 p-6 shadow-sm lg:p-8"
        style={{
          background: `linear-gradient(135deg, ${rgba(
            form.primaryColor,
            0.08,
          )} 0%, #ffffff 45%, ${rgba(form.secondaryColor, 0.08)} 100%)`,
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[780px]">
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
              style={{
                backgroundColor: rgba(form.primaryColor, 0.12),
                color: form.primaryColor,
              }}
            >
              Super Admin
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 lg:text-4xl">
              Platform Settings
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              Manage KidGage branding, public platform configuration, menu
              colors, feature visibility, contact details, SEO content, and
              maintenance mode.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => loadSettings({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Reload"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
              }}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div className="text-sm font-medium text-emerald-700">
              {message}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
            <div className="text-sm font-medium text-rose-700">{error}</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          icon={ImageIcon}
          title="Branding & Visual Identity"
          subtitle="Upload platform logo, favicon, and adjust brand colors."
          primaryColor={form.primaryColor}
        >
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <UploadBox
                title="Platform Logo"
                preview={logoPreview}
                fileName={form.logo?.name || ""}
                accept="image/*"
                onChange={onLogoChange}
                secondaryColor={form.secondaryColor}
              />

              <UploadBox
                title="Favicon"
                preview={faviconPreview}
                fileName={form.favicon?.name || ""}
                accept=".png,.jpg,.jpeg,.svg,.ico,image/*"
                onChange={onFaviconChange}
                secondaryColor={form.secondaryColor}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Site Name">
                <TextInput
                  value={form.siteName}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  placeholder="KidGage"
                />
              </Field>

              <Field label="Tagline">
                <TextInput
                  value={form.tagline}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder="Short brand line"
                />
              </Field>

              <ColorField
                label="Primary Color"
                value={form.primaryColor}
                onChange={(value) => updateField("primaryColor", value)}
              />

              <ColorField
                label="Secondary Color"
                value={form.secondaryColor}
                onChange={(value) => updateField("secondaryColor", value)}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Palette}
          title="Menu Link Colors"
          subtitle="Control public website navigation link, hover, and active states."
          primaryColor={form.primaryColor}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <ColorField
              label="Menu Link Color"
              value={form.menuLinkColor}
              onChange={(value) => updateField("menuLinkColor", value)}
            />

            <ColorField
              label="Menu Hover Color"
              value={form.menuLinkHoverColor}
              onChange={(value) => updateField("menuLinkHoverColor", value)}
            />

            <ColorField
              label="Active Link Color"
              value={form.menuLinkActiveColor}
              onChange={(value) => updateField("menuLinkActiveColor", value)}
            />

            <ColorField
              label="Active Link Background"
              value={form.menuLinkActiveBg}
              onChange={(value) => updateField("menuLinkActiveBg", value)}
            />
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Menu Preview
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2.5 text-sm font-bold transition"
                style={{
                  color: form.menuLinkColor,
                }}
              >
                Normal Link
              </button>

              <button
                type="button"
                className="rounded-full px-4 py-2.5 text-sm font-bold transition"
                style={{
                  color: form.menuLinkHoverColor,
                  backgroundColor: rgba(form.menuLinkHoverColor, 0.08),
                }}
              >
                Hover Link
              </button>

              <button
                type="button"
                className="rounded-full px-4 py-2.5 text-sm font-bold transition"
                style={{
                  color: form.menuLinkActiveColor,
                  backgroundColor: form.menuLinkActiveBg,
                }}
              >
                Active Link
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          icon={Phone}
          title="Contact & Public Information"
          subtitle="Global contact details shown across the website and footer."
          primaryColor={form.primaryColor}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Contact Email">
              <TextInput
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder="info@kidgage.qa"
              />
            </Field>

            <Field label="Contact Phone">
              <TextInput
                value={form.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                placeholder="+974 0000 0000"
              />
            </Field>

            <Field label="WhatsApp">
              <TextInput
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                placeholder="+974 0000 0000"
              />
            </Field>

            <Field label="Website">
              <TextInput
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://kidgage.qa"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Address">
                <TextArea
                  rows={4}
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Doha, Qatar"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Footer Description">
                <TextArea
                  rows={4}
                  value={form.footerDescription}
                  onChange={(e) =>
                    updateField("footerDescription", e.target.value)
                  }
                  placeholder="Short footer description shown in the public footer."
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Footer Copyright">
                <TextInput
                  value={form.footerCopyright}
                  onChange={(e) =>
                    updateField("footerCopyright", e.target.value)
                  }
                  placeholder="© KidGage. All rights reserved."
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Globe}
          title="Social Links"
          subtitle="Manage public social media and brand channels."
          primaryColor={form.primaryColor}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Instagram">
              <TextInput
                value={form.instagram}
                onChange={(e) => updateField("instagram", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </Field>

            <Field label="Facebook">
              <TextInput
                value={form.facebook}
                onChange={(e) => updateField("facebook", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </Field>

            <Field label="YouTube">
              <TextInput
                value={form.youtube}
                onChange={(e) => updateField("youtube", e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </Field>

            <Field label="TikTok">
              <TextInput
                value={form.tiktok}
                onChange={(e) => updateField("tiktok", e.target.value)}
                placeholder="https://tiktok.com/@..."
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          icon={Search}
          title="SEO Settings"
          subtitle="Control global meta content for search engines and sharing."
          primaryColor={form.primaryColor}
        >
          <div className="space-y-5">
            <Field label="Meta Title">
              <TextInput
                value={form.metaTitle}
                onChange={(e) => updateField("metaTitle", e.target.value)}
                placeholder="Meta title"
              />
            </Field>

            <Field label="Meta Description" hint="Recommended 140–160 chars">
              <TextArea
                rows={5}
                value={form.metaDescription}
                onChange={(e) => updateField("metaDescription", e.target.value)}
                placeholder="Meta description"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={Wrench}
          title="Maintenance Mode"
          subtitle="Temporarily restrict public access while you update the platform."
          primaryColor={form.primaryColor}
        >
          <div className="space-y-5">
            <Toggle
              checked={form.maintenanceMode}
              onChange={(v) => updateField("maintenanceMode", v)}
              label="Enable Maintenance Mode"
              description="Public visitors will see a maintenance screen."
              primaryColor={form.primaryColor}
            />

            <Field label="Maintenance Message">
              <TextArea
                rows={5}
                value={form.maintenanceMessage}
                onChange={(e) =>
                  updateField("maintenanceMessage", e.target.value)
                }
                placeholder="Maintenance message"
              />
            </Field>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        icon={Settings2}
        title="Feature Visibility"
        subtitle="Enable or disable sections and public registration flows."
        primaryColor={form.primaryColor}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Toggle
            checked={form.allowProviderRegistration}
            onChange={(v) => updateField("allowProviderRegistration", v)}
            label="Provider Registration"
            description="Allow academies/providers to submit joining forms."
            primaryColor={form.primaryColor}
          />

          <Toggle
            checked={form.allowParentRegistration}
            onChange={(v) => updateField("allowParentRegistration", v)}
            label="Parent Registration"
            description="Allow parents to create accounts from public pages."
            primaryColor={form.primaryColor}
          />

          <Toggle
            checked={form.showBlogs}
            onChange={(v) => updateField("showBlogs", v)}
            label="Show Blogs"
            description="Display the blog section and blog pages publicly."
            primaryColor={form.primaryColor}
          />

          <Toggle
            checked={form.showEvents}
            onChange={(v) => updateField("showEvents", v)}
            label="Show Events"
            description="Display events across homepage and public event pages."
            primaryColor={form.primaryColor}
          />

          <Toggle
            checked={form.showTopBrands}
            onChange={(v) => updateField("showTopBrands", v)}
            label="Show Top Brands"
            description="Show featured academies/brands on the public site."
            primaryColor={form.primaryColor}
          />

          <Toggle
            checked={form.showTopActivities}
            onChange={(v) => updateField("showTopActivities", v)}
            label="Show Top Activities"
            description="Show homepage top activities section."
            primaryColor={form.primaryColor}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={ShieldCheck}
        title="Live Brand Preview"
        subtitle="Quick visual preview using your current branding configuration."
        primaryColor={form.primaryColor}
      >
        <div className="overflow-hidden rounded-[28px] border border-slate-200">
          <div
            className="px-6 py-5 text-white"
            style={{
              background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/20">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Palette className="h-6 w-6 text-white" />
                )}
              </div>

              <div>
                <div className="text-xl font-black">{form.siteName}</div>
                <div className="text-sm text-white/85">{form.tagline}</div>
              </div>
            </div>
          </div>

          <div className="space-y-5 bg-white p-6">
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              {["Academies", "Activities", "Events", "Blogs"].map(
                (item, index) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full px-4 py-2.5 text-sm font-bold transition"
                    style={
                      index === 1
                        ? {
                            color: form.menuLinkActiveColor,
                            backgroundColor: form.menuLinkActiveBg,
                          }
                        : {
                            color: form.menuLinkColor,
                            backgroundColor: "#ffffff",
                          }
                    }
                  >
                    {item}
                  </button>
                ),
              )}
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: rgba(form.primaryColor, 0.08) }}
            >
              <div className="text-sm font-semibold text-slate-500">
                Contact
              </div>

              <div className="mt-2 space-y-1 text-sm text-slate-800">
                <div className="flex items-center gap-2">
                  <Mail
                    className="h-4 w-4"
                    style={{ color: form.primaryColor }}
                  />
                  {form.contactEmail || "info@example.com"}
                </div>

                <div className="flex items-center gap-2">
                  <Phone
                    className="h-4 w-4"
                    style={{ color: form.primaryColor }}
                  />
                  {form.contactPhone || "+974 0000 0000"}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
              }}
            >
              Sample Action Button
            </button>

            <div className="space-y-1">
              <div className="text-sm text-slate-600">
                {form.footerDescription}
              </div>

              <div className="text-xs text-slate-400">
                {form.footerCopyright}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </form>
  );
}

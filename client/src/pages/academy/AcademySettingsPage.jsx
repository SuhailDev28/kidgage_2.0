// client/src/pages/academy/AcademySettingsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { api } from "../../lib/api.js";

const EMPTY_SETTINGS = {
  name: "",
  academyName: "",
  slug: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  website: "",
  description: "",
  logo: "",
  academyLogo: "",
  coverImage: "",
  bannerImage: "",
  status: "ACTIVE",

  establishedYear: "",
  ownerName: "",
  contactPerson: "",
  whatsapp: "",
  country: "Qatar",

  shortBio: "",
  mission: "",
  vision: "",

  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",

  facilities: [],
  programsOffered: [],
  ageGroups: [],
  languages: [],
  awards: [],
  recognitions: [],
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

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;
  return `${base}/uploads/${raw}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function Field({ label, children, hint = "" }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-700">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </label>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}

        <div>
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function AlertBox({ type = "success", children }) {
  const isError = type === "error";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{children}</span>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <TextInput
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-11 pr-12"
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ImageUploadBox({ title, image, inputRef, onPick }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">
            Upload JPG, PNG, or WebP image.
          </div>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <UploadCloud className="h-4 w-4" />
          Upload
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {image ? (
          <img src={image} alt={title} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 items-center justify-center text-slate-400">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

export default function AcademySettingsPage() {
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return normalizeImage(settings.logo || settings.academyLogo);
  }, [logoFile, settings.logo, settings.academyLogo]);

  const bannerPreview = useMemo(() => {
    if (bannerFile) return URL.createObjectURL(bannerFile);
    return normalizeImage(settings.bannerImage || settings.coverImage);
  }, [bannerFile, settings.bannerImage, settings.coverImage]);

  async function loadSettings() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const { data } = await api.get("/academy/settings");
      const next = data?.settings || data?.academy || data?.profile || {};

      setSettings({
        ...EMPTY_SETTINGS,
        ...next,
        name: next.name || next.academyName || "",
        academyName: next.academyName || next.name || "",
        facilities: toArray(next.facilities),
        programsOffered: toArray(next.programsOffered),
        ageGroups: toArray(next.ageGroups),
        languages: toArray(next.languages),
        awards: toArray(next.awards),
        recognitions: toArray(next.recognitions),
      });

      setLogoFile(null);
      setBannerFile(null);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load academy settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updatePasswordField(key, value) {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoPick(e) {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
  }

  function handleBannerPick(e) {
    const file = e.target.files?.[0];
    if (file) setBannerFile(file);
  }

  async function saveSettings(e) {
    e.preventDefault();

    try {
      setSavingSettings(true);
      setMessage("");
      setError("");

      const form = new FormData();

      form.append("name", settings.name || settings.academyName || "");
      form.append("email", settings.email || "");
      form.append("phone", settings.phone || "");
      form.append("city", settings.city || "");
      form.append("address", settings.address || "");
      form.append("website", settings.website || "");
      form.append("description", settings.description || "");

      form.append("establishedYear", settings.establishedYear || "");
      form.append("ownerName", settings.ownerName || "");
      form.append("contactPerson", settings.contactPerson || "");
      form.append("whatsapp", settings.whatsapp || "");
      form.append("country", settings.country || "Qatar");

      form.append("shortBio", settings.shortBio || "");
      form.append("mission", settings.mission || "");
      form.append("vision", settings.vision || "");

      form.append("instagram", settings.instagram || "");
      form.append("facebook", settings.facebook || "");
      form.append("youtube", settings.youtube || "");
      form.append("tiktok", settings.tiktok || "");

      form.append("facilities", JSON.stringify(toArray(settings.facilities)));
      form.append(
        "programsOffered",
        JSON.stringify(toArray(settings.programsOffered)),
      );
      form.append("ageGroups", JSON.stringify(toArray(settings.ageGroups)));
      form.append("languages", JSON.stringify(toArray(settings.languages)));
      form.append("awards", JSON.stringify(toArray(settings.awards)));
      form.append(
        "recognitions",
        JSON.stringify(toArray(settings.recognitions)),
      );

      if (logoFile) form.append("logo", logoFile);
      if (bannerFile) form.append("bannerImage", bannerFile);

      const { data } = await api.put("/academy/settings", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const next = data?.settings || data?.academy || data?.profile || {};

      setSettings({
        ...EMPTY_SETTINGS,
        ...next,
        name: next.name || next.academyName || "",
        academyName: next.academyName || next.name || "",
        facilities: toArray(next.facilities),
        programsOffered: toArray(next.programsOffered),
        ageGroups: toArray(next.ageGroups),
        languages: toArray(next.languages),
        awards: toArray(next.awards),
        recognitions: toArray(next.recognitions),
      });

      setLogoFile(null);
      setBannerFile(null);
      setMessage(data?.message || "Academy settings updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to save academy settings.",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      setError("Current password is required.");
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      setMessage("");
      setError("");

      const { data } = await api.put("/academy/change-password", passwordForm);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(data?.message || "Password updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full bg-slate-50 px-5 py-6 md:px-8">
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-[30px] bg-slate-100" />
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-96 animate-pulse rounded-[30px] bg-slate-100" />
            <div className="h-96 animate-pulse rounded-[30px] bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 px-5 py-6 md:px-8">
      <div className="mb-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
              <Settings className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Academy Settings
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Manage academy identity, public contact details, media, social
                links, and account security.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadSettings}
              disabled={savingSettings || savingPassword}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>

            <button
              type="submit"
              form="academy-settings-form"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.28)] hover:brightness-95 disabled:opacity-60"
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {message ? (
        <div className="mb-5">
          <AlertBox>{message}</AlertBox>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5">
          <AlertBox type="error">{error}</AlertBox>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <form
          id="academy-settings-form"
          onSubmit={saveSettings}
          className="space-y-6 xl:col-span-8"
        >
          <SectionCard
            title="Academy Identity"
            subtitle="These details are used on academy profile pages and public listings."
            icon={Building2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Academy Name">
                <TextInput
                  value={settings.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Academy name"
                  required
                />
              </Field>

              <Field label="Slug" hint="Read-only public URL identifier.">
                <TextInput value={settings.slug || ""} readOnly />
              </Field>

              <Field label="Established Year">
                <TextInput
                  value={settings.establishedYear}
                  onChange={(e) =>
                    updateField("establishedYear", e.target.value)
                  }
                  placeholder="2020"
                />
              </Field>

              <Field label="Status">
                <TextInput value={settings.status || "ACTIVE"} readOnly />
              </Field>

              <Field label="Owner / Founder">
                <TextInput
                  value={settings.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  placeholder="Owner name"
                />
              </Field>

              <Field label="Contact Person">
                <TextInput
                  value={settings.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                  placeholder="Main contact person"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Short Bio">
                  <TextArea
                    rows={3}
                    value={settings.shortBio}
                    onChange={(e) => updateField("shortBio", e.target.value)}
                    placeholder="Short academy summary"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Description">
                  <TextArea
                    rows={6}
                    value={settings.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Full academy description"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Mission and Vision"
            subtitle="Show parents your academy purpose and standards."
            icon={ShieldCheck}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Mission">
                <TextArea
                  rows={5}
                  value={settings.mission}
                  onChange={(e) => updateField("mission", e.target.value)}
                  placeholder="Academy mission"
                />
              </Field>

              <Field label="Vision">
                <TextArea
                  rows={5}
                  value={settings.vision}
                  onChange={(e) => updateField("vision", e.target.value)}
                  placeholder="Academy vision"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Contact and Location"
            subtitle="These contact details are visible to parents."
            icon={Phone}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="academy@example.com"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="Phone">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={settings.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+974 0000 0000"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="WhatsApp">
                <TextInput
                  value={settings.whatsapp}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder="+974 0000 0000"
                />
              </Field>

              <Field label="Website">
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={settings.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://example.com"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="City">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={settings.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Doha"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="Country">
                <TextInput
                  value={settings.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Qatar"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Address">
                  <TextArea
                    rows={4}
                    value={settings.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full academy address"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Social Links"
            subtitle="Optional public links displayed on your academy profile."
            icon={Globe2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Instagram">
                <TextInput
                  value={settings.instagram}
                  onChange={(e) => updateField("instagram", e.target.value)}
                  placeholder="Instagram URL"
                />
              </Field>

              <Field label="Facebook">
                <TextInput
                  value={settings.facebook}
                  onChange={(e) => updateField("facebook", e.target.value)}
                  placeholder="Facebook URL"
                />
              </Field>

              <Field label="YouTube">
                <TextInput
                  value={settings.youtube}
                  onChange={(e) => updateField("youtube", e.target.value)}
                  placeholder="YouTube URL"
                />
              </Field>

              <Field label="TikTok">
                <TextInput
                  value={settings.tiktok}
                  onChange={(e) => updateField("tiktok", e.target.value)}
                  placeholder="TikTok URL"
                />
              </Field>
            </div>
          </SectionCard>
        </form>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard
            title="Brand Media"
            subtitle="Upload academy logo and banner."
            icon={Camera}
          >
            <div className="space-y-4">
              <ImageUploadBox
                title="Academy Logo"
                image={logoPreview}
                inputRef={logoInputRef}
                onPick={handleLogoPick}
              />

              <ImageUploadBox
                title="Academy Banner"
                image={bannerPreview}
                inputRef={bannerInputRef}
                onPick={handleBannerPick}
              />
            </div>
          </SectionCard>

          <form onSubmit={changePassword}>
            <SectionCard
              title="Change Password"
              subtitle="Update academy admin login password."
              icon={KeyRound}
            >
              <div className="space-y-4">
                <Field label="Current Password">
                  <PasswordInput
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      updatePasswordField("currentPassword", e.target.value)
                    }
                    placeholder="Current password"
                  />
                </Field>

                <Field label="New Password">
                  <PasswordInput
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      updatePasswordField("newPassword", e.target.value)
                    }
                    placeholder="Minimum 6 characters"
                  />
                </Field>

                <Field label="Confirm New Password">
                  <PasswordInput
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      updatePasswordField("confirmPassword", e.target.value)
                    }
                    placeholder="Repeat new password"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </SectionCard>
          </form>
        </div>
      </div>
    </div>
  );
}

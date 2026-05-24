// client/src/pages/public/AcademyRegisterPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  LinkIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { api, publicApi } from "../../lib/api.js";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

const DEFAULT_THEME = {
  siteName: "KidGage",
  tagline: "Kids Activity Booking",
  logo: "",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
};

const initialForm = {
  academyName: "",
  location: "",
  bio: "",
  address: "",
  crNumber: "",
  crDocument: null,
  phone: "",
  email: "",
  fullName: "",
  designation: "",
  website: "",
  instagram: "",
  agreed: false,
};

function getApiOrigin() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  return apiBase || FALLBACK_API_ORIGIN;
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const base = getApiOrigin();

  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return raw;
}

function normalizeSettingsPayload(data) {
  const settings =
    data?.settings ||
    data?.data?.settings ||
    data?.data ||
    data?.appSettings ||
    data ||
    {};

  return {
    siteName: settings.siteName || DEFAULT_THEME.siteName,
    tagline: settings.tagline || DEFAULT_THEME.tagline,
    logo: normalizeImage(settings.logo || ""),
    primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
  };
}

function hexToRgb(hex, fallback = "236, 122, 59") {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

function getCompletionPercent(form) {
  const requiredFields = [
    form.academyName,
    form.location,
    form.bio,
    form.address,
    form.crNumber,
    form.phone,
    form.email,
    form.fullName,
    form.designation,
  ];

  const completed = requiredFields.filter((value) =>
    String(value || "").trim(),
  ).length;

  const agreement = form.agreed ? 1 : 0;

  return Math.round(
    ((completed + agreement) / (requiredFields.length + 1)) * 100,
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  required = false,
  primary = DEFAULT_THEME.primaryColor,
  primaryRgb = "236, 122, 59",
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {label}
        {required ? <span style={{ color: primary }}>*</span> : null}
      </div>

      <div
        className="group flex h-[56px] min-w-0 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4"
        style={{
          "--tw-ring-color": `rgba(${primaryRgb}, 0.14)`,
        }}
      >
        {Icon ? (
          <Icon className="h-5 w-5 shrink-0 text-slate-400 transition group-focus-within:text-slate-700" />
        ) : null}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
          onFocus={(e) => {
            e.currentTarget.parentElement.style.borderColor = primary;
          }}
          onBlur={(e) => {
            e.currentTarget.parentElement.style.borderColor = "";
          }}
        />
      </div>
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 5,
  required = false,
  primary = DEFAULT_THEME.primaryColor,
  primaryRgb = "236, 122, 59",
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {label}
        {required ? <span style={{ color: primary }}>*</span> : null}
      </div>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-4"
        style={{
          "--tw-ring-color": `rgba(${primaryRgb}, 0.14)`,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = primary;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "";
        }}
      />
    </label>
  );
}

function FileField({
  label,
  name,
  onChange,
  fileName,
  required = false,
  primary = DEFAULT_THEME.primaryColor,
  primaryRgb = "236, 122, 59",
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-800">
        {label}
        {required ? <span style={{ color: primary }}>*</span> : null}
      </div>

      <div
        className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
        style={{
          boxShadow: fileName ? `0 0 0 4px rgba(${primaryRgb}, 0.08)` : "",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: primary }}
          >
            <UploadCloud className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-800">
              Upload CR document
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-500">
              PDF format only. This helps KidGage verify your provider request.
            </div>

            <input
              type="file"
              name={name}
              accept=".pdf,application/pdf"
              onChange={onChange}
              className="mt-3 w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-700 file:ring-1 file:ring-slate-200 hover:file:bg-slate-100"
            />

            {fileName ? (
              <div className="mt-2 flex items-center gap-2 break-all text-xs font-semibold text-slate-600">
                <FileText className="h-4 w-4 shrink-0" />
                {fileName}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </label>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[22px] border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-black text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-white/80">{text}</div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ icon: Icon, title, subtitle, children, primary }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: primary }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-black leading-tight text-slate-900">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function StepBadge({ number, title, active = false, primary }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        active ? "bg-white" : "bg-white/60"
      }`}
      style={{
        borderColor: active ? primary : "rgba(226,232,240,1)",
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
        style={{ backgroundColor: primary }}
      >
        {number}
      </div>

      <div className="min-w-0 text-sm font-black text-slate-800">{title}</div>
    </div>
  );
}

export default function AcademyRegisterPage() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const primary = theme.primaryColor || DEFAULT_THEME.primaryColor;
  const secondary = theme.secondaryColor || DEFAULT_THEME.secondaryColor;
  const primaryRgb = useMemo(() => hexToRgb(primary), [primary]);
  const progress = useMemo(() => getCompletionPercent(form), [form]);

  const isValid = useMemo(() => {
    return (
      form.academyName.trim() &&
      form.location.trim() &&
      form.bio.trim() &&
      form.address.trim() &&
      form.crNumber.trim() &&
      form.phone.trim() &&
      form.email.trim() &&
      form.fullName.trim() &&
      form.designation.trim() &&
      form.agreed
    );
  }, [form]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const endpoints = [
        () => publicApi.get("/settings"),
        () => api.get("/public/settings"),
      ];

      for (const request of endpoints) {
        try {
          const res = await request();

          if (!mounted) return;

          setTheme(normalizeSettingsPayload(res.data));
          return;
        } catch {
          // try next endpoint
        }
      }

      if (mounted) setTheme(DEFAULT_THEME);
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target;

    setMessage("");
    setError("");

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "file"
            ? files?.[0] || null
            : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isValid) {
      setError("Please fill all required fields and accept the declaration.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append("academyName", form.academyName.trim());
      payload.append("location", form.location.trim());
      payload.append("bio", form.bio.trim());
      payload.append("address", form.address.trim());
      payload.append("crNumber", form.crNumber.trim());
      payload.append("phone", form.phone.trim());
      payload.append("email", form.email.trim());
      payload.append("fullName", form.fullName.trim());
      payload.append("designation", form.designation.trim());
      payload.append("website", form.website.trim());
      payload.append("instagram", form.instagram.trim());
      payload.append("agreed", String(form.agreed));

      if (form.crDocument) {
        payload.append("crDocument", form.crDocument);
      }

      await api.post("/public/provider-joining-form", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(
        "Your academy onboarding request has been submitted successfully.",
      );
      setForm(initialForm);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to submit the form. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="min-h-[100svh] overflow-x-hidden px-0 py-0 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-8 lg:py-10"
      style={{
        background: `radial-gradient(circle at top left, rgba(${primaryRgb}, 0.15), transparent 34%), radial-gradient(circle at bottom right, ${secondary}33, transparent 30%), linear-gradient(180deg, #fff7ed 0%, #ffffff 42%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto grid w-full max-w-[1240px] overflow-hidden rounded-none border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:rounded-[30px] xl:grid-cols-[0.88fr_1.12fr]">
        <aside
          className="relative hidden overflow-hidden p-8 text-white xl:flex xl:flex-col xl:justify-between xl:p-10"
          style={{ backgroundColor: primary }}
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div
            className="absolute -bottom-28 right-0 h-80 w-80 rounded-full blur-3xl"
            style={{ backgroundColor: `${secondary}55` }}
          />
          <div className="absolute right-8 top-10 h-28 w-28 rounded-full border border-white/20" />
          <div className="absolute bottom-40 left-10 h-16 w-16 rounded-full border border-white/15" />

          <div className="relative">
            <div className="inline-flex max-w-full items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white backdrop-blur">
              {theme.logo ? (
                <img
                  src={theme.logo}
                  alt={theme.siteName}
                  className="h-6 w-6 shrink-0 rounded-lg object-contain"
                />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" />
              )}

              <span className="truncate">{theme.siteName}</span>
            </div>

            <h1 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight xl:text-5xl">
              Join our provider network.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/85 xl:text-base">
              Submit your academy details for verification. Once approved, your
              academy can manage activities, packages, slots, and booking
              enquiries inside KidGage.
            </p>

            <div className="mt-8 grid gap-4">
              <InfoCard
                icon={Building2}
                title="Academy profile"
                text="Your provider profile can be listed for parents to discover."
              />

              <InfoCard
                icon={CalendarDays}
                title="Activity bookings"
                text="Create activities, packages, and available slots after approval."
              />

              <InfoCard
                icon={ShieldCheck}
                title="Admin verification"
                text="KidGage super admin will review and approve your request."
              />
            </div>
          </div>

          <div className="relative rounded-[26px] border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900">
                <CheckCircle2 className="h-6 w-6" style={{ color: primary }} />
              </div>

              <div>
                <div className="text-lg font-black">Currently onboarding</div>
                <div className="mt-1 text-sm text-white/75">
                  Companies registered in Qatar.
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 px-5 py-7 sm:p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-[820px] min-w-0">
            <div className="mb-7 xl:hidden">
              <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white"
                  style={{ backgroundColor: primary }}
                >
                  {theme.logo ? (
                    <img
                      src={theme.logo}
                      alt={theme.siteName}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <Sparkles className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate text-2xl font-black tracking-tight text-slate-900">
                    {theme.siteName}
                  </div>
                  <div className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Provider onboarding
                  </div>
                </div>
              </div>
            </div>

            <div
              className="inline-flex max-w-full rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1"
              style={{
                color: primary,
                backgroundColor: `rgba(${primaryRgb}, 0.08)`,
                borderColor: `rgba(${primaryRgb}, 0.12)`,
              }}
            >
              Academy registration
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_240px] lg:items-end">
              <div className="min-w-0">
                <h2 className="text-[34px] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                  Join our provider list, it&apos;s free.
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
                  Please complete the form below. Required fields are marked
                  with an asterisk. Currently, KidGage is onboarding companies
                  registered in Qatar.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Completion
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {progress}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: primary,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <StepBadge
                number="1"
                title="Academy details"
                active={progress >= 10}
                primary={primary}
              />
              <StepBadge
                number="2"
                title="Verification"
                active={progress >= 40}
                primary={primary}
              />
              <StepBadge
                number="3"
                title="Admin review"
                active={progress >= 80}
                primary={primary}
              />
            </div>

            {message ? (
              <div className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold leading-6 text-emerald-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold leading-6 text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <FormSection
                icon={Building2}
                title="Academy details"
                subtitle="Basic information about your academy."
                primary={primary}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field
                    label="Academy Name"
                    name="academyName"
                    value={form.academyName}
                    onChange={handleChange}
                    placeholder="Academy name as per CR"
                    icon={Building2}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <Field
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Academy location"
                    icon={MapPin}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <div className="lg:col-span-2">
                    <TextArea
                      label="Academy Bio"
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Tell us about your academy"
                      rows={5}
                      required
                      primary={primary}
                      primaryRgb={primaryRgb}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <TextArea
                      label="Address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Academy address as per company registration"
                      rows={4}
                      required
                      primary={primary}
                      primaryRgb={primaryRgb}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                icon={FileText}
                title="Company verification"
                subtitle="CR details used by admin for review."
                primary={primary}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field
                    label="CR Number"
                    name="crNumber"
                    value={form.crNumber}
                    onChange={handleChange}
                    placeholder="Enter CR number"
                    icon={FileText}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <FileField
                    label="CR Document PDF"
                    name="crDocument"
                    onChange={handleChange}
                    fileName={form.crDocument?.name || ""}
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={UserRound}
                title="Contact person"
                subtitle="Admin will contact this person if needed."
                primary={primary}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field
                    label="Full Name"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Contact person full name"
                    icon={UserRound}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <Field
                    label="Designation"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="Owner / Manager / Admin"
                    icon={ShieldCheck}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <Field
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+974 0000 0000"
                    icon={Phone}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <Field
                    label="Email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    type="email"
                    icon={Mail}
                    required
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />
                </div>
              </FormSection>

              <FormSection
                icon={Globe2}
                title="Online links"
                subtitle="Optional public links for your academy."
                primary={primary}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field
                    label="Website"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://www.website.com"
                    icon={Globe2}
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />

                  <Field
                    label="Instagram Link"
                    name="instagram"
                    value={form.instagram}
                    onChange={handleChange}
                    placeholder="https://instagram.com/username"
                    icon={LinkIcon}
                    primary={primary}
                    primaryRgb={primaryRgb}
                  />
                </div>
              </FormSection>

              <div className="sticky bottom-0 z-10 -mx-5 border-t border-slate-200 bg-white/90 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-[28px] sm:border sm:bg-slate-50 sm:p-5 sm:backdrop-blur-0">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <label className="flex cursor-pointer items-start gap-3 rounded-[22px] bg-white p-4 ring-1 ring-slate-200">
                    <input
                      type="checkbox"
                      name="agreed"
                      checked={form.agreed}
                      onChange={handleChange}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300"
                      style={{ accentColor: primary }}
                    />

                    <span className="text-sm font-semibold leading-6 text-slate-700">
                      I agree that all provided information is correct and can
                      be used by KidGage administrators for verification.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting || !isValid}
                    className="group flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] px-6 text-base font-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.14)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 lg:w-[230px]"
                    style={{ backgroundColor: primary }}
                  >
                    {submitting ? "Submitting..." : "Submit request"}
                    {!submitting ? (
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                    ) : null}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

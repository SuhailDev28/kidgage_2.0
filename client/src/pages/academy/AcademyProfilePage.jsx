import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Medal,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { api } from "../../lib/api.js";

const EMPTY_PROFILE = {
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
  bannerImage: "",
  coverImage: "",
  status: "ACTIVE",

  establishedYear: "",
  ownerName: "",
  contactPerson: "",
  whatsapp: "",
  country: "Qatar",

  shortBio: "",
  mission: "",
  vision: "",

  facilities: [],
  programsOffered: [],
  ageGroups: [],
  languages: [],

  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",

  awards: [],
  recognitions: [],
  gallery: [],

  activitiesCount: 0,
  categoriesCount: 0,
  bookingsCount: 0,
  branchesCount: 0,
};

const EMPTY_AWARD = {
  title: "",
  year: "",
  issuer: "",
  description: "",
};

const EMPTY_RECOGNITION = {
  title: "",
  organization: "",
  date: "",
  description: "",
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

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

function normalizeProfilePayload(next = {}) {
  return {
    ...EMPTY_PROFILE,
    ...next,
    name: next.name || next.academyName || "",
    academyName: next.academyName || next.name || "",
    facilities: toArray(next.facilities),
    programsOffered: toArray(next.programsOffered),
    ageGroups: toArray(next.ageGroups),
    languages: toArray(next.languages),
    awards: toArray(next.awards),
    recognitions: toArray(next.recognitions),
    gallery: toArray(next.gallery),
  };
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

function SectionCard({ title, subtitle, icon: Icon, children, right }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-black text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {right || null}
      </div>

      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {Number(value || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipInput({ label, value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function addChip() {
    const clean = draft.trim();
    if (!clean) return;

    const next = [...toArray(value), clean].filter(
      (item, index, arr) => arr.indexOf(item) === index,
    );

    onChange(next);
    setDraft("");
  }

  function removeChip(item) {
    onChange(toArray(value).filter((x) => x !== item));
  }

  return (
    <Field label={label}>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {toArray(value).map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#ff7a3d]"
            >
              {item}
              <button
                type="button"
                onClick={() => removeChip(item)}
                className="rounded-full hover:bg-orange-100"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChip();
              }
            }}
            placeholder={placeholder}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-300"
          />

          <button
            type="button"
            onClick={addChip}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </Field>
  );
}

function AwardEditor({ title, items, emptyItem, onChange, type = "award" }) {
  function addItem() {
    onChange([...toArray(items), { ...emptyItem }]);
  }

  function updateItem(index, key, value) {
    onChange(
      toArray(items).map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function removeItem(index) {
    onChange(toArray(items).filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-slate-900">{title}</div>

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff7a3d] px-3 py-2 text-sm font-bold text-white hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {toArray(items).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No {type === "award" ? "awards" : "recognitions"} added yet.
        </div>
      ) : (
        <div className="space-y-4">
          {toArray(items).map((item, index) => (
            <div
              key={`${type}-${index}`}
              className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                  {type === "award" ? (
                    <Trophy className="h-4 w-4 text-[#ff7a3d]" />
                  ) : (
                    <BadgeCheck className="h-4 w-4 text-[#ff7a3d]" />
                  )}
                  {type === "award" ? "Award" : "Recognition"} #{index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <TextInput
                    value={item.title || ""}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                    placeholder={
                      type === "award"
                        ? "Best Kids Academy Award"
                        : "Accredited Training Partner"
                    }
                  />
                </Field>

                {type === "award" ? (
                  <Field label="Year">
                    <TextInput
                      value={item.year || ""}
                      onChange={(e) =>
                        updateItem(index, "year", e.target.value)
                      }
                      placeholder="2026"
                    />
                  </Field>
                ) : (
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={item.date || ""}
                      onChange={(e) =>
                        updateItem(index, "date", e.target.value)
                      }
                    />
                  </Field>
                )}

                <Field label={type === "award" ? "Issuer" : "Organization"}>
                  <TextInput
                    value={
                      type === "award"
                        ? item.issuer || ""
                        : item.organization || ""
                    }
                    onChange={(e) =>
                      updateItem(
                        index,
                        type === "award" ? "issuer" : "organization",
                        e.target.value,
                      )
                    }
                    placeholder="Organization name"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Description">
                    <TextArea
                      rows={3}
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="Short details"
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUploadBox({ title, subtitle, image, onPick, inputRef }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
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

export default function AcademyProfilePage() {
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return normalizeImage(profile.logo || profile.academyLogo);
  }, [logoFile, profile.logo, profile.academyLogo]);

  const bannerPreview = useMemo(() => {
    if (bannerFile) return URL.createObjectURL(bannerFile);
    return normalizeImage(profile.bannerImage || profile.coverImage);
  }, [bannerFile, profile.bannerImage, profile.coverImage]);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { data } = await api.get("/academy/profile");
      const next = data?.profile || data?.academy || {};

      setProfile(normalizeProfilePayload(next));
      setLogoFile(null);
      setBannerFile(null);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load academy profile.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function updateField(key, value) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoPick(e) {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
  }

  function handleBannerPick(e) {
    const file = e.target.files?.[0];
    if (file) setBannerFile(file);
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const form = new FormData();

      form.append("name", profile.name || profile.academyName || "");
      form.append("email", profile.email || "");
      form.append("phone", profile.phone || "");
      form.append("city", profile.city || "");
      form.append("address", profile.address || "");
      form.append("website", profile.website || "");
      form.append("description", profile.description || "");

      form.append("establishedYear", profile.establishedYear || "");
      form.append("ownerName", profile.ownerName || "");
      form.append("contactPerson", profile.contactPerson || "");
      form.append("whatsapp", profile.whatsapp || "");
      form.append("country", profile.country || "Qatar");

      form.append("shortBio", profile.shortBio || "");
      form.append("mission", profile.mission || "");
      form.append("vision", profile.vision || "");

      form.append("facilities", JSON.stringify(toArray(profile.facilities)));
      form.append(
        "programsOffered",
        JSON.stringify(toArray(profile.programsOffered)),
      );
      form.append("ageGroups", JSON.stringify(toArray(profile.ageGroups)));
      form.append("languages", JSON.stringify(toArray(profile.languages)));

      form.append("instagram", profile.instagram || "");
      form.append("facebook", profile.facebook || "");
      form.append("youtube", profile.youtube || "");
      form.append("tiktok", profile.tiktok || "");

      form.append("awards", JSON.stringify(toArray(profile.awards)));
      form.append(
        "recognitions",
        JSON.stringify(toArray(profile.recognitions)),
      );
      form.append("gallery", JSON.stringify(toArray(profile.gallery)));

      if (logoFile) form.append("logo", logoFile);
      if (bannerFile) form.append("bannerImage", bannerFile);

      const { data } = await api.put("/academy/profile", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const next = data?.profile || data?.academy || {};

      setProfile(normalizeProfilePayload(next));
      setLogoFile(null);
      setBannerFile(null);
      setMessage(data?.message || "Academy profile updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to save academy profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full bg-slate-50 px-5 py-6 md:px-8">
        <div className="space-y-5">
          <div className="h-56 animate-pulse rounded-[30px] bg-slate-100" />
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-32 animate-pulse rounded-[28px] bg-slate-100" />
          </div>
          <div className="h-96 animate-pulse rounded-[30px] bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="w-full bg-slate-50 px-5 py-6 md:px-8"
    >
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="relative h-56 bg-slate-200 sm:h-72">
          {bannerPreview ? (
            <img
              src={bannerPreview}
              alt="Academy banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Camera className="h-10 w-10" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm backdrop-blur hover:bg-white"
          >
            <ImagePlus className="h-4 w-4" />
            Change Banner
          </button>

          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerPick}
          />

          <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-[26px] border-4 border-white bg-white shadow-lg">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Academy logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                    <Building2 className="h-9 w-9" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-xs font-bold text-white"
                >
                  Logo
                </button>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoPick}
                />
              </div>

              <div className="min-w-0 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Academy Profile
                </div>

                <h1 className="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">
                  {profile.name || "Academy Name"}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/85">
                  {profile.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.city}
                    </span>
                  ) : null}

                  {profile.status ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {profile.status}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm backdrop-blur hover:bg-white disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.28)] hover:brightness-95 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Activities"
          value={profile.activitiesCount || 0}
        />
        <StatCard
          icon={Building2}
          label="Branches"
          value={profile.branchesCount || 0}
        />
        <StatCard
          icon={Star}
          label="Categories"
          value={profile.categoriesCount || 0}
        />
        <StatCard
          icon={BadgeCheck}
          label="Bookings"
          value={profile.bookingsCount || 0}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <SectionCard
            title="Basic Information"
            subtitle="Main academy details shown to parents on KidGage."
            icon={Building2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Academy Name">
                <TextInput
                  value={profile.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Example: Skills Development Center"
                  required
                />
              </Field>

              <Field label="Established Year">
                <TextInput
                  value={profile.establishedYear}
                  onChange={(e) =>
                    updateField("establishedYear", e.target.value)
                  }
                  placeholder="2020"
                />
              </Field>

              <Field label="Owner / Founder Name">
                <TextInput
                  value={profile.ownerName}
                  onChange={(e) => updateField("ownerName", e.target.value)}
                  placeholder="Owner name"
                />
              </Field>

              <Field label="Contact Person">
                <TextInput
                  value={profile.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                  placeholder="Main contact person"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Short Bio">
                  <TextArea
                    rows={3}
                    value={profile.shortBio}
                    onChange={(e) => updateField("shortBio", e.target.value)}
                    placeholder="Short public summary about the academy"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Full Description">
                  <TextArea
                    rows={6}
                    value={profile.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Detailed academy description"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Mission and Vision"
            subtitle="Explain academy values, direction, and learning approach."
            icon={ShieldCheck}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Mission">
                <TextArea
                  rows={5}
                  value={profile.mission}
                  onChange={(e) => updateField("mission", e.target.value)}
                  placeholder="Your academy mission"
                />
              </Field>

              <Field label="Vision">
                <TextArea
                  rows={5}
                  value={profile.vision}
                  onChange={(e) => updateField("vision", e.target.value)}
                  placeholder="Your academy vision"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Awards and Recognition"
            subtitle="Display achievements, certificates, accreditations, and recognitions for parent trust."
            icon={Award}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <AwardEditor
                title="Awards"
                type="award"
                items={profile.awards}
                emptyItem={EMPTY_AWARD}
                onChange={(value) => updateField("awards", value)}
              />

              <AwardEditor
                title="Recognitions"
                type="recognition"
                items={profile.recognitions}
                emptyItem={EMPTY_RECOGNITION}
                onChange={(value) => updateField("recognitions", value)}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Facilities and Programs"
            subtitle="Add what parents should know before booking."
            icon={Medal}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <ChipInput
                label="Facilities"
                value={profile.facilities}
                onChange={(value) => updateField("facilities", value)}
                placeholder="Indoor hall, Parking, Waiting area"
              />

              <ChipInput
                label="Programs Offered"
                value={profile.programsOffered}
                onChange={(value) => updateField("programsOffered", value)}
                placeholder="Dance, Music, Karate"
              />

              <ChipInput
                label="Age Groups"
                value={profile.ageGroups}
                onChange={(value) => updateField("ageGroups", value)}
                placeholder="3-5 years, 6-9 years"
              />

              <ChipInput
                label="Languages"
                value={profile.languages}
                onChange={(value) => updateField("languages", value)}
                placeholder="English, Arabic, Hindi"
              />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <SectionCard
            title="Contact Details"
            subtitle="Used in parent-facing pages and enquiries."
            icon={Phone}
          >
            <div className="space-y-4">
              <Field label="Email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    type="email"
                    value={profile.email}
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
                    value={profile.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+974 0000 0000"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="WhatsApp">
                <TextInput
                  value={profile.whatsapp}
                  onChange={(e) => updateField("whatsapp", e.target.value)}
                  placeholder="+974 0000 0000"
                />
              </Field>

              <Field label="Website">
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={profile.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://example.com"
                    className="pl-11"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Location"
            subtitle="Academy address and country."
            icon={MapPin}
          >
            <div className="space-y-4">
              <Field label="City">
                <TextInput
                  value={profile.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Doha"
                />
              </Field>

              <Field label="Country">
                <TextInput
                  value={profile.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Qatar"
                />
              </Field>

              <Field label="Address">
                <TextArea
                  rows={4}
                  value={profile.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Full academy address"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Social Links"
            subtitle="Optional links shown on public profile."
            icon={Link2}
          >
            <div className="space-y-4">
              <Field label="Instagram">
                <div className="relative">
                  <Camera className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={profile.instagram}
                    onChange={(e) => updateField("instagram", e.target.value)}
                    placeholder="Instagram URL"
                    className="pl-11"
                  />
                </div>
              </Field>

              <Field label="Facebook">
                <TextInput
                  value={profile.facebook}
                  onChange={(e) => updateField("facebook", e.target.value)}
                  placeholder="Facebook URL"
                />
              </Field>

              <Field label="YouTube">
                <TextInput
                  value={profile.youtube}
                  onChange={(e) => updateField("youtube", e.target.value)}
                  placeholder="YouTube URL"
                />
              </Field>

              <Field label="TikTok">
                <TextInput
                  value={profile.tiktok}
                  onChange={(e) => updateField("tiktok", e.target.value)}
                  placeholder="TikTok URL"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Media"
            subtitle="Upload logo and banner image."
            icon={Camera}
          >
            <div className="space-y-4">
              <ImageUploadBox
                title="Logo"
                subtitle="Square image recommended"
                image={logoPreview}
                inputRef={logoInputRef}
                onPick={handleLogoPick}
              />

              <ImageUploadBox
                title="Banner"
                subtitle="Wide image recommended"
                image={bannerPreview}
                inputRef={bannerInputRef}
                onPick={handleBannerPick}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="sticky bottom-4 z-20 mt-8 flex justify-end">
        <div className="flex gap-3 rounded-[24px] border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={loadProfile}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#ff7a3d] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.28)] hover:brightness-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Academy Profile"}
          </button>
        </div>
      </div>
    </form>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Building2, Upload } from "lucide-react";
import { api } from "../../lib/api.js";

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${base}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${base}/${value}`;
  }

  return `${base}/uploads/${value}`;
}

function normalizeAcademy(item) {
  return {
    id: item?._id || item?.id || "",
    name: item?.name || "",
    email: item?.email || item?.contactEmail || "",
    phone: item?.phone || item?.contactNumber || "",
    city: item?.city || item?.location?.city || "",
    logo: item?.logo || item?.image || "",
    featured: Boolean(item?.featured || item?.isFeatured),
    status: String(item?.status || "INACTIVE").toUpperCase(),
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-600">{label}</div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${
        props.className || ""
      }`}
    />
  );
}

export default function EditAcademyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    city: "",
    logo: "",
    featured: false,
    status: "INACTIVE",
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAcademy() {
      try {
        setLoading(true);
        const res = await api.get("/super-admin/academies");
        const rows = Array.isArray(res?.data?.academies)
          ? res.data.academies.map(normalizeAcademy)
          : [];

        if (!active) return;

        const found =
          rows.find((item) => String(item.id) === String(id)) || null;

        if (!found) {
          navigate("/super-admin/academies", { replace: true });
          return;
        }

        setForm(found);
      } catch {
        if (!active) return;
        navigate("/super-admin/academies", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAcademy();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    const preview = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreview(preview);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("city", form.city);
      formData.append("featured", String(form.featured));

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      await api.put(`/super-admin/academies/${form.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await api.put(`/super-admin/academies/${form.id}/status`, {
        status: form.status,
      });

      setMessage("Academy updated successfully.");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update academy.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-[420px] animate-pulse rounded-[30px] bg-slate-100" />
      </div>
    );
  }

  const displayLogo = logoPreview || normalizeImage(form.logo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/super-admin/academies")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Link
          to={`/super-admin/academies/${form.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          View Details
        </Link>
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/40 p-6 shadow-sm lg:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-b from-blue-50 to-indigo-50 shadow-inner">
            {displayLogo ? (
              <img
                src={displayLogo}
                alt={form.name || "Academy logo"}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600" />
            )}
          </div>

          <div>
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              Edit Academy
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {form.name || "Academy"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Update academy settings, branding, and visibility.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Academy Name">
            <TextInput
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Academy name"
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Email"
            />
          </Field>

          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Phone"
            />
          </Field>

          <Field label="City">
            <TextInput
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="City"
            />
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </Field>

          <Field label="Featured">
            <select
              value={form.featured ? "true" : "false"}
              onChange={(e) =>
                updateField("featured", e.target.value === "true")
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="false">Standard</option>
              <option value="true">Featured</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Academy Logo">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-sm">
                    {displayLogo ? (
                      <img
                        src={displayLogo}
                        alt={form.name || "Academy logo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </Field>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <Link
            to={`/super-admin/academies/${form.id}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

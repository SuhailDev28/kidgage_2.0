// client/src/pages/superadmin/CertificateTemplatesPage.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  Eye,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../lib/api.js";

const DEFAULT_PRIMARY = "#2563eb";
const DEFAULT_SECONDARY = "#6d28d9";

function getAssetUrl(value) {
  if (!value) return "";

  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("blob:")) return raw;

  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  const base = apiBase || "http://localhost:5001";

  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Intl.DateTimeFormat("en-QA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "N/A";
  }
}

function getFileName(fileUrl = "") {
  const clean = String(fileUrl || "").split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  return parts[parts.length - 1] || "certificate-template";
}

function TemplatePreview({ template }) {
  const url = getAssetUrl(template?.fileUrl);

  if (!url) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400">
        <FileImage className="h-10 w-10" />
        <div className="text-sm font-bold">No preview available</div>
      </div>
    );
  }

  if (template?.fileType === "PDF") {
    return (
      <iframe
        title={template.title || "Certificate template"}
        src={url}
        className="h-[420px] w-full rounded-[24px] border border-slate-200 bg-white"
      />
    );
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
      <img
        src={url}
        alt={template?.title || "Certificate template"}
        className="max-h-[420px] w-full rounded-[18px] object-contain"
        loading="lazy"
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "purple"
          ? "bg-violet-50 text-violet-700"
          : "bg-blue-50 text-blue-700";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <div className="text-2xl font-black text-slate-950">{value}</div>
          <div className="mt-1 truncate text-sm font-medium text-slate-500">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificateTemplatesPage() {
  const fileRef = useRef(null);

  const [templates, setTemplates] = useState([]);
  const [title, setTitle] = useState("Course Completion Certificate");
  const [file, setFile] = useState(null);
  const [makeActive, setMakeActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeTemplate = useMemo(
    () => templates.find((item) => item.isActive),
    [templates],
  );

  const imageCount = useMemo(
    () => templates.filter((item) => item.fileType === "IMAGE").length,
    [templates],
  );

  const pdfCount = useMemo(
    () => templates.filter((item) => item.fileType === "PDF").length,
    [templates],
  );

  async function loadTemplates() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/super-admin/certificate-templates");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      setTemplates(list);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load certificate templates",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function resetForm() {
    setTitle("Course Completion Certificate");
    setFile(null);
    setMakeActive(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a certificate template file");
      return;
    }

    const formData = new FormData();
    formData.append("title", title || "Course Completion Certificate");
    formData.append("makeActive", String(makeActive));
    formData.append("template", file);

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const res = await api.post(
        "/super-admin/certificate-templates",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setSuccess(
        res.data?.message || "Certificate template uploaded successfully",
      );

      resetForm();
      await loadTemplates();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to upload certificate template",
      );
    } finally {
      setUploading(false);
    }
  }

  async function activateTemplate(id) {
    try {
      setBusyId(id);
      setError("");
      setSuccess("");

      const res = await api.patch(
        `/super-admin/certificate-templates/${id}/activate`,
      );

      setSuccess(res.data?.message || "Certificate template activated");
      await loadTemplates();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to activate certificate template",
      );
    } finally {
      setBusyId("");
    }
  }

  async function deleteTemplate(id) {
    const ok = window.confirm(
      "Delete this certificate template? This cannot be undone.",
    );

    if (!ok) return;

    try {
      setBusyId(id);
      setError("");
      setSuccess("");

      const res = await api.delete(
        `/super-admin/certificate-templates/${id}`,
      );

      setSuccess(res.data?.message || "Certificate template deleted");
      await loadTemplates();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to delete certificate template",
      );
    } finally {
      setBusyId("");
    }
  }

  function openFile(fileUrl) {
    const url = getAssetUrl(fileUrl);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="min-h-full"
      style={{
        "--kg-primary": `var(--kg-primary-color, ${DEFAULT_PRIMARY})`,
        "--kg-secondary": `var(--kg-secondary-color, ${DEFAULT_SECONDARY})`,
      }}
    >
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div
              className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] opacity-10"
              style={{
                background:
                  "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
              }}
            />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div
                  className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]"
                  style={{
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                    color: "var(--kg-primary)",
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Super Admin Certificate Studio
                </div>

                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                  Course Completion Certificate Templates
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                  Upload and manage the active background template used when
                  KidGage generates course completion certificates for children.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={loadTemplates}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </button>

                {activeTemplate?.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => openFile(activeTemplate.fileUrl)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-95"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Active
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileImage}
            label="Total Templates"
            value={templates.length}
          />
          <StatCard
            icon={CheckCircle2}
            label="Active Template"
            value={activeTemplate ? "Yes" : "No"}
            tone="green"
          />
          <StatCard
            icon={FileImage}
            label="Image Templates"
            value={imageCount}
            tone="purple"
          />
          <StatCard
            icon={FileText}
            label="PDF Templates"
            value={pdfCount}
            tone="amber"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Upload Template
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recommended: A4 landscape PNG/JPG.
                </p>
              </div>

              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
                }}
              >
                <UploadCloud className="h-6 w-6" />
              </div>
            </div>

            <form className="space-y-5 p-6" onSubmit={handleUpload}>
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Template title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Course Completion Certificate"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <label className="block cursor-pointer rounded-[26px] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  className="hidden"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                />

                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
                  }}
                >
                  <UploadCloud className="h-7 w-7" />
                </div>

                <div className="mt-4 text-sm font-black text-slate-950">
                  Click to upload certificate template
                </div>

                <div className="mt-2 break-words text-xs leading-5 text-slate-500">
                  {file ? file.name : "PNG, JPG, WEBP, or PDF up to 15 MB"}
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={makeActive}
                  onChange={(event) => setMakeActive(event.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300"
                  style={{ accentColor: "var(--kg-primary)" }}
                />

                <span>
                  <span className="block text-sm font-black text-slate-800">
                    Set as active template
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    This template will be used after upload for new completion
                    certificates.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
                }}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UploadCloud className="h-5 w-5" />
                )}
                {uploading ? "Uploading..." : "Upload Template"}
              </button>
            </form>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Active Template Preview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This background will be used for generated certificates.
                </p>
              </div>

              {activeTemplate ? (
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  Not selected
                </span>
              )}
            </div>

            <div className="p-6">
              {activeTemplate ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-950">
                          {activeTemplate.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {getFileName(activeTemplate.fileUrl)} • Uploaded{" "}
                          {formatDate(activeTemplate.createdAt)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openFile(activeTemplate.fileUrl)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        Open
                      </button>
                    </div>
                  </div>

                  <TemplatePreview template={activeTemplate} />
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                    <Award className="h-8 w-8" />
                  </div>

                  <h3 className="mt-5 text-base font-black text-slate-950">
                    No active template selected
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Upload a certificate template and mark it as active to start
                    using it for course completion certificates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Uploaded Templates
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage previous templates and choose which one is active.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
              <FileImage className="h-4 w-4" />
              {templates.length} template{templates.length === 1 ? "" : "s"}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[260px] animate-pulse rounded-[26px] bg-slate-100"
                />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <FileImage className="h-8 w-8" />
              </div>

              <h3 className="mt-5 text-base font-black text-slate-950">
                No certificate templates uploaded yet
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Upload your first KidGage course completion certificate template
                from the form above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => {
                const url = getAssetUrl(template.fileUrl);
                const isBusy = busyId === template._id;

                return (
                  <article
                    key={template._id}
                    className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative flex h-44 items-center justify-center bg-slate-50">
                      {template.fileType === "PDF" ? (
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-red-500 shadow-sm">
                          <FileText className="h-10 w-10" />
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt={template.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm">
                          {template.fileType === "PDF" ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <FileImage className="h-3.5 w-3.5" />
                          )}
                          {template.fileType}
                        </span>

                        {template.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <h3 className="line-clamp-1 text-base font-black text-slate-950">
                          {template.title}
                        </h3>

                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {getFileName(template.fileUrl)}
                        </p>

                        <p className="mt-2 text-xs font-bold text-slate-400">
                          Uploaded {formatDate(template.createdAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openFile(template.fileUrl)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Open
                        </a>
                      </div>

                      <div className="flex gap-2">
                        {!template.isActive ? (
                          <button
                            type="button"
                            onClick={() => activateTemplate(template._id)}
                            disabled={isBusy}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--kg-primary), var(--kg-secondary))",
                            }}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Activate
                          </button>
                        ) : (
                          <div className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Active
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteTemplate(template._id)}
                          disabled={isBusy}
                          className="inline-flex h-11 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Delete template"
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
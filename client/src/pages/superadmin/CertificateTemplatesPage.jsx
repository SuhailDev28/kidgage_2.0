import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../lib/api.js";

const FALLBACK_PRIMARY = "#ec7a3b";
const FALLBACK_SECONDARY = "#ffd84d";

function getAssetUrl(value) {
  if (!value) return "";

  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

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

function TemplatePreview({ template }) {
  const url = getAssetUrl(template?.fileUrl);

  if (!url) {
    return (
      <div className="kg-empty-preview">
        <FileImage size={32} />
        <span>No preview available</span>
      </div>
    );
  }

  if (template?.fileType === "PDF") {
    return (
      <iframe
        title={template.title}
        src={url}
        className="kg-template-pdf"
      />
    );
  }

  return (
    <img
      src={url}
      alt={template?.title || "Certificate template"}
      className="kg-template-image"
      loading="lazy"
    />
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

  return (
    <div className="kg-cert-page">
      <style>{`
        .kg-cert-page {
          --kg-primary: var(--kg-primary-color, ${FALLBACK_PRIMARY});
          --kg-secondary: var(--kg-secondary-color, ${FALLBACK_SECONDARY});
          min-height: 100%;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(236, 122, 59, 0.14), transparent 34%),
            radial-gradient(circle at top right, rgba(255, 216, 77, 0.22), transparent 30%),
            #fffaf5;
          color: #1f2937;
        }

        .kg-cert-shell {
          max-width: 1240px;
          margin: 0 auto;
        }

        .kg-cert-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .kg-cert-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(236, 122, 59, 0.12);
          color: var(--kg-primary);
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 10px;
        }

        .kg-cert-title {
          margin: 0;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -0.04em;
          color: #111827;
        }

        .kg-cert-subtitle {
          margin: 10px 0 0;
          color: #6b7280;
          max-width: 720px;
          line-height: 1.6;
        }

        .kg-cert-refresh {
          border: 0;
          border-radius: 16px;
          background: #ffffff;
          color: #111827;
          padding: 12px 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          box-shadow: 0 12px 30px rgba(17, 24, 39, 0.08);
          cursor: pointer;
        }

        .kg-cert-grid {
          display: grid;
          grid-template-columns: 390px minmax(0, 1fr);
          gap: 20px;
          align-items: start;
        }

        .kg-cert-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(236, 122, 59, 0.14);
          border-radius: 28px;
          box-shadow: 0 18px 55px rgba(17, 24, 39, 0.08);
          overflow: hidden;
        }

        .kg-cert-card-head {
          padding: 20px;
          border-bottom: 1px solid rgba(17, 24, 39, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .kg-cert-card-head h2 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .kg-cert-card-head p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .kg-cert-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, var(--kg-primary), var(--kg-secondary));
          color: white;
          box-shadow: 0 12px 25px rgba(236, 122, 59, 0.28);
          flex: 0 0 auto;
        }

        .kg-cert-form {
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .kg-field label {
          display: block;
          font-size: 13px;
          font-weight: 800;
          color: #374151;
          margin-bottom: 8px;
        }

        .kg-input {
          width: 100%;
          min-height: 46px;
          border-radius: 16px;
          border: 1px solid rgba(17, 24, 39, 0.12);
          background: #fff;
          padding: 0 14px;
          color: #111827;
          outline: none;
          font-weight: 700;
        }

        .kg-input:focus {
          border-color: var(--kg-primary);
          box-shadow: 0 0 0 4px rgba(236, 122, 59, 0.14);
        }

        .kg-upload-box {
          border: 1.5px dashed rgba(236, 122, 59, 0.45);
          border-radius: 24px;
          background: rgba(236, 122, 59, 0.06);
          padding: 20px;
          text-align: center;
          cursor: pointer;
        }

        .kg-upload-box input {
          display: none;
        }

        .kg-upload-box strong {
          display: block;
          margin-top: 8px;
          color: #111827;
        }

        .kg-upload-box span {
          display: block;
          margin-top: 5px;
          color: #6b7280;
          font-size: 13px;
          word-break: break-word;
        }

        .kg-switch-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #374151;
          font-weight: 800;
          font-size: 14px;
        }

        .kg-switch-row input {
          width: 18px;
          height: 18px;
          accent-color: var(--kg-primary);
        }

        .kg-submit {
          border: 0;
          min-height: 50px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--kg-primary), #f59e0b);
          color: white;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 16px 30px rgba(236, 122, 59, 0.28);
        }

        .kg-submit:disabled,
        .kg-cert-refresh:disabled,
        .kg-action-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .kg-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 800;
        }

        .kg-alert.error {
          color: #991b1b;
          background: #fee2e2;
        }

        .kg-alert.success {
          color: #166534;
          background: #dcfce7;
        }

        .kg-active-preview {
          padding: 20px;
        }

        .kg-active-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 20px;
          padding: 14px;
          background: linear-gradient(135deg, rgba(236,122,59,0.12), rgba(255,216,77,0.2));
          color: #92400e;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .kg-template-stage {
          background:
            linear-gradient(45deg, rgba(17,24,39,0.04) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(17,24,39,0.04) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(17,24,39,0.04) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(17,24,39,0.04) 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          border-radius: 22px;
          overflow: hidden;
          min-height: 330px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(17, 24, 39, 0.08);
        }

        .kg-template-image {
          width: 100%;
          height: 100%;
          max-height: 520px;
          object-fit: contain;
          display: block;
          background: white;
        }

        .kg-template-pdf {
          width: 100%;
          height: 520px;
          border: 0;
          background: white;
        }

        .kg-empty-preview {
          color: #9ca3af;
          display: grid;
          place-items: center;
          gap: 8px;
          padding: 40px;
          text-align: center;
        }

        .kg-list {
          display: grid;
          gap: 14px;
          padding: 20px;
        }

        .kg-template-row {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          border: 1px solid rgba(17, 24, 39, 0.08);
          border-radius: 22px;
          padding: 12px;
          background: #fff;
        }

        .kg-thumb {
          height: 82px;
          border-radius: 16px;
          overflow: hidden;
          background: #f3f4f6;
          display: grid;
          place-items: center;
          color: #9ca3af;
        }

        .kg-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .kg-template-info h3 {
          margin: 0;
          font-size: 15px;
          color: #111827;
        }

        .kg-template-info p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 13px;
        }

        .kg-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .kg-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 900;
          background: #f3f4f6;
          color: #374151;
        }

        .kg-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .kg-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .kg-action-btn {
          border: 0;
          border-radius: 14px;
          min-height: 38px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-weight: 900;
          cursor: pointer;
          background: #f3f4f6;
          color: #111827;
        }

        .kg-action-btn.primary {
          background: rgba(236, 122, 59, 0.12);
          color: var(--kg-primary);
        }

        .kg-action-btn.danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .kg-empty {
          padding: 34px;
          text-align: center;
          color: #6b7280;
        }

        @media (max-width: 980px) {
          .kg-cert-grid {
            grid-template-columns: 1fr;
          }

          .kg-cert-header {
            flex-direction: column;
          }
        }

        @media (max-width: 680px) {
          .kg-cert-page {
            padding: 14px;
          }

          .kg-template-row {
            grid-template-columns: 1fr;
          }

          .kg-thumb {
            height: 160px;
          }

          .kg-actions {
            justify-content: stretch;
          }

          .kg-action-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>

      <div className="kg-cert-shell">
        <header className="kg-cert-header">
          <div>
            <div className="kg-cert-kicker">
              <ShieldCheck size={16} />
              Super Admin Certificate Studio
            </div>

            <h1 className="kg-cert-title">
              Course Completion Certificate Template
            </h1>

            <p className="kg-cert-subtitle">
              Upload and manage the certificate background used for KidGage
              course completion certificates. The active template will be used
              when generating certificates for completed courses.
            </p>
          </div>

          <button
            type="button"
            className="kg-cert-refresh"
            onClick={loadTemplates}
            disabled={loading}
          >
            {loading ? <Loader2 size={17} className="kg-spin" /> : <RefreshCw size={17} />}
            Refresh
          </button>
        </header>

        <div className="kg-cert-grid">
          <section className="kg-cert-card">
            <div className="kg-cert-card-head">
              <div>
                <h2>Upload Template</h2>
                <p>Recommended: A4 landscape PNG/JPG or PDF.</p>
              </div>
              <div className="kg-cert-icon">
                <UploadCloud size={22} />
              </div>
            </div>

            <form className="kg-cert-form" onSubmit={handleUpload}>
              {error ? (
                <div className="kg-alert error">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              ) : null}

              {success ? (
                <div className="kg-alert success">
                  <CheckCircle2 size={17} />
                  <span>{success}</span>
                </div>
              ) : null}

              <div className="kg-field">
                <label>Template title</label>
                <input
                  className="kg-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Course Completion Certificate"
                />
              </div>

              <label className="kg-upload-box">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                />

                <UploadCloud size={34} color="var(--kg-primary)" />
                <strong>Click to upload certificate template</strong>
                <span>
                  {file
                    ? file.name
                    : "PNG, JPG, WEBP, or PDF up to 15 MB"}
                </span>
              </label>

              <label className="kg-switch-row">
                <input
                  type="checkbox"
                  checked={makeActive}
                  onChange={(event) => setMakeActive(event.target.checked)}
                />
                Set as active template after upload
              </label>

              <button
                type="submit"
                className="kg-submit"
                disabled={uploading}
              >
                {uploading ? <Loader2 size={18} /> : <UploadCloud size={18} />}
                {uploading ? "Uploading..." : "Upload Template"}
              </button>
            </form>
          </section>

          <section className="kg-cert-card">
            <div className="kg-cert-card-head">
              <div>
                <h2>Active Template Preview</h2>
                <p>This template will be used for course completion.</p>
              </div>
              <div className="kg-cert-icon">
                <Award size={22} />
              </div>
            </div>

            <div className="kg-active-preview">
              {activeTemplate ? (
                <>
                  <div className="kg-active-banner">
                    <CheckCircle2 size={18} />
                    Active: {activeTemplate.title}
                  </div>

                  <div className="kg-template-stage">
                    <TemplatePreview template={activeTemplate} />
                  </div>
                </>
              ) : (
                <div className="kg-empty">
                  No active certificate template selected yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="kg-cert-card" style={{ marginTop: 20 }}>
          <div className="kg-cert-card-head">
            <div>
              <h2>Uploaded Templates</h2>
              <p>Manage previous certificate templates.</p>
            </div>
            <div className="kg-cert-icon">
              <FileImage size={22} />
            </div>
          </div>

          {loading ? (
            <div className="kg-empty">
              <Loader2 size={26} /> Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="kg-empty">
              No certificate templates uploaded yet.
            </div>
          ) : (
            <div className="kg-list">
              {templates.map((template) => {
                const url = getAssetUrl(template.fileUrl);
                const isBusy = busyId === template._id;

                return (
                  <article className="kg-template-row" key={template._id}>
                    <div className="kg-thumb">
                      {template.fileType === "PDF" ? (
                        <FileText size={30} />
                      ) : (
                        <img src={url} alt={template.title} loading="lazy" />
                      )}
                    </div>

                    <div className="kg-template-info">
                      <h3>{template.title}</h3>
                      <p>Uploaded: {formatDate(template.createdAt)}</p>

                      <div className="kg-badges">
                        <span className="kg-badge">
                          {template.fileType}
                        </span>

                        {template.isActive ? (
                          <span className="kg-badge active">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="kg-actions">
                      {!template.isActive ? (
                        <button
                          type="button"
                          className="kg-action-btn primary"
                          onClick={() => activateTemplate(template._id)}
                          disabled={isBusy}
                        >
                          {isBusy ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
                          Activate
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="kg-action-btn danger"
                        onClick={() => deleteTemplate(template._id)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 size={15} /> : <Trash2 size={15} />}
                        Delete
                      </button>
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
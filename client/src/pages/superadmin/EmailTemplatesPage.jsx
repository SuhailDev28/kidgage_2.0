import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eye,
  Mail,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api.js";

const CATEGORIES = [
  "ALL",
  "BOOKING",
  "PAYMENT",
  "CONTACT",
  "ACADEMY",
  "AUTH",
  "CERTIFICATE",
  "SYSTEM",
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitVariables(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatusAlert({ type, children }) {
  const success = type === "success";

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 text-sm font-bold ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {success ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{children}</span>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-800">{label}</span>
        {hint ? (
          <span className="text-xs font-semibold text-slate-400">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(null);

  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState("HTML");
  const [preview, setPreview] = useState(null);
  const [testEmail, setTestEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(() => {
    return templates.find((item) => String(item._id) === String(selectedId));
  }, [templates, selectedId]);

  function applyTemplateToForm(template) {
    if (!template) {
      setForm(null);
      return;
    }

    setForm({
      name: template.name || "",
      description: template.description || "",
      category: template.category || "SYSTEM",
      subject: template.subject || "",
      html: template.html || "",
      text: template.text || "",
      variablesText: safeArray(template.variables).join(", "),
      active: template.active !== false,
    });
  }

  async function loadTemplates() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const data = await api.superAdminEmailTemplates({
        category,
        search,
      });

      const rows = safeArray(data?.templates);
      setTemplates(rows);

      const nextSelected =
        rows.find((item) => String(item._id) === String(selectedId)) ||
        rows[0] ||
        null;

      setSelectedId(nextSelected?._id || "");
      applyTemplateToForm(nextSelected);
    } catch (err) {
      setError(err?.message || "Unable to load email templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (selectedTemplate) {
      applyTemplateToForm(selectedTemplate);
      setPreview(null);
    }
  }, [selectedTemplate]);

  function updateForm(key, value) {
    setMessage("");
    setError("");
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSearchSubmit(e) {
    e.preventDefault();
    await loadTemplates();
  }

  async function handleSave() {
    if (!selectedId || !form) return;

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const data = await api.updateSuperAdminEmailTemplate(selectedId, {
        name: form.name,
        description: form.description,
        category: form.category,
        subject: form.subject,
        html: form.html,
        text: form.text,
        variables: splitVariables(form.variablesText),
        active: form.active,
      });

      setMessage(data?.message || "Email template saved.");
      await loadTemplates();
    } catch (err) {
      setError(err?.message || "Failed to save email template.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!selectedId) return;

    try {
      setPreviewing(true);
      setMessage("");
      setError("");

      const data = await api.previewSuperAdminEmailTemplate(selectedId);
      setPreview(data);
      setActiveTab("PREVIEW");
    } catch (err) {
      setError(err?.message || "Failed to generate preview.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleTest() {
    if (!selectedId || !testEmail.trim()) {
      setError("Enter test recipient email.");
      return;
    }

    try {
      setTesting(true);
      setMessage("");
      setError("");

      const data = await api.testSuperAdminEmailTemplate(selectedId, {
        testEmail,
      });

      setMessage(data?.message || "Test email sent.");
    } catch (err) {
      setError(err?.message || "Failed to send test email.");
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!selectedId) return;

    const ok = window.confirm(
      "Reset this template to the default KidGage design?",
    );

    if (!ok) return;

    try {
      setResetting(true);
      setMessage("");
      setError("");

      const data = await api.resetSuperAdminEmailTemplate(selectedId);
      setMessage(data?.message || "Template reset.");
      await loadTemplates();
    } catch (err) {
      setError(err?.message || "Failed to reset template.");
    } finally {
      setResetting(false);
    }
  }

  async function handleSeed() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      await api.seedSuperAdminEmailTemplates();
      setMessage("Default templates checked and seeded.");
      await loadTemplates();
    } catch (err) {
      setError(err?.message || "Failed to seed templates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-orange-100 bg-gradient-to-br from-white via-orange-50/80 to-blue-50 p-6 shadow-sm lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
              <Palette className="h-3.5 w-3.5" />
              Email Design Studio
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Email Templates
            </h1>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              Modify, redesign, preview, and test all KidGage system email
              templates from one Super Admin module.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSeed}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-[#ec7a3b]" />
              Seed Defaults
            </button>

            <button
              type="button"
              onClick={loadTemplates}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
          </div>
        </div>
      </section>

      {message ? <StatusAlert type="success">{message}</StatusAlert> : null}
      {error ? <StatusAlert type="error">{error}</StatusAlert> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="pl-11"
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 outline-none focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All Categories" : item}
                </option>
              ))}
            </select>
          </form>

          <div className="mt-5 max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : templates.length > 0 ? (
              templates.map((template) => {
                const active = String(template._id) === String(selectedId);

                return (
                  <button
                    key={template._id}
                    type="button"
                    onClick={() => setSelectedId(template._id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-orange-200 bg-orange-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? "bg-[#ec7a3b] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-black text-slate-950">
                          {template.name}
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs font-bold text-slate-400">
                          {template.key}
                        </div>
                        <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                          {template.category}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
                No templates found.
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          {!form ? (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                  <Mail className="h-7 w-7" />
                </div>
                <div className="mt-4 text-lg font-black text-slate-900">
                  Select a template
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Choose a template from the left to edit its design.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[#ec7a3b]">
                    {selectedTemplate?.key}
                  </div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    {form.name || "Email Template"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {form.description || "Customize this email design."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewing}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                  >
                    <Eye className="h-4 w-4" />
                    {previewing ? "Previewing..." : "Preview"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(236,122,59,0.24)] transition hover:bg-[#d9682f] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Field label="Template Name">
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 outline-none focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                  >
                    {CATEGORIES.filter((item) => item !== "ALL").map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="lg:col-span-2">
                  <Field label="Description">
                    <Input
                      value={form.description}
                      onChange={(e) =>
                        updateForm("description", e.target.value)
                      }
                    />
                  </Field>
                </div>

                <div className="lg:col-span-2">
                  <Field label="Subject">
                    <Input
                      value={form.subject}
                      onChange={(e) => updateForm("subject", e.target.value)}
                      placeholder="Email subject"
                    />
                  </Field>
                </div>

                <div className="lg:col-span-2">
                  <Field
                    label="Variables"
                    hint="Comma separated, example: parentName, bookingId"
                  >
                    <Input
                      value={form.variablesText}
                      onChange={(e) =>
                        updateForm("variablesText", e.target.value)
                      }
                      placeholder="name, email, subject"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {["HTML", "TEXT", "PREVIEW", "TEST"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                      activeTab === tab
                        ? "bg-[#ec7a3b] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "HTML" ? (
                <Field label="HTML Design Code">
                  <TextArea
                    rows={20}
                    value={form.html}
                    onChange={(e) => updateForm("html", e.target.value)}
                    className="font-mono text-xs leading-6"
                  />
                </Field>
              ) : null}

              {activeTab === "TEXT" ? (
                <Field label="Plain Text Version">
                  <TextArea
                    rows={14}
                    value={form.text}
                    onChange={(e) => updateForm("text", e.target.value)}
                    className="font-mono text-xs leading-6"
                  />
                </Field>
              ) : null}

              {activeTab === "PREVIEW" ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewing}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    <Eye className="h-4 w-4" />
                    Refresh Preview
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Subject
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-900">
                      {preview?.subject || form.subject}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <iframe
                      title="Email Preview"
                      srcDoc={preview?.html || form.html}
                      className="h-[620px] w-full bg-white"
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "TEST" ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Send className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Send Test Email
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Sends this template through your configured SMTP
                        settings.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="recipient@example.com"
                    />

                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={testing}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {testing ? "Sending..." : "Send Test"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold leading-6 text-orange-800">
                Use variables inside templates like{" "}
                <code className="rounded bg-white px-1.5 py-0.5">
                  {"{{parentName}}"}
                </code>{" "}
                or{" "}
                <code className="rounded bg-white px-1.5 py-0.5">
                  {"{{bookingId}}"}
                </code>
                .
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

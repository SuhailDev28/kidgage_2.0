import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Save,
  Send,
  Server,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../lib/api.js";

const BRAND_ORANGE = "#ec7a3b";
const BRAND_GREEN = "#16a34a";

const initialForm = {
  enabled: false,
  provider: "CUSTOM",
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromName: "KidGage",
  fromEmail: "",
  replyTo: "",
};

function isEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-700">{label}</span>
        {hint ? (
          <span className="text-xs font-semibold text-slate-400">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

function TextInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100 ${className}`}
    />
  );
}

function SelectInput({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100 ${className}`}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-[24px] border px-4 py-4 text-left transition ${
        checked
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div>
        <div className="text-sm font-black text-slate-950">{label}</div>
        {description ? (
          <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>

      <div
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-emerald-600" : "bg-slate-300"
        }`}
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

function StatusAlert({ type, children }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`rounded-[22px] border px-5 py-4 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <div className="flex items-start gap-3">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5" />
        )}
        <div className="text-sm font-bold">{children}</div>
      </div>
    </div>
  );
}

export default function SmtpSettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [testEmail, setTestEmail] = useState("");
  const [lastTest, setLastTest] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSave = useMemo(() => {
    if (!form.enabled) return true;
    if (!form.host.trim()) return false;
    if (!Number(form.port)) return false;
    if (!form.username.trim()) return false;
    if (!form.password.trim()) return false;
    if (form.fromEmail && !isEmail(form.fromEmail)) return false;
    if (form.replyTo && !isEmail(form.replyTo)) return false;
    return true;
  }, [form]);

  function updateField(key, value) {
    setMessage("");
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadSettings({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setMessage("");
      setError("");

      const data = await api.superAdminSmtpSettings();
      const settings = data?.settings || {};

      setForm({
        enabled: Boolean(settings.enabled),
        provider: settings.provider || "CUSTOM",
        host: settings.host || "",
        port: String(settings.port || 587),
        secure: Boolean(settings.secure),
        username: settings.username || "",
        password: settings.hasPassword ? "********" : "",
        fromName: settings.fromName || "KidGage",
        fromEmail: settings.fromEmail || "",
        replyTo: settings.replyTo || "",
      });

      setLastTest({
        status: settings.lastTestStatus || "NOT_TESTED",
        message: settings.lastTestMessage || "",
        at: settings.lastTestedAt || null,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load SMTP settings.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(e) {
    e.preventDefault();

    if (!canSave) {
      setError("Please complete all required SMTP fields.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const data = await api.updateSuperAdminSmtpSettings({
        enabled: String(form.enabled),
        provider: form.provider,
        host: form.host.trim(),
        port: String(form.port || 587),
        secure: String(form.secure),
        username: form.username.trim(),
        password: form.password,
        fromName: form.fromName.trim(),
        fromEmail: form.fromEmail.trim(),
        replyTo: form.replyTo.trim(),
      });

      const settings = data?.settings || {};

      setForm((prev) => ({
        ...prev,
        password: settings.hasPassword ? "********" : "",
      }));

      setLastTest({
        status: settings.lastTestStatus || "NOT_TESTED",
        message: settings.lastTestMessage || "",
        at: settings.lastTestedAt || null,
      });

      setMessage(data?.message || "SMTP settings saved successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save SMTP settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!isEmail(testEmail)) {
      setError("Enter a valid recipient email for testing.");
      return;
    }

    try {
      setTesting(true);
      setMessage("");
      setError("");

      const data = await api.testSuperAdminSmtpSettings(testEmail);

      const settings = data?.settings || {};

      setLastTest({
        status: settings.lastTestStatus || "SUCCESS",
        message: settings.lastTestMessage || data?.message || "",
        at: settings.lastTestedAt || new Date().toISOString(),
      });

      setMessage(data?.message || "Test email sent successfully.");
    } catch (err) {
      const settings = err?.response?.data?.settings || null;

      if (settings) {
        setLastTest({
          status: settings.lastTestStatus || "FAILED",
          message: settings.lastTestMessage || "",
          at: settings.lastTestedAt || new Date().toISOString(),
        });
      }

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to send test email.",
      );
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-100" />
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
          <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-orange-100 bg-gradient-to-br from-white via-orange-50/80 to-emerald-50 p-6 shadow-sm lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[780px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
              <Mail className="h-3.5 w-3.5" />
              Email Configuration
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">
              SMTP Settings
            </h2>

            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              Configure outgoing email delivery for booking confirmations,
              password resets, contact forms, academy notifications, and system
              alerts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => loadSettings({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Reload"}
            </button>

            <button
              type="submit"
              disabled={saving || !canSave}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(236,122,59,0.22)] transition hover:bg-[#d9682f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save SMTP"}
            </button>
          </div>
        </div>
      </section>

      {message ? <StatusAlert type="success">{message}</StatusAlert> : null}
      {error ? <StatusAlert type="error">{error}</StatusAlert> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ec7a3b]">
              <Server className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-950">
                SMTP Server Details
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Add your provider host, port, credentials, and sender identity.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Toggle
              checked={form.enabled}
              onChange={(v) => updateField("enabled", v)}
              label="Enable SMTP email sending"
              description="When enabled, KidGage will send outgoing emails through this SMTP provider."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Provider">
                <SelectInput
                  value={form.provider}
                  onChange={(e) => updateField("provider", e.target.value)}
                >
                  <option value="CUSTOM">Custom SMTP</option>
                  <option value="GMAIL">Gmail</option>
                  <option value="OUTLOOK">Outlook / Microsoft 365</option>
                  <option value="ZOHO">Zoho Mail</option>
                  <option value="SENDGRID">SendGrid</option>
                  <option value="MAILGUN">Mailgun</option>
                </SelectInput>
              </Field>

              <Field label="SMTP Host">
                <TextInput
                  value={form.host}
                  onChange={(e) => updateField("host", e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </Field>

              <Field label="SMTP Port">
                <TextInput
                  type="number"
                  min="1"
                  value={form.port}
                  onChange={(e) => updateField("port", e.target.value)}
                  placeholder="587"
                />
              </Field>

              <Field label="Encryption">
                <SelectInput
                  value={form.secure ? "SSL" : "TLS"}
                  onChange={(e) =>
                    updateField("secure", e.target.value === "SSL")
                  }
                >
                  <option value="TLS">TLS / STARTTLS usually port 587</option>
                  <option value="SSL">SSL usually port 465</option>
                </SelectInput>
              </Field>

              <Field label="SMTP Username">
                <TextInput
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="no-reply@kidgage.com"
                />
              </Field>

              <Field label="SMTP Password / App Password">
                <div className="relative">
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Enter SMTP password"
                    className="pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field label="From Name">
                <TextInput
                  value={form.fromName}
                  onChange={(e) => updateField("fromName", e.target.value)}
                  placeholder="KidGage"
                />
              </Field>

              <Field label="From Email">
                <TextInput
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => updateField("fromEmail", e.target.value)}
                  placeholder="no-reply@kidgage.com"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Reply-To Email" hint="Optional">
                  <TextInput
                    type="email"
                    value={form.replyTo}
                    onChange={(e) => updateField("replyTo", e.target.value)}
                    placeholder="support@kidgage.com"
                  />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Send className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-950">
                  Send Test Email
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Verify SMTP delivery before using it in production.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Recipient Email">
                <TextInput
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                />
              </Field>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !isEmail(testEmail)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                {testing ? "Sending Test..." : "Send Test Email"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-950">
                  SMTP Status
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Current configuration and last test result.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <StatusRow
                label="Email Sending"
                value={form.enabled ? "Enabled" : "Disabled"}
                tone={form.enabled ? "success" : "muted"}
              />

              <StatusRow
                label="Provider"
                value={form.provider || "CUSTOM"}
                tone="muted"
              />

              <StatusRow
                label="Encryption"
                value={form.secure ? "SSL" : "TLS / STARTTLS"}
                tone="muted"
              />

              <StatusRow
                label="Last Test"
                value={lastTest?.status || "NOT_TESTED"}
                tone={
                  lastTest?.status === "SUCCESS"
                    ? "success"
                    : lastTest?.status === "FAILED"
                      ? "danger"
                      : "muted"
                }
              />

              {lastTest?.message ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
                  {lastTest.message}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-orange-100 bg-orange-50/60 p-5 md:p-6">
            <h3 className="text-base font-black text-slate-950">
              Recommended SMTP Ports
            </h3>

            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
              <div className="flex justify-between gap-3">
                <span>TLS / STARTTLS</span>
                <strong className="text-slate-950">587</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>SSL</span>
                <strong className="text-slate-950">465</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Unencrypted</span>
                <strong className="text-slate-950">25</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}

function StatusRow({ label, value, tone = "muted" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

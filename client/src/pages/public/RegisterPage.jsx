// client/src/pages/public/RegisterPage.jsx

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Baby,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { api, publicApi } from "../../lib/api.js";
import { saveSession } from "../../lib/auth.js";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

const DEFAULT_THEME = {
  siteName: "KidGage",
  tagline: "Kids Activity Booking",
  logo: "",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
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

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return "236,122,59";
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `${r},${g},${b}`;
}

function extractAuthPayload(responseData) {
  const token =
    responseData?.token ||
    responseData?.accessToken ||
    responseData?.data?.token ||
    responseData?.data?.accessToken ||
    "";

  const user = responseData?.user || responseData?.data?.user || null;

  if (!token || !user) return null;

  return {
    token,
    user,
  };
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  rightElement,
  error = false,
  primaryRgb = "236,122,59",
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 text-sm font-black text-slate-800">{label}</div>

      <div
        className={`group flex h-[56px] min-w-0 items-center gap-3 rounded-[20px] border bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 sm:h-[58px] ${
          error ? "border-red-300" : "border-slate-200"
        }`}
        style={{
          "--tw-ring-color": error
            ? "rgba(239, 68, 68, 0.14)"
            : `rgba(${primaryRgb}, 0.16)`,
        }}
      >
        {Icon ? (
          <Icon className="h-5 w-5 shrink-0 text-slate-400 transition" />
        ) : null}

        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
        />

        {rightElement}
      </div>
    </label>
  );
}

function FeaturePill({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[22px] border border-white/20 bg-white/15 p-4 shadow-sm backdrop-blur-xl xl:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white xl:h-11 xl:w-11">
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

export default function RegisterPage() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(DEFAULT_THEME);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const primary = theme.primaryColor || DEFAULT_THEME.primaryColor;
  const secondary = theme.secondaryColor || DEFAULT_THEME.secondaryColor;
  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);

  const emailValid = useMemo(() => {
    if (!form.email.trim()) return true;
    return isValidEmail(form.email);
  }, [form.email]);

  const passwordLongEnough = useMemo(() => {
    if (!form.password) return false;
    return form.password.length >= 6;
  }, [form.password]);

  const passwordsMatch = useMemo(() => {
    return !form.confirmPassword || form.password === form.confirmPassword;
  }, [form.password, form.confirmPassword]);

  const isValid = useMemo(() => {
    return (
      form.fullName.trim().length >= 2 &&
      isValidEmail(form.email) &&
      form.phone.trim().length >= 6 &&
      form.password.trim().length >= 6 &&
      form.confirmPassword.trim() &&
      form.password === form.confirmPassword
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

      if (mounted) {
        setTheme(DEFAULT_THEME);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(name, value) {
    setError("");
    setMessage("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!passwordLongEnough) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      };

      const { data } = await api.post("/auth/register-parent", payload);

      const authPayload = extractAuthPayload(data);

      if (authPayload?.token && authPayload?.user) {
        saveSession(authPayload);
      } else {
        saveSession(data);
      }

      setMessage("Account created successfully.");
      navigate("/parent/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="min-h-[100svh] overflow-x-hidden px-0 py-0 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-8 lg:py-10"
      style={{
        background: `radial-gradient(circle at top left, rgba(${primaryRgb}, 0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(${secondaryRgb}, 0.2), transparent 30%), linear-gradient(180deg, #fff7ed 0%, #ffffff 42%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-none border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:rounded-[30px] xl:min-h-[720px] xl:grid-cols-[0.92fr_1.08fr]">
        <aside
          className="relative hidden overflow-hidden p-7 text-white xl:flex xl:flex-col xl:justify-between xl:p-10"
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
                  className="h-5 w-5 shrink-0 rounded object-contain"
                />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0" />
              )}

              <span className="truncate">{theme.siteName}</span>
            </div>

            <h2 className="mt-8 max-w-md text-4xl font-black leading-tight tracking-tight xl:text-5xl">
              Start booking better kids activities.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/85 xl:text-base">
              Create your parent account to discover academies, manage children,
              track bookings, and keep every activity organized in one place.
            </p>

            <div className="mt-8 grid gap-4">
              <FeaturePill
                icon={Baby}
                title="Add children"
                text="Create child profiles and keep booking details organized."
              />

              <FeaturePill
                icon={UsersRound}
                title="Book activities"
                text="Find trusted academies, programs, and sessions."
              />

              <FeaturePill
                icon={ShieldCheck}
                title="Secure parent portal"
                text="Track bookings, payments, and upcoming schedules."
              />
            </div>
          </div>

          <div className="relative rounded-[26px] border border-white/20 bg-white/15 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white"
                style={{ color: primary }}
              >
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <div className="text-lg font-black">Parent account</div>
                <div className="mt-1 text-sm text-white/75">
                  Fast registration for family bookings.
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[100svh] min-w-0 items-start justify-center px-5 py-7 sm:min-h-[640px] sm:items-center sm:p-6 md:p-8 lg:p-10 xl:min-h-[720px]">
          <div className="w-full max-w-[500px] min-w-0 overflow-hidden">
            <div className="mb-7 xl:hidden">
              <Link
                to="/"
                className="flex min-w-0 items-center gap-3 overflow-hidden"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                  style={{
                    backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                    color: primary,
                  }}
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
                  <div className="max-w-full truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {theme.tagline}
                  </div>
                </div>
              </Link>
            </div>

            <div
              className="inline-flex max-w-full rounded-full px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.16em] ring-1 sm:text-xs"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                color: primary,
                borderColor: `rgba(${primaryRgb}, 0.2)`,
              }}
            >
              Parent Registration
            </div>

            <h1 className="mt-5 text-[34px] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Create your parent account
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              Book activities, manage children, and track upcoming sessions
              through your {theme.siteName} parent dashboard.
            </p>

            <form className="mt-7 space-y-5 sm:mt-8" onSubmit={submit}>
              <InputField
                label="Full name"
                icon={UserRound}
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                primaryRgb={primaryRgb}
              />

              <InputField
                label="Email address"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                error={!emailValid}
                primaryRgb={primaryRgb}
              />

              {!emailValid ? (
                <div className="-mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Please enter a valid email address.
                </div>
              ) : null}

              <InputField
                label="Phone number"
                icon={Phone}
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+974 0000 0000"
                autoComplete="tel"
                primaryRgb={primaryRgb}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <InputField
                  label="Password"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Create password"
                  autoComplete="new-password"
                  error={Boolean(form.password) && !passwordLongEnough}
                  primaryRgb={primaryRgb}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                />

                <InputField
                  label="Confirm password"
                  icon={Lock}
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  error={!passwordsMatch}
                  primaryRgb={primaryRgb}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  }
                />
              </div>

              {form.password && !passwordLongEnough ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  Password must be at least 6 characters.
                </div>
              ) : null}

              {!passwordsMatch ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Passwords do not match.
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !isValid}
                className="group flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] px-5 text-base font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-[60px]"
                style={{
                  backgroundColor: primary,
                  boxShadow: `0 16px 34px rgba(${primaryRgb}, 0.25)`,
                }}
              >
                {submitting ? "Creating account..." : "Create account"}
                {!submitting ? (
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                ) : null}
              </button>
            </form>

            <div className="mt-7 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center sm:p-5">
              <div className="text-sm font-semibold text-slate-600">
                Already have an account?
              </div>

              <Link
                to="/login"
                className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-black transition hover:opacity-80"
                style={{ color: primary }}
              >
                Login to your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:mt-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Parent portal
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Child profiles
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Easy bookings
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

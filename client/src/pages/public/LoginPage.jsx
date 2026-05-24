// client/src/pages/public/LoginPage.jsx

import { useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
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

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
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

function getRedirectPath(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "PARENT") {
    return "/parent/dashboard";
  }

  if (normalizedRole === "SUPER_ADMIN") {
    return "/super-admin/dashboard";
  }

  if (
    normalizedRole === "ACADEMY_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "PROVIDER_ADMIN" ||
    normalizedRole === "MANAGER" ||
    normalizedRole === "STAFF"
  ) {
    return "/academy/dashboard";
  }

  return "";
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

export default function LoginPage() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(DEFAULT_THEME);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const primary = theme.primaryColor || DEFAULT_THEME.primaryColor;
  const secondary = theme.secondaryColor || DEFAULT_THEME.secondaryColor;
  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);

  const canSubmit = useMemo(() => {
    return String(form.email || "").trim() && String(form.password || "");
  }, [form.email, form.password]);

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

  useEffect(() => {
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    const redirectURI = import.meta.env.VITE_APPLE_REDIRECT_URI;

    if (!clientId || !redirectURI) return;

    const scriptId = "apple-signin-js";

    function initApple() {
      if (!window.AppleID?.auth) return;

      window.AppleID.auth.init({
        clientId,
        scope: "name email",
        redirectURI,
        usePopup: true,
      });
    }

    if (document.getElementById(scriptId)) {
      initApple();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.defer = true;
    script.onload = initApple;

    document.body.appendChild(script);
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (error) {
      setError("");
    }
  }

  function handleLoginSuccess(authPayload) {
    saveSession(authPayload, rememberMe);

    const redirectPath = getRedirectPath(authPayload.user?.role);

    if (!redirectPath) {
      setError(
        `Unsupported role: ${
          normalizeRole(authPayload.user?.role) || "UNKNOWN"
        }`,
      );
      return;
    }

    navigate(redirectPath, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();

    setError("");

    const email = String(form.email || "").trim();
    const password = String(form.password || "");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      const authPayload = extractAuthPayload(data);

      if (!authPayload?.token || !authPayload?.user) {
        throw new Error("Invalid login response");
      }

      handleLoginSuccess(authPayload);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin(credentialResponse) {
    setError("");

    const credential = credentialResponse?.credential;

    if (!credential) {
      setError("Google login failed. Missing credential.");
      return;
    }

    try {
      setSocialSubmitting("GOOGLE");

      const { data } = await api.post("/auth/social/google", {
        credential,
      });

      const authPayload = extractAuthPayload(data);

      if (!authPayload?.token || !authPayload?.user) {
        throw new Error("Invalid Google login response");
      }

      handleLoginSuccess(authPayload);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Google login failed",
      );
    } finally {
      setSocialSubmitting("");
    }
  }

  async function handleAppleLogin() {
    setError("");

    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    const redirectURI = import.meta.env.VITE_APPLE_REDIRECT_URI;

    if (!clientId || !redirectURI) {
      setError("Apple login is not configured.");
      return;
    }

    if (!window.AppleID?.auth) {
      setError("Apple login is not ready. Please try again.");
      return;
    }

    try {
      setSocialSubmitting("APPLE");

      const response = await window.AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;

      if (!idToken) {
        throw new Error("Apple login failed. Missing ID token.");
      }

      const { data } = await api.post("/auth/social/apple", {
        idToken,
        user: response?.user || null,
      });

      const authPayload = extractAuthPayload(data);

      if (!authPayload?.token || !authPayload?.user) {
        throw new Error("Invalid Apple login response");
      }

      handleLoginSuccess(authPayload);
    } catch (err) {
      if (err?.error === "popup_closed_by_user") return;

      setError(
        err?.response?.data?.message || err?.message || "Apple login failed",
      );
    } finally {
      setSocialSubmitting("");
    }
  }

  return (
    <section
      className="min-h-[100svh] px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-8 lg:py-10"
      style={{
        background: `radial-gradient(circle at top left, rgba(${primaryRgb}, 0.16), transparent 34%), radial-gradient(circle at bottom right, rgba(${secondaryRgb}, 0.2), transparent 30%), linear-gradient(180deg, #fff7ed 0%, #ffffff 42%, #f8fafc 100%)`,
      }}
    >
      <div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:rounded-[30px] lg:min-h-[680px] xl:min-h-[720px] xl:grid-cols-[0.92fr_1.08fr]">
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
              Kids activity booking made simple.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/85 xl:text-base">
              Parents discover activities, academies manage bookings, and{" "}
              {theme.siteName} keeps payments and operations organized in one
              platform.
            </p>

            <div className="mt-8 grid gap-4">
              <FeaturePill
                icon={UsersRound}
                title="For parents"
                text="Book activities, manage children, and track upcoming sessions."
              />

              <FeaturePill
                icon={GraduationCap}
                title="For academies"
                text="Manage activities, packages, slots, and booking enquiries."
              />

              <FeaturePill
                icon={ShieldCheck}
                title="For platform admins"
                text="Control academies, payments, settlements, reports, and settings."
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
                <div className="text-lg font-black">Secure role login</div>
                <div className="mt-1 text-sm text-white/75">
                  Parent, academy, and super admin dashboards.
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[calc(100svh-32px)] items-center justify-center p-4 sm:min-h-[640px] sm:p-6 md:p-8 lg:p-10 xl:min-h-[720px]">
          <div className="w-full max-w-[470px]">
            <div className="mb-7 flex items-center justify-between gap-4 xl:hidden">
              <Link to="/" className="flex min-w-0 items-center gap-3">
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

                <div className="min-w-0">
                  <div className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {theme.siteName}
                  </div>
                  <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                    {theme.tagline}
                  </div>
                </div>
              </Link>
            </div>

            <div
              className="inline-flex rounded-full px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.16em] ring-1 sm:text-xs"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                color: primary,
                borderColor: `rgba(${primaryRgb}, 0.2)`,
              }}
            >
              Welcome back
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Sign in to your account
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              Continue to your parent dashboard, academy workspace, or{" "}
              {theme.siteName} super admin panel.
            </p>

            <form className="mt-7 space-y-5 sm:mt-8" onSubmit={submit}>
              <label className="block">
                <div className="mb-2 text-sm font-black text-slate-800">
                  Email address
                </div>

                <div
                  className="group flex h-[56px] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 sm:h-[58px]"
                  style={{
                    "--tw-ring-color": `rgba(${primaryRgb}, 0.16)`,
                  }}
                >
                  <Mail className="h-5 w-5 shrink-0 text-slate-400 transition" />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    autoComplete="email"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-black text-slate-800">
                  Password
                </div>

                <div
                  className="group flex h-[56px] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 sm:h-[58px]"
                  style={{
                    "--tw-ring-color": `rgba(${primaryRgb}, 0.16)`,
                  }}
                >
                  <Lock className="h-5 w-5 shrink-0 text-slate-400 transition" />

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                  />

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
                </div>
              </label>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                    style={{ accentColor: primary }}
                  />
                  Remember me
                </label>

                <Link
                  to="/register"
                  className="text-sm font-black transition hover:opacity-80"
                  style={{ color: primary }}
                >
                  Create parent account
                </Link>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting || socialSubmitting || !canSubmit}
                className="group flex h-[58px] w-full items-center justify-center gap-2 rounded-[20px] px-5 text-base font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-[60px]"
                style={{
                  backgroundColor: primary,
                  boxShadow: `0 16px 34px rgba(${primaryRgb}, 0.25)`,
                }}
              >
                {submitting ? "Signing in..." : "Login"}
                {!submitting ? (
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                ) : null}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 sm:my-7">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-xs">
                Or continue with
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-3">
              <div className="mx-auto w-full max-w-[360px] overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => setError("Google login failed")}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  shape="pill"
                  text="continue_with"
                  width="360"
                />
              </div>

              <div className="mx-auto w-full max-w-[360px]">
                <button
                  type="button"
                  onClick={handleAppleLogin}
                  disabled={Boolean(socialSubmitting)}
                  className="flex h-[44px] w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {socialSubmitting === "APPLE"
                    ? "Connecting Apple..."
                    : "Continue with Apple"}
                </button>
              </div>
            </div>

            <div className="mt-7 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center sm:p-5">
              <div className="text-sm font-semibold text-slate-600">
                Looking to onboard your academy?
              </div>

              <Link
                to="/provider-joining-form"
                className="mt-2 inline-flex items-center justify-center gap-2 text-sm font-black transition hover:opacity-80"
                style={{ color: primary }}
              >
                Get started as a provider
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 text-xs text-slate-500 xs:grid-cols-3 sm:mt-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Parent portal
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Academy admin
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                Super admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

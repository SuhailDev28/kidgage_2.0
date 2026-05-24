import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
} from "lucide-react";
import { api, publicApi } from "../../lib/api.js";

const DEFAULT_THEME = {
  siteName: "KidGage",
  tagline: "Kids Activity Booking",
  logo: "",
  primaryColor: "#ec7a3b",
  secondaryColor: "#ffd84d",
};

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "236,122,59";

  return `${parseInt(clean.slice(0, 2), 16)},${parseInt(
    clean.slice(2, 4),
    16,
  )},${parseInt(clean.slice(4, 6), 16)}`;
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
    logo: settings.logo || "",
    primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
  };
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const email = String(searchParams.get("email") || "").trim();
  const token = String(searchParams.get("token") || "").trim();

  const primary = theme.primaryColor || DEFAULT_THEME.primaryColor;
  const secondary = theme.secondaryColor || DEFAULT_THEME.secondaryColor;
  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);

  const isValid = useMemo(() => {
    return (
      token &&
      email &&
      form.password.length >= 6 &&
      form.password === form.confirmPassword
    );
  }, [email, token, form.password, form.confirmPassword]);

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
          // try next
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setError("");
    setMessage("");
  }

  async function submit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!token || !email) {
      setError("Password reset link is invalid.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await api.post("/auth/reset-password", {
        email,
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setMessage(
        data?.message ||
          "Password has been reset successfully. You can now login.",
      );

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to reset password.",
      );
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
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[720px] items-center justify-center px-5 py-8">
        <div className="w-full rounded-[32px] border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8 md:p-10">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div
            className="mt-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: primary }}
          >
            <Sparkles className="h-7 w-7" />
          </div>

          <div
            className="mt-5 inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1"
            style={{
              backgroundColor: `rgba(${primaryRgb}, 0.1)`,
              color: primary,
              borderColor: `rgba(${primaryRgb}, 0.2)`,
            }}
          >
            Reset Password
          </div>

          <h1 className="mt-5 text-[34px] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl">
            Create new password
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Enter a new password for your {theme.siteName} account.
          </p>

          {!token || !email ? (
            <div className="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
              Password reset link is invalid or incomplete.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block">
              <div className="mb-2 text-sm font-black text-slate-800">
                New password
              </div>

              <div
                className="flex h-[58px] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4"
                style={{
                  "--tw-ring-color": `rgba(${primaryRgb}, 0.16)`,
                }}
              >
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-black text-slate-800">
                Confirm password
              </div>

              <div
                className="flex h-[58px] items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4"
                style={{
                  "--tw-ring-color": `rgba(${primaryRgb}, 0.16)`,
                }}
              >
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField("confirmPassword", e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </label>

            {message ? (
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="group flex h-[60px] w-full items-center justify-center gap-2 rounded-[20px] px-5 text-base font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: primary,
                boxShadow: `0 16px 34px rgba(${primaryRgb}, 0.25)`,
              }}
            >
              {submitting ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

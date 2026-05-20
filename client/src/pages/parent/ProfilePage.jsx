// client/src/pages/parent/ProfilePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  UserCircle2,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  Eye,
  EyeOff,
  Baby,
  CalendarDays,
  CreditCard,
  Wallet,
  Clock3,
  BadgeCheck,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { getUser } from "../../lib/auth.js";

function normalizeUser(value) {
  const user = value?.user || value?.parent || value?.data?.user || value || {};

  return {
    id: user._id || user.id || "",
    fullName: user.fullName || user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    city: user.city || "",
    role: user.role || "PARENT",
    status: user.status || "ACTIVE",
    createdAt: user.createdAt || null,
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(value, currency = "QAR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function normalizeUpper(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();
  return text || fallback;
}

function getPasswordStrength(password) {
  const text = String(password || "");
  let score = 0;

  if (text.length >= 6) score += 1;
  if (text.length >= 10) score += 1;
  if (/[A-Z]/.test(text)) score += 1;
  if (/[0-9]/.test(text)) score += 1;
  if (/[^A-Za-z0-9]/.test(text)) score += 1;

  if (!text) {
    return {
      label: "Not entered",
      className: "bg-slate-100 text-slate-500",
      width: "0%",
    };
  }

  if (score <= 2) {
    return {
      label: "Weak",
      className: "bg-red-50 text-red-700",
      bar: "bg-red-500",
      width: "35%",
    };
  }

  if (score <= 4) {
    return {
      label: "Good",
      className: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      width: "70%",
    };
  }

  return {
    label: "Strong",
    className: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    width: "100%",
  };
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="mt-3 truncate text-3xl font-black text-slate-900">
            {value}
          </div>
          {helper ? (
            <div className="mt-1 text-sm font-medium text-slate-500">
              {helper}
            </div>
          ) : null}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ec7a3b]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children, helper }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </label>
      {children}
      {helper ? (
        <div className="mt-2 text-xs font-medium text-slate-400">{helper}</div>
      ) : null}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ParentProfilePage() {
  const localUser = useMemo(() => normalizeUser(getUser?.() || {}), []);

  const [profile, setProfile] = useState(localUser);
  const [stats, setStats] = useState({
    childrenCount: 0,
    bookingsCount: 0,
    paidBookingsCount: 0,
    pendingPaymentsCount: 0,
    paidAmount: 0,
    currency: "QAR",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const initials = useMemo(() => {
    const parts = String(profile.fullName || "Parent")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    return (
      parts
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "P"
    );
  }, [profile.fullName]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwords.newPassword),
    [passwords.newPassword],
  );

  const profileStatus = normalizeUpper(profile.status, "ACTIVE");

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let profileData = null;

      try {
        const res = await api.get("/parent/me");
        profileData = res.data;
      } catch {
        try {
          const res = await api.get("/parent/profile");
          profileData = res.data;
        } catch {
          profileData = localUser;
        }
      }

      setProfile((prev) => ({
        ...prev,
        ...normalizeUser(profileData),
      }));

      try {
        const dashboardRes = await api.get("/parent/dashboard");
        setStats({
          childrenCount: Number(dashboardRes.data?.childrenCount || 0),
          bookingsCount: Number(dashboardRes.data?.bookingsCount || 0),
          paidBookingsCount: Number(dashboardRes.data?.paidBookingsCount || 0),
          pendingPaymentsCount: Number(
            dashboardRes.data?.pendingPaymentsCount || 0,
          ),
          paidAmount: Number(
            dashboardRes.data?.paidAmount ||
              dashboardRes.data?.totals?.paidAmount ||
              0,
          ),
          currency:
            dashboardRes.data?.currency ||
            dashboardRes.data?.totals?.currency ||
            "QAR",
        });
      } catch {
        // dashboard stats are optional
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [localUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function updateProfileField(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updatePasswordField(field, value) {
    setPasswords((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function togglePassword(field) {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  function clearAlerts() {
    setError("");
    setMessage("");
  }

  async function saveProfile() {
    try {
      setSavingProfile(true);
      clearAlerts();

      const payload = {
        fullName: String(profile.fullName || "").trim(),
        phone: String(profile.phone || "").trim(),
        address: String(profile.address || "").trim(),
        city: String(profile.city || "").trim(),
      };

      if (!payload.fullName) {
        setError("Full name is required.");
        return;
      }

      let saved = null;

      try {
        const res = await api.patch("/parent/me", payload);
        saved = res.data;
      } catch {
        const res = await api.patch("/parent/profile", payload);
        saved = res.data;
      }

      const updatedUser = normalizeUser(saved);
      setProfile((prev) => ({
        ...prev,
        ...updatedUser,
        ...payload,
      }));

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    try {
      setSavingPassword(true);
      clearAlerts();

      const currentPassword = String(passwords.currentPassword || "").trim();
      const newPassword = String(passwords.newPassword || "").trim();
      const confirmPassword = String(passwords.confirmPassword || "").trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        setError("Please fill all password fields.");
        return;
      }

      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }

      if (newPassword === currentPassword) {
        setError("New password must be different from current password.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }

      const payload = {
        currentPassword,
        newPassword,
      };

      try {
        await api.patch("/parent/password", payload);
      } catch {
        await api.patch("/parent/change-password", payload);
      }

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswords({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });

      setMessage("Password changed successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to change password.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <section className="px-3 py-5 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-5 py-7 sm:px-7">
            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[26px] bg-[#ec7a3b] text-2xl font-black text-white shadow-[0_18px_40px_rgba(236,122,59,0.24)]">
                  {initials}
                </div>

                <div className="min-w-0">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ec7a3b] ring-1 ring-orange-100">
                    <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Parent Profile</span>
                  </div>

                  <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-900">
                    {profile.fullName || "Parent"}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                    <span>Member since {formatDate(profile.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {profileStatus}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={loadProfile}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Baby}
            label="Children"
            value={loading ? "..." : stats.childrenCount}
            helper="Child profiles"
          />
          <StatCard
            icon={CalendarDays}
            label="Bookings"
            value={loading ? "..." : stats.bookingsCount}
            helper="Total bookings"
          />
          <StatCard
            icon={CreditCard}
            label="Paid Bookings"
            value={loading ? "..." : stats.paidBookingsCount}
            helper="Confirmed payments"
          />
          <StatCard
            icon={Wallet}
            label="Paid Amount"
            value={loading ? "..." : money(stats.paidAmount, stats.currency)}
            helper={`${stats.pendingPaymentsCount || 0} payment(s) pending`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Personal Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update your parent account details.
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#ec7a3b] ring-1 ring-orange-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure Account
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field icon={UserCircle2} label="Full Name">
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) =>
                    updateProfileField("fullName", e.target.value)
                  }
                  placeholder="Enter full name"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                />
              </Field>

              <Field
                icon={Mail}
                label="Email"
                helper="Email cannot be changed from this page."
              >
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="h-12 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 outline-none"
                />
              </Field>

              <Field icon={Phone} label="Phone">
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => updateProfileField("phone", e.target.value)}
                  placeholder="Enter phone number"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                />
              </Field>

              <Field icon={MapPin} label="City">
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => updateProfileField("city", e.target.value)}
                  placeholder="Enter city"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                />
              </Field>

              <div className="md:col-span-2">
                <Field icon={MapPin} label="Address">
                  <textarea
                    value={profile.address}
                    onChange={(e) =>
                      updateProfileField("address", e.target.value)
                    }
                    placeholder="Enter address"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ec7a3b] focus:ring-4 focus:ring-orange-100"
                  />
                </Field>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(236,122,59,0.22)] transition hover:brightness-95 disabled:opacity-60 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">Security</h2>
              <p className="mt-1 text-sm text-slate-500">
                Change your login password.
              </p>
            </div>

            <div className="space-y-5">
              <Field icon={LockKeyhole} label="Current Password">
                <PasswordInput
                  show={showPasswords.currentPassword}
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    updatePasswordField("currentPassword", e.target.value)
                  }
                  onToggle={() => togglePassword("currentPassword")}
                  placeholder="Current password"
                />
              </Field>

              <Field icon={LockKeyhole} label="New Password">
                <PasswordInput
                  show={showPasswords.newPassword}
                  value={passwords.newPassword}
                  onChange={(e) =>
                    updatePasswordField("newPassword", e.target.value)
                  }
                  onToggle={() => togglePassword("newPassword")}
                  placeholder="New password"
                />

                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Password Strength
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${passwordStrength.className}`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.bar || "bg-slate-300"}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                </div>
              </Field>

              <Field icon={ShieldCheck} label="Confirm Password">
                <PasswordInput
                  show={showPasswords.confirmPassword}
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    updatePasswordField("confirmPassword", e.target.value)
                  }
                  onToggle={() => togglePassword("confirmPassword")}
                  placeholder="Confirm password"
                />
              </Field>

              <button
                type="button"
                onClick={changePassword}
                disabled={savingPassword}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <LockKeyhole className="h-4 w-4" />
                {savingPassword ? "Updating..." : "Change Password"}
              </button>

              <div className="rounded-[22px] bg-orange-50/70 p-4 text-sm leading-6 text-slate-600 ring-1 ring-orange-100">
                <div className="mb-1 flex items-center gap-2 font-black text-slate-900">
                  <Clock3 className="h-4 w-4 text-[#ec7a3b]" />
                  Security tip
                </div>
                Use at least 8 characters with a number and symbol for better
                protection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

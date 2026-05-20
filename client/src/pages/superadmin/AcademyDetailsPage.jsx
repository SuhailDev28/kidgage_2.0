// client/src/pages/superadmin/AcademyDetailsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  LayoutGrid,
  CalendarDays,
  Star,
  CheckCircle2,
  Ban,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Pencil,
  Globe,
  Hash,
  MapPinned,
  Eye,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${base}${value}`;
  if (value.startsWith("uploads/")) return `${base}/${value}`;

  return `${base}/uploads/${value}`;
}

function formatDate(value) {
  if (!value || value === "-") return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeAcademy(item) {
  return {
    id: item?._id || item?.id || "",
    name: item?.name || item?.academyName || "Untitled Academy",
    slug: item?.slug || "",
    email: item?.email || item?.contactEmail || "-",
    phone: item?.phone || item?.contactNumber || "-",
    city: item?.city || item?.location?.city || item?.location || "Doha",
    address: item?.address || "",
    website: item?.website || "",
    description: item?.description || item?.bio || "",
    logo: item?.logo || item?.image || "",
    activities: toNumber(
      item?.activities ?? item?.activitiesCount ?? item?.stats?.activities ?? 0,
    ),
    branches: toNumber(
      item?.branches ?? item?.branchesCount ?? item?.stats?.branches ?? 0,
    ),
    status: String(item?.status || "INACTIVE").toUpperCase(),
    featured: Boolean(item?.featured || item?.isFeatured),
    createdAt: item?.createdAt || "-",
  };
}

function extractAcademies(payload) {
  const root = payload?.data || payload || {};
  const list =
    root?.academies || root?.items || root?.rows || root?.results || [];

  return toArray(list).map(normalizeAcademy);
}

function getInitials(name = "Academy") {
  const words = String(name || "Academy")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "A";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function StatusBadge({ value }) {
  const status = String(value || "INACTIVE").toUpperCase();

  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
    INACTIVE: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] ring-1 ${
        styles[status] || styles.INACTIVE
      }`}
    >
      {status}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, href }) {
  const content = (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </div>
        <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-900">
          {value || "N/A"}
        </div>
      </div>
    </div>
  );

  if (href && value && value !== "N/A" && value !== "-") {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

function MetricCard({ icon: Icon, label, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </div>
          {subtitle ? (
            <div className="mt-1 truncate text-xs font-medium text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tones[tone] || tones.orange
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  children,
  onClick,
  to,
  disabled = false,
  variant = "default",
}) {
  const styles = {
    default:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
    primary:
      "border-transparent bg-[#ff7a3d] text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] hover:brightness-95",
    success:
      "border-transparent bg-emerald-600 text-white shadow-[0_12px_28px_rgba(5,150,105,0.18)] hover:bg-emerald-700",
    danger:
      "border-transparent bg-red-600 text-white shadow-[0_12px_28px_rgba(220,38,38,0.18)] hover:bg-red-700",
    soft: "border-orange-100 bg-orange-50 text-[#ff7a3d] hover:bg-orange-100",
    blue: "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
  };

  const className = `inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    styles[variant] || styles.default
  }`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function RelatedAcademyCard({ item }) {
  const logoSrc = normalizeImage(item.logo);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logoSrc]);

  return (
    <Link
      to={`/super-admin/academies/${item.id}`}
      className="group block rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-orange-100 hover:bg-white hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-[#ff7a3d] shadow-sm">
          {logoSrc && !imageFailed ? (
            <img
              src={logoSrc}
              alt={item.name}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="text-lg font-black">{getInitials(item.name)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-black text-slate-900">
            {item.name}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{item.city}</span>
          </div>

          <div className="mt-3">
            <StatusBadge value={item.status} />
          </div>
        </div>

        <div className="mt-1 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#ff7a3d]">
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

export default function AcademyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [academy, setAcademy] = useState(null);
  const [allAcademies, setAllAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAcademy = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        setError("");

        let rows = [];

        try {
          const detailsRes = await api.get(`/super-admin/academies/${id}`);
          const item =
            detailsRes?.data?.academy ||
            detailsRes?.data?.item ||
            detailsRes?.data ||
            null;

          if (item) {
            const normalized = normalizeAcademy(item);
            rows = [normalized];
            setAcademy(normalized);
          }
        } catch {
          // fallback to list endpoint below
        }

        const listRes = await api.get("/super-admin/academies");
        const listRows = extractAcademies(listRes);

        setAllAcademies(listRows);

        const found =
          listRows.find((item) => String(item.id) === String(id)) ||
          rows[0] ||
          null;

        setAcademy(found);
      } catch (err) {
        setAcademy(null);
        setAllAcademies([]);
        setError(
          err?.response?.data?.message || "Failed to load academy details.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadAcademy();
  }, [loadAcademy]);

  const related = useMemo(() => {
    return allAcademies
      .filter((item) => String(item.id) !== String(id))
      .slice(0, 3);
  }, [allAcademies, id]);

  async function updateStatus(status) {
    if (!academy?.id) return;

    const previous = academy;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      setAcademy((prev) => (prev ? { ...prev, status } : prev));

      await api.put(`/super-admin/academies/${academy.id}/status`, { status });

      setMessage(
        status === "ACTIVE"
          ? "Academy approved successfully."
          : "Academy suspended successfully.",
      );

      await loadAcademy({ silent: true });
    } catch (err) {
      setAcademy(previous);
      setError(
        err?.response?.data?.message || "Failed to update academy status.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFeatured() {
    if (!academy?.id) return;

    const nextFeatured = !academy.featured;
    const previous = academy;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      setAcademy((prev) => (prev ? { ...prev, featured: nextFeatured } : prev));

      await api.put(`/super-admin/academies/${academy.id}`, {
        featured: nextFeatured,
      });

      setMessage(
        nextFeatured
          ? "Academy marked as featured."
          : "Academy removed from featured list.",
      );

      await loadAcademy({ silent: true });
    } catch (err) {
      setAcademy(previous);
      setError(
        err?.response?.data?.message || "Failed to update featured status.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-slate-50 px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
          <div className="h-36 animate-pulse rounded-[34px] bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-[24px] bg-slate-100"
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
            <div className="h-96 animate-pulse rounded-[28px] bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (!academy) {
    return (
      <main className="min-h-screen w-full bg-slate-50 px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-2xl font-black text-slate-900">
              Academy not found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The requested academy could not be loaded. It may have been
              removed or the ID is invalid.
            </p>

            <button
              type="button"
              onClick={() => navigate("/super-admin/academies")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Academies
            </button>
          </div>
        </div>
      </main>
    );
  }

  const logoSrc = normalizeImage(academy.logo);

  return (
    <main className="min-h-screen w-full bg-slate-50 px-3 py-4 text-slate-900 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1800px] space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm sm:rounded-[34px]">
          <div className="relative bg-gradient-to-br from-white via-white to-orange-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-100/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/2 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />

            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Academy Profile
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[26px] bg-white text-[#ff7a3d] shadow-sm ring-1 ring-slate-200 sm:h-24 sm:w-24">
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={academy.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black sm:text-3xl">
                        {getInitials(academy.name)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {academy.name}
                    </h1>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge value={academy.status} />

                      {academy.featured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-blue-700 ring-1 ring-blue-200">
                          <Sparkles className="h-3.5 w-3.5" />
                          Featured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200">
                          <Eye className="h-3.5 w-3.5" />
                          Standard
                        </span>
                      )}
                    </div>

                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                      {academy.description ||
                        "Manage academy information, contact details, activity visibility, approval status, and partner profile from this page."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:self-start">
                <button
                  type="button"
                  onClick={() => navigate("/super-admin/academies")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => loadAcademy({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  to={`/super-admin/academies/${academy.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={LayoutGrid}
            label="Activities"
            value={academy.activities}
            subtitle="Published programs"
            tone="orange"
          />
          <MetricCard
            icon={Building2}
            label="Branches"
            value={academy.branches}
            subtitle="Academy locations"
            tone="emerald"
          />
          <MetricCard
            icon={CalendarDays}
            label="Created"
            value={formatDate(academy.createdAt)}
            subtitle="Joined KidGage"
            tone="amber"
          />
          <MetricCard
            icon={Star}
            label="Visibility"
            value={academy.featured ? "Featured" : "Standard"}
            subtitle="Homepage status"
            tone={academy.featured ? "violet" : "slate"}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Contact & Business Details
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Public and administrative academy profile information.
                  </p>
                </div>

                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d] sm:flex">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoCard icon={Mail} label="Email" value={academy.email} />
                <InfoCard icon={Phone} label="Phone" value={academy.phone} />
                <InfoCard icon={MapPin} label="City" value={academy.city} />
                <InfoCard
                  icon={Hash}
                  label="Slug"
                  value={academy.slug || "N/A"}
                />
                <InfoCard
                  icon={Globe}
                  label="Website"
                  value={academy.website || "N/A"}
                  href={academy.website}
                />
                <InfoCard
                  icon={MapPinned}
                  label="Address"
                  value={academy.address || "N/A"}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Academy Description
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Overview visible for academy profile and internal review.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 ring-1 ring-slate-200">
                {academy.description || "No description added yet."}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-900">
                Quick Actions
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Update approval, suspension, featured status, or profile data.
              </p>

              <div className="mt-5 grid gap-3">
                <ActionButton
                  icon={CheckCircle2}
                  variant="success"
                  disabled={actionLoading || academy.status === "ACTIVE"}
                  onClick={() => updateStatus("ACTIVE")}
                >
                  {academy.status === "ACTIVE"
                    ? "Already Approved"
                    : "Approve Academy"}
                </ActionButton>

                <ActionButton
                  icon={Ban}
                  variant="danger"
                  disabled={actionLoading || academy.status === "SUSPENDED"}
                  onClick={() => updateStatus("SUSPENDED")}
                >
                  {academy.status === "SUSPENDED"
                    ? "Already Suspended"
                    : "Suspend Academy"}
                </ActionButton>

                <ActionButton
                  icon={academy.featured ? RotateCcw : Star}
                  variant={academy.featured ? "soft" : "blue"}
                  disabled={actionLoading}
                  onClick={toggleFeatured}
                >
                  {academy.featured ? "Remove Featured" : "Mark Featured"}
                </ActionButton>

                <ActionButton
                  icon={Pencil}
                  to={`/super-admin/academies/${academy.id}/edit`}
                >
                  Edit Profile
                </ActionButton>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-slate-900">
                System Details
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Academy ID
                  </div>
                  <div className="mt-2 break-all text-sm font-bold text-slate-900">
                    {academy.id}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Current Status
                  </div>
                  <div className="mt-2">
                    <StatusBadge value={academy.status} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Other Academies
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Quick access to other academy partner profiles.
              </p>
            </div>

            <Link
              to="/super-admin/academies"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View All
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {related.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <RelatedAcademyCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <h3 className="text-lg font-black text-slate-900">
                No related academies found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Add more academies to see them here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

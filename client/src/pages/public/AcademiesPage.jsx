import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { publicApi } from "../../lib/api.js";
import { AcademyCard } from "../../components/public/AcademyCard.jsx";

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Building2 className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900">
        No academies found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try changing your search keyword or selected city.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:brightness-95"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Filters
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-[26px] bg-slate-100">
        <div className="h-24 w-24 animate-pulse rounded-[24px] bg-slate-200" />
      </div>

      <div className="mt-5 space-y-3">
        <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
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

function normalizeAcademy(item) {
  return {
    _id: item?._id || item?.id || "",
    id: item?._id || item?.id || "",
    slug: item?.slug || "",
    name: item?.name || item?.academyName || "Academy",
    city: item?.city || item?.location?.city || item?.location || "Doha",
    logo: item?.logo || item?.image || item?.thumbnail || "",
    image: item?.logo || item?.image || item?.thumbnail || "",
    thumbnail: item?.thumbnail || item?.logo || item?.image || "",
    status: String(item?.status || "ACTIVE").toUpperCase(),
    featured: Boolean(item?.featured || item?.isFeatured),
  };
}

function SelectBox({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#ff7a3d]"
      >
        {children}
      </select>

      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export default function AcademiesPage() {
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");

  const loadAcademies = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const res = await publicApi.get("/academies");

      const list = Array.isArray(res?.data?.academies)
        ? res.data.academies
        : Array.isArray(res?.data)
          ? res.data
          : [];

      setAcademies(list.map(normalizeAcademy));
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load academies right now.",
      );
      setAcademies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAcademies();
  }, [loadAcademies]);

  const cities = useMemo(() => {
    const unique = [
      ...new Set(
        academies
          .map((item) => String(item?.city || "").trim())
          .filter(Boolean),
      ),
    ];

    return ["ALL", ...unique];
  }, [academies]);

  const filteredAcademies = useMemo(() => {
    const q = search.trim().toLowerCase();

    return academies.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const city = String(item?.city || "").toLowerCase();
      const status = String(item?.status || "").toLowerCase();

      const matchesSearch =
        !q || name.includes(q) || city.includes(q) || status.includes(q);

      const matchesCity =
        cityFilter === "ALL"
          ? true
          : String(item?.city || "").trim() === cityFilter;

      return matchesSearch && matchesCity;
    });
  }, [academies, search, cityFilter]);

  const stats = useMemo(() => {
    return {
      total: academies.length,
      visible: academies.filter((item) => item.status !== "INACTIVE").length,
      featured: academies.filter((item) => item.featured).length,
      cities: cities.length > 0 ? Math.max(cities.length - 1, 0) : 0,
    };
  }, [academies, cities]);

  const hasFilters = Boolean(search || cityFilter !== "ALL");

  function clearFilters() {
    setSearch("");
    setCityFilter("ALL");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/2 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="container-main relative py-8 sm:py-10 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                KidGage Partner Network
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Explore Trusted Academies
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Find verified academies and activity partners for kids programs,
                classes, and creative learning experiences across Qatar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAcademies({ silent: true })}
              disabled={refreshing}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="container-main py-6 sm:py-8 md:py-10">
        <div className="space-y-5 sm:space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Building2}
              title="Academies"
              value={loading ? "..." : stats.total}
              subtitle="Listed partners"
              tone="orange"
            />
            <StatCard
              icon={CheckCircle2}
              title="Available"
              value={loading ? "..." : stats.visible}
              subtitle="Public listings"
              tone="emerald"
            />
            <StatCard
              icon={Sparkles}
              title="Featured"
              value={loading ? "..." : stats.featured}
              subtitle="Highlighted partners"
              tone="blue"
            />
            <StatCard
              icon={MapPin}
              title="Cities"
              value={loading ? "..." : stats.cities}
              subtitle="Service areas"
              tone="slate"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_240px_auto]">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Search
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search academy name, city, status..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  City
                </label>

                <SelectBox
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city === "ALL" ? "All Cities" : city}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Academy Partners
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredAcademies.length} of {academies.length}{" "}
                  academies.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Sparkles className="h-3.5 w-3.5" />
                Verified partners
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : filteredAcademies.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredAcademies.map((item) => (
                  <AcademyCard
                    key={item._id || item.id || item.slug}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <EmptyState onReset={clearFilters} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

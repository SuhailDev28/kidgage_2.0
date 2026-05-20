import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronDown,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { api } from "../../lib/api.js";
import { ActivityCard } from "../../components/public/ActivityCard.jsx";

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:-translate-y-0.5 hover:bg-[#f06423] hover:shadow-[0_18px_36px_rgba(255,122,61,0.26)] disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1877f2]/20 bg-white px-4 text-sm font-bold text-[#1877f2] transition hover:border-[#ff7a3d]/40 hover:bg-orange-50 hover:text-[#ff7a3d] disabled:cursor-not-allowed disabled:opacity-50";

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(item) {
  return {
    _id: item?._id || item?.id || "",
    id: item?._id || item?.id || "",
    name: item?.name || item?.title || "",
    slug:
      item?.slug ||
      normalizeSlug(item?.name || item?.title || item?.categoryName || ""),
  };
}

function normalizeActivity(item) {
  const academyName =
    item?.academy?.name ||
    item?.academyId?.name ||
    item?.academyName ||
    item?.providerName ||
    "";

  const categoryName =
    item?.category?.name ||
    item?.categoryId?.name ||
    item?.categoryName ||
    item?.category ||
    "";

  const categorySlug =
    item?.category?.slug ||
    item?.categoryId?.slug ||
    item?.categorySlug ||
    normalizeSlug(categoryName);

  return {
    ...item,
    _id: item?._id || item?.id || "",
    id: item?._id || item?.id || "",
    slug: item?.slug || "",
    title: item?.title || item?.name || "Activity",
    name: item?.name || item?.title || "Activity",
    academyName,
    categoryName,
    categorySlug,
    minAge: item?.minAge ?? null,
    maxAge: item?.maxAge ?? null,
    status: String(item?.status || "PUBLISHED").toUpperCase(),
    featured: Boolean(item?.featured || item?.isFeatured),
  };
}

function StatCard({ icon: Icon, title, value, subtitle, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-50 text-[#ff7a3d]",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-[#1877f2]",
    violet: "bg-violet-50 text-violet-600",
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

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Activity className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900">
        No activities found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Try changing your search keyword, category, academy, or age filter.
      </p>

      <button
        type="button"
        onClick={onReset}
        className={`mt-6 ${PRIMARY_BUTTON}`}
      >
        <RotateCcw className="h-4 w-4" />
        Reset Filters
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-56 animate-pulse bg-slate-100 sm:h-64" />

      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
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

function prettyLabel(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ActivitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [academyFilter, setAcademyFilter] = useState("ALL");
  const [ageFilter, setAgeFilter] = useState("ALL");

  const categoryFilter = searchParams.get("category") || "ALL";

  const loadPage = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const [activitiesRes, categoriesRes] = await Promise.all([
        api.get("/public/activities"),
        api.get("/public/categories"),
      ]);

      const activityList = Array.isArray(activitiesRes?.data?.activities)
        ? activitiesRes.data.activities
        : Array.isArray(activitiesRes?.data)
          ? activitiesRes.data
          : [];

      const categoryList = Array.isArray(categoriesRes?.data?.categories)
        ? categoriesRes.data.categories
        : Array.isArray(categoriesRes?.data)
          ? categoriesRes.data
          : [];

      setActivities(activityList.map(normalizeActivity));
      setCategories(categoryList.map(normalizeCategory));
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load activities right now.",
      );
      setActivities([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const academies = useMemo(() => {
    const unique = [
      ...new Set(
        activities
          .map((item) => item?.academy?.name || item?.academyName)
          .filter(Boolean),
      ),
    ];

    return ["ALL", ...unique];
  }, [activities]);

  const categoryOptions = useMemo(() => {
    const fromCategories = categories.map((item) => item.slug).filter(Boolean);

    const fromActivities = activities
      .map(
        (item) =>
          item?.category?.slug ||
          item?.categorySlug ||
          normalizeSlug(item?.category?.name || item?.categoryName),
      )
      .filter(Boolean);

    const merged = [...new Set([...fromCategories, ...fromActivities])];

    if (categoryFilter !== "ALL" && !merged.includes(categoryFilter)) {
      merged.unshift(categoryFilter);
    }

    return ["ALL", ...merged];
  }, [categories, activities, categoryFilter]);

  const selectedCategoryLabel = useMemo(() => {
    if (categoryFilter === "ALL") return "All Activities";

    const matchCategory = categories.find(
      (item) => item.slug === categoryFilter,
    );

    if (matchCategory?.name) return matchCategory.name;

    const matchActivity = activities.find((item) => {
      const slug =
        item?.category?.slug ||
        item?.categorySlug ||
        normalizeSlug(item?.category?.name || item?.categoryName);

      return slug === categoryFilter;
    });

    return (
      matchActivity?.category?.name ||
      matchActivity?.categoryName ||
      prettyLabel(categoryFilter)
    );
  }, [activities, categories, categoryFilter]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ageValue = ageFilter === "ALL" ? null : Number(ageFilter);

    return activities.filter((item) => {
      const title = String(item?.title || item?.name || "").toLowerCase();
      const academyName = String(
        item?.academy?.name || item?.academyName || "",
      ).toLowerCase();
      const categoryName = String(
        item?.category?.name || item?.categoryName || "",
      ).toLowerCase();

      const itemCategorySlug =
        item?.category?.slug ||
        item?.categorySlug ||
        normalizeSlug(item?.category?.name || item?.categoryName || "");

      const matchesSearch =
        !q ||
        title.includes(q) ||
        academyName.includes(q) ||
        categoryName.includes(q);

      const matchesAcademy =
        academyFilter === "ALL"
          ? true
          : (item?.academy?.name || item?.academyName || "") === academyFilter;

      const matchesCategory =
        categoryFilter === "ALL" ? true : itemCategorySlug === categoryFilter;

      const matchesAge =
        ageValue === null
          ? true
          : item?.minAge != null && item?.maxAge != null
            ? ageValue >= Number(item.minAge) && ageValue <= Number(item.maxAge)
            : item?.minAge != null
              ? ageValue >= Number(item.minAge)
              : true;

      return matchesSearch && matchesAcademy && matchesCategory && matchesAge;
    });
  }, [activities, search, academyFilter, categoryFilter, ageFilter]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      categories: categoryOptions.filter((item) => item !== "ALL").length,
      academies: academies.filter((item) => item !== "ALL").length,
      featured: activities.filter((item) => item.featured).length,
    };
  }, [activities, categoryOptions, academies]);

  const hasFilters = Boolean(
    search ||
    academyFilter !== "ALL" ||
    ageFilter !== "ALL" ||
    categoryFilter !== "ALL",
  );

  function handleCategoryChange(value) {
    const next = new URLSearchParams(searchParams);

    if (!value || value === "ALL") {
      next.delete("category");
    } else {
      next.set("category", value);
    }

    setSearchParams(next);
  }

  function clearFilters() {
    setSearch("");
    setAcademyFilter("ALL");
    setAgeFilter("ALL");

    const next = new URLSearchParams(searchParams);
    next.delete("category");
    setSearchParams(next);
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="container-main relative py-8 sm:py-10 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                KidGage Activity Marketplace
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                Explore Kids Activities
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Browse programs from trusted academies, filter by category,
                provider, and age, then choose the right activity for your
                child.
              </p>

              <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                <Sparkles className="h-4 w-4 text-[#ff7a3d]" />
                Currently showing:
                <span className="text-[#ff7a3d]">{selectedCategoryLabel}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadPage({ silent: true })}
              disabled={refreshing}
              className={`h-12 ${PRIMARY_BUTTON}`}
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
              icon={Activity}
              title="Activities"
              value={loading ? "..." : stats.total}
              subtitle="Available programs"
              tone="orange"
            />

            <StatCard
              icon={Tags}
              title="Categories"
              value={loading ? "..." : stats.categories}
              subtitle="Activity types"
              tone="blue"
            />

            <StatCard
              icon={Building2}
              title="Academies"
              value={loading ? "..." : stats.academies}
              subtitle="Partner providers"
              tone="emerald"
            />

            <StatCard
              icon={Sparkles}
              title="Featured"
              value={loading ? "..." : stats.featured}
              subtitle="Highlighted activities"
              tone="violet"
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
                <Filter className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Find Activities
                </h2>
                <p className="text-sm text-slate-500">
                  Search and filter activities across all academies.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_180px_auto]">
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
                    placeholder="Search activities, academies, categories..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a3d]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Category
                </label>

                <SelectBox
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category === "ALL"
                        ? "All Categories"
                        : prettyLabel(category)}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Academy
                </label>

                <SelectBox
                  value={academyFilter}
                  onChange={(e) => setAcademyFilter(e.target.value)}
                >
                  {academies.map((academy) => (
                    <option key={academy} value={academy}>
                      {academy === "ALL" ? "All Academies" : academy}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Age
                </label>

                <SelectBox
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                >
                  <option value="ALL">All Ages</option>
                  <option value="3">Age 3+</option>
                  <option value="5">Age 5+</option>
                  <option value="8">Age 8+</option>
                  <option value="12">Age 12+</option>
                </SelectBox>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className={`h-12 w-full xl:w-auto ${SECONDARY_BUTTON}`}
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Activity Results
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredActivities.length} of {activities.length}{" "}
                  activities.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Users className="h-3.5 w-3.5" />
                Kids programs
              </div>
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredActivities.map((item) => (
                  <ActivityCard
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

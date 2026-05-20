// client/src/components/public/SearchHero.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getCategoryValue(item) {
  return normalizeId(
    item?.slug || item?.name || item?.title || item?._id || "",
  );
}

function getAcademyValue(item) {
  return normalizeId(
    item?.slug || item?._id || item?.id || item?.academyId || item?.name || "",
  );
}

function NativeSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
}) {
  return (
    <div className="group relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`h-[58px] w-full appearance-none rounded-[20px] border bg-white px-4 pr-12 text-sm font-black outline-none shadow-sm transition ${
          value
            ? "border-[#ffb088] text-[#0f172a]"
            : "border-[rgba(15,23,42,0.08)] text-[#64748b]"
        } hover:border-[#ff7a3d]/40 hover:bg-[#fffaf7] focus:border-[#ff7a3d] focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70`}
      >
        <option value="">{label}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#fff4ec] text-[#ff7a3d] transition group-hover:bg-[#ff7a3d] group-hover:text-white">
        <ChevronDown className="h-4 w-4" />
      </span>
    </div>
  );
}

export function SearchHero() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [academies, setAcademies] = useState([]);

  const [filters, setFilters] = useState({
    location: "",
    gender: "",
    age: "",
    activity: "",
    academy: "",
  });

  useEffect(() => {
    let active = true;

    async function loadSearchData() {
      try {
        setLoading(true);

        const [categoryRes, academyRes] = await Promise.allSettled([
          api.get("/public/categories"),
          api.get("/public/academies"),
        ]);

        if (!active) return;

        const categoryRows =
          categoryRes.status === "fulfilled"
            ? toArray(
                categoryRes.value?.data?.categories ||
                  categoryRes.value?.data?.items ||
                  [],
              )
            : [];

        const academyRows =
          academyRes.status === "fulfilled"
            ? toArray(
                academyRes.value?.data?.academies ||
                  academyRes.value?.data?.items ||
                  [],
              )
            : [];

        setCategories(categoryRows);
        setAcademies(academyRows);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSearchData();

    return () => {
      active = false;
    };
  }, []);

  const locationOptions = useMemo(() => {
    const set = new Set();

    academies.forEach((item) => {
      const city = String(item?.city || item?.location || "").trim();
      if (city) set.add(city);
    });

    if (!set.size) {
      ["Doha", "Al Wakrah", "Al Rayyan", "Lusail", "The Pearl"].forEach(
        (item) => set.add(item),
      );
    }

    return [...set].sort().map((item) => ({
      label: item,
      value: item,
    }));
  }, [academies]);

  const genderOptions = [
    { label: "Boys", value: "BOYS" },
    { label: "Girls", value: "GIRLS" },
    { label: "Mixed", value: "MIXED" },
    { label: "All", value: "ALL" },
  ];

  const ageOptions = [
    { label: "0 - 2 years", value: "0-2" },
    { label: "3 - 5 years", value: "3-5" },
    { label: "6 - 8 years", value: "6-8" },
    { label: "9 - 12 years", value: "9-12" },
    { label: "13+ years", value: "13+" },
  ];

  const activityOptions = useMemo(() => {
    return categories
      .map((item) => {
        const label = item?.name || item?.title || "Activity";
        const value = getCategoryValue(item) || normalizeSlug(label);

        return { label, value };
      })
      .filter((item) => item.value);
  }, [categories]);

  const academyOptions = useMemo(() => {
    return academies
      .map((item) => {
        const label = item?.name || item?.academyName || "Academy";
        const value = getAcademyValue(item);

        return { label, value };
      })
      .filter((item) => item.value);
  }, [academies]);

  function updateFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      location: "",
      gender: "",
      age: "",
      activity: "",
      academy: "",
    });
  }

  function handleSearch() {
    const params = new URLSearchParams();

    if (filters.location) params.set("location", filters.location);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.age) params.set("age", filters.age);
    if (filters.activity) params.set("category", filters.activity);
    if (filters.academy) params.set("academy", filters.academy);

    const query = params.toString();

    navigate(query ? `/activities?${query}` : "/activities");
  }

  const hasFilters =
    filters.location ||
    filters.gender ||
    filters.age ||
    filters.activity ||
    filters.academy;

  return (
    <section className="container-main mt-6">
      <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#fff6dc] via-[#fff0d8] to-[#ffe7db] px-5 py-6 shadow-sm md:px-8 md:py-8">
        <div className="absolute -left-8 top-10 h-20 w-20 rounded-[26px] bg-[#ffd84d]" />
        <div className="absolute right-[-10px] top-[-6px] h-28 w-28 rounded-[30px] bg-[#7c5cff]" />
        <div className="absolute bottom-[-10px] left-[40%] h-14 w-14 rounded-full bg-[#ff7a3d]" />
        <div className="absolute bottom-6 right-10 h-10 w-10 rounded-full border-[3px] border-[#ffd84d]" />

        <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.6fr] lg:items-center">
          <div className="max-w-md">
            <div className="inline-flex rounded-full bg-[#7c5cff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm">
              Find the right fit
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#0f172a] md:text-5xl">
              Search activities with ease
            </h1>

            <p className="mt-3 text-sm font-medium leading-7 text-[#64748b] md:text-base">
              Find activities by location, age, category, and academy across
              trusted KidGage partners.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/75 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur md:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <NativeSelect
                label="Location"
                value={filters.location}
                onChange={(value) => updateFilter("location", value)}
                options={locationOptions}
              />

              <NativeSelect
                label="Gender"
                value={filters.gender}
                onChange={(value) => updateFilter("gender", value)}
                options={genderOptions}
              />

              <NativeSelect
                label="Age"
                value={filters.age}
                onChange={(value) => updateFilter("age", value)}
                options={ageOptions}
              />

              <NativeSelect
                label={loading ? "Loading activities..." : "Activity"}
                value={filters.activity}
                onChange={(value) => updateFilter("activity", value)}
                options={activityOptions}
                disabled={loading}
              />

              <NativeSelect
                label={loading ? "Loading academies..." : "Academy"}
                value={filters.academy}
                onChange={(value) => updateFilter("academy", value)}
                options={academyOptions}
                disabled={loading}
              />

              <button
                type="button"
                onClick={handleSearch}
                className="flex h-[58px] w-full items-center justify-between rounded-[20px] bg-[#ff7a3d] px-4 text-left shadow-[0_12px_24px_rgba(255,122,61,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ea6a2f] hover:shadow-[0_18px_34px_rgba(255,122,61,0.28)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                    <Search className="h-4 w-4" />
                  </span>
                  <span className="max-w-[180px] text-sm font-black uppercase tracking-wide text-white md:text-base">
                    Search Activities
                  </span>
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 text-white" />
              </button>
            </div>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-black text-[#ff7a3d] transition hover:bg-[#ff7a3d] hover:text-white"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

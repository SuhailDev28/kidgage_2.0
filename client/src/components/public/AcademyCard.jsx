import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ListChecks,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();

  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );

  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${base}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${base}/${value}`;
  }

  return value;
}

function getInitials(name = "Academy") {
  const words = String(name || "Academy")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "A";

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function getAcademyKey(item) {
  return (
    item?.slug ||
    item?._id ||
    item?.id ||
    item?.academyId ||
    item?.name ||
    item?.academyName ||
    ""
  );
}

function getAcademyProfileUrl(item) {
  const slugOrId = item?.slug || item?._id || item?.id || item?.academyId || "";

  if (!slugOrId) return "/academies";

  return `/academies/${encodeURIComponent(String(slugOrId))}`;
}

export function AcademyCard({ item }) {
  const academyKey = getAcademyKey(item);

  const name = item?.name || item?.academyName || "Academy";
  const city = item?.city || item?.location || "Doha";
  const description =
    item?.description ||
    item?.shortDescription ||
    "Discover activities, programs, classes, and learning experiences from this trusted KidGage academy partner.";

  const academyUrl = getAcademyProfileUrl(item);

  const activitiesUrl = academyKey
    ? `/activities?academy=${encodeURIComponent(String(academyKey))}`
    : "/activities";

  const logo = useMemo(
    () => normalizeImage(item?.logo || item?.image || item?.thumbnail || ""),
    [item?.logo, item?.image, item?.thumbnail],
  );

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logo]);

  return (
    <article className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-100 hover:shadow-[0_22px_55px_rgba(255,122,61,0.16)] sm:min-h-[390px] sm:rounded-[30px] lg:rounded-[34px]">
      <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-orange-100/70 blur-3xl transition duration-300 group-hover:bg-orange-200/80 sm:-right-16 sm:-top-16 sm:h-40 sm:w-40" />
      <div className="pointer-events-none absolute -bottom-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl sm:h-48 sm:w-48" />

      <div className="relative flex flex-1 flex-col p-4 sm:p-5 lg:p-5">
        <Link
          to={academyUrl}
          className="flex flex-1 flex-col rounded-[22px] focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
          aria-label={`View ${name}`}
        >
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between sm:gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100 sm:text-[11px]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Academy
            </span>

            <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200 min-[420px]:max-w-[150px] sm:text-[11px] lg:max-w-[140px]">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1877f2]" />
              <span className="truncate">{city}</span>
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 sm:mt-5 sm:rounded-[28px] sm:p-5">
            <div className="flex min-h-[108px] items-center justify-center sm:min-h-[128px]">
              {logo && !imageFailed ? (
                <img
                  src={logo}
                  alt={name}
                  loading="lazy"
                  className="h-24 w-24 object-contain drop-shadow-sm transition duration-300 group-hover:scale-105 sm:h-28 sm:w-28 md:h-32 md:w-32"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-[#ff7a3d] text-2xl font-black text-white shadow-[0_16px_36px_rgba(255,122,61,0.28)] transition duration-300 group-hover:scale-105 sm:h-28 sm:w-28 sm:rounded-[28px] sm:text-3xl md:h-32 md:w-32">
                  {getInitials(name)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1877f2] sm:h-11 sm:w-11">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="line-clamp-2 text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl md:text-2xl">
                  {name}
                </h3>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Trusted Partner
                </div>
              </div>
            </div>

            <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-500">
              {description}
            </p>
          </div>
        </Link>

        <div className="relative z-10 mt-auto grid gap-3 pt-5">
          <Link
            to={academyUrl}
            className="flex min-h-12 items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 transition duration-300 hover:border-orange-100 hover:bg-orange-50 sm:rounded-[22px]"
            aria-label={`Open academy profile for ${name}`}
          >
            <span className="text-sm font-black text-slate-800 transition group-hover:text-[#ff7a3d]">
              View academy
            </span>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ff7a3d] shadow-sm transition duration-300 group-hover:translate-x-1 group-hover:bg-[#ff7a3d] group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            to={activitiesUrl}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#ff7a3d] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ec6f35] hover:shadow-[0_18px_36px_rgba(255,122,61,0.28)] sm:rounded-[22px]"
            aria-label={`View activities from ${name}`}
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            View Activities
          </Link>
        </div>
      </div>
    </article>
  );
}

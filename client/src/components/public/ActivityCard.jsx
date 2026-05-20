import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Image as ImageIcon,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const BRAND_BLUE = "#1877f2";
const BRAND_ORANGE = "#ff7a3d";

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

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isCategoryCard(item) {
  if (!item) return false;

  if (item.categoryCard === true) return true;
  if (item.type === "category") return true;

  const hasCategoryVisuals =
    Boolean(item.image) ||
    Boolean(item.emoji) ||
    Boolean(item.icon) ||
    Boolean(item.bg);

  const looksLikeRealActivity =
    item.minAge !== undefined ||
    item.maxAge !== undefined ||
    item.academy !== undefined ||
    item.academyName !== undefined ||
    item.category !== undefined ||
    item.categoryName !== undefined ||
    item.categorySlug !== undefined;

  return hasCategoryVisuals && !looksLikeRealActivity;
}

function getActivityImage(item) {
  return (
    item?.image ||
    item?.thumbnail ||
    item?.coverImage ||
    item?.bannerImage ||
    item?.activityImage ||
    item?.images?.[0] ||
    ""
  );
}

function getTitle(item) {
  return item?.title || item?.name || item?.categoryName || "Activity";
}

function TypeBadge({ categoryMode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ${
        categoryMode
          ? "bg-orange-50 text-[#ff7a3d] ring-orange-100"
          : "bg-blue-50 text-[#1877f2] ring-blue-100"
      }`}
    >
      {categoryMode ? (
        <Tags className="h-3.5 w-3.5" />
      ) : (
        <ImageIcon className="h-3.5 w-3.5" />
      )}
      {categoryMode ? "Category" : "Activity"}
    </span>
  );
}

export function ActivityCard({ item }) {
  const [imgError, setImgError] = useState(false);

  const title = getTitle(item);
  const slug = item?.slug || normalizeSlug(title);
  const emoji = item?.emoji || item?.icon || "🎯";
  const bg = item?.bg || "#f1f5f9";
  const categoryMode = isCategoryCard(item);

  const image = useMemo(() => normalizeImage(getActivityImage(item)), [item]);

  const href = useMemo(() => {
    if (!slug) return "/activities";

    return categoryMode
      ? `/activities?category=${slug}`
      : `/activities/${slug}`;
  }, [categoryMode, slug]);

  useEffect(() => {
    setImgError(false);
  }, [image]);

  return (
    <Link
      to={href}
      className="group block h-full overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_18px_42px_rgba(15,23,42,0.10)]"
    >
      <article className="flex h-full flex-col">
        <div className="p-4">
          <div
            className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-[24px] border border-slate-100 sm:h-[250px] md:h-[270px]"
            style={{ backgroundColor: bg }}
          >
            {image && !imgError ? (
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-white text-6xl shadow-sm ring-1 ring-slate-200">
                {emoji}
              </div>
            )}

            <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-slate-900 shadow-sm ring-1 ring-slate-200 transition group-hover:bg-[#ff7a3d] group-hover:text-white">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <div className="flex items-center justify-between gap-3">
            <TypeBadge categoryMode={categoryMode} />

            <span className="hidden rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
              KidGage
            </span>
          </div>

          <h3 className="mt-4 line-clamp-2 text-[24px] font-black leading-tight tracking-tight text-slate-900 sm:text-[28px]">
            {title}
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-500">
            {categoryMode
              ? "Discover suitable programs in this category and explore options for your child."
              : "View full activity details, schedule, availability, and booking options."}
          </p>

          <div className="mt-auto pt-6">
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(255,122,61,0.24)] transition hover:bg-[#f06423]">
              Explore
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default ActivityCard;

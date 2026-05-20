// client/src/components/public/EventCard.jsx
import { Link } from "react-router-dom";
import { MapPin, CalendarDays, ArrowRight, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
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

  if (value.startsWith("blob:")) return value;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${base}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${base}/${value}`;
  }

  if (value.includes("/")) {
    return `${base}/${value}`;
  }

  return `${base}/uploads/events/${value}`;
}

function isExternalUrl(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) || /^www\./i.test(raw);
}

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^www\./i.test(raw)) {
    return `https://${raw}`;
  }

  return raw;
}

function getEventUrl(item) {
  const directUrl = normalizeExternalUrl(item?.url || item?.link || "");

  if (directUrl && isExternalUrl(directUrl)) {
    return directUrl;
  }

  const slug = item?.slug || item?._id || item?.id || "";

  return slug ? `/events/${encodeURIComponent(String(slug))}` : "/events";
}

function Stars({ count = 5 }) {
  return (
    <div className="flex items-center gap-0.5 text-[#f4b400] sm:gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="text-[15px] leading-none sm:text-[18px]">
          ★
        </span>
      ))}
    </div>
  );
}

function CardInner({ item }) {
  const [imageFailed, setImageFailed] = useState(false);

  const title = item?.title || item?.name || "KidGage Event";

  const location =
    item?.venue ||
    item?.city ||
    item?.location ||
    item?.address ||
    item?.venueName ||
    "Doha";

  const image = useMemo(
    () =>
      normalizeImage(
        item?.image ||
          item?.poster ||
          item?.thumbnail ||
          item?.coverImage ||
          "",
      ),
    [item?.image, item?.poster, item?.thumbnail, item?.coverImage],
  );

  const eventDate =
    item?.eventDate || item?.date || item?.startDate || item?.createdAt || "";

  const description =
    item?.description ||
    item?.shortDescription ||
    "Explore this KidGage event and discover exciting activities for kids and families.";

  const eventUrl = getEventUrl(item);
  const hasExternalUrl = isExternalUrl(eventUrl);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-100 hover:shadow-[0_18px_40px_rgba(255,122,61,0.16)] sm:rounded-[30px] sm:p-4 md:p-5">
      <div className="relative overflow-hidden rounded-[22px] bg-slate-100 sm:rounded-[24px]">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-[190px] w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:h-[230px] md:h-[250px] lg:h-[260px]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-[190px] w-full items-center justify-center bg-gradient-to-br from-[#eef5ff] via-white to-orange-50 text-sm font-bold text-slate-400 sm:h-[230px] md:h-[250px] lg:h-[260px]">
            Event Poster
          </div>
        )}

        <div className="absolute left-3 top-3 inline-flex max-w-[calc(100%-24px)] items-center gap-2 rounded-[14px] bg-[#6b5cff] px-3 py-2 text-xs font-black text-white shadow-[0_12px_24px_rgba(107,92,255,0.28)] sm:left-4 sm:top-4 sm:rounded-[16px] sm:px-4 sm:py-3 sm:text-sm">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatDate(eventDate)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#64748b] sm:mt-5 sm:text-[15px]">
        <MapPin className="h-4 w-4 shrink-0 text-[#ff7a3d]" />
        <span className="truncate">{location}</span>
      </div>

      <h3 className="mt-3 line-clamp-2 min-h-[58px] text-xl font-black leading-tight tracking-tight text-[#0f172a] sm:mt-4 sm:min-h-[68px] sm:text-2xl">
        {title}
      </h3>

      <p className="mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 border-t-2 border-dashed border-[#ff9b67]" />

      <div className="mt-auto flex flex-col gap-4 pt-5">
        <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#ff7a3d] px-5 text-sm font-black text-[#ff7a3d] transition group-hover:bg-[#ff7a3d] group-hover:text-white sm:h-[58px] sm:max-w-[220px] sm:text-base">
          {hasExternalUrl ? "Open Event" : "View Event"}

          {hasExternalUrl ? (
            <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </span>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-[#64748b] sm:text-sm">
            ( 0 Review )
          </div>
          <Stars />
        </div>
      </div>
    </article>
  );
}

export function EventCard({ item }) {
  const href = getEventUrl(item);
  const external = isExternalUrl(href);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
      >
        <CardInner item={item} />
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
    >
      <CardInner item={item} />
    </Link>
  );
}

export default EventCard;

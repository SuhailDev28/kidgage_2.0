// client/src/pages/public/HomePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Presentation, MonitorPlay, BarChart3, Smartphone } from "lucide-react";
import { api } from "../../lib/api.js";
import { SearchHero } from "../../components/public/SearchHero.jsx";
import { BlogCard } from "../../components/public/BlogCard.jsx";
import { EventCard } from "../../components/public/EventCard.jsx";

const BRAND_PRIMARY = "#ec7a3b";
const BRAND_PRIMARY_DARK = "#d9682f";
const BRAND_PURPLE = "#6557f5";

function getAssetBase() {
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );

  return apiBase || "http://localhost:5001";
}

function normalizeAssetUrl(value, folder = "") {
  if (!value) return "";

  const raw = String(value).trim();
  const base = getAssetBase();

  if (!raw) return "";

  if (raw.startsWith("blob:")) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${base}${raw}`;
  }

  if (raw.startsWith("uploads/")) {
    return `${base}/${raw}`;
  }

  if (raw.includes("/")) {
    return `${base}/${raw}`;
  }

  return folder ? `${base}/uploads/${folder}/${raw}` : `${base}/${raw}`;
}

function normalizeBanner(item) {
  return {
    id: item?._id || item?.id,
    _id: item?._id || item?.id,
    title: item?.title || "Campaign",
    link: item?.link || "#",
    image: normalizeAssetUrl(item?.image, "banners"),
    bannerType: String(item?.bannerType || "home").toLowerCase(),
  };
}

function normalizeCategory(item) {
  return {
    _id: item?._id || item?.id,
    id: item?._id || item?.id,
    name: item?.name || "",
    title: item?.name || "",
    slug: item?.slug || "",
    icon: item?.icon || "",
    emoji: item?.emoji || "🎯",
    image: normalizeAssetUrl(item?.image, "category"),
    bg: item?.bg || "#eef5ff",
    categoryCard: true,
    type: "category",
    sortOrder: Number(item?.sortOrder || 0),
  };
}

function normalizeAcademy(item) {
  const rawImage = item?.logo || item?.image || item?.thumbnail || "";

  return {
    _id: item?._id || item?.id,
    id: item?._id || item?.id,
    slug: item?.slug || "",
    name: item?.name || "Academy",
    city: item?.city || "Doha",
    logo: normalizeAssetUrl(rawImage, "academies"),
    image: normalizeAssetUrl(rawImage, "academies"),
  };
}

function normalizeEvent(item) {
  const rawImage =
    item?.image || item?.poster || item?.thumbnail || item?.coverImage || "";

  const startDate = item?.startDate || item?.eventDate || item?.date || "";

  return {
    _id: item?._id || item?.id,
    id: item?._id || item?.id,
    slug: item?.slug || "",
    title: item?.title || item?.name || "KidGage Event",
    name: item?.title || item?.name || "KidGage Event",
    description: item?.description || item?.shortDescription || "",
    image: normalizeAssetUrl(rawImage, "events"),
    poster: normalizeAssetUrl(rawImage, "events"),
    thumbnail: normalizeAssetUrl(rawImage, "events"),
    coverImage: normalizeAssetUrl(rawImage, "events"),
    link: item?.link || item?.url || "",
    url: item?.url || item?.link || "",
    venue: item?.venue || "",
    city: item?.city || "Doha",
    location: item?.location || item?.venue || item?.city || "Doha",
    startDate,
    endDate: item?.endDate || "",
    eventDate: item?.eventDate || startDate,
    date: item?.date || startDate,
    active:
      item?.active !== undefined
        ? Boolean(item.active)
        : String(item?.status || "").toUpperCase() !== "DRAFT",
    status: item?.status || "",
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function ArrowButton({ direction = "left", onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous" : "Next"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {direction === "left" ? (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path
            d="M15 18l-6-6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path
            d="M9 18l6-6-6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function SliderDots({
  count,
  activeIndex,
  onSelect,
  activeClass = "bg-[#1877f2]",
}) {
  if (count <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Go to slide ${index + 1}`}
          className={`h-2.5 rounded-full transition ${
            activeIndex === index
              ? `w-8 ${activeClass}`
              : "w-2.5 bg-slate-300 hover:bg-slate-400"
          }`}
        />
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-[28px] border border-slate-200 bg-slate-100 ${className}`}
    />
  );
}

function HomeSkeleton() {
  return (
    <div className="container-main mt-8 space-y-10">
      <SkeletonBlock className="h-[520px]" />
      <SkeletonBlock className="h-[480px]" />
      <SkeletonBlock className="h-[480px]" />
      <SkeletonBlock className="h-[520px]" />
      <SkeletonBlock className="h-[460px]" />
      <SkeletonBlock className="h-[420px]" />
    </div>
  );
}

function HeroSection({ items = [] }) {
  const safeItems = Array.isArray(items) ? items : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeItems.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeItems.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [safeItems.length]);

  if (!safeItems.length) return null;

  const current = safeItems[activeIndex] || safeItems[0];

  function handlePrimary() {
    if (current?.link && current.link !== "#") {
      const href =
        current.link.startsWith("http://") ||
        current.link.startsWith("https://")
          ? current.link
          : `https://${current.link}`;

      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = "/activities";
  }

  return (
    <section className="container-main mt-8">
      <div className="relative overflow-hidden rounded-[38px] bg-[#fff7e8] px-6 py-10 shadow-sm md:px-10 md:py-14">
        <div className="absolute -left-10 top-12 h-28 w-28 rounded-[32px] bg-[#ffd44d]" />
        <div className="absolute left-[40%] top-0 h-40 w-40 rounded-[40px] bg-[#c8ef4b]" />
        <div className="absolute right-[-14px] top-[-10px] h-36 w-36 rounded-[40px] bg-[#6b5cff]" />
        <div className="absolute bottom-[-12px] right-[20%] h-24 w-24 rounded-full bg-[#ff8a4d]" />
        <div className="absolute bottom-16 right-10 h-12 w-12 rounded-full border-4 border-[#ffd44d]" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-[620px]">
            <div className="inline-flex rounded-full bg-[#6b5cff] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
              KidGage for Families
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight text-[#111827] md:text-6xl">
              Discover joyful learning, activities and events for every child
            </h1>

            <p className="mt-5 max-w-[560px] text-base leading-8 text-[#5b6474] md:text-lg">
              Explore programs, trusted academies, fresh events and family news
              in one delightful platform made for modern parents.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handlePrimary}
                className="rounded-full bg-[#ec7a3b] px-6 py-4 text-base font-bold text-white shadow-[0_14px_28px_rgba(236,122,59,0.28)] transition hover:bg-[#d9682f]"
              >
                Explore Programs
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/events";
                }}
                className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-4 text-base font-semibold text-[#0f172a] shadow-sm transition hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b5cff] text-white">
                  ▶
                </span>
                View Events
              </button>
            </div>

            <SliderDots
              count={safeItems.length}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              activeClass="bg-[#6b5cff]"
            />
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -left-6 top-8 h-44 w-44 rounded-[40px] bg-[#c8ef4b]" />
            <div className="absolute -right-6 bottom-4 h-40 w-40 rounded-[40px] bg-[#c8ef4b]" />

            <div className="relative overflow-hidden rounded-[34px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              {current?.image ? (
                <img
                  src={current.image}
                  alt={current.title}
                  className="h-[360px] w-full object-cover md:h-[460px]"
                />
              ) : (
                <div className="flex h-[360px] items-center justify-center bg-slate-100 text-slate-400 md:h-[460px]">
                  {current?.title || "Banner"}
                </div>
              )}
            </div>

            <div className="absolute bottom-8 left-[-8px] rounded-[18px] bg-white px-5 py-3 shadow-xl">
              <div className="text-xs font-bold uppercase tracking-wide text-[#ec7a3b]">
                Featured
              </div>
              <div className="mt-1 text-base font-black text-[#0f172a]">
                Admission Open
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayfulSection({
  title,
  subtitle,
  items,
  renderItem,
  itemKey = "_id",
  actionLabel,
  onAction,
  iconLeft = "✦",
  iconRight = "👑",
  autoSlide = true,
  autoSlideDelay = 3500,
}) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];

  const middleHighlightIndex = useMemo(() => {
    if (!safeItems.length) return 0;

    if (safeItems.length >= 3) {
      return Math.min(activeIndex + 1, safeItems.length - 1);
    }

    return activeIndex;
  }, [activeIndex, safeItems.length]);

  function scrollToIndex(index) {
    const track = trackRef.current;
    if (!track || !safeItems.length) return;

    const safeIndex = Math.max(0, Math.min(index, safeItems.length - 1));
    const child = track.children[safeIndex];
    if (!child) return;

    track.scrollTo({
      left: child.offsetLeft,
      behavior: "smooth",
    });

    setActiveIndex(safeIndex);
  }

  useEffect(() => {
    if (!autoSlide || isPaused || safeItems.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = prev >= safeItems.length - 1 ? 0 : prev + 1;
        const track = trackRef.current;
        const child = track?.children?.[next];

        if (track && child) {
          track.scrollTo({
            left: child.offsetLeft,
            behavior: "smooth",
          });
        }

        return next;
      });
    }, autoSlideDelay);

    return () => window.clearInterval(timer);
  }, [autoSlide, autoSlideDelay, isPaused, safeItems.length]);

  useEffect(() => {
    if (!safeItems.length) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex > safeItems.length - 1) {
      setActiveIndex(0);
    }
  }, [safeItems.length, activeIndex]);

  return (
    <section className="container-main mt-10">
      <div
        className="relative overflow-hidden rounded-[36px] bg-[#6557f5] px-6 py-8 text-white shadow-sm md:px-8 md:py-10"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="absolute left-6 top-8 text-5xl opacity-70">
          {iconLeft}
        </div>

        <div className="absolute right-8 top-8 text-5xl opacity-80">
          {iconRight}
        </div>

        <div className="absolute right-[-20px] bottom-10 text-7xl opacity-20">
          〰
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="max-w-[720px]">
              <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
                KidGage
              </div>

              <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight md:text-5xl">
                {title}
              </h2>

              {subtitle ? (
                <p className="mt-3 max-w-[620px] text-base leading-8 text-white/80 md:text-lg">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#6557f5] shadow-sm transition hover:bg-white/90"
              >
                {actionLabel}
              </button>
            ) : null}
          </div>

          {safeItems.length > 0 ? (
            <>
              <div className="mb-4 flex justify-end gap-2">
                <ArrowButton
                  direction="left"
                  onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
                  disabled={activeIndex === 0}
                />

                <ArrowButton
                  direction="right"
                  onClick={() =>
                    scrollToIndex(
                      activeIndex >= safeItems.length - 1 ? 0 : activeIndex + 1,
                    )
                  }
                  disabled={false}
                />
              </div>

              <div
                ref={trackRef}
                className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {safeItems.map((item, index) => {
                  const isMiddleCard = index === middleHighlightIndex;

                  return (
                    <div
                      key={item[itemKey] || item._id || item.id || index}
                      className="w-[85%] shrink-0 snap-start sm:w-[48%] lg:w-[31.5%]"
                    >
                      {renderItem(item, index, isMiddleCard)}
                    </div>
                  );
                })}
              </div>

              <SliderDots
                count={safeItems.length}
                activeIndex={activeIndex}
                onSelect={scrollToIndex}
                activeClass="bg-white"
              />
            </>
          ) : (
            <div className="rounded-[24px] bg-white px-6 py-10 text-center text-slate-600">
              No items available right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityShowcaseCard({ item, highlight = false }) {
  const image = item?.image || "";
  const title = item?.title || item?.name || "Activity";
  const emoji = item?.emoji || "🎯";
  const href = item?.slug ? `/activities?category=${item.slug}` : "/activities";

  return (
    <Link
      to={href}
      style={highlight ? { backgroundColor: BRAND_PRIMARY } : undefined}
      className={`group block overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        highlight ? "text-white" : "bg-white"
      }`}
    >
      <div className="overflow-hidden rounded-[22px] bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-[240px] items-center justify-center text-7xl">
            {emoji}
          </div>
        )}
      </div>

      <div
        className={`mt-5 flex items-center gap-2 text-[15px] ${
          highlight ? "text-white/85" : "text-[#64748b]"
        }`}
      >
        <span className={highlight ? "text-white" : "text-[#ec7a3b]"}>📍</span>
        <span>Doha, Qatar</span>
      </div>

      <h3
        className={`mt-4 text-[26px] font-black leading-tight ${
          highlight ? "text-white" : "text-[#0f172a]"
        }`}
      >
        {title}
      </h3>

      <div
        className={`mt-5 border-t-2 border-dashed ${
          highlight ? "border-white/45" : "border-[#ff9b67]"
        }`}
      />

      <div className="mt-6 flex items-center justify-between gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full border-2 px-6 py-3 text-lg font-bold transition ${
            highlight
              ? "border-white text-white group-hover:bg-white group-hover:text-[#ec7a3b]"
              : "border-[#ec7a3b] text-[#ec7a3b] group-hover:bg-[#ec7a3b] group-hover:text-white"
          }`}
        >
          Explore
        </span>

        <div className="text-right">
          <div
            className={`text-sm ${
              highlight ? "text-white/85" : "text-[#64748b]"
            }`}
          >
            ( Popular )
          </div>

          <div
            className={highlight ? "mt-1 text-white" : "mt-1 text-[#f4b400]"}
          >
            ★★★★★
          </div>
        </div>
      </div>
    </Link>
  );
}

function BrandShowcaseCard({ item, highlight = false }) {
  const image = item?.logo || item?.image || "";
  const title = item?.name || "Academy";
  const city = item?.city || "Doha";
  const href = item?.slug ? `/academies/${item.slug}` : "/academies";

  return (
    <Link
      to={href}
      style={highlight ? { backgroundColor: BRAND_PRIMARY } : undefined}
      className={`group block overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        highlight ? "text-white" : "bg-white"
      }`}
    >
      <div className="overflow-hidden rounded-[22px] bg-white">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-[240px] items-center justify-center bg-[#eef5ff] text-6xl font-black text-[#1877f2]">
            {title.charAt(0)}
          </div>
        )}
      </div>

      <div
        className={`mt-5 flex items-center gap-2 text-[15px] ${
          highlight ? "text-white/85" : "text-[#64748b]"
        }`}
      >
        <span className={highlight ? "text-white" : "text-[#ec7a3b]"}>📍</span>
        <span>{city}, Qatar</span>
      </div>

      <h3
        className={`mt-4 text-[26px] font-black leading-tight ${
          highlight ? "text-white" : "text-[#0f172a]"
        }`}
      >
        {title}
      </h3>

      <div
        className={`mt-5 border-t-2 border-dashed ${
          highlight ? "border-white/45" : "border-[#ff9b67]"
        }`}
      />

      <div className="mt-6 flex items-center justify-between gap-4">
        <span
          className={`inline-flex items-center justify-center rounded-full border-2 px-6 py-3 text-lg font-bold transition ${
            highlight
              ? "border-white text-white group-hover:bg-white group-hover:text-[#ec7a3b]"
              : "border-[#ec7a3b] text-[#ec7a3b] group-hover:bg-[#ec7a3b] group-hover:text-white"
          }`}
        >
          View Brand
        </span>

        <div className="text-right">
          <div
            className={`text-sm ${
              highlight ? "text-white/85" : "text-[#64748b]"
            }`}
          >
            ( Trusted )
          </div>

          <div
            className={highlight ? "mt-1 text-white" : "mt-1 text-[#f4b400]"}
          >
            ★★★★★
          </div>
        </div>
      </div>
    </Link>
  );
}

function CardsSlider({
  items = [],
  renderItem,
  itemKey,
  widthClass,
  title,
  subtitle,
  eyebrow,
  actionLabel,
  onAction,
  cardShellClass = "rounded-[34px] bg-white px-6 py-8 shadow-sm md:px-8 md:py-10",
}) {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const safeItems = Array.isArray(items) ? items : [];

  function scrollToIndex(index) {
    const track = trackRef.current;
    if (!track || !safeItems.length) return;

    const safeIndex = Math.max(0, Math.min(index, safeItems.length - 1));
    const child = track.children[safeIndex];

    if (!child) return;

    track.scrollTo({
      left: child.offsetLeft,
      behavior: "smooth",
    });

    setActiveIndex(safeIndex);
  }

  useEffect(() => {
    if (!safeItems.length) {
      setActiveIndex(0);
      return;
    }

    if (activeIndex > safeItems.length - 1) {
      setActiveIndex(0);
    }
  }, [safeItems.length, activeIndex]);

  return (
    <section className="container-main mt-10">
      <div className={cardShellClass}>
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="max-w-[760px]">
            {eyebrow ? (
              <div className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#1877f2]">
                {eyebrow}
              </div>
            ) : null}

            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#0f172a] md:text-5xl">
              {title}
            </h2>

            {subtitle ? (
              <p className="mt-3 max-w-[620px] text-base leading-8 text-[#64748b] md:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>

          {actionLabel ? (
            <button
              type="button"
              onClick={onAction}
              className="shrink-0 rounded-full bg-[#1877f2] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f67d6]"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>

        {safeItems.length ? (
          <>
            <div className="mb-4 flex justify-end gap-2">
              <ArrowButton
                direction="left"
                onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
                disabled={activeIndex === 0}
              />

              <ArrowButton
                direction="right"
                onClick={() => scrollToIndex(activeIndex + 1)}
                disabled={activeIndex >= safeItems.length - 1}
              />
            </div>

            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {safeItems.map((item, index) => (
                <div
                  key={item[itemKey] || item._id || item.id || index}
                  className={
                    widthClass ||
                    "w-[78%] shrink-0 snap-start sm:w-[46%] md:w-[32%] lg:w-[24%] xl:w-[19.5%]"
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {renderItem(item, index)}
                </div>
              ))}
            </div>

            <SliderDots
              count={safeItems.length}
              activeIndex={activeIndex}
              onSelect={scrollToIndex}
            />
          </>
        ) : (
          <EmptyState
            title={`No ${title.toLowerCase()} available`}
            subtitle="Content will appear here when it is available."
          />
        )}
      </div>
    </section>
  );
}

function SectionStatCard({ item, showDivider = false }) {
  const Icon = item.icon;

  return (
    <div className="relative flex flex-col items-center justify-center px-6 py-6 text-center text-white">
      {showDivider ? (
        <div className="absolute left-0 top-1/2 hidden h-36 -translate-y-1/2 border-l border-white/30 xl:block" />
      ) : null}

      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
        <Icon className="h-8 w-8 text-white" strokeWidth={1.8} />
      </div>

      <div className="text-5xl font-black tracking-tight">{item.value}</div>
      <div className="mt-2 text-lg font-semibold text-white/90">
        {item.label}
      </div>
    </div>
  );
}

function SessionRow({ title, time }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-full bg-white px-6 py-5 text-[#111827] shadow-sm">
      <div className="text-lg font-bold md:text-xl">{title}</div>
      <div className="text-base font-black md:text-xl">{time}</div>
    </div>
  );
}

function StatsSessionSection({ data }) {
  const featuredAcademiesCount = data.featuredAcademies?.length || 0;
  const eventsCount = data.events?.length || 0;
  const blogsCount = data.blogs?.length || 0;

  const stats = [
    {
      value: `${featuredAcademiesCount}+`,
      label: "Trusted Academies",
      icon: Presentation,
    },
    {
      value: `${eventsCount}+`,
      label: "Family Events",
      icon: MonitorPlay,
    },
    {
      value: `${blogsCount}+`,
      label: "Latest News",
      icon: BarChart3,
    },
    {
      value: `${featuredAcademiesCount + eventsCount}+`,
      label: "Experiences to Explore",
      icon: Smartphone,
    },
  ];

  const sessions = [
    { title: "Morning Activities", time: "8.00am - 10.00am" },
    { title: "Learning Programs", time: "10.30am - 12.00pm" },
    { title: "Midday Sessions", time: "12.00pm - 2.00pm" },
    { title: "Afternoon Fun", time: "2.00pm - 4.00pm" },
  ];

  return (
    <section className="relative mt-16 overflow-hidden bg-[#6756e8] pt-24">
      <div className="absolute left-0 top-0 h-16 w-full bg-[#f8f8f8]" />
      <div className="absolute left-0 top-10 h-24 w-full rounded-b-[48%] bg-[#6756e8]" />

      <div className="pointer-events-none absolute left-0 top-36 hidden xl:block">
        <svg width="160" height="260" viewBox="0 0 160 260" fill="none">
          <path
            d="M60 20C60 20 20 40 20 40L52 56"
            stroke="#ec7a3b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
          />
          <path
            d="M58 55C30 86 26 122 42 148C60 177 58 214 30 246"
            stroke="#ec7a3b"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 8"
          />
          <path
            d="M20 40L66 18L54 65"
            fill="#ec7a3b"
            stroke="#ec7a3b"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="pointer-events-none absolute right-10 top-8 hidden text-[92px] xl:block">
        ☀️
      </div>

      <div className="container-main relative z-10">
        <div className="grid gap-8 pb-16 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <SectionStatCard
              key={`${item.label}-${index}`}
              item={item}
              showDivider={index !== 0}
            />
          ))}
        </div>

        <div className="relative translate-y-16 rounded-[36px] bg-[#ec7a3b] px-6 py-8 text-white shadow-[0_30px_60px_rgba(17,24,39,0.16)] md:px-10 md:py-12">
          <div className="grid items-center gap-10 xl:grid-cols-[1fr_1.15fr]">
            <div className="xl:pr-10">
              <div className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-bold text-[#ec7a3b] shadow-sm">
                Session Times
              </div>

              <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
                Our Session Times
              </h2>

              <div className="mt-3 h-3 w-64 rounded-full bg-white/80" />

              <p className="mt-8 max-w-xl text-xl leading-9 text-white/90 md:text-2xl md:leading-10">
                Choose the most convenient timing for children to learn, play,
                and grow through structured daily activities.
              </p>
            </div>

            <div className="relative xl:border-l xl:border-dashed xl:border-white/35 xl:pl-12">
              <div className="space-y-4">
                {sessions.map((item, index) => (
                  <SessionRow
                    key={`${item.title}-${index}`}
                    title={item.title}
                    time={item.time}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-28 bg-[#f8f8f8]" />
    </section>
  );
}

function EditorialBlogSection({ blogs = [] }) {
  const safeBlogs = Array.isArray(blogs) ? blogs : [];

  return (
    <section className="container-main mt-10">
      <div className="rounded-[34px] bg-white px-6 py-8 shadow-sm md:px-8 md:py-10">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#6b5cff]">
            Our News
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-[#0f172a] md:text-5xl">
            Read our latest news
          </h2>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/blogs";
            }}
            className="mx-auto mt-7 inline-flex items-center gap-3 rounded-full bg-[#ec7a3b] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(236,122,59,0.24)] transition hover:bg-[#d9682f]"
          >
            View All Blogs
          </button>
        </div>

        {safeBlogs.length > 0 ? (
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {safeBlogs.slice(0, 3).map((item) => (
              <BlogCard key={item._id || item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="No blog posts available"
              subtitle="Latest blogs and stories will appear here."
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [data, setData] = useState({
    featuredAcademies: [],
    blogs: [],
    events: [],
  });

  const [topActivities, setTopActivities] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const heroBanners = useMemo(() => {
    if (!Array.isArray(banners)) return [];

    const rows = banners.filter(
      (item) => item.bannerType === "home" || item.bannerType === "desktop",
    );

    return rows.length ? rows : banners;
  }, [banners]);

  useEffect(() => {
    let active = true;

    async function loadHome() {
      try {
        setLoading(true);
        setError("");

        const [homeRes, bannerRes, categoryRes, eventRes] =
          await Promise.allSettled([
            api.get("/public/home"),
            api.get("/public/banners"),
            api.get("/public/categories"),
            api.get("/public/events"),
          ]);

        if (!active) return;

        const homeData =
          homeRes.status === "fulfilled" ? homeRes.value?.data || {} : {};

        const bannerData =
          bannerRes.status === "fulfilled" ? bannerRes.value?.data || {} : {};

        const categoryData =
          categoryRes.status === "fulfilled"
            ? categoryRes.value?.data || {}
            : {};

        const eventData =
          eventRes.status === "fulfilled" ? eventRes.value?.data || {} : {};

        const publicEvents = Array.isArray(eventData?.events)
          ? eventData.events
          : Array.isArray(homeData?.events)
            ? homeData.events
            : [];

        setData({
          featuredAcademies: Array.isArray(homeData?.featuredAcademies)
            ? homeData.featuredAcademies.map(normalizeAcademy)
            : [],
          blogs: Array.isArray(homeData?.blogs) ? homeData.blogs : [],
          events: publicEvents.map(normalizeEvent),
        });

        const bannerRows = Array.isArray(bannerData?.banners)
          ? bannerData.banners
          : [];
        setBanners(bannerRows.map(normalizeBanner));

        const categoryRows = Array.isArray(categoryData?.categories)
          ? categoryData.categories
          : [];
        setTopActivities(
          categoryRows
            .map(normalizeCategory)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
        );

        const failed = [homeRes, bannerRes, categoryRes, eventRes].some(
          (result) => result.status === "rejected",
        );

        if (failed) {
          setError("Some homepage content could not be loaded.");
        }
      } catch {
        if (!active) return;
        setError("Unable to load homepage content right now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHome();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="pb-16">
      <SearchHero />

      {loading ? (
        <HomeSkeleton />
      ) : (
        <>
          <HeroSection items={heroBanners} />

          {error ? (
            <section className="container-main mt-10">
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
                <h3 className="text-base font-bold text-amber-800">
                  Homepage content notice
                </h3>
                <p className="mt-1 text-sm text-amber-700">{error}</p>
              </div>
            </section>
          ) : null}

          <PlayfulSection
            title="Top Activities"
            subtitle="Fun experiences and popular categories children love the most."
            items={topActivities}
            itemKey="_id"
            actionLabel="All Activities"
            onAction={() => {
              window.location.href = "/activities";
            }}
            iconLeft="🎈"
            iconRight="👑"
            renderItem={(item, index, isMiddleCard) => (
              <ActivityShowcaseCard item={item} highlight={isMiddleCard} />
            )}
          />

          <PlayfulSection
            title="Top Brands"
            subtitle="Trusted academies and learning partners for your child’s journey."
            items={data.featuredAcademies}
            itemKey="_id"
            actionLabel="View All"
            onAction={() => {
              window.location.href = "/academies";
            }}
            iconLeft="✿"
            iconRight="🎓"
            renderItem={(item, index, isMiddleCard) => (
              <BrandShowcaseCard item={item} highlight={isMiddleCard} />
            )}
          />

          <CardsSlider
            items={data.events}
            itemKey="_id"
            title="Recent Events"
            subtitle="Browse public events, workshops and engaging family-friendly moments."
            eyebrow="Events"
            actionLabel="All Events"
            onAction={() => {
              window.location.href = "/events";
            }}
            widthClass="w-[88%] shrink-0 snap-start sm:w-[48%] lg:w-[24%]"
            renderItem={(item) => <EventCard item={item} />}
          />

          <StatsSessionSection data={data} />
          <EditorialBlogSection blogs={data.blogs} />
        </>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";

const FALLBACK_API_ORIGIN = "http://localhost:5001";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  return String(value || "").trim();
}

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value || "").trim();
  if (!raw) return "";

  const apiBase = String(import.meta.env.VITE_API_BASE || "")
    .trim()
    .replace(/\/api\/?$/, "");

  const base = apiBase || FALLBACK_API_ORIGIN;

  if (raw.startsWith("blob:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/events/${raw}`;
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

function formatDateTime(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventStatus(item) {
  const explicitStatus = String(item?.status || "")
    .trim()
    .toUpperCase();
  if (explicitStatus) return explicitStatus;

  if (item?.active === false) return "INACTIVE";

  const now = new Date();
  const start = item?.startDate ? new Date(item.startDate) : null;
  const end = item?.endDate ? new Date(item.endDate) : null;

  if (end && !Number.isNaN(end.getTime()) && end < now) return "COMPLETED";
  if (start && !Number.isNaN(start.getTime()) && start > now) return "UPCOMING";

  return "LIVE";
}

function normalizeEvent(item, index) {
  const id = normalizeId(item?._id || item?.id || "");

  return {
    raw: item,
    id: id || `event-${index + 1}`,
    title: safeText(item?.title || item?.name, "KidGage Event"),
    description: safeText(
      item?.description || item?.summary || item?.details,
      "Explore this KidGage event for children and families.",
    ),
    image: item?.image || item?.poster || item?.bannerImage || "",
    startDate: item?.startDate || item?.date || null,
    endDate: item?.endDate || null,
    location: item?.location || item?.venue || item?.city || "Qatar",
    active: item?.active !== false,
    status: getEventStatus(item),
    createdAt: item?.createdAt || null,
  };
}

function StatusBadge({ value }) {
  const text = String(value || "N/A").toUpperCase();

  const classes = {
    LIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    UPCOMING: "bg-blue-50 text-blue-700 ring-blue-100",
    COMPLETED: "bg-slate-100 text-slate-700 ring-slate-200",
    INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
    CANCELLED: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        classes[text] || "bg-orange-50 text-[#ff7a3d] ring-orange-100"
      }`}
    >
      {text}
    </span>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-[#ff7a3d]">
        <CalendarDays className="h-8 w-8" />
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-900">
        No events found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
        Try clearing the search or changing the status filter.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ec6f35]"
      >
        Clear filters
      </button>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[430px] animate-pulse rounded-[30px] border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}

function EventCard({ event, onView }) {
  const image = normalizeImage(event.image);

  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-[230px] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={event.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}

        <div className="absolute left-4 top-4">
          <StatusBadge value={event.status} />
        </div>

        <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-[#ff7a3d]">
            Event Date
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {formatDate(event.startDate)}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#ff7a3d]" />
            {event.location}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-[#ff7a3d]" />
            {formatDate(event.endDate || event.startDate)}
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-2xl font-black leading-tight text-slate-900">
          {event.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm font-medium leading-7 text-slate-500">
          {event.description}
        </p>

        <button
          type="button"
          onClick={() => onView(event)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35]"
        >
          View Event
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function EventDetailsModal({ event, onClose }) {
  if (!event) return null;

  const image = normalizeImage(event.image);

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
              <CalendarDays className="h-3.5 w-3.5" />
              Event Details
            </div>

            <h3 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">
              {event.title}
            </h3>

            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={event.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {event.location}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Close event details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-5 py-6 md:px-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
            {image ? (
              <img
                src={image}
                alt={event.title}
                className="h-[280px] w-full object-cover md:h-[360px]"
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-slate-400 md:h-[360px]">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Start Date
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {formatDateTime(event.startDate)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  End Date
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {formatDateTime(event.endDate || event.startDate)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Location
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {event.location}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Description
                </div>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
                  {event.description}
                </p>
              </div>
            </div>

            <Link
              to="/activities"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ec6f35]"
            >
              Explore Activities
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewEvent, setViewEvent] = useState(null);

  async function loadEvents({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      const res = await api.get("/public/events");

      const rows = toArray(
        res?.data?.events || res?.data?.items || res?.data || [],
      );

      setEvents(rows.map(normalizeEvent));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load events right now.",
      );
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const statusOptions = useMemo(() => {
    const set = new Set();

    events.forEach((item) => {
      if (item.status) set.add(item.status);
    });

    return [...set].sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !q ||
        [
          event.title,
          event.description,
          event.location,
          event.status,
          formatDate(event.startDate),
          formatDate(event.endDate),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        !statusFilter ||
        String(event.status).toUpperCase() ===
          String(statusFilter).toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
  }

  return (
    <main className="bg-[#f8f8f8] pb-16">
      <section className="container-main pt-6">
        <div className="rounded-[34px] border border-slate-200 bg-gradient-to-br from-white via-white to-orange-50/50 p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ff7a3d] ring-1 ring-orange-100">
                <Sparkles className="h-3.5 w-3.5" />
                KidGage Events
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 md:text-6xl">
                Family events for every child
              </h1>

              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-500 md:text-base">
                Discover KidGage events, workshops, showcases, open days, and
                family-friendly experiences published by Super Admin.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadEvents({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.22)] transition hover:bg-[#ec6f35] disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-7 grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, date, location..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#ff7a3d] focus:ring-4 focus:ring-orange-100"
            >
              <option value="">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="container-main mt-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-main mt-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Upcoming & Recent Events
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Showing {filteredEvents.length} of {events.length} events.
            </p>
          </div>
        </div>

        {loading ? (
          <EventSkeleton />
        ) : filteredEvents.length === 0 ? (
          <EmptyState onReset={clearFilters} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} onView={setViewEvent} />
            ))}
          </div>
        )}
      </section>

      <EventDetailsModal event={viewEvent} onClose={() => setViewEvent(null)} />
    </main>
  );
}

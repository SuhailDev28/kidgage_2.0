import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
  Users,
  Sparkles,
  ShieldCheck,
  Ticket,
  Building2,
  ChevronLeft,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api.js";

const BRAND = {
  primary: "#7c3aed",
  primaryDark: "#5b21b6",
  accent: "#f97316",
  soft: "#f5f3ff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f8fafc",
};

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "Date TBA";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(value);
}

function getInitials(name) {
  return String(name || "KG")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const fallbackEvent = {
  _id: "demo-event",
  title: "Kids Activity Open Day",
  name: "Kids Activity Open Day",
  tagline: "Book fun, safe, and skill-building activities for your child.",
  description:
    "Join KidGage partner academies for a public activity event where parents can explore classes, view slots, and book activities for children with confidence.",
  date: new Date().toISOString(),
  startTime: "10:00 AM",
  endTime: "06:00 PM",
  location: "Doha, Qatar",
  ageGroup: "4 - 14 Years",
  price: "From QAR 120",
  coverImage: "",
  academy: {
    name: "KidGage Partner Academy",
    phone: "+974 74068761",
    email: "info@kidgage.com",
    address: "Doha, Qatar",
  },
  activities: [
    {
      name: "Dance Class",
      category: "Creative Arts",
      duration: "60 min",
      level: "Beginner",
    },
    {
      name: "Karate Training",
      category: "Martial Arts",
      duration: "45 min",
      level: "Beginner to Intermediate",
    },
    {
      name: "Music Session",
      category: "Performing Arts",
      duration: "50 min",
      level: "All Levels",
    },
  ],
  slots: [
    {
      label: "Morning Batch",
      time: "10:00 AM - 12:00 PM",
      available: 12,
      total: 20,
    },
    {
      label: "Afternoon Batch",
      time: "02:00 PM - 04:00 PM",
      available: 8,
      total: 20,
    },
    {
      label: "Evening Batch",
      time: "04:30 PM - 06:00 PM",
      available: 5,
      total: 15,
    },
  ],
};

export default function PublicEventPage() {
  const navigate = useNavigate();
  const { eventId, id } = useParams();

  const resolvedEventId = eventId || id;

  const [event, setEvent] = useState(fallbackEvent);
  const [loading, setLoading] = useState(Boolean(resolvedEventId));
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadEvent() {
      if (!resolvedEventId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await api.get(`/public/events/${resolvedEventId}`);
        const payload = res?.data?.event || res?.data?.data || res?.data;

        if (!alive) return;

        if (payload && typeof payload === "object") {
          setEvent({
            ...fallbackEvent,
            ...payload,
            academy: {
              ...fallbackEvent.academy,
              ...(payload.academy || payload.academyId || {}),
            },
            activities: toArray(payload.activities).length
              ? toArray(payload.activities)
              : fallbackEvent.activities,
            slots: toArray(payload.slots).length
              ? toArray(payload.slots)
              : fallbackEvent.slots,
          });
        }
      } catch (err) {
        if (!alive) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load event details.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadEvent();

    return () => {
      alive = false;
    };
  }, [resolvedEventId]);

  const title = safeText(event.title || event.name, "KidGage Event");

  const academy = event.academy || event.academyId || {};

  const activities = useMemo(() => {
    return toArray(event.activities).length
      ? toArray(event.activities)
      : fallbackEvent.activities;
  }, [event.activities]);

  const slots = useMemo(() => {
    return toArray(event.slots).length
      ? toArray(event.slots)
      : fallbackEvent.slots;
  }, [event.slots]);

  const heroImage =
    event.coverImage ||
    event.image ||
    event.banner ||
    event.academy?.coverImage ||
    "";

  function handleBookNow() {
    if (resolvedEventId) {
      navigate(`/book/${resolvedEventId}`);
      return;
    }

    navigate("/book");
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  }

  return (
    <div className="kg-public-event-page">
      <style>{`
        .kg-public-event-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(124, 58, 237, 0.14), transparent 32rem),
            radial-gradient(circle at top right, rgba(249, 115, 22, 0.13), transparent 28rem),
            ${BRAND.bg};
          color: ${BRAND.text};
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .kg-container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .kg-navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(18px);
          background: rgba(255, 255, 255, 0.82);
          border-bottom: 1px solid rgba(229, 231, 235, 0.82);
        }

        .kg-navbar-inner {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .kg-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .kg-logo {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: white;
          font-weight: 900;
          letter-spacing: -0.05em;
          background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent});
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.28);
          flex: 0 0 auto;
        }

        .kg-brand-copy {
          min-width: 0;
        }

        .kg-brand-title {
          margin: 0;
          font-size: 20px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .kg-brand-subtitle {
          margin: 4px 0 0;
          font-size: 12px;
          color: ${BRAND.muted};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kg-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .kg-btn {
          border: 0;
          outline: 0;
          cursor: pointer;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-weight: 800;
          font-size: 14px;
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
          text-decoration: none;
          white-space: nowrap;
        }

        .kg-btn:hover {
          transform: translateY(-1px);
        }

        .kg-btn-primary {
          color: #fff;
          background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark});
          box-shadow: 0 14px 30px rgba(124, 58, 237, 0.24);
        }

        .kg-btn-primary:hover {
          box-shadow: 0 18px 38px rgba(124, 58, 237, 0.32);
        }

        .kg-btn-soft {
          color: ${BRAND.primaryDark};
          background: #fff;
          border: 1px solid ${BRAND.border};
        }

        .kg-hero {
          padding: 42px 0 28px;
        }

        .kg-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.06fr) minmax(360px, 0.94fr);
          gap: 28px;
          align-items: stretch;
        }

        .kg-hero-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(229, 231, 235, 0.88);
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 22px 70px rgba(15, 23, 42, 0.08);
          border-radius: 32px;
          padding: clamp(24px, 4vw, 46px);
        }

        .kg-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 22px;
        }

        .kg-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          background: ${BRAND.soft};
          color: ${BRAND.primaryDark};
          border: 1px solid rgba(124, 58, 237, 0.14);
        }

        .kg-chip-orange {
          background: #fff7ed;
          color: #c2410c;
          border-color: #fed7aa;
        }

        .kg-title {
          margin: 0;
          max-width: 760px;
          font-size: clamp(34px, 6vw, 68px);
          line-height: 0.95;
          letter-spacing: -0.075em;
          font-weight: 950;
        }

        .kg-gradient-text {
          background: linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.accent});
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .kg-tagline {
          margin: 20px 0 0;
          max-width: 720px;
          color: #374151;
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.7;
        }

        .kg-hero-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
        }

        .kg-meta-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          border-radius: 20px;
          background: #fff;
          border: 1px solid ${BRAND.border};
        }

        .kg-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: ${BRAND.primaryDark};
          background: ${BRAND.soft};
        }

        .kg-meta-label {
          margin: 0;
          font-size: 12px;
          color: ${BRAND.muted};
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kg-meta-value {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 900;
          color: ${BRAND.text};
        }

        .kg-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .kg-visual-card {
          position: relative;
          overflow: hidden;
          min-height: 520px;
          border-radius: 32px;
          background:
            linear-gradient(135deg, rgba(124, 58, 237, 0.88), rgba(249, 115, 22, 0.84)),
            url("${heroImage}");
          background-size: cover;
          background-position: center;
          box-shadow: 0 26px 76px rgba(124, 58, 237, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.45);
        }

        .kg-visual-card-empty {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.32), transparent 18rem),
            linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent});
        }

        .kg-visual-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top, rgba(17, 24, 39, 0.62), transparent 58%),
            radial-gradient(circle at 80% 10%, rgba(255,255,255,0.22), transparent 20rem);
        }

        .kg-floating-card {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 22px;
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.72);
          box-shadow: 0 22px 50px rgba(15, 23, 42, 0.2);
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .kg-academy-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .kg-academy-avatar {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent});
          color: #fff;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .kg-academy-name {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .kg-academy-location {
          margin: 5px 0 0;
          color: ${BRAND.muted};
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kg-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .kg-trust-item {
          border-radius: 18px;
          background: #f9fafb;
          border: 1px solid ${BRAND.border};
          padding: 12px;
        }

        .kg-trust-number {
          margin: 0;
          font-size: 18px;
          font-weight: 950;
        }

        .kg-trust-label {
          margin: 4px 0 0;
          color: ${BRAND.muted};
          font-size: 11px;
          font-weight: 700;
        }

        .kg-main {
          padding: 18px 0 54px;
        }

        .kg-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }

        .kg-section {
          border-radius: 28px;
          background: #fff;
          border: 1px solid ${BRAND.border};
          box-shadow: 0 18px 52px rgba(15, 23, 42, 0.055);
          padding: clamp(20px, 3vw, 28px);
          margin-bottom: 20px;
        }

        .kg-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .kg-section-kicker {
          margin: 0 0 6px;
          font-size: 12px;
          color: ${BRAND.primaryDark};
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .kg-section-title {
          margin: 0;
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.1;
          letter-spacing: -0.05em;
          font-weight: 950;
        }

        .kg-section-text {
          margin: 0;
          color: #4b5563;
          line-height: 1.75;
          font-size: 15px;
        }

        .kg-activity-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .kg-activity-card {
          border: 1px solid ${BRAND.border};
          border-radius: 22px;
          padding: 18px;
          background:
            linear-gradient(180deg, #ffffff, #fafafa);
        }

        .kg-activity-icon {
          width: 46px;
          height: 46px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          margin-bottom: 14px;
          color: ${BRAND.primaryDark};
          background: ${BRAND.soft};
        }

        .kg-activity-title {
          margin: 0;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .kg-activity-meta {
          margin: 8px 0 0;
          color: ${BRAND.muted};
          font-size: 13px;
          line-height: 1.55;
        }

        .kg-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .kg-benefit {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 20px;
          border: 1px solid ${BRAND.border};
          background: #fcfcfd;
        }

        .kg-benefit svg {
          color: #16a34a;
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .kg-benefit strong {
          display: block;
          font-size: 14px;
          margin-bottom: 3px;
        }

        .kg-benefit span {
          color: ${BRAND.muted};
          font-size: 13px;
          line-height: 1.45;
        }

        .kg-sidebar {
          position: sticky;
          top: 92px;
        }

        .kg-book-card {
          border-radius: 30px;
          background: #fff;
          border: 1px solid ${BRAND.border};
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.11);
          overflow: hidden;
        }

        .kg-book-head {
          padding: 22px;
          color: #fff;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.26), transparent 12rem),
            linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark});
        }

        .kg-book-title {
          margin: 0;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .kg-book-subtitle {
          margin: 8px 0 0;
          opacity: 0.86;
          font-size: 14px;
          line-height: 1.6;
        }

        .kg-book-body {
          padding: 18px;
        }

        .kg-price {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          border-radius: 22px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          margin-bottom: 16px;
        }

        .kg-price-label {
          margin: 0;
          color: #9a3412;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kg-price-value {
          margin: 5px 0 0;
          color: #c2410c;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .kg-slot-list {
          display: grid;
          gap: 10px;
        }

        .kg-slot {
          border: 1px solid ${BRAND.border};
          border-radius: 20px;
          padding: 14px;
          background: #fff;
        }

        .kg-slot-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .kg-slot-name {
          margin: 0;
          font-size: 14px;
          font-weight: 950;
        }

        .kg-slot-time {
          margin: 5px 0 0;
          color: ${BRAND.muted};
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kg-slot-badge {
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 900;
          padding: 6px 9px;
          border-radius: 999px;
          color: #166534;
          background: #dcfce7;
        }

        .kg-progress {
          height: 8px;
          border-radius: 999px;
          background: #f3f4f6;
          overflow: hidden;
          margin-top: 12px;
        }

        .kg-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent});
        }

        .kg-book-button {
          width: 100%;
          margin-top: 16px;
          min-height: 52px;
          font-size: 15px;
        }

        .kg-contact-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .kg-contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #374151;
          font-size: 13px;
          line-height: 1.5;
        }

        .kg-contact-item svg {
          color: ${BRAND.primary};
          flex: 0 0 auto;
        }

        .kg-error {
          width: min(1180px, calc(100% - 32px));
          margin: 16px auto 0;
          padding: 14px 16px;
          border-radius: 18px;
          color: #991b1b;
          background: #fef2f2;
          border: 1px solid #fecaca;
          font-weight: 700;
        }

        .kg-loading {
          min-height: 56vh;
          display: grid;
          place-items: center;
          color: ${BRAND.muted};
          font-weight: 800;
        }

        .kg-mobile-bottom {
          display: none;
        }

        @media (max-width: 1024px) {
          .kg-hero-grid,
          .kg-content-grid {
            grid-template-columns: 1fr;
          }

          .kg-visual-card {
            min-height: 420px;
          }

          .kg-sidebar {
            position: static;
          }

          .kg-activity-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .kg-container {
            width: min(100% - 22px, 1180px);
          }

          .kg-navbar-inner {
            min-height: 64px;
          }

          .kg-brand-subtitle {
            display: none;
          }

          .kg-nav-actions .kg-btn-primary {
            display: none;
          }

          .kg-btn {
            min-height: 40px;
            padding: 0 14px;
          }

          .kg-hero {
            padding: 22px 0 14px;
          }

          .kg-hero-card {
            border-radius: 24px;
            padding: 22px;
          }

          .kg-hero-meta {
            grid-template-columns: 1fr;
          }

          .kg-hero-actions {
            display: none;
          }

          .kg-visual-card {
            min-height: 360px;
            border-radius: 24px;
          }

          .kg-floating-card {
            left: 14px;
            right: 14px;
            bottom: 14px;
            padding: 16px;
            border-radius: 22px;
          }

          .kg-trust-grid {
            grid-template-columns: 1fr;
          }

          .kg-section {
            border-radius: 22px;
          }

          .kg-section-head {
            display: block;
          }

          .kg-activity-grid,
          .kg-benefits {
            grid-template-columns: 1fr;
          }

          .kg-book-card {
            border-radius: 24px;
          }

          .kg-mobile-bottom {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 70;
            display: block;
            padding: 12px;
            background: rgba(255, 255, 255, 0.92);
            border-top: 1px solid ${BRAND.border};
            backdrop-filter: blur(16px);
          }

          .kg-mobile-bottom .kg-btn {
            width: 100%;
            min-height: 52px;
          }

          .kg-public-event-page {
            padding-bottom: 74px;
          }
        }

        @media (max-width: 420px) {
          .kg-logo {
            width: 40px;
            height: 40px;
            border-radius: 14px;
          }

          .kg-brand-title {
            font-size: 18px;
          }

          .kg-title {
            font-size: 34px;
          }

          .kg-chip {
            font-size: 12px;
          }

          .kg-meta-card {
            padding: 12px;
          }

          .kg-visual-card {
            min-height: 330px;
          }
        }
      `}</style>

      <header className="kg-navbar">
        <div className="kg-container kg-navbar-inner">
          <div className="kg-brand">
            <div className="kg-logo">KG</div>
            <div className="kg-brand-copy">
              <h1 className="kg-brand-title">KidGage</h1>
              <p className="kg-brand-subtitle">Kids activities made simple</p>
            </div>
          </div>

          <div className="kg-nav-actions">
            <button
              className="kg-btn kg-btn-soft"
              type="button"
              onClick={handleBack}
            >
              <ChevronLeft size={17} />
              Back
            </button>
            <button
              className="kg-btn kg-btn-primary"
              type="button"
              onClick={handleBookNow}
            >
              Book Now
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </header>

      {error ? <div className="kg-error">{error}</div> : null}

      {loading ? (
        <div className="kg-loading">Loading event details...</div>
      ) : (
        <>
          <section className="kg-hero">
            <div className="kg-container kg-hero-grid">
              <div className="kg-hero-card">
                <div className="kg-chip-row">
                  <span className="kg-chip">
                    <Sparkles size={15} />
                    Public Event
                  </span>
                  <span className="kg-chip kg-chip-orange">
                    <Ticket size={15} />
                    {safeText(event.price, "Booking Available")}
                  </span>
                </div>

                <h2 className="kg-title">
                  {title}
                  <br />
                  <span className="kg-gradient-text">for active kids.</span>
                </h2>

                <p className="kg-tagline">
                  {safeText(
                    event.tagline || event.description,
                    "Discover activities, compare available slots, and book your child’s class with KidGage.",
                  )}
                </p>

                <div className="kg-hero-meta">
                  <div className="kg-meta-card">
                    <div className="kg-icon-box">
                      <CalendarDays size={21} />
                    </div>
                    <div>
                      <p className="kg-meta-label">Date</p>
                      <p className="kg-meta-value">
                        {formatDate(event.date || event.startDate)}
                      </p>
                    </div>
                  </div>

                  <div className="kg-meta-card">
                    <div className="kg-icon-box">
                      <Clock size={21} />
                    </div>
                    <div>
                      <p className="kg-meta-label">Time</p>
                      <p className="kg-meta-value">
                        {safeText(
                          event.time ||
                            `${formatTime(event.startTime) || event.startTime || "Time TBA"}${
                              event.endTime
                                ? ` - ${formatTime(event.endTime)}`
                                : ""
                            }`,
                          "Time TBA",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="kg-meta-card">
                    <div className="kg-icon-box">
                      <MapPin size={21} />
                    </div>
                    <div>
                      <p className="kg-meta-label">Location</p>
                      <p className="kg-meta-value">
                        {safeText(
                          event.location || academy.address,
                          "Doha, Qatar",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="kg-meta-card">
                    <div className="kg-icon-box">
                      <Users size={21} />
                    </div>
                    <div>
                      <p className="kg-meta-label">Age Group</p>
                      <p className="kg-meta-value">
                        {safeText(
                          event.ageGroup || event.ageRange,
                          "Kids & Juniors",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="kg-hero-actions">
                  <button
                    className="kg-btn kg-btn-primary"
                    type="button"
                    onClick={handleBookNow}
                  >
                    Reserve a Slot
                    <ArrowRight size={18} />
                  </button>

                  <button
                    className="kg-btn kg-btn-soft"
                    type="button"
                    onClick={() => {
                      document
                        .getElementById("kg-event-details")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>

              <div
                className={`kg-visual-card ${heroImage ? "" : "kg-visual-card-empty"}`}
              >
                <div className="kg-visual-overlay" />

                <div className="kg-floating-card">
                  <div className="kg-academy-row">
                    <div className="kg-academy-avatar">
                      {getInitials(academy.name)}
                    </div>

                    <div>
                      <h3 className="kg-academy-name">
                        {safeText(academy.name, "KidGage Academy")}
                      </h3>
                      <p className="kg-academy-location">
                        <MapPin size={14} />
                        {safeText(
                          academy.address || event.location,
                          "Doha, Qatar",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="kg-trust-grid">
                    <div className="kg-trust-item">
                      <p className="kg-trust-number">{activities.length}+</p>
                      <p className="kg-trust-label">Activities</p>
                    </div>
                    <div className="kg-trust-item">
                      <p className="kg-trust-number">{slots.length}</p>
                      <p className="kg-trust-label">Slot Options</p>
                    </div>
                    <div className="kg-trust-item">
                      <p className="kg-trust-number">Safe</p>
                      <p className="kg-trust-label">Booking Flow</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <main className="kg-main" id="kg-event-details">
            <div className="kg-container kg-content-grid">
              <div>
                <section className="kg-section">
                  <div className="kg-section-head">
                    <div>
                      <p className="kg-section-kicker">About Event</p>
                      <h2 className="kg-section-title">
                        Designed for parents and kids
                      </h2>
                    </div>
                  </div>

                  <p className="kg-section-text">
                    {safeText(
                      event.description,
                      "This KidGage public event helps parents discover trusted academies, view available activity slots, and book classes for their children in a simple and organized way.",
                    )}
                  </p>
                </section>

                <section className="kg-section">
                  <div className="kg-section-head">
                    <div>
                      <p className="kg-section-kicker">Activities</p>
                      <h2 className="kg-section-title">Available classes</h2>
                    </div>
                  </div>

                  <div className="kg-activity-grid">
                    {activities.map((activity, index) => (
                      <article
                        className="kg-activity-card"
                        key={activity._id || index}
                      >
                        <div className="kg-activity-icon">
                          <Star size={22} />
                        </div>

                        <h3 className="kg-activity-title">
                          {safeText(
                            activity.name || activity.title,
                            "Activity",
                          )}
                        </h3>

                        <p className="kg-activity-meta">
                          {safeText(activity.category, "Kids Activity")}
                          <br />
                          {safeText(
                            activity.duration,
                            "Flexible duration",
                          )} · {safeText(activity.level, "All levels")}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="kg-section">
                  <div className="kg-section-head">
                    <div>
                      <p className="kg-section-kicker">Why KidGage</p>
                      <h2 className="kg-section-title">
                        Simple booking experience
                      </h2>
                    </div>
                  </div>

                  <div className="kg-benefits">
                    <div className="kg-benefit">
                      <CheckCircle2 size={21} />
                      <div>
                        <strong>Parent-friendly booking</strong>
                        <span>
                          Select academy, activity, child, and slot in a smooth
                          flow.
                        </span>
                      </div>
                    </div>

                    <div className="kg-benefit">
                      <ShieldCheck size={21} />
                      <div>
                        <strong>Clear slot availability</strong>
                        <span>
                          Parents can see available spaces before booking.
                        </span>
                      </div>
                    </div>

                    <div className="kg-benefit">
                      <Building2 size={21} />
                      <div>
                        <strong>Academy visibility</strong>
                        <span>
                          Public pages help academies promote events and
                          classes.
                        </span>
                      </div>
                    </div>

                    <div className="kg-benefit">
                      <Ticket size={21} />
                      <div>
                        <strong>Ready for payments</strong>
                        <span>
                          Can connect with online payment or manual
                          confirmation.
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="kg-sidebar">
                <div className="kg-book-card">
                  <div className="kg-book-head">
                    <h2 className="kg-book-title">Book your child’s slot</h2>
                    <p className="kg-book-subtitle">
                      Choose a suitable batch and continue to the KidGage
                      booking flow.
                    </p>
                  </div>

                  <div className="kg-book-body">
                    <div className="kg-price">
                      <div>
                        <p className="kg-price-label">Event Fee</p>
                        <p className="kg-price-value">
                          {safeText(event.price || event.fee, "QAR 120")}
                        </p>
                      </div>
                      <Ticket color="#ea580c" size={28} />
                    </div>

                    <div className="kg-slot-list">
                      {slots.map((slot, index) => {
                        const total = Number(slot.total || slot.capacity || 20);
                        const available = Number(
                          slot.available ?? slot.remaining ?? 0,
                        );
                        const used = Math.max(total - available, 0);
                        const percent =
                          total > 0 ? Math.min((used / total) * 100, 100) : 0;

                        return (
                          <div className="kg-slot" key={slot._id || index}>
                            <div className="kg-slot-top">
                              <div>
                                <p className="kg-slot-name">
                                  {safeText(
                                    slot.label || slot.name,
                                    `Slot ${index + 1}`,
                                  )}
                                </p>
                                <p className="kg-slot-time">
                                  <Clock size={14} />
                                  {safeText(slot.time, "Time TBA")}
                                </p>
                              </div>

                              <span className="kg-slot-badge">
                                {Number.isFinite(available) ? available : "Few"}{" "}
                                left
                              </span>
                            </div>

                            <div className="kg-progress">
                              <div
                                className="kg-progress-fill"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      className="kg-btn kg-btn-primary kg-book-button"
                      type="button"
                      onClick={handleBookNow}
                    >
                      Continue Booking
                      <ArrowRight size={18} />
                    </button>

                    <div className="kg-contact-list">
                      <div className="kg-contact-item">
                        <Phone size={16} />
                        {safeText(
                          academy.phone || event.phone,
                          "+974 74068761",
                        )}
                      </div>

                      <div className="kg-contact-item">
                        <Mail size={16} />
                        {safeText(
                          academy.email || event.email,
                          "info@kidgage.com",
                        )}
                      </div>

                      <div className="kg-contact-item">
                        <MapPin size={16} />
                        {safeText(
                          academy.address || event.location,
                          "Doha, Qatar",
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </main>

          <div className="kg-mobile-bottom">
            <button
              className="kg-btn kg-btn-primary"
              type="button"
              onClick={handleBookNow}
            >
              Book Now
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

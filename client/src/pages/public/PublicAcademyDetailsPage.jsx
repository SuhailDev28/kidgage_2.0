import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe2,
  GraduationCap,
  Languages,
  Link2,
  Mail,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { publicApi } from "../../lib/api.js";

const EMPTY_ACADEMY = {
  _id: "",
  id: "",
  name: "",
  academyName: "",
  slug: "",
  logo: "",
  coverImage: "",
  bannerImage: "",
  description: "",
  shortBio: "",
  mission: "",
  vision: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  address: "",
  city: "",
  country: "Qatar",
  status: "ACTIVE",
  establishedYear: "",
  ownerName: "",
  contactPerson: "",
  facilities: [],
  programsOffered: [],
  ageGroups: [],
  languages: [],
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  awards: [],
  recognitions: [],
  gallery: [],
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeImage(value) {
  if (!value) return "";

  const raw = String(value).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${base}${raw}`;
  if (raw.startsWith("uploads/")) return `${base}/${raw}`;

  return `${base}/uploads/${raw}`;
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

function formatYear(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw;
}

function formatDate(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeActivityImage(value) {
  return normalizeImage(value);
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children, right }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-black text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {right || null}
      </div>

      {children}
    </section>
  );
}

function ChipList({ items, emptyText = "Not added yet" }) {
  const rows = toArray(items).filter(Boolean);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((item) => (
        <span
          key={String(item)}
          className="inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-[#ff7a3d] ring-1 ring-orange-100"
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
}

function AwardCard({ item, type = "award" }) {
  const isAward = type === "award";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ff7a3d] shadow-sm">
          {isAward ? (
            <Trophy className="h-5 w-5" />
          ) : (
            <BadgeCheck className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900">
            {item?.title || (isAward ? "Award" : "Recognition")}
          </h3>

          <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            {isAward && item?.year ? <span>{item.year}</span> : null}
            {!isAward && item?.date ? (
              <span>{formatDate(item.date)}</span>
            ) : null}
            {item?.issuer ? <span>• {item.issuer}</span> : null}
            {item?.organization ? <span>• {item.organization}</span> : null}
          </div>

          {item?.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ item }) {
  const title = item?.title || item?.name || "Activity";
  const slug = item?.slug || item?._id || item?.id || "";
  const image = normalizeActivityImage(
    item?.coverImage || item?.bannerImage || item?.image || item?.images?.[0],
  );

  return (
    <Link
      to={slug ? `/activities/${slug}` : "/activities"}
      className="group overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-100 hover:shadow-[0_18px_42px_rgba(255,122,61,0.14)]"
    >
      <div className="h-44 bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Activity className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#ff7a3d]">
          {item?.categoryName || item?.category?.name || "Activity"}
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-black text-slate-900">
          {title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {item?.shortDescription ||
            item?.description ||
            "Explore this kids activity and available booking slots."}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#ff7a3d]">
          View details
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

export default function PublicAcademyDetailsPage() {
  const { slug } = useParams();

  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [error, setError] = useState("");

  const [academy, setAcademy] = useState(EMPTY_ACADEMY);
  const [activities, setActivities] = useState([]);

  const academyName = academy?.name || academy?.academyName || "Academy";

  const logo = useMemo(
    () => normalizeImage(academy?.logo || academy?.academyLogo),
    [academy?.logo, academy?.academyLogo],
  );

  const coverImage = useMemo(
    () =>
      normalizeImage(
        academy?.coverImage ||
          academy?.bannerImage ||
          academy?.image ||
          academy?.logo,
      ),
    [academy?.coverImage, academy?.bannerImage, academy?.image, academy?.logo],
  );

  const locationLabel = [academy?.city, academy?.country]
    .filter(Boolean)
    .join(", ");

  const publicDescription =
    academy?.description ||
    academy?.shortBio ||
    "Explore activities, programs, classes, and kids learning experiences from this trusted KidGage academy partner.";

  const visibleAwards = toArray(academy?.awards).filter(
    (item) => item?.title || item?.issuer || item?.description,
  );

  const visibleRecognitions = toArray(academy?.recognitions).filter(
    (item) => item?.title || item?.organization || item?.description,
  );

  const galleryImages = toArray(academy?.gallery)
    .map((item) => (typeof item === "string" ? item : item?.image || item?.url))
    .filter(Boolean);

  async function loadActivities(nextAcademy) {
    const academyId =
      nextAcademy?._id || nextAcademy?.id || nextAcademy?.academyId || "";

    if (!academyId) {
      setActivities([]);
      return;
    }

    try {
      setActivitiesLoading(true);

      const { data } = await publicApi.get("/activities", {
        params: { academyId },
      });

      setActivities(Array.isArray(data?.activities) ? data.activities : []);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function loadAcademy() {
    try {
      setLoading(true);
      setError("");

      const { data } = await publicApi.get(`/academies/${slug}`);
      const nextAcademy = data?.academy || data?.profile || data?.data || null;

      if (!nextAcademy) {
        setError("Academy not found.");
        setAcademy(EMPTY_ACADEMY);
        return;
      }

      const normalized = {
        ...EMPTY_ACADEMY,
        ...nextAcademy,
        name: nextAcademy.name || nextAcademy.academyName || "",
        academyName: nextAcademy.academyName || nextAcademy.name || "",
        facilities: toArray(nextAcademy.facilities),
        programsOffered: toArray(nextAcademy.programsOffered),
        ageGroups: toArray(nextAcademy.ageGroups),
        languages: toArray(nextAcademy.languages),
        awards: toArray(nextAcademy.awards),
        recognitions: toArray(nextAcademy.recognitions),
        gallery: toArray(nextAcademy.gallery),
      };

      setAcademy(normalized);
      await loadActivities(normalized);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load academy.");
      setAcademy(EMPTY_ACADEMY);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcademy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return (
      <section className="container-main py-8 sm:py-10 md:py-14">
        <div className="h-[360px] animate-pulse rounded-[34px] bg-slate-100" />
        <div className="mt-6 grid gap-5 md:grid-cols-4">
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
          <div className="h-28 animate-pulse rounded-[24px] bg-slate-100" />
        </div>
        <div className="mt-6 h-96 animate-pulse rounded-[30px] bg-slate-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-main py-12">
        <Link
          to="/academies"
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to academies
        </Link>

        <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-6 text-red-700">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="container-main py-8 sm:py-10 md:py-14">
      <Link
        to="/academies"
        className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to academies
      </Link>

      <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
        <div className="relative h-[320px] bg-slate-200 sm:h-[420px]">
          {coverImage ? (
            <img
              src={coverImage}
              alt={academyName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Building2 className="h-14 w-14" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />

          <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white bg-white shadow-xl sm:h-28 sm:w-28">
                {logo ? (
                  <img
                    src={logo}
                    alt={`${academyName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#ff7a3d] text-3xl font-black text-white">
                    {getInitials(academyName)}
                  </div>
                )}
              </div>

              <div className="min-w-0 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  KidGage Trusted Academy
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                  {academyName}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/90">
                  {locationLabel ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {locationLabel}
                    </span>
                  ) : null}

                  {academy?.status ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {academy.status}
                    </span>
                  ) : null}

                  {academy?.establishedYear ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Since {formatYear(academy.establishedYear)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <Link
              to={`/activities?academyId=${encodeURIComponent(
                String(academy?._id || academy?.id || ""),
              )}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.28)] hover:brightness-95"
            >
              View Activities
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <p className="max-w-4xl text-base leading-8 text-slate-600">
            {publicDescription}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Activities"
          value={activitiesLoading ? "..." : activities.length}
        />
        <StatCard icon={Medal} label="Awards" value={visibleAwards.length} />
        <StatCard
          icon={BadgeCheck}
          label="Recognitions"
          value={visibleRecognitions.length}
        />
        <StatCard
          icon={Star}
          label="Facilities"
          value={toArray(academy.facilities).length}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <SectionCard
            title="About the Academy"
            subtitle="Learn more about the academy, its mission, and learning approach."
            icon={Building2}
          >
            <div className="space-y-5">
              {academy?.shortBio ? (
                <p className="text-sm leading-7 text-slate-600">
                  {academy.shortBio}
                </p>
              ) : null}

              {academy?.description ? (
                <p className="text-sm leading-7 text-slate-600">
                  {academy.description}
                </p>
              ) : null}

              {!academy?.shortBio && !academy?.description ? (
                <p className="text-sm leading-7 text-slate-500">
                  No detailed academy information has been added yet.
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Mission and Vision"
            subtitle="The academy’s purpose and long-term direction."
            icon={ShieldCheck}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <div className="mb-2 text-sm font-black text-slate-900">
                  Mission
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {academy?.mission || "Mission details are not available yet."}
                </p>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-4">
                <div className="mb-2 text-sm font-black text-slate-900">
                  Vision
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {academy?.vision || "Vision details are not available yet."}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Awards and Recognition"
            subtitle="Achievements, certificates, accreditations, and public recognitions."
            icon={Award}
          >
            {!visibleAwards.length && !visibleRecognitions.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Awards and recognitions have not been added yet.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleAwards.map((item, index) => (
                  <AwardCard key={`award-${index}`} item={item} type="award" />
                ))}

                {visibleRecognitions.map((item, index) => (
                  <AwardCard
                    key={`recognition-${index}`}
                    item={item}
                    type="recognition"
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Programs and Facilities"
            subtitle="What parents can expect from this academy."
            icon={GraduationCap}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-black text-slate-900">
                  Programs Offered
                </div>
                <ChipList
                  items={academy.programsOffered}
                  emptyText="No programs added yet"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-slate-900">
                  Facilities
                </div>
                <ChipList
                  items={academy.facilities}
                  emptyText="No facilities added yet"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-slate-900">
                  Age Groups
                </div>
                <ChipList
                  items={academy.ageGroups}
                  emptyText="No age groups added yet"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-black text-slate-900">
                  Languages
                </div>
                <ChipList
                  items={academy.languages}
                  emptyText="No languages added yet"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Activities"
            subtitle="Browse bookable activities from this academy."
            icon={Activity}
            right={
              <Link
                to={`/activities?academyId=${encodeURIComponent(
                  String(academy?._id || academy?.id || ""),
                )}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            {activitiesLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-72 animate-pulse rounded-[26px] bg-slate-100" />
                <div className="h-72 animate-pulse rounded-[26px] bg-slate-100" />
              </div>
            ) : activities.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activities.slice(0, 4).map((item) => (
                  <ActivityCard key={item?._id || item?.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                No public activities are available for this academy yet.
              </div>
            )}
          </SectionCard>

          {galleryImages.length ? (
            <SectionCard
              title="Gallery"
              subtitle="Photos shared by the academy."
              icon={Sparkles}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {galleryImages.slice(0, 9).map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={normalizeImage(image)}
                      alt={`Gallery ${index + 1}`}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <aside className="space-y-6 xl:col-span-4">
          <SectionCard
            title="Contact Details"
            subtitle="Reach the academy directly."
            icon={Phone}
          >
            <div className="space-y-3">
              {academy?.email ? (
                <a
                  href={`mailto:${academy.email}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                >
                  <Mail className="h-4 w-4" />
                  <span className="min-w-0 truncate">{academy.email}</span>
                </a>
              ) : null}

              {academy?.phone ? (
                <a
                  href={`tel:${academy.phone}`}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                >
                  <Phone className="h-4 w-4" />
                  <span>{academy.phone}</span>
                </a>
              ) : null}

              {academy?.whatsapp ? (
                <a
                  href={`https://wa.me/${String(academy.whatsapp).replace(
                    /[^0-9]/g,
                    "",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                >
                  <Phone className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              ) : null}

              {academy?.website ? (
                <a
                  href={academy.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                >
                  <Globe2 className="h-4 w-4" />
                  <span className="min-w-0 truncate">{academy.website}</span>
                </a>
              ) : null}

              {!academy?.email &&
              !academy?.phone &&
              !academy?.whatsapp &&
              !academy?.website ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Contact details are not available yet.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Location"
            subtitle="Academy address."
            icon={MapPin}
          >
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">
                {locationLabel || "Doha, Qatar"}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {academy?.address || "Address not added yet."}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Academy Info"
            subtitle="Additional profile details."
            icon={Users}
          >
            <div className="space-y-3 text-sm">
              {academy?.ownerName ? (
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-500">Owner</span>
                  <span className="text-right font-bold text-slate-900">
                    {academy.ownerName}
                  </span>
                </div>
              ) : null}

              {academy?.contactPerson ? (
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-500">Contact</span>
                  <span className="text-right font-bold text-slate-900">
                    {academy.contactPerson}
                  </span>
                </div>
              ) : null}

              {academy?.establishedYear ? (
                <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-500">
                    Established
                  </span>
                  <span className="text-right font-bold text-slate-900">
                    {academy.establishedYear}
                  </span>
                </div>
              ) : null}

              {!academy?.ownerName &&
              !academy?.contactPerson &&
              !academy?.establishedYear ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Additional info not added yet.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Social Links"
            subtitle="Academy social profiles."
            icon={Link2}
          >
            <div className="space-y-3">
              {[
                ["Instagram", academy?.instagram],
                ["Facebook", academy?.facebook],
                ["YouTube", academy?.youtube],
                ["TikTok", academy?.tiktok],
              ]
                .filter(([, url]) => Boolean(url))
                .map(([label, url]) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#ff7a3d]"
                  >
                    <span>{label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </a>
                ))}

              {!academy?.instagram &&
              !academy?.facebook &&
              !academy?.youtube &&
              !academy?.tiktok ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Social links are not available yet.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Languages"
            subtitle="Available communication languages."
            icon={Languages}
          >
            <ChipList
              items={academy.languages}
              emptyText="No languages added yet"
            />
          </SectionCard>
        </aside>
      </div>
    </section>
  );
}

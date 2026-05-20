// client/src/pages/parent/ParentDashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Baby,
  CalendarDays,
  Clock3,
  CreditCard,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  XCircle,
  ArrowRight,
  ExternalLink,
  ReceiptText,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../lib/api.js";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value?._id || value?.id || value || "").trim();
}

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const text = String(value).trim();
  if (/^\d{1,2}:\d{2}/.test(text)) return text;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value, currency = "QAR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-QA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function normalizeUpper(value, fallback = "PENDING") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();
  return text || fallback;
}

function getStatusConfig(status) {
  const value = normalizeUpper(status);

  if (
    ["CONFIRMED", "PAID", "ACTIVE", "APPROVED", "COMPLETED"].includes(value)
  ) {
    return {
      label: value,
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (["FAILED", "CANCELLED", "CANCELED", "REJECTED"].includes(value)) {
    return {
      label: value,
      className: "bg-rose-50 text-rose-700 ring-rose-200",
      icon: XCircle,
    };
  }

  return {
    label: value,
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: Hourglass,
  };
}

function getSelectedSessions(booking) {
  const direct = toArray(
    booking?.selectedSessions || booking?.sessionsList || booking?.sessionItems,
  );

  if (direct.length) return direct;

  const bookedItems = toArray(booking?.bookedSlotItems);

  if (bookedItems.length) {
    return bookedItems.map((item, index) => {
      const slot =
        item?.slotId && typeof item.slotId === "object" ? item.slotId : item;

      return {
        id: normalizeId(
          slot?._id || slot?.id || item?.slotId || `session-${index + 1}`,
        ),
        sessionNo: Number(item?.sessionNo || index + 1),
        sessionLabel:
          item?.sessionLabel || slot?.sessionLabel || `Session ${index + 1}`,
        date:
          item?.date || item?.slotDate || slot?.date || slot?.slotDate || null,
        startTime: item?.startTime || slot?.startTime || "",
        endTime: item?.endTime || slot?.endTime || "",
        status:
          item?.status ||
          item?.sessionStatus ||
          item?.attendanceStatus ||
          "BOOKED",
      };
    });
  }

  const slotIds = toArray(booking?.slotIds);

  if (slotIds.length) {
    return slotIds.map((slot, index) => ({
      id: normalizeId(slot?._id || slot?.id || slot || `session-${index + 1}`),
      sessionNo: index + 1,
      sessionLabel: slot?.sessionLabel || `Session ${index + 1}`,
      date: slot?.date || slot?.slotDate || null,
      startTime: slot?.startTime || "",
      endTime: slot?.endTime || "",
      status: slot?.status || "BOOKED",
    }));
  }

  return [];
}

function pickPrimarySession(booking) {
  const sessions = getSelectedSessions(booking);

  if (sessions.length) return sessions[0];

  return {
    date:
      booking?.slotDate ||
      booking?.date ||
      booking?.startDate ||
      booking?.firstSlot?.slotDate ||
      booking?.firstSessionDate ||
      booking?.createdAt ||
      null,
    startTime:
      booking?.startTime ||
      booking?.firstSlot?.startTime ||
      booking?.slot?.startTime ||
      "",
    endTime:
      booking?.endTime ||
      booking?.firstSlot?.endTime ||
      booking?.slot?.endTime ||
      "",
    sessionLabel: "First Session",
  };
}

function buildEmbedPaymentUrl(booking) {
  const bookingId = normalizeId(
    booking?._id || booking?.id || booking?.bookingId,
  );
  const paymentId = normalizeId(
    booking?.paymentId || booking?.payment?._id || booking?.payment?.id,
  );

  if (!bookingId) return "";

  const search = new URLSearchParams();
  if (paymentId) search.set("paymentId", paymentId);

  const query = search.toString();
  return `/payment/myfatoorah/${bookingId}${query ? `?${query}` : ""}`;
}

function pickPaymentPage(booking) {
  return (
    booking?.paymentPage ||
    booking?.paymentUrl ||
    buildEmbedPaymentUrl(booking) ||
    booking?.checkoutUrl ||
    booking?.gatewayCheckoutUrl ||
    booking?.payment?.gatewayCheckoutUrl ||
    booking?.paymentLink ||
    ""
  );
}

function buildSuccessUrl(booking) {
  const bookingId = normalizeId(
    booking?._id || booking?.id || booking?.bookingId,
  );
  if (!bookingId) return "/parent/bookings";
  return `/payment/success/${bookingId}`;
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-500">{label}</div>

          <div className="mt-2 truncate text-4xl font-black tracking-tight text-slate-900">
            {value}
          </div>

          {helper ? (
            <div className="mt-2 text-sm text-slate-500">{helper}</div>
          ) : null}
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#ff7a3d]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function SessionPreview({ sessions }) {
  if (!sessions.length) return null;

  const visible = sessions.slice(0, 3);
  const remaining = Math.max(0, sessions.length - visible.length);

  return (
    <div className="mt-4 rounded-[22px] border border-orange-100 bg-orange-50/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#ff7a3d]">
        <PackageCheck className="h-4 w-4" />
        Selected Sessions
      </div>

      <div className="space-y-2">
        {visible.map((session, index) => (
          <div
            key={session.id || `${session.date}-${session.startTime}-${index}`}
            className="flex flex-col gap-1 rounded-2xl bg-white px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-black text-slate-800">
              {session.sessionLabel || `Session ${index + 1}`}
            </span>
            <span>
              {formatDate(session.date)}
              {session.startTime || session.endTime
                ? ` · ${formatTime(session.startTime)}${session.endTime ? ` - ${formatTime(session.endTime)}` : ""}`
                : ""}
            </span>
          </div>
        ))}
      </div>

      {remaining > 0 ? (
        <div className="mt-2 text-xs font-bold text-slate-500">
          +{remaining} more session{remaining === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}

function BookingCard({ booking, onViewHistory, navigate }) {
  const activity =
    booking?.activityId?.title ||
    booking?.activityId?.name ||
    booking?.activityName ||
    booking?.activitySnapshot?.title ||
    "Activity";

  const academy =
    booking?.academyId?.name ||
    booking?.academyName ||
    booking?.academySnapshot?.name ||
    "Academy";

  const child =
    booking?.childId?.fullName ||
    booking?.childId?.name ||
    booking?.childName ||
    booking?.childSnapshot?.fullName ||
    "Child";

  const packageName =
    booking?.packageId?.title ||
    booking?.packageName ||
    booking?.packageSnapshot?.title ||
    "Package";

  const bookingNo =
    booking?.bookingNo ||
    booking?.referenceNo ||
    booking?._id ||
    booking?.id ||
    "N/A";
  const bookingStatus = booking?.bookingStatus || booking?.status || "PENDING";
  const paymentStatus =
    booking?.paymentStatus || booking?.payment?.paymentStatus || "PENDING";

  const bookingStatusConfig = getStatusConfig(bookingStatus);
  const paymentStatusConfig = getStatusConfig(paymentStatus);

  const BookingIcon = bookingStatusConfig.icon;
  const PaymentIcon = paymentStatusConfig.icon;

  const sessions = getSelectedSessions(booking);
  const firstSession = pickPrimarySession(booking);

  const amount =
    booking?.finalAmount ||
    booking?.totalAmount ||
    booking?.amount ||
    booking?.price ||
    booking?.payment?.amount ||
    booking?.packageSnapshot?.price ||
    booking?.packageId?.price ||
    0;

  const currency =
    booking?.currency ||
    booking?.payment?.currency ||
    booking?.packageSnapshot?.currency ||
    "QAR";

  const paymentPage = pickPaymentPage(booking);
  const canPay = paymentPage && normalizeUpper(paymentStatus) !== "PAID";
  const successUrl = buildSuccessUrl(booking);

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            <ReceiptText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{bookingNo}</span>
          </div>

          <div className="mt-3 text-lg font-black text-slate-900">
            {activity}
          </div>
          <div className="mt-1 text-sm text-slate-500">{packageName}</div>

          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-slate-400" />
              {child}
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {academy}
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {formatDate(firstSession.date)}
            </div>

            {firstSession.startTime || firstSession.endTime ? (
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-400" />
                {formatTime(firstSession.startTime)}
                {firstSession.endTime
                  ? ` - ${formatTime(firstSession.endTime)}`
                  : ""}
              </div>
            ) : null}
          </div>

          <SessionPreview sessions={sessions} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="text-lg font-black text-slate-900">
            {formatMoney(amount, currency)}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${bookingStatusConfig.className}`}
          >
            <BookingIcon className="h-3.5 w-3.5" />
            {bookingStatusConfig.label}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${paymentStatusConfig.className}`}
          >
            <PaymentIcon className="h-3.5 w-3.5" />
            Payment {paymentStatusConfig.label}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onViewHistory}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ReceiptText className="h-4 w-4" />
          View History
        </button>

        <button
          type="button"
          onClick={() => navigate(successUrl)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-[#ff7a3d] transition hover:bg-orange-100"
        >
          <ExternalLink className="h-4 w-4" />
          Receipt
        </button>

        {canPay ? (
          <button
            type="button"
            onClick={() => navigate(paymentPage)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.2)] transition hover:brightness-95"
          >
            <CreditCard className="h-4 w-4" />
            Pay Now
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const navigate = useNavigate();

  const [data, setData] = useState({
    childrenCount: 0,
    bookingsCount: 0,
    upcomingBookings: [],
    recentBookings: [],
    pendingPaymentsCount: 0,
    paidBookingsCount: 0,
    paidAmount: 0,
    totalAmount: 0,
    currency: "QAR",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/parent/dashboard");

      setData({
        childrenCount: Number(res.data?.childrenCount || 0),
        bookingsCount: Number(res.data?.bookingsCount || 0),
        upcomingBookings: toArray(res.data?.upcomingBookings),
        recentBookings: toArray(res.data?.recentBookings || res.data?.bookings),
        pendingPaymentsCount: Number(res.data?.pendingPaymentsCount || 0),
        paidBookingsCount: Number(res.data?.paidBookingsCount || 0),
        paidAmount: Number(
          res.data?.paidAmount || res.data?.totals?.paidAmount || 0,
        ),
        totalAmount: Number(
          res.data?.totalAmount || res.data?.totals?.totalAmount || 0,
        ),
        currency: res.data?.currency || res.data?.totals?.currency || "QAR",
        ...res.data,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load parent dashboard. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const upcomingBookings = useMemo(() => {
    return toArray(data.upcomingBookings);
  }, [data.upcomingBookings]);

  const displayBookings = useMemo(() => {
    const recentBookings = toArray(data.recentBookings);
    return upcomingBookings.length ? upcomingBookings : recentBookings;
  }, [upcomingBookings, data.recentBookings]);

  return (
    <section className="container-main py-8 sm:py-10 md:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#ff7a3d]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Parent Portal
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Parent Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Manage your children, bookings, upcoming sessions, selected slots,
            and payment status from one place.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/parent/bookings")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,61,0.2)] transition hover:brightness-95"
          >
            My Bookings
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Baby}
          label="Children"
          value={loading ? "..." : data.childrenCount}
          helper="Registered child profiles"
        />

        <StatCard
          icon={CalendarDays}
          label="Bookings"
          value={loading ? "..." : data.bookingsCount}
          helper="Total bookings created"
        />

        <StatCard
          icon={Clock3}
          label="Upcoming"
          value={loading ? "..." : upcomingBookings.length}
          helper="Upcoming scheduled sessions"
        />

        <StatCard
          icon={CreditCard}
          label="Pending Payments"
          value={loading ? "..." : Number(data.pendingPaymentsCount || 0)}
          helper={`Paid: ${formatMoney(data.paidAmount || 0, data.currency || "QAR")}`}
        />
      </div>

      <div className="mt-8 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {upcomingBookings.length
                ? "Upcoming bookings"
                : "Recent bookings"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {upcomingBookings.length
                ? "Your next scheduled activity sessions and selected slots."
                : "Your latest booking records and payment receipts."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/parent/bookings")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            View all bookings
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <>
              <div className="h-32 animate-pulse rounded-[24px] bg-slate-100" />
              <div className="h-32 animate-pulse rounded-[24px] bg-slate-100" />
              <div className="h-32 animate-pulse rounded-[24px] bg-slate-100" />
            </>
          ) : displayBookings.length ? (
            displayBookings.map((booking) => (
              <BookingCard
                key={booking._id || booking.id || booking.bookingNo}
                booking={booking}
                navigate={navigate}
                onViewHistory={() => navigate("/parent/bookings")}
              />
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <CalendarDays className="h-7 w-7" />
              </div>

              <div className="mt-4 text-base font-bold text-slate-900">
                No bookings yet
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Once you book an activity, it will appear here.
              </div>

              <button
                type="button"
                onClick={() => navigate("/academies")}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
              >
                Explore academies
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

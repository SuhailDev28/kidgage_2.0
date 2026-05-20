// client/src/pages/payment/BookingSuccessPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { api, publicApi } from "../../lib/api.js";
import { getToken, getUser } from "../../lib/auth.js";

function safeText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeUpper(value, fallback = "") {
  const text = String(value || "")
    .trim()
    .toUpperCase();
  return text || fallback;
}

function toCurrency(value, currency = "QAR") {
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

function formatDateLabel(value) {
  if (!value) return "N/A";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractPayload(data) {
  return data?.data && typeof data.data === "object" ? data.data : data;
}

function extractBooking(data) {
  const payload = extractPayload(data);

  return (
    payload?.booking ||
    payload?.item ||
    payload?.data?.booking ||
    payload ||
    null
  );
}

function extractPayment(data) {
  const payload = extractPayload(data);

  return (
    payload?.payment || payload?.latestPayment || payload?.data?.payment || null
  );
}

function extractSessions(data, booking) {
  const payload = extractPayload(data);

  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.bookingSessions)) return payload.bookingSessions;
  if (Array.isArray(payload?.data?.sessions)) return payload.data.sessions;

  if (Array.isArray(booking?.sessions)) return booking.sessions;
  if (Array.isArray(booking?.bookingSessions)) return booking.bookingSessions;
  if (Array.isArray(booking?.bookedSlotItems)) return booking.bookedSlotItems;
  if (Array.isArray(booking?.slotItems)) return booking.slotItems;
  if (Array.isArray(booking?.slots)) return booking.slots;

  return [];
}

function getAmount(booking, payment) {
  return Number(
    payment?.amount ||
      payment?.invoiceValue ||
      payment?.paidAmount ||
      booking?.finalAmount ||
      booking?.totalAmount ||
      booking?.payableAmount ||
      booking?.amount ||
      booking?.packageSnapshot?.price ||
      0,
  );
}

function getCurrency(booking, payment) {
  return (
    payment?.currency ||
    booking?.currency ||
    booking?.packageSnapshot?.currency ||
    "QAR"
  );
}

function getActivityTitle(booking) {
  return (
    booking?.activityId?.title ||
    booking?.activity?.title ||
    booking?.activitySnapshot?.title ||
    booking?.activityTitle ||
    "Activity"
  );
}

function getPackageTitle(booking) {
  return (
    booking?.packageId?.title ||
    booking?.package?.title ||
    booking?.packageSnapshot?.title ||
    booking?.packageTitle ||
    "Package"
  );
}

function getAcademyName(booking) {
  return (
    booking?.academyId?.name ||
    booking?.academy?.name ||
    booking?.academySnapshot?.name ||
    booking?.academyName ||
    "KidGage Academy"
  );
}

function getChildName(booking) {
  return (
    booking?.childId?.fullName ||
    booking?.child?.fullName ||
    booking?.childSnapshot?.fullName ||
    booking?.guestChild?.fullName ||
    booking?.guestChild?.name ||
    booking?.guestChildSnapshot?.fullName ||
    booking?.childName ||
    "Child"
  );
}

function getParentName(booking) {
  return (
    booking?.parentId?.fullName ||
    booking?.parent?.fullName ||
    booking?.parentSnapshot?.fullName ||
    booking?.guestParent?.fullName ||
    booking?.guestParent?.name ||
    booking?.guestParentSnapshot?.fullName ||
    booking?.parentName ||
    "Parent"
  );
}

function getBookingNo(booking) {
  return safeText(
    booking?.bookingNo ||
      booking?.bookingNumber ||
      booking?.referenceNo ||
      booking?._id,
  );
}

function getSlotDate(item) {
  return (
    item?.slotDate ||
    item?.date ||
    item?.sessionDate ||
    item?.startDate ||
    item?.slotId?.slotDate ||
    item?.slotId?.date ||
    item?.slot?.slotDate ||
    item?.slot?.date ||
    null
  );
}

function getSlotStartTime(item) {
  return (
    item?.startTime ||
    item?.slotStartTime ||
    item?.slotId?.startTime ||
    item?.slot?.startTime ||
    ""
  );
}

function getSlotEndTime(item) {
  return (
    item?.endTime ||
    item?.slotEndTime ||
    item?.slotId?.endTime ||
    item?.slot?.endTime ||
    ""
  );
}

function getSlots(booking, sessions = []) {
  if (Array.isArray(sessions) && sessions.length) {
    return sessions.map((item) => ({
      slotId: item?.slotId?._id || item?.slotId || item?.slot?._id || item?._id,
      date: getSlotDate(item),
      startTime: getSlotStartTime(item),
      endTime: getSlotEndTime(item),
      sessionLabel:
        item?.sessionLabel ||
        item?.slotId?.sessionLabel ||
        item?.slot?.sessionLabel ||
        "Session",
      status:
        item?.sessionStatus || item?.status || item?.bookingStatus || "BOOKED",
    }));
  }

  if (
    Array.isArray(booking?.bookedSlotItems) &&
    booking.bookedSlotItems.length
  ) {
    return booking.bookedSlotItems.map((item) => ({
      slotId: item?.slotId?._id || item?.slotId || item?._id,
      date: getSlotDate(item),
      startTime: getSlotStartTime(item),
      endTime: getSlotEndTime(item),
      sessionLabel: item?.sessionLabel || "Session",
      status: item?.status || "BOOKED",
    }));
  }

  return [];
}

function statusBadgeClass(status) {
  const value = normalizeUpper(status);

  if (
    ["PAID", "SUCCESS", "CAPTURED", "CONFIRMED", "COMPLETED"].includes(value)
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    ["FAILED", "CANCELLED", "CANCELED", "EXPIRED", "REFUNDED"].includes(value)
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#16A34A]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-black text-slate-950 sm:text-base">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const guestToken =
    searchParams.get("guestToken") ||
    searchParams.get("guestPaymentToken") ||
    searchParams.get("token") ||
    "";

  const token = getToken();
  const user = getUser();
  const userRole = normalizeUpper(user?.role);
  const isParent = Boolean(token) && userRole === "PARENT";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [sessions, setSessions] = useState([]);

  const slots = useMemo(() => getSlots(booking, sessions), [booking, sessions]);

  async function fetchBooking({ silent = false } = {}) {
    if (!bookingId) {
      setError("Booking ID is missing.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      let responseData = null;

      if (isParent) {
        try {
          const response = await api.get(`/parent/bookings/${bookingId}`);
          responseData = response.data;
        } catch (parentErr) {
          if (!guestToken) throw parentErr;
        }
      }

      if (!responseData) {
        const response = await publicApi.get(`/bookings/${bookingId}`, {
          params: guestToken ? { guestToken } : {},
        });

        responseData = response.data;
      }

      const nextBooking = extractBooking(responseData);
      const nextPayment = extractPayment(responseData);
      const nextSessions = extractSessions(responseData, nextBooking);

      if (!nextBooking?._id && !nextBooking?.bookingNo) {
        throw new Error("Booking details were not found.");
      }

      setBooking(nextBooking);
      setPayment(nextPayment);
      setSessions(nextSessions);
    } catch (err) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load booking details.";

      setError(serverMessage);
      setBooking(null);
      setPayment(null);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, guestToken, isParent]);

  const paymentStatus = normalizeUpper(
    payment?.paymentStatus ||
      payment?.status ||
      payment?.invoiceStatus ||
      booking?.paymentStatus ||
      "PENDING",
    "PENDING",
  );

  const bookingStatus = normalizeUpper(
    booking?.bookingStatus || booking?.status || "PENDING",
    "PENDING",
  );

  const paymentMethod = normalizeUpper(
    booking?.paymentMethod || payment?.paymentMethod || "ONLINE",
    "ONLINE",
  );

  const amount = getAmount(booking, payment);
  const currency = getCurrency(booking, payment);

  const firstSessionDate =
    booking?.firstSessionDate || slots[0]?.date || booking?.startDate || null;

  const lastSessionDate =
    booking?.lastSessionDate ||
    slots[slots.length - 1]?.date ||
    booking?.endDate ||
    null;

  const totalSessions =
    Number(booking?.totalSessions || 0) || slots.length || sessions.length || 0;

  const bookedSessions =
    Number(booking?.bookedSessions || 0) ||
    slots.length ||
    sessions.length ||
    0;

  if (loading) {
    return (
      <section className="container-main py-10 sm:py-14">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#16A34A]" />

          <div className="mt-5 text-xl font-black text-slate-950">
            Loading booking details...
          </div>

          <div className="mt-2 text-sm text-slate-500">
            Please wait while KidGage prepares your confirmation.
          </div>
        </div>
      </section>
    );
  }

  if (error || !booking) {
    return (
      <section className="container-main py-10 sm:py-14">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-rose-600 shadow-sm">
            <AlertCircle className="h-8 w-8" />
          </div>

          <h1 className="mt-6 text-2xl font-black text-rose-900">
            Booking details unavailable
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-rose-700">
            {error || "Booking could not be loaded."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => fetchBooking()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#15803D]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-main py-8 sm:py-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#16A34A] px-5 py-8 shadow-[0_30px_90px_rgba(22,163,74,0.24)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-50 ring-1 ring-white/15">
                <ShieldCheck className="h-4 w-4" />
                KidGage Booking Confirmation
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Booking received successfully
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/85 sm:text-base">
                Your child’s activity booking has been created. Keep this page
                or booking number for reference.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900">
                  <ReceiptText className="h-4 w-4 text-[#16A34A]" />
                  {getBookingNo(booking)}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${statusBadgeClass(paymentStatus)}`}
                >
                  <CreditCard className="h-4 w-4" />
                  Payment {paymentStatus}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${statusBadgeClass(bookingStatus)}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Booking {bookingStatus}
                </span>
              </div>
            </div>

            <div className="rounded-[30px] bg-white/95 p-5 shadow-xl backdrop-blur">
              <div className="text-sm font-black text-slate-500">
                Total amount
              </div>

              <div className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                {toCurrency(amount, currency)}
              </div>

              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Payment method:{" "}
                {paymentMethod === "CASH" ? "Cash Payment" : "Online Payment"}
              </div>

              <button
                type="button"
                onClick={() => fetchBooking({ silent: true })}
                disabled={refreshing}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh status
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={PackageCheck}
            label="Activity"
            value={getActivityTitle(booking)}
          />

          <InfoCard
            icon={Wallet}
            label="Package"
            value={getPackageTitle(booking)}
          />

          <InfoCard
            icon={UserRound}
            label="Child"
            value={getChildName(booking)}
          />

          <InfoCard
            icon={MapPin}
            label="Academy"
            value={getAcademyName(booking)}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Selected sessions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {slots.length} session{slots.length === 1 ? "" : "s"} included
                  in this booking.
                </p>
              </div>

              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#16A34A]">
                {normalizeUpper(booking.bookingMode || "BOOKED")}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {slots.length ? (
                slots.map((slot, index) => (
                  <div
                    key={`${slot.slotId || index}-${index}`}
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950">
                        Session {index + 1}:{" "}
                        {safeText(slot.sessionLabel, "Session")}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {formatDateLabel(slot.date)}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-4 w-4" />
                          {safeText(slot.startTime, "--:--")} -{" "}
                          {safeText(slot.endTime, "--:--")}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      {safeText(slot.status, "BOOKED")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No session details found for this booking.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Booking details
              </h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-500">Parent</span>
                  <span className="text-right font-black text-slate-900">
                    {getParentName(booking)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-500">
                    Booking No
                  </span>
                  <span className="text-right font-black text-slate-900">
                    {getBookingNo(booking)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-500">Sessions</span>
                  <span className="text-right font-black text-slate-900">
                    {bookedSessions} / {totalSessions}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <span className="font-semibold text-slate-500">
                    First session
                  </span>
                  <span className="text-right font-black text-slate-900">
                    {formatDateLabel(firstSessionDate)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-500">
                    Last session
                  </span>
                  <span className="text-right font-black text-slate-900">
                    {formatDateLabel(lastSessionDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Next steps</h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {paymentMethod === "CASH"
                  ? "Your booking is pending cash payment confirmation. KidGage or the academy will update the payment status after verification."
                  : paymentStatus === "PAID"
                    ? "Your online payment is confirmed. You can keep this page as your booking receipt."
                    : "Your online payment is pending. Refresh this page after payment completion."}
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#15803D]"
                >
                  <Home className="h-4 w-4" />
                  Back to home
                </Link>

                {isParent ? (
                  <Link
                    to="/parent/bookings"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <ReceiptText className="h-4 w-4" />
                    My bookings
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

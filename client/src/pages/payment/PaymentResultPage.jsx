// client/src/pages/payment/PaymentResultPage.jsx

import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Home,
  Loader2,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { api } from "../../lib/api.js";

const CONFIG = {
  success: {
    icon: CheckCircle2,
    title: "Payment Successful",
    message:
      "Your payment has been confirmed successfully. Your KidGage booking is now confirmed.",
    badge: "Confirmed",
    badgeClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    iconClass: "bg-emerald-100 text-emerald-600",
    panelClass: "from-emerald-50 via-white to-orange-50",
  },
  failed: {
    icon: AlertCircle,
    title: "Payment Failed",
    message:
      "Your payment could not be completed. You can try again or contact KidGage support.",
    badge: "Failed",
    badgeClass: "bg-red-100 text-red-700 ring-red-200",
    iconClass: "bg-red-100 text-red-600",
    panelClass: "from-red-50 via-white to-orange-50",
  },
  pending: {
    icon: Clock3,
    title: "Payment Pending",
    message:
      "Your payment is being verified. Refresh the status or check your booking again shortly.",
    badge: "Pending",
    badgeClass: "bg-amber-100 text-amber-700 ring-amber-200",
    iconClass: "bg-amber-100 text-amber-600",
    panelClass: "from-amber-50 via-white to-orange-50",
  },
};

function normalizeUpper(value, fallback = "") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return text || fallback;
}

function buildUrl(path, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

function shortId(value) {
  const text = String(value || "").trim();
  if (!text) return "N/A";
  return text.length > 14 ? `${text.slice(0, 6)}...${text.slice(-6)}` : text;
}

function getErrorMessage(err, fallback = "Something went wrong.") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default function PaymentResultPage({ type = "pending" }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const config = CONFIG[type] || CONFIG.pending;
  const Icon = config.icon;

  const paymentId =
    searchParams.get("paymentId") ||
    searchParams.get("payment_id") ||
    searchParams.get("localPaymentId") ||
    "";

  const bookingId =
    searchParams.get("bookingId") || searchParams.get("booking_id") || "";

  const status = normalizeUpper(searchParams.get("status") || config.badge);

  const guestToken =
    searchParams.get("guestToken") ||
    searchParams.get("guestPaymentToken") ||
    searchParams.get("token") ||
    "";

  const guest =
    searchParams.get("guest") === "1" ||
    searchParams.get("guest") === "true" ||
    Boolean(guestToken);

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const retryUrl = useMemo(() => {
    if (!bookingId) return "/activities";

    return buildUrl(`/payment/myfatoorah/${bookingId}`, {
      paymentId,
      guestToken,
      guest: guest ? "1" : "",
    });
  }, [bookingId, paymentId, guestToken, guest]);

  const bookingSuccessUrl = useMemo(() => {
    if (!bookingId) return "/";

    return buildUrl(`/payment/success/${bookingId}`, {
      paymentId,
      guestToken,
      guest: guest ? "1" : "",
    });
  }, [bookingId, paymentId, guestToken, guest]);

  async function refreshPaymentStatus() {
    if (!bookingId && !paymentId) {
      setError("Booking ID or Payment ID is missing.");
      return;
    }

    try {
      setSyncing(true);
      setError("");
      setMessage("");

      const { data } = await api.post("/payments/myfatoorah/sync", {
        bookingId,
        localPaymentId: paymentId,
        paymentRecordId: paymentId,
        guestToken,
      });

      const nextStatus = normalizeUpper(
        data?.status ||
          data?.payment?.paymentStatus ||
          data?.payment?.status ||
          data?.booking?.paymentStatus ||
          "PENDING",
        "PENDING",
      );

      const nextBookingId =
        data?.booking?._id ||
        data?.booking?.id ||
        data?.payment?.bookingId ||
        bookingId;

      const nextPaymentId =
        data?.payment?._id || data?.payment?.id || paymentId;

      const nextGuestToken =
        data?.booking?.guestPaymentToken ||
        data?.guestPaymentToken ||
        data?.guestToken ||
        guestToken;

      const nextGuest = Boolean(
        guest ||
        nextGuestToken ||
        data?.booking?.isGuestBooking ||
        data?.payment?.meta?.guestParent,
      );

      if (nextStatus === "PAID") {
        navigate(
          buildUrl(`/payment/success/${nextBookingId}`, {
            paymentId: nextPaymentId,
            status: "PAID",
            guestToken: nextGuestToken,
            guest: nextGuest ? "1" : "",
          }),
          { replace: true },
        );
        return;
      }

      if (nextStatus === "FAILED") {
        navigate(
          buildUrl("/payment/failed", {
            bookingId: nextBookingId,
            paymentId: nextPaymentId,
            status: "FAILED",
            guestToken: nextGuestToken,
            guest: nextGuest ? "1" : "",
          }),
          { replace: true },
        );
        return;
      }

      setMessage(`Payment status refreshed: ${nextStatus}`);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to refresh payment status. Try again."),
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-10">
      <section
        className={`mx-auto max-w-xl overflow-hidden rounded-[32px] border border-slate-100 bg-gradient-to-br ${config.panelClass} p-1 shadow-sm`}
      >
        <div className="rounded-[28px] bg-white/90 p-6 text-center backdrop-blur">
          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl ${config.iconClass}`}
          >
            <Icon size={34} />
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${config.badgeClass}`}
          >
            {status}
          </span>

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            {config.title}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {config.message}
          </p>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-bold text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <ReceiptText size={18} />
              Payment Details
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {bookingId ? (
                <div className="flex justify-between gap-4">
                  <span>Booking ID</span>
                  <span className="break-all font-semibold text-slate-800">
                    {shortId(bookingId)}
                  </span>
                </div>
              ) : null}

              {paymentId ? (
                <div className="flex justify-between gap-4">
                  <span>Payment ID</span>
                  <span className="break-all font-semibold text-slate-800">
                    {shortId(paymentId)}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between gap-4">
                <span>Customer Type</span>
                <span className="font-semibold text-slate-800">
                  {guest ? "Guest" : "Parent"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Status</span>
                <span className="font-semibold text-slate-800">{status}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Home size={18} />
              Go Home
            </Link>

            {type === "success" && bookingId ? (
              <Link
                to={bookingSuccessUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
              >
                <ReceiptText size={18} />
                View Booking
              </Link>
            ) : type === "failed" ? (
              <Link
                to={retryUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
              >
                <RefreshCw size={18} />
                Try Again
              </Link>
            ) : (
              <button
                type="button"
                onClick={refreshPaymentStatus}
                disabled={syncing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                {syncing ? "Refreshing..." : "Refresh Status"}
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {type !== "success" && bookingId ? (
              <Link
                to={bookingSuccessUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-[#ff7a3d] transition hover:bg-orange-100"
              >
                <ReceiptText size={18} />
                Booking Details
              </Link>
            ) : null}

            {type !== "failed" && bookingId ? (
              <Link
                to={retryUrl}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={18} />
                Retry Payment
              </Link>
            ) : null}

            {!guest ? (
              <Link
                to="/parent/bookings"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ReceiptText size={18} />
                My Bookings
              </Link>
            ) : (
              <Link
                to="/activities"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ReceiptText size={18} />
                Browse Activities
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

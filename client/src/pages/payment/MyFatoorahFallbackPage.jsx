// client/src/pages/payment/MyFatoorahFallbackPage.jsx
import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Clock3,
  CreditCard,
  Home,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export default function MyFatoorahFallbackPage() {
  const [searchParams] = useSearchParams();

  const status = normalizeStatus(searchParams.get("status") || "PENDING");
  const bookingId = searchParams.get("bookingId") || "";
  const paymentId = searchParams.get("paymentId") || "";
  const reason = searchParams.get("reason") || "";
  const guest = searchParams.get("guest") === "1";

  const config = useMemo(() => {
    if (status === "PAID" || status === "SUCCESS") {
      return {
        icon: ShieldCheck,
        title: "Payment Verified",
        message:
          "Your payment has already been verified. Your booking is confirmed.",
        badge: "Paid",
        iconClass: "bg-emerald-100 text-emerald-600",
        badgeClass: "bg-emerald-100 text-emerald-700",
      };
    }

    if (
      status === "FAILED" ||
      status === "CANCELLED" ||
      status === "CANCELED"
    ) {
      return {
        icon: AlertCircle,
        title: "Payment Could Not Be Completed",
        message:
          "MyFatoorah could not complete this payment. You can try again or contact KidGage support.",
        badge: "Failed",
        iconClass: "bg-red-100 text-red-600",
        badgeClass: "bg-red-100 text-red-700",
      };
    }

    return {
      icon: Clock3,
      title: "Payment Status Pending",
      message:
        "We are checking your MyFatoorah payment status. If money was deducted, please do not pay again immediately. KidGage will update the booking after verification.",
      badge: "Pending",
      iconClass: "bg-amber-100 text-amber-600",
      badgeClass: "bg-amber-100 text-amber-700",
    };
  }, [status]);

  const Icon = config.icon;

  const retryUrl = bookingId
    ? `/payment/myfatoorah/${bookingId}${guest ? "?guest=1" : ""}`
    : "/activities";

  return (
    <main className="min-h-[75vh] bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-xl rounded-[32px] border border-slate-100 bg-white p-6 text-center shadow-sm">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${config.iconClass}`}
        >
          <Icon size={34} />
        </div>

        <div
          className={`mx-auto mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${config.badgeClass}`}
        >
          {config.badge}
        </div>

        <h1 className="mt-4 text-2xl font-black text-slate-900">
          {config.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {config.message}
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <CreditCard size={18} />
            MyFatoorah Payment Info
          </div>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {bookingId ? (
              <div className="flex justify-between gap-4">
                <span>Booking ID</span>
                <span className="break-all font-semibold text-slate-900">
                  {bookingId}
                </span>
              </div>
            ) : null}

            {paymentId ? (
              <div className="flex justify-between gap-4">
                <span>Payment ID</span>
                <span className="break-all font-semibold text-slate-900">
                  {paymentId}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between gap-4">
              <span>Status</span>
              <span className="font-semibold text-slate-900">{status}</span>
            </div>

            {reason ? (
              <div className="flex justify-between gap-4">
                <span>Reason</span>
                <span className="break-all font-semibold text-slate-900">
                  {reason}
                </span>
              </div>
            ) : null}
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

          {status === "FAILED" ||
          status === "CANCELLED" ||
          status === "CANCELED" ? (
            <Link
              to={retryUrl}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              <RefreshCw size={18} />
              Try Again
            </Link>
          ) : (
            <Link
              to={guest ? "/activities" : "/parent/bookings"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-4 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              <ShieldCheck size={18} />
              {guest ? "Browse Activities" : "My Bookings"}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

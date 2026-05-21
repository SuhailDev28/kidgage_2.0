// client/src/pages/payment/MyFatoorahEmbedPage.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../lib/api.js";

function loadMyFatoorahScript(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("MyFatoorah script URL missing"));
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      if (window.myfatoorah) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load MyFatoorah script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load MyFatoorah script"));

    document.body.appendChild(script);
  });
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function boolTrue(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function isCompletedCallback(payload = {}) {
  return (
    (boolTrue(payload?.isSuccess) ||
      boolTrue(payload?.IsSuccess) ||
      boolTrue(payload?.success) ||
      boolTrue(payload?.Success)) &&
    (boolTrue(payload?.paymentCompleted) ||
      boolTrue(payload?.PaymentCompleted) ||
      boolTrue(payload?.completed) ||
      boolTrue(payload?.Completed))
  );
}

function pickGatewayPaymentId(payload = {}) {
  return String(
    payload?.PaymentId ||
      payload?.paymentId ||
      payload?.PaymentID ||
      payload?.payment_id ||
      payload?.TransactionId ||
      payload?.transactionId ||
      payload?.TrackId ||
      payload?.trackId ||
      payload?.Data?.PaymentId ||
      payload?.Data?.paymentId ||
      payload?.data?.PaymentId ||
      payload?.data?.paymentId ||
      payload?.paymentData?.PaymentId ||
      payload?.paymentData?.paymentId ||
      "",
  ).trim();
}

function pickGatewayInvoiceId(payload = {}) {
  return String(
    payload?.InvoiceId ||
      payload?.invoiceId ||
      payload?.InvoiceID ||
      payload?.invoice_id ||
      payload?.Id ||
      payload?.id ||
      payload?.Data?.InvoiceId ||
      payload?.Data?.invoiceId ||
      payload?.Data?.Id ||
      payload?.data?.InvoiceId ||
      payload?.data?.invoiceId ||
      payload?.data?.Id ||
      payload?.paymentData?.InvoiceId ||
      payload?.paymentData?.invoiceId ||
      "",
  ).trim();
}

function pickEncryptedPaymentData(payload = {}) {
  return String(
    payload?.PaymentData ||
      payload?.paymentData ||
      payload?.EncryptedPaymentData ||
      payload?.encryptedPaymentData ||
      payload?.Data?.PaymentData ||
      payload?.Data?.paymentData ||
      payload?.data?.PaymentData ||
      payload?.data?.paymentData ||
      "",
  ).trim();
}

function pickSessionId(payload = {}, fallback = "") {
  return String(
    payload?.SessionId ||
      payload?.sessionId ||
      payload?.session_id ||
      payload?.Data?.SessionId ||
      payload?.Data?.sessionId ||
      payload?.data?.SessionId ||
      payload?.data?.sessionId ||
      fallback ||
      "",
  ).trim();
}

function buildResultUrl(path, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();

  return `${path}${query ? `?${query}` : ""}`;
}

function buildBookingSuccessUrl(bookingId, params = {}) {
  const safeBookingId = String(bookingId || "").trim();

  if (!safeBookingId) {
    return buildResultUrl("/payment/success", params);
  }

  return buildResultUrl(`/payment/success/${safeBookingId}`, params);
}

function getAxiosMessage(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function getLocalPaymentId(payment, embedded, fallback = "") {
  return String(
    embedded?.localPaymentId ||
      payment?.localPaymentId ||
      payment?._id ||
      payment?.id ||
      fallback ||
      "",
  ).trim();
}

function getAmountLabel(payment, embedded) {
  const amount = Number(payment?.amount || embedded?.amount || 0);
  const currency =
    payment?.currency || embedded?.currency || embedded?.currencyCode || "QAR";

  if (!Number.isFinite(amount) || amount <= 0) {
    return `${currency} 0.00`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

export default function MyFatoorahEmbedPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const containerId = "kidgage-myfatoorah-embed-container";
  const initializedRef = useRef(false);
  const verifyingRef = useRef(false);

  const bookingId = useMemo(() => {
    return String(
      params.bookingId ||
        searchParams.get("bookingId") ||
        searchParams.get("booking_id") ||
        "",
    ).trim();
  }, [params.bookingId, searchParams]);

  const guestToken = useMemo(() => {
    return String(
      searchParams.get("guestToken") ||
        searchParams.get("guestPaymentToken") ||
        searchParams.get("token") ||
        "",
    ).trim();
  }, [searchParams]);

  const urlLocalPaymentId = useMemo(() => {
    return String(
      searchParams.get("localPaymentId") ||
        searchParams.get("local_payment_id") ||
        searchParams.get("kidgagePaymentId") ||
        searchParams.get("kgPaymentId") ||
        searchParams.get("paymentId") ||
        "",
    ).trim();
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [embedded, setEmbedded] = useState(null);
  const [payment, setPayment] = useState(null);
  const [ready, setReady] = useState(false);

  function redirectByStatus({
    status,
    localPaymentId,
    finalBookingId,
    guest = false,
    finalGuestToken = "",
  }) {
    const normalized = normalizeStatus(status);
    const safeBookingId = String(finalBookingId || bookingId || "").trim();
    const safePaymentId = String(localPaymentId || "").trim();
    const safeGuestToken = String(finalGuestToken || guestToken || "").trim();
    const isGuest = Boolean(guest || safeGuestToken);

    const commonParams = {
      localPaymentId: safePaymentId,
      paymentId: safePaymentId,
      bookingId: safeBookingId,
      status: normalized || "PENDING",
      guestToken: isGuest ? safeGuestToken : "",
      guest: isGuest ? "1" : "",
    };

    if (normalized === "PAID") {
      navigate(buildBookingSuccessUrl(safeBookingId, commonParams), {
        replace: true,
      });
      return;
    }

    if (normalized === "FAILED" || normalized === "CANCELLED") {
      navigate(
        buildResultUrl("/payment/failed", {
          ...commonParams,
          status: "FAILED",
        }),
        { replace: true },
      );
      return;
    }

    navigate(
      buildResultUrl("/payment/pending", {
        ...commonParams,
        status: "PENDING",
      }),
      { replace: true },
    );
  }

  async function verifyEmbeddedResult({
    localPaymentId,
    sessionId,
    paymentData = "",
    gatewayPaymentId = "",
    gatewayInvoiceId = "",
    rawPayload = null,
  }) {
    const safeLocalPaymentId = String(localPaymentId || "").trim();

    if (!safeLocalPaymentId) {
      setError("Local payment ID missing. Please contact support.");
      return;
    }

    if (verifyingRef.current) return;

    verifyingRef.current = true;
    setVerifying(true);
    setError("");

    try {
      const response = await api.post("/payments/myfatoorah/embedded-result", {
        bookingId,
        guestToken,

        localPaymentId: safeLocalPaymentId,
        paymentRecordId: safeLocalPaymentId,

        sessionId,
        paymentData,

        gatewayPaymentId,
        gatewayInvoiceId,

        PaymentId: gatewayPaymentId,
        InvoiceId: gatewayInvoiceId,

        rawPayload,
        rawResponse: rawPayload,

        isSuccess: rawPayload?.isSuccess,
        IsSuccess: rawPayload?.IsSuccess,
        paymentCompleted: rawPayload?.paymentCompleted,
        PaymentCompleted: rawPayload?.PaymentCompleted,
      });

      const data = response.data || {};

      const status = normalizeStatus(
        data?.status ||
          data?.payment?.paymentStatus ||
          data?.payment?.status ||
          data?.paymentStatus ||
          data?.booking?.paymentStatus ||
          "PENDING",
      );

      const finalBookingId =
        data?.booking?._id ||
        data?.booking?.id ||
        data?.payment?.bookingId ||
        bookingId;

      const isGuestPayment = Boolean(
        data?.booking?.isGuestBooking ||
          data?.payment?.meta?.guestParent ||
          data?.payment?.meta?.parentType === "GUEST" ||
          guestToken,
      );

      redirectByStatus({
        status,
        localPaymentId: safeLocalPaymentId,
        finalBookingId,
        guest: isGuestPayment,
        finalGuestToken:
          data?.booking?.guestPaymentToken ||
          data?.guestToken ||
          data?.guestPaymentToken ||
          guestToken,
      });
    } catch (err) {
      console.error("MyFatoorah embedded verify failed:", err);

      const message = getAxiosMessage(
        err,
        "Payment verification failed. Please refresh status or contact support.",
      );

      setError(message);

      navigate(
        buildResultUrl("/payment/pending", {
          localPaymentId: safeLocalPaymentId,
          paymentId: safeLocalPaymentId,
          bookingId,
          status: "PENDING",
          guestToken,
          guest: guestToken ? "1" : "",
        }),
        { replace: true },
      );
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  }

  async function syncPaymentStatus() {
    const localPaymentId = getLocalPaymentId(
      payment,
      embedded,
      urlLocalPaymentId,
    );

    if (!localPaymentId && !bookingId) {
      setError("Payment ID or booking ID missing.");
      return;
    }

    try {
      setRetrying(true);
      setError("");

      const { data } = await api.post("/payments/myfatoorah/sync", {
        bookingId,
        guestToken,
        localPaymentId,
        paymentRecordId: localPaymentId,
      });

      const status = normalizeStatus(
        data?.status ||
          data?.payment?.paymentStatus ||
          data?.payment?.status ||
          "PENDING",
      );

      const finalBookingId =
        data?.booking?._id ||
        data?.booking?.id ||
        data?.payment?.bookingId ||
        bookingId;

      redirectByStatus({
        status,
        localPaymentId,
        finalBookingId,
        guest: Boolean(guestToken || data?.booking?.isGuestBooking),
        finalGuestToken:
          data?.booking?.guestPaymentToken ||
          data?.guestToken ||
          data?.guestPaymentToken ||
          guestToken,
      });
    } catch (err) {
      console.error("MyFatoorah sync failed:", err);
      setError(getAxiosMessage(err, "Unable to refresh payment status."));
    } finally {
      setRetrying(false);
    }
  }

  async function startPayment() {
    try {
      setLoading(true);
      setReady(false);
      setError("");
      setEmbedded(null);
      setPayment(null);
      initializedRef.current = false;

      if (!bookingId) {
        throw new Error("Booking ID missing");
      }

      const { data } = await api.post("/payments/myfatoorah/embed-session", {
        bookingId,
        guestToken,
        localPaymentId: urlLocalPaymentId,
      });

      if (data?.alreadyPaid || data?.nextAction === "ALREADY_PAID") {
        const finalPaymentId = getLocalPaymentId(
          data?.payment,
          data?.embedded || data?.myfatoorah,
          urlLocalPaymentId,
        );

        redirectByStatus({
          status: "PAID",
          localPaymentId: finalPaymentId,
          finalBookingId: data?.bookingId || bookingId,
          guest: Boolean(data?.guest || guestToken),
          finalGuestToken: guestToken,
        });
        return;
      }

      const responseEmbedded = data?.embedded || data?.myfatoorah || null;

      if (!data?.success || !responseEmbedded?.sessionId) {
        throw new Error(data?.message || "Unable to create payment session");
      }

      const nextPayment = data.payment || null;

      const localPaymentId = getLocalPaymentId(
        nextPayment,
        responseEmbedded,
        urlLocalPaymentId,
      );

      if (!localPaymentId) {
        throw new Error("Local payment ID missing from payment session.");
      }

      const normalizedEmbedded = {
        ...responseEmbedded,
        localPaymentId,
        paymentId: localPaymentId,
      };

      setEmbedded(normalizedEmbedded);
      setPayment(nextPayment);

      await loadMyFatoorahScript(normalizedEmbedded.scriptUrl);

      if (!window.myfatoorah) {
        throw new Error("MyFatoorah object not found after loading script");
      }

      const container = document.getElementById(containerId);

      if (container) {
        container.innerHTML = "";
      }

      if (initializedRef.current) return;

      initializedRef.current = true;

      window.myfatoorah.init({
        sessionId: normalizedEmbedded.sessionId,
        containerId,
        shouldHandlePaymentUrl: true,

        callback: async function paymentCallback(response = {}) {
          console.log("MyFatoorah callback:", response);

          const paymentData = pickEncryptedPaymentData(response);
          const gatewayPaymentId = pickGatewayPaymentId(response);
          const gatewayInvoiceId = pickGatewayInvoiceId(response);
          const sessionId = pickSessionId(
            response,
            normalizedEmbedded.sessionId,
          );

          if (paymentData || isCompletedCallback(response)) {
            await verifyEmbeddedResult({
              localPaymentId,
              sessionId,
              paymentData,
              gatewayPaymentId,
              gatewayInvoiceId,
              rawPayload: response,
            });
            return;
          }

          if (response?.redirectionUrl || response?.RedirectionUrl) {
            window.location.href =
              response?.redirectionUrl || response?.RedirectionUrl;
            return;
          }

          if (gatewayPaymentId || gatewayInvoiceId) {
            await verifyEmbeddedResult({
              localPaymentId,
              sessionId,
              paymentData: "",
              gatewayPaymentId,
              gatewayInvoiceId,
              rawPayload: response,
            });
            return;
          }

          if (
            response?.isSuccess === false ||
            response?.IsSuccess === false ||
            response?.success === false ||
            response?.Success === false
          ) {
            setError(
              response?.message ||
                response?.Message ||
                response?.error ||
                response?.Error ||
                "Payment was not completed. Please try again.",
            );
            return;
          }

          setError(
            "Payment response was received, but no payment data was returned. Please try again or contact support.",
          );
        },
      });

      setReady(true);
    } catch (err) {
      console.error("MyFatoorah start failed:", err);
      setError(getAxiosMessage(err, "Unable to start payment"));
      setReady(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await startPayment();
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, guestToken, urlLocalPaymentId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]">
            <CreditCard size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Secure Payment
            </h1>
            <p className="text-sm text-slate-500">
              Complete your KidGage booking payment.
            </p>
          </div>
        </div>

        {payment ? (
          <div className="mb-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Amount</span>
              <strong className="text-lg text-slate-900">
                {getAmountLabel(payment, embedded)}
              </strong>
            </div>

            {payment.bookingNo ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Booking</span>
                <span className="text-sm font-semibold text-slate-700">
                  {payment.bookingNo}
                </span>
              </div>
            ) : null}

            {payment.paymentStatus ? (
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Status</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {payment.paymentStatus}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            <Loader2 className="animate-spin" size={18} />
            <span>Loading payment form...</span>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div
          id={containerId}
          className="min-h-[220px] rounded-2xl border border-slate-100 p-3"
        />

        {verifying ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            <Loader2 className="animate-spin" size={18} />
            <span>Verifying payment...</span>
          </div>
        ) : null}

        {!loading && !error && !verifying && ready ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            <span>Payment form is ready.</span>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={startPayment}
              disabled={retrying || loading || verifying}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 py-3 text-sm font-black text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry payment form
            </button>

            <button
              type="button"
              onClick={syncPaymentStatus}
              disabled={retrying || loading || verifying}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh payment status
            </button>
          </div>
        ) : null}

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={16} />
          <span>Payments are securely processed by MyFatoorah.</span>
        </div>
      </section>
    </main>
  );
}
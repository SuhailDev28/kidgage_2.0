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
    (boolTrue(payload.isSuccess) ||
      boolTrue(payload.IsSuccess) ||
      boolTrue(payload.success) ||
      boolTrue(payload.Success)) &&
    (boolTrue(payload.paymentCompleted) ||
      boolTrue(payload.PaymentCompleted) ||
      boolTrue(payload.completed) ||
      boolTrue(payload.Completed))
  );
}

function pickGatewayPaymentId(payload = {}) {
  return String(
    payload.paymentId ||
      payload.PaymentId ||
      payload.payment_id ||
      payload.transactionId ||
      payload.TransactionId ||
      payload.trackId ||
      payload.TrackId ||
      payload?.paymentData?.paymentId ||
      payload?.paymentData?.PaymentId ||
      payload?.Data?.PaymentId ||
      payload?.data?.PaymentId ||
      "",
  ).trim();
}

function pickGatewayInvoiceId(payload = {}) {
  return String(
    payload.invoiceId ||
      payload.InvoiceId ||
      payload.invoice_id ||
      payload?.paymentData?.invoiceId ||
      payload?.paymentData?.InvoiceId ||
      payload?.Data?.InvoiceId ||
      payload?.data?.InvoiceId ||
      "",
  ).trim();
}

function pickEncryptedPaymentData(payload = {}) {
  return String(
    payload.paymentData ||
      payload.PaymentData ||
      payload.encryptedPaymentData ||
      payload.EncryptedPaymentData ||
      payload?.Data?.paymentData ||
      payload?.Data?.PaymentData ||
      payload?.data?.paymentData ||
      payload?.data?.PaymentData ||
      "",
  ).trim();
}

function pickSessionId(payload = {}, fallback = "") {
  return String(
    payload.sessionId ||
      payload.SessionId ||
      payload.session_id ||
      payload?.Data?.SessionId ||
      payload?.data?.SessionId ||
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
    return buildResultUrl("/payment/pending", params);
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

function getPaymentId(payment, fallback = "") {
  return String(
    payment?._id ||
      payment?.id ||
      payment?.paymentId ||
      payment?.localPaymentId ||
      fallback ||
      "",
  ).trim();
}

function getAmountLabel(payment, embedded) {
  const amount = Number(payment?.amount || embedded?.amount || 0);
  const currency = payment?.currency || embedded?.currencyCode || "QAR";

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
    return (
      params.bookingId ||
      searchParams.get("bookingId") ||
      searchParams.get("booking_id") ||
      ""
    );
  }, [params.bookingId, searchParams]);

  const guestToken = useMemo(() => {
    return (
      searchParams.get("guestToken") ||
      searchParams.get("guestPaymentToken") ||
      searchParams.get("token") ||
      ""
    );
  }, [searchParams]);

  const urlPaymentId = useMemo(() => {
    return (
      searchParams.get("paymentId") ||
      searchParams.get("payment_id") ||
      searchParams.get("localPaymentId") ||
      ""
    );
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
    const safeGuestToken = String(finalGuestToken || guestToken || "").trim();

    if (normalized === "PAID") {
      navigate(
        buildBookingSuccessUrl(safeBookingId, {
          paymentId: localPaymentId,
          status: "PAID",
          guestToken: guest || safeGuestToken ? safeGuestToken : "",
          guest: guest || safeGuestToken ? "1" : "",
        }),
        { replace: true },
      );
      return;
    }

    if (normalized === "FAILED") {
      navigate(
        buildResultUrl("/payment/failed", {
          paymentId: localPaymentId,
          bookingId: safeBookingId,
          status: "FAILED",
          guestToken: guest || safeGuestToken ? safeGuestToken : "",
          guest: guest || safeGuestToken ? "1" : "",
        }),
        { replace: true },
      );
      return;
    }

    navigate(
      buildResultUrl("/payment/pending", {
        paymentId: localPaymentId,
        bookingId: safeBookingId,
        status: "PENDING",
        guestToken: guest || safeGuestToken ? safeGuestToken : "",
        guest: guest || safeGuestToken ? "1" : "",
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
    if (!localPaymentId) {
      setError("Local payment ID missing. Please contact support.");
      return;
    }

    if (verifyingRef.current) return;

    verifyingRef.current = true;
    setVerifying(true);
    setError("");

    try {
      const response = await api.post("/payments/myfatoorah/verify", {
        bookingId,
        guestToken,

        localPaymentId,
        paymentRecordId: localPaymentId,

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
        localPaymentId,
        finalBookingId,
        guest: isGuestPayment,
        finalGuestToken:
          data?.booking?.guestPaymentToken ||
          data?.guestToken ||
          data?.guestPaymentToken ||
          guestToken,
      });
    } catch (err) {
      console.error("MyFatoorah verify failed:", err);

      const message = getAxiosMessage(
        err,
        "Payment verification failed. Please refresh status or contact support.",
      );

      setError(message);

      navigate(
        buildResultUrl("/payment/pending", {
          paymentId: localPaymentId,
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
    const localPaymentId = getPaymentId(payment, urlPaymentId);

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

      const sessionUrl = `/payments/myfatoorah/session/${bookingId}`;
      const { data } = await api.get(sessionUrl, {
        params: {
          ...(guestToken ? { guestToken } : {}),
          ...(urlPaymentId ? { paymentId: urlPaymentId } : {}),
        },
      });

      if (data?.alreadyPaid || data?.nextAction === "ALREADY_PAID") {
        const finalPaymentId = getPaymentId(data?.payment, urlPaymentId);

        redirectByStatus({
          status: "PAID",
          localPaymentId: finalPaymentId,
          finalBookingId: data?.bookingId || bookingId,
          guest: Boolean(data?.guest || guestToken),
          finalGuestToken: guestToken,
        });
        return;
      }

      if (!data?.success || !data?.myfatoorah?.sessionId) {
        throw new Error(data?.message || "Unable to create payment session");
      }

      const nextEmbedded = data.myfatoorah;
      const nextPayment = data.payment;

      const localPaymentId =
        nextEmbedded.paymentId ||
        nextEmbedded.localPaymentId ||
        getPaymentId(nextPayment, urlPaymentId);

      const normalizedEmbedded = {
        ...nextEmbedded,
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

        callback: async function paymentCallback(response) {
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

          if (response?.redirectionUrl) {
            window.location.href = response.redirectionUrl;
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
  }, [bookingId, guestToken, urlPaymentId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#16A34A]">
            <CreditCard size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">Secure Payment</h1>
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
              disabled={retrying}
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
              disabled={retrying}
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

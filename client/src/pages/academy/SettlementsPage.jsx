// client/src/pages/academy/SettlementsPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { api } from "../../lib/api.js";

const BRAND = "#ec7a3b";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100) / 100;
}

function formatMoney(value, currency = "QAR") {
  const amount = toMoney(value, 0);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "QAR").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${String(currency || "QAR").toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeUpper(value, fallback = "N/A") {
  const text = String(value || fallback)
    .trim()
    .toUpperCase();

  return text || fallback;
}

function getSettlementId(item) {
  return String(item?._id || item?.id || "").trim();
}

function getPaymentId(item) {
  return String(item?._id || item?.id || "").trim();
}

function getSettlementStatus(item) {
  return normalizeUpper(
    item?.settlementStatus || item?.status || item?.paymentStatus,
    "READY",
  );
}

function getPaymentStatus(item) {
  return normalizeUpper(item?.paymentStatus || item?.status, "PENDING");
}

function getSettlementCurrency(item, fallback = "QAR") {
  return String(item?.currency || item?.settlementCurrency || fallback || "QAR")
    .trim()
    .toUpperCase();
}

function getPaymentCurrency(item, fallback = "QAR") {
  return String(item?.currency || fallback || "QAR")
    .trim()
    .toUpperCase();
}

function getSettlementGrossAmount(item) {
  return toMoney(
    item?.grossAmount ||
      item?.totalAmount ||
      item?.amount ||
      item?.paidAmount ||
      item?.meta?.grossAmount,
    0,
  );
}

function getSettlementCommissionAmount(item) {
  return toMoney(
    item?.kidgageCommissionAmount ||
      item?.commissionAmount ||
      item?.platformCommissionAmount ||
      item?.meta?.kidgageCommissionAmount,
    0,
  );
}

function getSettlementPayableAmount(item) {
  return toMoney(
    item?.academyPayableAmount ||
      item?.payableAmount ||
      item?.settlementAmount ||
      item?.netAmount ||
      item?.meta?.academyPayableAmount,
    0,
  );
}

function getPaymentGrossAmount(item) {
  return toMoney(item?.amount || item?.grossAmount || item?.totalAmount, 0);
}

function getPaymentCommissionAmount(item) {
  return toMoney(
    item?.kidgageCommissionAmount ||
      item?.commissionAmount ||
      item?.platformCommissionAmount,
    0,
  );
}

function getPaymentPayableAmount(item) {
  return toMoney(
    item?.academyPayableAmount ||
      item?.payableAmount ||
      item?.settlementAmount ||
      item?.netAmount,
    0,
  );
}

function statusClass(status) {
  const value = normalizeUpper(status);

  if (value === "PAID" || value === "SETTLED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "READY") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "CANCELLED" || value === "CANCELED" || value === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(
        status,
      )}`}
    >
      {normalizeUpper(status)}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, helper, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700"
        : tone === "purple"
          ? "bg-violet-50 text-violet-700"
          : tone === "orange"
            ? "bg-orange-50 text-orange-700"
            : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-500">{label}</div>
          <div className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
            {value}
          </div>
          {helper ? (
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {helper}
            </div>
          ) : null}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-[#ec7a3b]">
        <Landmark className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading settlement data...
      </div>

      <div className="mt-6 space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

function normalizeSummary(data) {
  const summary =
    data?.summary ||
    data?.settlementSummary ||
    data?.data?.summary ||
    data?.data ||
    data ||
    {};

  const currency = String(summary.currency || "QAR").toUpperCase();

  return {
    currency,
    readyAmount: toMoney(
      summary.readyAmount ||
        summary.readyForSettlementAmount ||
        summary.academyPayableReadyAmount ||
        summary.pendingSettlementAmount ||
        0,
      0,
    ),
    grossPaidAmount: toMoney(
      summary.grossPaidAmount ||
        summary.totalGrossAmount ||
        summary.totalPaidAmount ||
        summary.paidAmount ||
        0,
      0,
    ),
    commissionAmount: toMoney(
      summary.kidgageCommissionAmount ||
        summary.totalCommissionAmount ||
        summary.commissionAmount ||
        0,
      0,
    ),
    academyPayableAmount: toMoney(
      summary.academyPayableAmount ||
        summary.totalAcademyPayableAmount ||
        summary.payableAmount ||
        0,
      0,
    ),
    readyPaymentsCount: Number(
      summary.readyPaymentsCount || summary.readyCount || 0,
    ),
    paidSettlementsCount: Number(
      summary.paidSettlementsCount || summary.settlementsCount || 0,
    ),
  };
}

function normalizeSettlements(data) {
  return toArray(
    data?.settlements ||
      data?.items ||
      data?.data?.settlements ||
      data?.data?.items ||
      [],
  );
}

function normalizePayments(data) {
  return toArray(
    data?.payments || data?.items || data?.data?.payments || data?.data?.items,
  );
}

export default function AcademySettlementsPage() {
  const [summary, setSummary] = useState(() => normalizeSummary({}));
  const [settlements, setSettlements] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [tab, setTab] = useState("SETTLEMENTS");

  async function loadData({ soft = false } = {}) {
    try {
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [summaryRes, settlementsRes, paymentsRes] = await Promise.all([
        api.academySettlementSummary(),
        api.academySettlements({ limit: 100 }),
        api.academyPayments({ limit: 100, settlementStatus: "READY" }),
      ]);

      setSummary(normalizeSummary(summaryRes));
      setSettlements(normalizeSettlements(settlementsRes));
      setPayments(normalizePayments(paymentsRes));
    } catch (err) {
      setError(err?.message || "Failed to load settlement data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSettlements = useMemo(() => {
    const search = q.trim().toLowerCase();

    return settlements.filter((item) => {
      const itemStatus = getSettlementStatus(item);

      if (status !== "ALL" && itemStatus !== status) return false;

      if (!search) return true;

      const haystack = [
        item?.settlementNo,
        item?.referenceNo,
        item?.settlementReference,
        item?.bankReference,
        item?.notes,
        itemStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [settlements, q, status]);

  const filteredPayments = useMemo(() => {
    const search = q.trim().toLowerCase();

    return payments.filter((item) => {
      const itemStatus = normalizeUpper(
        item?.settlementStatus || item?.paymentStatus,
        "READY",
      );

      if (status !== "ALL" && itemStatus !== status) return false;

      if (!search) return true;

      const haystack = [
        item?.bookingNo,
        item?.paymentNo,
        item?.gatewayReference,
        item?.gatewayPaymentId,
        item?.parentName,
        item?.childName,
        item?.activityName,
        itemStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [payments, q, status]);

  const totalsFromReadyPayments = useMemo(() => {
    return filteredPayments.reduce(
      (acc, item) => {
        acc.gross += getPaymentGrossAmount(item);
        acc.commission += getPaymentCommissionAmount(item);
        acc.payable += getPaymentPayableAmount(item);
        return acc;
      },
      {
        gross: 0,
        commission: 0,
        payable: 0,
      },
    );
  }, [filteredPayments]);

  const currency = summary.currency || "QAR";

  return (
    <div className="min-h-[calc(100vh-88px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[32px] bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ec7a3b]/25 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-100">
                  <ShieldCheck className="h-4 w-4" />
                  KidGage Settlement
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Settlements
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Payments are collected by KidGage. Your academy receives the
                  payable settlement amount after KidGage commission deduction.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadData({ soft: true })}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Ready for Settlement"
            value={formatMoney(summary.readyAmount, currency)}
            helper={`${summary.readyPaymentsCount || 0} payment(s) ready`}
            tone="orange"
          />

          <StatCard
            icon={CreditCard}
            label="Gross Paid Amount"
            value={formatMoney(summary.grossPaidAmount, currency)}
            helper="Collected by KidGage"
            tone="blue"
          />

          <StatCard
            icon={ReceiptText}
            label="KidGage Commission"
            value={formatMoney(summary.commissionAmount, currency)}
            helper="Deducted from gross"
            tone="purple"
          />

          <StatCard
            icon={Landmark}
            label="Academy Payable"
            value={formatMoney(summary.academyPayableAmount, currency)}
            helper="Net amount for academy"
            tone="green"
          />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "SETTLEMENTS", label: "Settlement History" },
                { key: "READY_PAYMENTS", label: "Ready Payments" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                    tab === item.key
                      ? "bg-[#ec7a3b] text-white shadow-[0_12px_28px_rgba(236,122,59,0.28)]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search reference, booking, parent..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#ec7a3b] focus:bg-white"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#ec7a3b] focus:bg-white"
              >
                <option value="ALL">All statuses</option>
                <option value="READY">Ready</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingBlock />
          ) : tab === "SETTLEMENTS" ? (
            filteredSettlements.length ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-black text-slate-950">
                    Settlement History
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed and pending settlement batches from KidGage.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Reference</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Gross</th>
                        <th className="px-5 py-4">Commission</th>
                        <th className="px-5 py-4">Payable</th>
                        <th className="px-5 py-4">Payments</th>
                        <th className="px-5 py-4">Paid Date</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredSettlements.map((item) => {
                        const itemCurrency = getSettlementCurrency(
                          item,
                          currency,
                        );
                        const statusValue = getSettlementStatus(item);

                        return (
                          <tr
                            key={getSettlementId(item)}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="font-black text-slate-950">
                                {item?.settlementNo ||
                                  item?.referenceNo ||
                                  item?.settlementReference ||
                                  item?.bankReference ||
                                  "N/A"}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">
                                Created {formatDate(item?.createdAt)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={statusValue} />
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-700">
                              {formatMoney(
                                getSettlementGrossAmount(item),
                                itemCurrency,
                              )}
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-700">
                              {formatMoney(
                                getSettlementCommissionAmount(item),
                                itemCurrency,
                              )}
                            </td>

                            <td className="px-5 py-4 font-black text-emerald-700">
                              {formatMoney(
                                getSettlementPayableAmount(item),
                                itemCurrency,
                              )}
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-700">
                              {item?.paymentCount ||
                                item?.paymentsCount ||
                                toArray(item?.paymentIds).length ||
                                0}
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-700">
                                {formatDate(item?.paidAt || item?.settledAt)}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">
                                {item?.bankReference ||
                                  item?.settlementReference ||
                                  ""}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No settlements yet"
                message="Once KidGage settles payable amounts to your academy, settlement batches will appear here."
              />
            )
          ) : filteredPayments.length ? (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Ready Payments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Paid bookings collected by KidGage and ready for academy
                    settlement.
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700">
                  Ready payable:{" "}
                  {formatMoney(totalsFromReadyPayments.payable, currency)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full text-left">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Booking</th>
                      <th className="px-5 py-4">Parent / Child</th>
                      <th className="px-5 py-4">Activity</th>
                      <th className="px-5 py-4">Gross</th>
                      <th className="px-5 py-4">Commission</th>
                      <th className="px-5 py-4">Payable</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Paid At</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((item) => {
                      const itemCurrency = getPaymentCurrency(item, currency);
                      const settlementStatus = normalizeUpper(
                        item?.settlementStatus,
                        "READY",
                      );

                      return (
                        <tr
                          key={getPaymentId(item)}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-950">
                              {item?.bookingNo ||
                                item?.bookingId?.bookingNo ||
                                item?.referenceNo ||
                                "N/A"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">
                              {item?.gatewayReference ||
                                item?.gatewayPaymentId ||
                                item?._id}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">
                              {item?.parentName ||
                                item?.parentId?.fullName ||
                                item?.parentId?.name ||
                                "Parent"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">
                              {item?.childName ||
                                item?.childId?.fullName ||
                                item?.childId?.name ||
                                "Child"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">
                              {item?.activityName ||
                                item?.activityId?.title ||
                                item?.activityId?.name ||
                                "Activity"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-400">
                              {item?.packageName ||
                                item?.packageId?.title ||
                                "Package"}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-700">
                            {formatMoney(
                              getPaymentGrossAmount(item),
                              itemCurrency,
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold text-slate-700">
                            {formatMoney(
                              getPaymentCommissionAmount(item),
                              itemCurrency,
                            )}
                          </td>

                          <td className="px-5 py-4 font-black text-emerald-700">
                            {formatMoney(
                              getPaymentPayableAmount(item),
                              itemCurrency,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={settlementStatus} />
                            <div className="mt-1 text-xs font-bold text-slate-400">
                              Payment: {getPaymentStatus(item)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-700">
                              {formatDateTime(item?.paidAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No ready payments"
              message="When parents pay KidGage and settlement is ready, those payments will appear here for your academy."
            />
          )}
        </div>

        <div className="mt-6 rounded-[28px] border border-orange-100 bg-orange-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ec7a3b]">
              <Banknote className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-950">
                Settlement goes through KidGage
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Parents and guests pay KidGage first. KidGage deducts the
                configured commission, then transfers the academy payable amount
                to your academy. This page is read-only for academy users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

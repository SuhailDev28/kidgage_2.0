// client/src/pages/public/TermsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { publicApi } from "../../lib/api.js";

const DEFAULT_CONTENT = {
  title: "Terms & Conditions",
  excerpt:
    "These terms govern the use of KidGage by parents, guardians, academies, activity providers, and administrators using the platform.",
  content: `1. Acceptance of Terms

By accessing or using KidGage, you agree to comply with these terms and any related policies published on the platform.

2. Platform Services

KidGage provides a platform for discovering academies, viewing activities, checking availability, making bookings, and managing related account information.

We may update, improve, suspend, or remove features at any time to maintain service quality and security.

3. User Accounts

Users are responsible for maintaining accurate profile information and protecting login credentials.

You are responsible for activity conducted through your account unless unauthorized access is reported promptly.

4. Bookings and Payments

Booking availability is subject to academy schedules, slot capacity, and provider rules.

Payment terms, refund rules, cancellation policies, and rescheduling conditions may vary by academy or activity provider.

5. Provider Responsibilities

Activity providers and academies must ensure that published content, pricing, schedules, and operational details are accurate and kept up to date.

6. Acceptable Use

Users may not misuse the platform, interfere with security, submit misleading data, or attempt unauthorized access to accounts, systems, or protected content.

7. Intellectual Property

KidGage branding, interface elements, platform design, and related content remain the property of KidGage unless otherwise stated.

8. Limitation of Liability

KidGage acts as a technology platform. Activity delivery, service quality, safety practices, and on-site operations remain the responsibility of the academy or provider offering the activity.

9. Updates to These Terms

We may revise these terms from time to time. Continued use of the platform after updates means you accept the revised terms.

10. Contact

For questions regarding these terms, please use the contact page on the platform.`,
};

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function splitContent(content = "") {
  const text = String(content || "").trim();

  if (!text) return [];

  const parts = text
    .split(/\n(?=\d+\.\s+)/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length ? parts : [text];
}

function parseSection(block = "", index = 0) {
  const lines = String(block || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const firstLine = lines[0] || `Section ${index + 1}`;
  const hasNumberedTitle = /^\d+\.\s+/.test(firstLine);

  return {
    title: hasNumberedTitle ? firstLine : `Section ${index + 1}`,
    paragraphs: hasNumberedTitle ? lines.slice(1) : lines,
  };
}

function normalizePagePayload(data) {
  const contentPage =
    data?.page ||
    data?.contentPage ||
    data?.data?.page ||
    data?.data?.contentPage ||
    data?.data ||
    null;

  if (!contentPage) return null;

  return {
    title: contentPage.title || DEFAULT_CONTENT.title,
    excerpt: contentPage.excerpt || DEFAULT_CONTENT.excerpt,
    content: contentPage.content || DEFAULT_CONTENT.content,
    updatedAt: contentPage.updatedAt || contentPage.publishedAt || null,
  };
}

function Section({ title, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
        {title}
      </h2>

      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  const [page, setPage] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTerms() {
    try {
      setLoading(true);
      setError("");

      let data = null;

      try {
        const res = await publicApi.get("/content-pages/terms-and-conditions");
        data = res.data;
      } catch {
        const res = await publicApi.get("/legal/terms-conditions");
        data = res.data;
      }

      const contentPage = normalizePagePayload(data);

      if (contentPage) {
        setPage(contentPage);
      } else {
        setPage(DEFAULT_CONTENT);
      }
    } catch (err) {
      setPage(DEFAULT_CONTENT);
      setError(
        err?.response?.data?.message ||
          "Showing default terms because dynamic content is not available.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTerms();
  }, []);

  const sections = useMemo(() => {
    return splitContent(page.content).map(parseSection);
  }, [page.content]);

  return (
    <section className="container-main py-8 sm:py-10 md:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ec7a3b]">
                <FileText className="h-3.5 w-3.5" />
                Legal
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                {page.title || "Terms & Conditions"}
              </h1>

              {page.updatedAt ? (
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Last updated: {formatDate(page.updatedAt)}
                </p>
              ) : null}

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {page.excerpt || DEFAULT_CONTENT.excerpt}
              </p>
            </div>

            <button
              type="button"
              onClick={loadTerms}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-[24px] bg-slate-100"
              />
            ))}
          </div>
        ) : sections.length ? (
          sections.map((section, index) => (
            <Section key={`${section.title}-${index}`} title={section.title}>
              {section.paragraphs.length ? (
                section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{paragraph}</p>
                ))
              ) : (
                <p>No content available.</p>
              )}
            </Section>
          ))
        ) : (
          <Section title="Terms & Conditions">
            <p>No content available.</p>
          </Section>
        )}
      </div>
    </section>
  );
}

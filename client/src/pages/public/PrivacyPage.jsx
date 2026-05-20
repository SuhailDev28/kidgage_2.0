// client/src/pages/public/PrivacyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { publicApi } from "../../lib/api.js";

const DEFAULT_CONTENT = {
  title: "Privacy Policy",
  excerpt:
    "This policy explains how KidGage collects, uses, stores, and protects personal information across parent, academy, and admin accounts.",
  content: `1. Information We Collect

We may collect names, email addresses, phone numbers, account credentials, child-related booking information, academy details, and transaction-related information.

2. How We Use Information

We use information to provide bookings, manage accounts, process transactions, communicate updates, improve platform services, and maintain security and compliance.

3. Provider and Booking Data

Information submitted by academies and providers may be used to display listings, manage campaigns, process onboarding, and support operations within the platform.

4. Sharing of Data

We only share relevant data with academies, providers, payment processors, technical service partners, or legal authorities when necessary to deliver services or comply with applicable law.

5. Data Security

We use reasonable technical and administrative safeguards to protect personal information against unauthorized access, loss, or misuse.

6. Data Retention

We retain information only as long as necessary for operational, contractual, accounting, support, or legal purposes.

7. User Rights

Users may request access, correction, or deletion of personal information, subject to legal, contractual, or operational requirements.

8. Cookies and Analytics

KidGage may use cookies, analytics, and essential technical data to improve functionality, performance, and user experience.

9. Changes to This Policy

This privacy policy may be updated from time to time. Continued use of the platform after changes indicates acceptance of the revised policy.

10. Contact

For privacy-related questions or requests, please use the contact page on the platform.`,
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

export default function PrivacyPage() {
  const [page, setPage] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPrivacy() {
    try {
      setLoading(true);
      setError("");

      let data = null;

      try {
        const res = await publicApi.get("/content-pages/privacy-policy");
        data = res.data;
      } catch {
        const res = await publicApi.get("/legal/privacy-policy");
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
          "Showing default privacy policy because dynamic content is not available.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrivacy();
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
                {page.title || "Privacy Policy"}
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
              onClick={loadPrivacy}
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
          <Section title="Privacy Policy">
            <p>No content available.</p>
          </Section>
        )}
      </div>
    </section>
  );
}

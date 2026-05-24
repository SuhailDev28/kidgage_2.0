import React, { useMemo, useState } from "react";
import { api } from "../../lib/api.js";

const BRAND_PRIMARY = "#ec7a3b";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isReady = useMemo(() => {
    return (
      form.name.trim().length >= 2 &&
      isValidEmail(form.email) &&
      form.subject.trim().length >= 2 &&
      form.message.trim().length >= 5
    );
  }, [form]);

  function updateField(name, value) {
    setSubmitted(false);
    setError("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isReady || submitting) {
      setError("Please fill all fields with valid details.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitted(false);
      setError("");

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      };

      await api.post("/public/contact", payload);

      setSubmitted(true);

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unable to send your message right now. Please try again.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#fff8f1] py-10 sm:py-14 md:py-16">
      <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-[#ffd84d]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-[#ec7a3b]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#6557f5]/10 blur-3xl" />

      <div className="container-main relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ec7a3b]/20 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ec7a3b] shadow-sm">
            <span className="text-base">👋</span>
            Contact KidGage
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
            We are here to help
            <span className="block text-[#ec7a3b]">parents & academies</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Questions about bookings, academy onboarding, activities, campaigns,
            or parent support? Send us a message and the KidGage team will get
            back to you.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200/70">
              <div className="relative bg-gradient-to-br from-[#ec7a3b] via-[#f58a4a] to-[#ffd84d] p-7 text-white sm:p-8">
                <div className="absolute right-6 top-5 text-5xl opacity-30">
                  🎈
                </div>
                <div className="absolute bottom-5 right-20 text-4xl opacity-30">
                  ⭐
                </div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
                  Let&apos;s talk
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Get in touch with KidGage
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-white/90">
                  We support parents, academies, activity providers, and
                  businesses who want to connect with families through KidGage.
                </p>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <ContactInfoCard
                  icon="✉️"
                  title="Email"
                  value="support@kidgage.com"
                  description="For support, bookings, and general questions"
                />

                <ContactInfoCard
                  icon="🏫"
                  title="Academy onboarding"
                  value="List your academy"
                  description="Add your activities, schedules, slots, and packages"
                />

                <ContactInfoCard
                  icon="👨‍👩‍👧"
                  title="Parent support"
                  value="Bookings & account help"
                  description="Help with children profiles, bookings, and activity issues"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <MiniStat value="Fast" label="Response" icon="⚡" />
              <MiniStat value="Qatar" label="Focused" icon="📍" />
              <MiniStat value="Kids" label="First" icon="🧒" />
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7 md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ec7a3b]">
                  Send message
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  How can we help?
                </h2>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff3e8] text-2xl">
                💬
              </div>
            </div>

            {submitted ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Your message has been received. We will get back to you soon.
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Your name">
                  <input
                    className="kidgage-input"
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </Field>

                <Field label="Your email">
                  <input
                    type="email"
                    className="kidgage-input"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Subject">
                <input
                  className="kidgage-input"
                  placeholder="Booking help, academy onboarding, support..."
                  value={form.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                />
              </Field>

              <Field label="Message">
                <textarea
                  className="kidgage-input min-h-[170px] resize-none py-4"
                  placeholder="Tell us more about your request..."
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                />
              </Field>

              <div className="rounded-2xl bg-[#fff8f1] p-4 text-sm leading-6 text-slate-600">
                <span className="font-bold text-slate-900">Tip:</span> For
                booking support, include the academy name, activity name, and
                booking reference if available.
              </div>

              <button
                type="submit"
                disabled={!isReady || submitting}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ec7a3b] px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#d9682f] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                {submitting ? "Sending..." : "Submit message"}
                <span className="transition group-hover:translate-x-1">
                  {submitting ? "⏳" : "→"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .kidgage-input {
          width: 100%;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0 16px;
          min-height: 56px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }

        .kidgage-input::placeholder {
          color: #94a3b8;
        }

        .kidgage-input:focus {
          border-color: ${BRAND_PRIMARY};
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(236, 122, 59, 0.14);
        }
      `}</style>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">
        {label}
      </span>
      {children}
    </label>
  );
}

function ContactInfoCard({ icon, title, value, description }) {
  return (
    <div className="flex gap-4 rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
        {icon}
      </div>

      <div>
        <div className="text-xs font-black uppercase tracking-wide text-slate-400">
          {title}
        </div>
        <div className="mt-1 text-base font-black text-slate-950">{value}</div>
        <div className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label, icon }) {
  return (
    <div className="rounded-[22px] bg-white p-4 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}

import React, { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="container-main py-8 sm:py-10 md:py-12">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sage">
            Contact
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Need help with bookings, academy onboarding, campaigns, or platform
            support? Send us a message and our team will get back to you.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-[20px] bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                support@kidgage.com
              </div>
            </div>

            <div className="rounded-[20px] bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Business
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                Academy onboarding & campaigns
              </div>
            </div>

            <div className="rounded-[20px] bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Support
              </div>
              <div className="mt-1 text-base font-bold text-slate-900">
                Parent accounts, bookings, and activity issues
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Send a message
          </h2>

          {submitted ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Your message has been received.
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <input
              className="input-base"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />

            <input
              type="email"
              className="input-base"
              placeholder="Your email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />

            <input
              className="input-base"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
            />

            <textarea
              className="textarea-base min-h-[160px]"
              placeholder="Message"
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
            />

            <button type="submit" className="btn-sage w-full sm:w-auto">
              Submit
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  Search,
  WifiOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function KidgageFallbackPage({ type = "404", title, message }) {
  const navigate = useNavigate();

  const isServerDown = type === "server";

  const displayTitle =
    title ||
    (isServerDown
      ? "Oops! The KidGage server is taking a juice break."
      : "Oops! This page ran away to activity class.");

  const displayMessage =
    message ||
    (isServerDown
      ? "Our little booking engine is not responding right now. Please refresh in a moment."
      : "We searched the playground, the classroom, and even under the tiny chairs — but this page is missing.");

  return (
    <main className="min-h-screen bg-[#fff7e8] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[36px] border border-orange-100 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -left-12 top-12 h-28 w-28 rounded-[32px] bg-[#ffd84d]" />
          <div className="pointer-events-none absolute right-[-18px] top-[-18px] h-36 w-36 rounded-[38px] bg-[#7c5cff]" />
          <div className="pointer-events-none absolute bottom-[-20px] right-[22%] h-24 w-24 rounded-full bg-[#ff7a3d]" />
          <div className="pointer-events-none absolute bottom-10 left-[42%] h-12 w-12 rounded-full border-[4px] border-[#ffd84d]" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ff7a3d] ring-1 ring-orange-100">
                {isServerDown ? (
                  <WifiOff className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                KidGage Alert
              </div>

              <h1 className="mt-6 text-[72px] font-black leading-none tracking-tight text-[#ff7a3d] sm:text-[96px] lg:text-[120px]">
                {isServerDown ? "500" : "404"}
              </h1>

              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {displayTitle}
              </h2>

              <p className="mt-5 max-w-xl text-base font-medium leading-8 text-slate-500 sm:text-lg">
                {displayMessage}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </button>

                <Link
                  to="/"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ff7a3d] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,122,61,0.24)] transition hover:bg-[#ec6f35]"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>

              <div className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7c5cff] shadow-sm">
                    <Search className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Parent tip
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Try checking Activities, Academies, Events, or refresh the
                      page. The missing page might just be late for karate
                      class.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -left-4 top-8 h-32 w-32 rounded-[36px] bg-[#ffd84d]" />
              <div className="absolute -right-4 bottom-6 h-36 w-36 rounded-[38px] bg-[#7c5cff]" />

              <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-white via-orange-50 to-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.14)] sm:p-8">
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-full bg-white shadow-inner sm:h-80 sm:w-80">
                  <div className="relative">
                    <div className="text-[120px] sm:text-[160px]">🧒</div>

                    <div className="absolute -right-8 top-2 rotate-12 rounded-2xl bg-[#ff7a3d] px-4 py-2 text-sm font-black text-white shadow-lg">
                      Lost?
                    </div>

                    <div className="absolute -bottom-3 -left-8 -rotate-6 rounded-2xl bg-[#7c5cff] px-4 py-2 text-sm font-black text-white shadow-lg">
                      Not me!
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[26px] bg-white p-5 text-center shadow-sm">
                  <div className="text-2xl font-black text-slate-900">
                    KidGage Explorer
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    “I clicked one button and the page went for swimming class.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

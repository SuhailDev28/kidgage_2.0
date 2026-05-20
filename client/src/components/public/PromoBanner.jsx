import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  CalendarDays,
  School,
  Shapes,
} from "lucide-react";

function StatCard({ icon, label, value, tint = "blue" }) {
  const tintMap = {
    blue: "bg-[#eef5ff] text-[#1877f2]",
    orange: "bg-[#fff4ec] text-[#ff7a3d]",
    purple: "bg-[#f3eeff] text-[#7c5cff]",
    yellow: "bg-[#fff9dc] text-[#d8a800]",
  };

  return (
    <div className="rounded-[24px] bg-white/20 p-4 backdrop-blur-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          tintMap[tint] || tintMap.blue
        }`}
      >
        {icon}
      </div>

      <div className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/80">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

export function PromoBanner() {
  return (
    <section className="container-main mt-10">
      <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#ffcf48] via-[#ffb347] to-[#ff7a3d] px-6 py-8 shadow-sm md:px-8 md:py-10">
        <div className="absolute -left-8 top-10 h-20 w-20 rounded-[26px] bg-white/20" />
        <div className="absolute right-[-8px] top-[-10px] h-28 w-28 rounded-[34px] bg-[#7c5cff]" />
        <div className="absolute bottom-[-14px] left-[46%] h-16 w-16 rounded-full bg-[#5c42ea]" />
        <div className="absolute bottom-8 right-12 h-10 w-10 rounded-full border-4 border-white/40" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Featured campaign
            </div>

            <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl">
              Free Holiday Fun
            </h2>

            <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/95 sm:text-base md:text-lg">
              Fun activities, camps, workshops and experiences for kids across
              trusted academies and learning centers on KidGage.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/activities"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#ff7a3d] shadow-[0_12px_24px_rgba(255,255,255,0.18)] transition hover:bg-white/90"
              >
                Explore Activities
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/events"
                className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                View Events
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<Shapes className="h-5 w-5" />}
                label="Activities"
                value="20+"
                tint="blue"
              />
              <StatCard
                icon={<School className="h-5 w-5" />}
                label="Academies"
                value="Multi"
                tint="purple"
              />
              <StatCard
                icon={<Sparkles className="h-5 w-5" />}
                label="Ages"
                value="3–16"
                tint="yellow"
              />
              <StatCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Booking"
                value="Easy"
                tint="orange"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

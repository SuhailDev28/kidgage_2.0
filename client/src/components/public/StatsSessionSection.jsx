import React from "react";
import {
  Presentation,
  MonitorPlay,
  BarChart3,
  Smartphone,
  MoveRight,
} from "lucide-react";

const defaultStats = [
  {
    value: "563+",
    label: "Experts Instructors",
    icon: Presentation,
  },
  {
    value: "6539+",
    label: "Class Completed",
    icon: MonitorPlay,
  },
  {
    value: "34+",
    label: "Year of Experience",
    icon: BarChart3,
  },
  {
    value: "6632+",
    label: "Students Enroll",
    icon: Smartphone,
  },
];

const defaultSessions = [
  { title: "Early Drop Off", time: "8.00am - 10.00am" },
  { title: "Morning", time: "10.30am - 12.00am" },
  { title: "Lunch", time: "12pm - 1.00pm" },
  { title: "Afternoon", time: "2.00pm - 4.00pm" },
];

function SectionStatCard({ item, showDivider = false }) {
  const Icon = item.icon;

  return (
    <div className="relative flex flex-col items-center justify-center px-6 py-6 text-center text-white">
      {showDivider ? (
        <div className="absolute left-0 top-1/2 hidden h-36 -translate-y-1/2 border-l border-white/30 xl:block" />
      ) : null}

      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
        <Icon className="h-8 w-8 text-white" strokeWidth={1.8} />
      </div>

      <div className="text-5xl font-black tracking-tight">{item.value}</div>
      <div className="mt-2 text-lg font-semibold text-white/90">
        {item.label}
      </div>
    </div>
  );
}

function SessionRow({ title, time }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-full bg-white px-6 py-5 text-[#111827] shadow-sm">
      <div className="text-xl font-bold">{title}</div>
      <div className="text-xl font-black">{time}</div>
    </div>
  );
}

export function StatsSessionSection({
  stats = defaultStats,
  sessions = defaultSessions,
}) {
  return (
    <section className="relative mt-16 overflow-hidden bg-[#6756e8] pt-24">
      <div className="absolute left-0 top-0 h-16 w-full bg-[#f8f8f8]" />
      <div className="absolute left-0 top-10 h-24 w-full rounded-b-[48%] bg-[#6756e8]" />

      <div className="pointer-events-none absolute left-0 top-36 hidden xl:block">
        <svg width="160" height="260" viewBox="0 0 160 260" fill="none">
          <path
            d="M60 20C60 20 20 40 20 40L52 56"
            stroke="#ffe45e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
          />
          <path
            d="M58 55C30 86 26 122 42 148C60 177 58 214 30 246"
            stroke="#ffe45e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 8"
          />
          <path
            d="M20 40L66 18L54 65"
            fill="#ffe600"
            stroke="#ffe600"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="pointer-events-none absolute right-10 top-8 hidden xl:block text-[92px]">
        ☀️
      </div>

      <div className="container-main relative z-10">
        <div className="grid gap-8 pb-16 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <SectionStatCard
              key={`${item.label}-${index}`}
              item={item}
              showDivider={index !== 0}
            />
          ))}
        </div>

        <div className="relative translate-y-16 rounded-[36px] bg-[#ffe600] px-6 py-8 shadow-[0_30px_60px_rgba(17,24,39,0.16)] md:px-10 md:py-12">
          <div className="grid items-center gap-10 xl:grid-cols-[1fr_1.15fr]">
            <div className="xl:pr-10">
              <div className="inline-flex rounded-full bg-[#6b5cff] px-5 py-2 text-sm font-bold text-white shadow-sm">
                Session Times
              </div>

              <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight text-[#0b1020] md:text-6xl">
                Our Session Times
              </h2>

              <div className="mt-3 h-3 w-64 rounded-full bg-[#ff7a3d]" />

              <p className="mt-8 max-w-xl text-2xl leading-10 text-[#334155]">
                Choose the most convenient timing for children to learn, play,
                and grow through structured daily activities.
              </p>
            </div>

            <div className="relative xl:border-l xl:border-dashed xl:border-[#111827]/25 xl:pl-12">
              <div className="space-y-4">
                {sessions.map((item, index) => (
                  <SessionRow
                    key={`${item.title}-${index}`}
                    title={item.title}
                    time={item.time}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-28 bg-[#f8f8f8]" />
    </section>
  );
}

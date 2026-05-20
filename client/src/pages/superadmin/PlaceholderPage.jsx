import React from "react";
import { useLocation } from "react-router-dom";

export default function PlaceholderPage() {
  const location = useLocation();

  return (
    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-black text-slate-900">
        {location.pathname.replace("/super-admin/", "").replaceAll("-", " ")}
      </h2>
      <p className="mt-3 text-slate-500">Coming Soon !</p>
    </div>
  );
}

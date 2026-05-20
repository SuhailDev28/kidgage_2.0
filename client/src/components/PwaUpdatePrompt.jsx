// client/src/components/PwaUpdatePrompt.jsx
import React, { useEffect, useState } from "react";

export default function PwaUpdatePrompt() {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,

      onOfflineReady() {
        setOfflineReady(true);
      },

      onNeedRefresh() {
        setNeedRefresh(true);
      },

      onRegistered(registration) {
        if (!registration) return;

        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      },
    });

    setUpdateSW(() => updateServiceWorker);
  }, []);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[99999] mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
      role="status"
    >
      <div className="mb-1 text-base font-black text-slate-950">
        {offlineReady ? "KidGage is ready offline" : "New KidGage update"}
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-500">
        {offlineReady
          ? "KidGage can now load faster and use cached pages when the connection is weak."
          : "A newer version of KidGage is available. Refresh to load the latest version."}
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
        >
          Later
        </button>

        {needRefresh && (
          <button
            type="button"
            onClick={() => updateSW?.(true)}
            className="rounded-full bg-[#AEC4A0] px-4 py-2 text-sm font-black text-slate-950"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

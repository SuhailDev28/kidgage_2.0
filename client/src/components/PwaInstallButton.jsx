// client/src/components/PwaInstallButton.jsx
import React, { useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true
  );
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setMessage("");
    }

    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setMessage("");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      setMessage("Install will be available after the PWA is ready.");
      window.setTimeout(() => setMessage(""), 3500);
      return;
    }

    try {
      await deferredPrompt.prompt();

      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult?.outcome === "accepted") {
        setDeferredPrompt(null);
        setInstalled(true);
      } else {
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("PWA install failed:", error);
      setMessage("Install prompt failed. Please refresh and try again.");
      window.setTimeout(() => setMessage(""), 3500);
    }
  }

  if (installed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[99998]">
      {message ? (
        <div className="mb-2 max-w-[260px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-5 text-slate-700 shadow-xl">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center justify-center rounded-full bg-[#AEC4A0] px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:brightness-95 active:scale-[0.98]"
      >
        Install App
      </button>
    </div>
  );
}
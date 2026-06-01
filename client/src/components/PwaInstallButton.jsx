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
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    }

    function handleInstalled() {
      setInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
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
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();

      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult?.outcome === "accepted") {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("PWA install failed:", error);
    }
  }

  if (installed || !canInstall || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99998]">
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
// client/src/components/PwaInstallButton.jsx
import React, { useEffect, useMemo, useState } from "react";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    setInstalled(isStandalone());

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    }

    function onInstalled() {
      setInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (ios || !deferredPrompt) {
      setShowHelp(true);
      return;
    }

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);
  }

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="fixed bottom-4 right-4 z-[99998] rounded-full bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-2xl"
      >
        {canInstall ? "Install App" : "How to Install"}
      </button>

      {showHelp ? (
        <div className="fixed inset-x-4 bottom-20 z-[99999] mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="text-base font-black text-slate-950">
            Install KidGage
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Open Chrome menu ⋮ and tap <b>Add to Home screen</b> or{" "}
            <b>Install app</b>.
          </p>

          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="mt-4 rounded-full bg-[#ff7a3d] px-4 py-2 text-sm font-black text-white"
          >
            OK
          </button>
        </div>
      ) : null}
    </>
  );
}

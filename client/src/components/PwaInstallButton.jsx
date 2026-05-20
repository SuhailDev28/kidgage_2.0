import React, { useEffect, useMemo, useState } from "react";

function isIos() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();

  return /iphone|ipad|ipod/.test(userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [debugReady, setDebugReady] = useState(false);

  const iosDevice = useMemo(() => isIos(), []);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
      setDebugReady(true);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = window.setTimeout(() => {
      setDebugReady(true);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (iosDevice) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      alert(
        "Install prompt is not available yet. Open DevTools → Application and check Manifest + Service Worker.",
      );
      return;
    }

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice?.outcome === "accepted") {
      setCanInstall(false);
    }

    setDeferredPrompt(null);
  }

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={installApp}
        className="fixed bottom-4 right-4 z-[99998] rounded-full bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:brightness-95"
      >
        {canInstall
          ? "Install App"
          : debugReady
            ? "Install App"
            : "Preparing..."}
      </button>

      {showIosHelp ? (
        <div className="fixed inset-x-4 bottom-20 z-[99999] mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="text-base font-black text-slate-950">
            Install KidGage on iPhone
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tap the Share button in Safari, then choose “Add to Home Screen”.
          </p>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="mt-4 rounded-full bg-[#ff7a3d] px-4 py-2 text-sm font-black text-white"
          >
            Got it
          </button>
        </div>
      ) : null}
    </>
  );
}

// client/src/components/PwaInstallButton.jsx
import React, { useEffect, useState } from "react";

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    function checkInstalled() {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

      setIsInstalled(standalone);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    }

    checkInstalled();

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice?.outcome === "accepted") {
      setCanInstall(false);
    }

    setDeferredPrompt(null);
  }

  if (isInstalled || !canInstall) return null;

  return (
    <button
      type="button"
      onClick={installApp}
      className="fixed bottom-4 right-4 z-[99998] rounded-full bg-[#ff7a3d] px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:brightness-95"
    >
      Install App
    </button>
  );
}

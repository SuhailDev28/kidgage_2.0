// client/src/components/PwaInstallButton.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Info,
  MonitorSmartphone,
  X,
} from "lucide-react";
import { usePwaMode } from "../hooks/usePwaMode.js";

function isIosDevice() {
  if (typeof window === "undefined") return false;

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

function isAndroidDevice() {
  if (typeof window === "undefined") return false;

  return /android/i.test(window.navigator.userAgent || "");
}

function getInstalledFlag() {
  try {
    return localStorage.getItem("kidgage_pwa_installed") === "true";
  } catch {
    return false;
  }
}

function setInstalledFlag(value = true) {
  try {
    localStorage.setItem("kidgage_pwa_installed", value ? "true" : "false");
  } catch {
    // ignore localStorage errors
  }
}

export default function PwaInstallButton({
  compact = false,
  className = "",
  showInstalledMessage = true,
}) {
  const isPwaMode = usePwaMode();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isPwaMode || getInstalledFlag());
  const [dismissed, setDismissed] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);
  const isAndroid = useMemo(() => isAndroidDevice(), []);

  useEffect(() => {
    if (isPwaMode) {
      setInstalled(true);
      setInstalledFlag(true);
    }
  }, [isPwaMode]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();

      setDeferredPrompt(event);
      setInstalled(false);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setInstalled(true);
      setInstalledFlag(true);
      setMessageOpen(true);

      window.setTimeout(() => {
        setMessageOpen(false);
      }, 3500);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (installed || isPwaMode) {
      setMessageOpen(true);
      return;
    }

    if (!deferredPrompt) {
      setMessageOpen(true);
      return;
    }

    try {
      await deferredPrompt.prompt();

      const choice = await deferredPrompt.userChoice;

      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setInstalledFlag(true);
      }

      setDeferredPrompt(null);
    } catch {
      setMessageOpen(true);
    }
  }

  if (dismissed) return null;

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleInstallClick}
          className={[
            "inline-flex h-11 w-11 items-center justify-center rounded-2xl transition active:scale-95",
            installed || isPwaMode
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              : "bg-orange-50 text-orange-600 hover:bg-orange-100",
          ].join(" ")}
          title={installed || isPwaMode ? "KidGage is already installed" : "Install KidGage app"}
          aria-label={installed || isPwaMode ? "KidGage is already installed" : "Install KidGage app"}
        >
          {installed || isPwaMode ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </button>

        {messageOpen ? (
          <div className="absolute right-0 top-14 z-[100] w-[260px] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  installed || isPwaMode
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-orange-50 text-orange-600",
                ].join(" ")}
              >
                {installed || isPwaMode ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Info className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">
                  {installed || isPwaMode
                    ? "App already installed"
                    : "Install option not ready"}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {installed || isPwaMode
                    ? "You are already using KidGage as an installed app."
                    : isIos
                      ? "On iPhone, tap Share, then choose Add to Home Screen."
                      : "Install will appear when the browser confirms PWA support."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={[
          "rounded-[24px] border bg-white p-4 shadow-sm",
          installed || isPwaMode
            ? "border-emerald-200"
            : "border-orange-200",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              installed || isPwaMode
                ? "bg-emerald-50 text-emerald-600"
                : "bg-orange-50 text-orange-600",
            ].join(" ")}
          >
            {installed || isPwaMode ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <MonitorSmartphone className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-950">
              {installed || isPwaMode
                ? "KidGage app is already installed"
                : "Install KidGage App"}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {installed || isPwaMode
                ? "You can continue using KidGage like a real mobile app from your home screen."
                : isIos
                  ? "For iPhone, tap Share in Safari and choose Add to Home Screen."
                  : isAndroid
                    ? "Install KidGage for faster access, app-like navigation, and full-screen PWA experience."
                    : "Install KidGage for a faster app-like experience."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installed || isPwaMode}
                className={[
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition active:scale-[0.98] disabled:cursor-default",
                  installed || isPwaMode
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-orange-500 text-white hover:bg-orange-600",
                ].join(" ")}
              >
                {installed || isPwaMode ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Already installed
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install App
                  </>
                )}
              </button>

              {showInstalledMessage && !installed && !isPwaMode && !deferredPrompt ? (
                <span className="text-xs font-semibold text-slate-400">
                  Install appears when PWA is ready
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss install message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
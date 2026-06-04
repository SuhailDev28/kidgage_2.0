// client/src/hooks/usePwaMode.js

import { useEffect, useState } from "react";

function getIsPwaMode() {
  if (typeof window === "undefined") return false;

  const isStandaloneDisplay = Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches,
  );

  const isFullscreenDisplay = Boolean(
    window.matchMedia?.("(display-mode: fullscreen)")?.matches,
  );

  const isMinimalUiDisplay = Boolean(
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches,
  );

  const isIosStandalone = window.navigator?.standalone === true;

  return Boolean(
    isStandaloneDisplay ||
      isFullscreenDisplay ||
      isMinimalUiDisplay ||
      isIosStandalone,
  );
}

export function usePwaMode() {
  const [isPwaMode, setIsPwaMode] = useState(() => getIsPwaMode());

  useEffect(() => {
    function updateMode() {
      setIsPwaMode(getIsPwaMode());
    }

    const queries = [
      window.matchMedia?.("(display-mode: standalone)"),
      window.matchMedia?.("(display-mode: fullscreen)"),
      window.matchMedia?.("(display-mode: minimal-ui)"),
    ].filter(Boolean);

    updateMode();

    queries.forEach((query) => {
      query.addEventListener?.("change", updateMode);
      query.addListener?.(updateMode);
    });

    window.addEventListener("focus", updateMode);
    window.addEventListener("pageshow", updateMode);
    window.addEventListener("visibilitychange", updateMode);

    return () => {
      queries.forEach((query) => {
        query.removeEventListener?.("change", updateMode);
        query.removeListener?.(updateMode);
      });

      window.removeEventListener("focus", updateMode);
      window.removeEventListener("pageshow", updateMode);
      window.removeEventListener("visibilitychange", updateMode);
    };
  }, []);

  return isPwaMode;
}
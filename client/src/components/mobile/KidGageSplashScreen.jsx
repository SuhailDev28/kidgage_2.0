// client/src/components/pwa/KidGageSplashScreen.jsx

import React, { useEffect, useState } from "react";

export default function KidGageSplashScreen({
  show = true,
  logo = "",
  siteName = "KidGage",
  duration = 2300,
  onFinish,
}) {
  const [visible, setVisible] = useState(show);
  const [leaving, setLeaving] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (!show) {
      setLeaving(true);

      const hideTimer = window.setTimeout(() => {
        setVisible(false);
      }, 460);

      return () => window.clearTimeout(hideTimer);
    }

    setVisible(true);
    setLeaving(false);

    const timer = window.setTimeout(() => {
      setLeaving(true);

      const finishTimer = window.setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 480);

      return () => window.clearTimeout(finishTimer);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [show, duration, onFinish]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logo]);

  if (!visible) return null;

  return (
    <div
      className={`kg-netflix-splash ${
        leaving ? "kg-netflix-splash--leaving" : ""
      }`}
      role="status"
      aria-label={`Loading ${siteName || "KidGage"}`}
    >
      <div className="kg-netflix-splash-glow kg-netflix-splash-glow-one" />
      <div className="kg-netflix-splash-glow kg-netflix-splash-glow-two" />

      <div className="kg-netflix-splash-logo-stage">
        <div className="kg-netflix-splash-logo-pulse" />

        {logo && !logoFailed ? (
          <img
            src={logo}
            alt={siteName || "KidGage"}
            className="kg-netflix-splash-logo-img"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="kg-netflix-splash-fallback">
            <div className="kg-netflix-splash-mark">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="kg-netflix-splash-wordmark">
              <div className="kg-netflix-splash-word-top">kid</div>
              <div className="kg-netflix-splash-word-bottom">gage</div>
            </div>
          </div>
        )}
      </div>

      <div className="kg-netflix-splash-loader" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
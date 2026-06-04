// client/src/components/pwa/KidGageSplashScreen.jsx

import React, { useEffect, useState } from "react";

const DEFAULT_LOGO_TEXT = "KidGage";

export default function KidGageSplashScreen({
  show = true,
  logo = "",
  siteName = DEFAULT_LOGO_TEXT,
  duration = 1800,
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
      }, 350);

      return () => window.clearTimeout(hideTimer);
    }

    setVisible(true);
    setLeaving(false);

    const timer = window.setTimeout(() => {
      setLeaving(true);

      const finishTimer = window.setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 380);

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
      className={[
        "kg-splash-screen",
        leaving ? "kg-splash-screen--leaving" : "",
      ].join(" ")}
      role="status"
      aria-label="Loading KidGage"
    >
      <div className="kg-splash-bg kg-splash-bg-one" />
      <div className="kg-splash-bg kg-splash-bg-two" />
      <div className="kg-splash-bg kg-splash-bg-three" />

      <div className="kg-splash-shape kg-splash-star kg-splash-star-one">
        ✦
      </div>
      <div className="kg-splash-shape kg-splash-star kg-splash-star-two">
        ✦
      </div>
      <div className="kg-splash-shape kg-splash-star kg-splash-star-three">
        ✦
      </div>

      <div className="kg-splash-doodle kg-splash-doodle-one" />
      <div className="kg-splash-doodle kg-splash-doodle-two" />

      <div className="kg-splash-content">
        <div className="kg-splash-logo-wrap">
          {logo && !logoFailed ? (
            <img
              src={logo}
              alt={siteName || "KidGage"}
              className="kg-splash-logo-img"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="kg-splash-logo-fallback">
              <div className="kg-splash-mark">
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="kg-splash-wordmark">
                <div className="kg-splash-wordmark-top">
                  kid
                  <span className="kg-splash-wordmark-star">✦</span>
                </div>
                <div className="kg-splash-wordmark-bottom">gage</div>
              </div>

              <div className="kg-splash-tagline">
                <span>play</span>
                <span>parents</span>
                <span>progress</span>
              </div>
            </div>
          )}
        </div>

        <div className="kg-splash-subtitle">
          Kids Activity Booking
        </div>
      </div>

      <div className="kg-splash-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
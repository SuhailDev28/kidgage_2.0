import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { usePublicSettings } from "../../context/PublicSettingsProvider.jsx";

function normalizeImage(value, version = "") {
  if (!value) return "";

  const raw = String(value).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  let finalUrl = "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    finalUrl = raw;
  } else if (raw.startsWith("/")) {
    finalUrl = `${base}${raw}`;
  } else if (raw.startsWith("uploads/")) {
    finalUrl = `${base}/${raw}`;
  } else {
    finalUrl = `${base}/uploads/settings/${raw}`;
  }

  if (!version) return finalUrl;
  return `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "#";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function normalizeWhatsApp(value) {
  const raw = String(value || "")
    .replace(/[^\d+]/g, "")
    .trim();

  if (!raw) return "#";

  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

function hexToRgba(hex, alpha = 1) {
  const value = String(hex || "")
    .replace("#", "")
    .trim();

  if (value.length !== 6) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  if ([r, g, b].some((v) => Number.isNaN(v))) {
    return `rgba(37, 99, 235, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function BrandMark({
  logo = "",
  siteName = "KidGage",
  version = "",
  primaryColor = "#2563eb",
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoSrc = normalizeImage(logo, version);

  useEffect(() => {
    setImageFailed(false);
  }, [logo, version]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-[rgba(15,23,42,0.06)]">
        {logoSrc && !imageFailed ? (
          <img
            src={logoSrc}
            alt={siteName}
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {String(siteName || "K")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}
      </div>

      <div className="text-[28px] font-black tracking-tight text-[#0f172a]">
        {siteName}
      </div>
    </div>
  );
}

function SocialIcon({ label, bgColor, textColor }) {
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-black transition hover:scale-[1.04]"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {label}
    </span>
  );
}

export function Footer() {
  const { settings } = usePublicSettings();

  const siteName = settings?.siteName || "KidGage";
  const logo = settings?.logo || "";
  const version = settings?.logoUpdatedAt || settings?.updatedAt || "";
  const primaryColor = settings?.primaryColor || "#2563eb";
  const secondaryColor = settings?.secondaryColor || "#6d28d9";
  const footerDescription =
    settings?.footerDescription ||
    settings?.footerText ||
    "Book activities for kids across trusted academies and help parents discover enriching experiences with confidence, clarity, and joy.";
  const footerCopyright =
    settings?.footerCopyright || "© KidGage. All rights reserved.";
  const website = settings?.website || "";
  const whatsapp = settings?.whatsapp || "";
  const instagram = settings?.instagram || "";
  const allowProviderRegistration = settings?.allowProviderRegistration ?? true;

  const websiteHref = useMemo(() => normalizeUrl(website), [website]);
  const whatsappHref = useMemo(() => normalizeWhatsApp(whatsapp), [whatsapp]);
  const instagramHref = useMemo(() => normalizeUrl(instagram), [instagram]);

  const primarySoft = useMemo(
    () => hexToRgba(primaryColor, 0.16),
    [primaryColor],
  );

  const secondarySoft = useMemo(
    () => hexToRgba(secondaryColor, 0.16),
    [secondaryColor],
  );

  const panelBg = useMemo(() => {
    return `linear-gradient(135deg, ${hexToRgba(
      primaryColor,
      0.08,
    )} 0%, ${hexToRgba(secondaryColor, 0.12)} 100%)`;
  }, [primaryColor, secondaryColor]);

  return (
    <footer className="mt-16 pb-8 pt-10 sm:pt-12 lg:pt-14">
      <div className="container-main">
        <div
          className="relative overflow-hidden rounded-[34px] px-5 py-7 shadow-sm md:px-8 md:py-8"
          style={{ background: panelBg }}
        >
          <div
            className="absolute -left-8 bottom-10 h-24 w-24 rounded-[28px]"
            style={{ backgroundColor: primarySoft }}
          />
          <div
            className="absolute right-[-18px] top-[-12px] h-28 w-28 rounded-[30px]"
            style={{ backgroundColor: secondarySoft }}
          />
          <div
            className="absolute bottom-[-10px] right-[20%] h-20 w-20 rounded-full"
            style={{ backgroundColor: hexToRgba(primaryColor, 0.22) }}
          />

          <div className="relative">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-[460px] text-center lg:text-left">
                <BrandMark
                  logo={logo}
                  siteName={siteName}
                  version={version}
                  primaryColor={primaryColor}
                />

                <p className="mt-4 text-sm leading-7 text-[#5b6474]">
                  {footerDescription}
                </p>
              </div>

              <div className="flex flex-col gap-4 lg:max-w-[480px] lg:flex-row lg:items-center">
                <div className="rounded-[20px] bg-white px-5 py-4 text-center text-sm font-medium text-[#475569] shadow-sm">
                  Looking to advertise an activity or join the KidGage network?
                </div>

                {allowProviderRegistration ? (
                  <Link
                    to="/provider-joining-form"
                    className="inline-flex items-center justify-center rounded-full px-6 py-4 text-center text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    List your academy
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="mt-8 grid gap-6 border-t border-[rgba(15,23,42,0.08)] pt-6 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex flex-col gap-3 md:gap-2">
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-[#64748b] md:justify-start">
                  <Link to="/terms" className="transition hover:text-[#0f172a]">
                    Terms & conditions
                  </Link>
                  <Link
                    to="/privacy"
                    className="transition hover:text-[#0f172a]"
                  >
                    Privacy policy
                  </Link>
                  <Link
                    to="/contact"
                    className="transition hover:text-[#0f172a]"
                  >
                    Contact
                  </Link>
                </div>

                <div className="text-center text-xs text-[#94a3b8] md:text-left">
                  {footerCopyright}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 md:justify-end">
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Website"
                >
                  <SocialIcon
                    label="W"
                    bgColor={primarySoft}
                    textColor={primaryColor}
                  />
                </a>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                >
                  <SocialIcon
                    label="WA"
                    bgColor={secondarySoft}
                    textColor={secondaryColor}
                  />
                </a>

                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <SocialIcon
                    label="IG"
                    bgColor={primarySoft}
                    textColor={primaryColor}
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

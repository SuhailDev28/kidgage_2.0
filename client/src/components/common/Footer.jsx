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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.25c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.28-1.39a9.86 9.86 0 0 0 4.76 1.21h.01c5.46 0 9.91-4.44 9.91-9.9C21.96 6.45 17.51 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 0 1-1.25-4.36c0-4.53 3.69-8.22 8.23-8.22 2.19 0 4.25.85 5.8 2.4a8.16 8.16 0 0 1 2.41 5.82c0 4.53-3.68 8.23-8.21 8.23Zm4.51-6.16c-.25-.13-1.47-.73-1.7-.81-.23-.09-.4-.13-.56.12-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.1 20.45H3.53V9H7.1v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
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
            {String(siteName || "K").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="text-[28px] font-black tracking-tight text-[#0f172a]">
        {siteName}
      </div>
    </div>
  );
}

function SocialIcon({ icon, bgColor, textColor }) {
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-[1.06] hover:shadow-md"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {icon}
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

  const facebook = settings?.facebook || "";
  const whatsapp = settings?.whatsapp || "";
  const instagram = settings?.instagram || "";
  const linkedin = settings?.linkedin || "";

  const allowProviderRegistration = settings?.allowProviderRegistration ?? true;

  const facebookHref = useMemo(() => normalizeUrl(facebook), [facebook]);
  const whatsappHref = useMemo(() => normalizeWhatsApp(whatsapp), [whatsapp]);
  const instagramHref = useMemo(() => normalizeUrl(instagram), [instagram]);
  const linkedinHref = useMemo(() => normalizeUrl(linkedin), [linkedin]);

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
                  href={facebookHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <SocialIcon
                    icon={<FacebookIcon />}
                    bgColor={primarySoft}
                    textColor={primaryColor}
                  />
                </a>

                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <SocialIcon
                    icon={<InstagramIcon />}
                    bgColor={secondarySoft}
                    textColor={secondaryColor}
                  />
                </a>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                >
                  <SocialIcon
                    icon={<WhatsAppIcon />}
                    bgColor={primarySoft}
                    textColor={primaryColor}
                  />
                </a>

                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                >
                  <SocialIcon
                    icon={<LinkedinIcon />}
                    bgColor={secondarySoft}
                    textColor={secondaryColor}
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
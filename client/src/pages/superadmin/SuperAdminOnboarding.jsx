// client/src/pages/superadmin/SuperAdminOnboarding.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Image,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";

const FALLBACK_PRIMARY = "#ec7a3b";
const FALLBACK_SECONDARY = "#ffd84d";
const DARK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "rgba(15, 23, 42, 0.1)";
const STORAGE_KEY = "kidgage_super_admin_onboarding";

const STEPS = [
  {
    id: "branding",
    title: "Setup KidGage Branding",
    description:
      "Upload logo, favicon, brand colors, social links, and platform identity.",
    icon: Image,
    route: "/super-admin/settings",
    action: "Open Settings",
    priority: "Essential",
  },
  {
    id: "categories",
    title: "Create Activity Categories",
    description:
      "Add categories like Sports, Arts, Robotics, Swimming, Music, and more.",
    icon: Layers3,
    route: "/super-admin/categories",
    action: "Manage Categories",
    priority: "Essential",
  },
  {
    id: "academies",
    title: "Register First Academy",
    description:
      "Add your first academy/provider and prepare it for activities and bookings.",
    icon: Building2,
    route: "/super-admin/academies",
    action: "Add Academy",
    priority: "Essential",
  },
  {
    id: "activities",
    title: "Review Activities",
    description:
      "Check uploaded activities, academy listings, visibility, pricing, and details.",
    icon: BadgeCheck,
    route: "/super-admin/activities",
    action: "View Activities",
    priority: "Essential",
  },
  {
    id: "bookings",
    title: "Check Booking Flow",
    description:
      "Verify parent booking journey, child selection, package slots, and confirmations.",
    icon: Rocket,
    route: "/super-admin/bookings",
    action: "View Bookings",
    priority: "Important",
  },
  {
    id: "payments",
    title: "Connect Payments",
    description:
      "Review MyFatoorah/payment settings and confirm payment status tracking.",
    icon: CreditCard,
    route: "/super-admin/payments",
    action: "Check Payments",
    priority: "Important",
  },
  {
    id: "content",
    title: "Publish Content Pages",
    description:
      "Update Terms, Privacy Policy, Contact, landing content, banners, blogs, and events.",
    icon: FileText,
    route: "/super-admin/content-pages",
    action: "Edit Pages",
    priority: "Important",
  },
  {
    id: "parents",
    title: "Monitor Parents & Children",
    description:
      "Review parent accounts, children profiles, booking history, and account health.",
    icon: Users,
    route: "/super-admin/parents",
    action: "View Parents",
    priority: "Optional",
  },
];

function isValidHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
}

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim();
  return isValidHex(raw) ? raw : fallback;
}

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }

  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  return { r: 236, g: 122, b: 59 };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darken(hex, amount = 0.32) {
  const { r, g, b } = hexToRgb(hex);

  const nextR = Math.max(0, Math.round(r * (1 - amount)));
  const nextG = Math.max(0, Math.round(g * (1 - amount)));
  const nextB = Math.max(0, Math.round(b * (1 - amount)));

  return `rgb(${nextR}, ${nextG}, ${nextB})`;
}

function readSavedProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore localStorage errors
  }
}

function useBrandSettings() {
  const [brand, setBrand] = useState({
    siteName: "KidGage",
    primaryColor: FALLBACK_PRIMARY,
    secondaryColor: FALLBACK_SECONDARY,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadBrand() {
      try {
        const { data } = await api.get("/super-admin/settings");
        const row = data?.settings || data || {};

        const primaryColor = normalizeHex(row.primaryColor, FALLBACK_PRIMARY);
        const secondaryColor = normalizeHex(
          row.secondaryColor,
          FALLBACK_SECONDARY,
        );

        if (!active) return;

        setBrand({
          siteName: row.siteName || "KidGage",
          primaryColor,
          secondaryColor,
          loading: false,
        });
      } catch {
        if (!active) return;

        setBrand({
          siteName: "KidGage",
          primaryColor: FALLBACK_PRIMARY,
          secondaryColor: FALLBACK_SECONDARY,
          loading: false,
        });
      }
    }

    loadBrand();

    return () => {
      active = false;
    };
  }, []);

  return brand;
}

export default function SuperAdminOnboarding() {
  const navigate = useNavigate();
  const brand = useBrandSettings();

  const primary = brand.primaryColor;
  const secondary = brand.secondaryColor;
  const primaryDark = darken(primary, 0.38);
  const softPrimary = rgba(primary, 0.1);

  const [completed, setCompleted] = useState(() => readSavedProgress());
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}_hidden`) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    saveProgress(completed);
  }, [completed]);

  const completedCount = useMemo(
    () => STEPS.filter((step) => completed[step.id]).length,
    [completed],
  );

  const progress = Math.round((completedCount / STEPS.length) * 100);

  const nextStep = useMemo(
    () => STEPS.find((step) => !completed[step.id]),
    [completed],
  );

  const styles = useMemo(
    () =>
      createStyles({
        primary,
        secondary,
        primaryDark,
        softPrimary,
      }),
    [primary, secondary, primaryDark, softPrimary],
  );

  function toggleStep(stepId) {
    setCompleted((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  }

  function resetProgress() {
    setCompleted({});
    setHidden(false);

    try {
      localStorage.removeItem(`${STORAGE_KEY}_hidden`);
    } catch {
      // ignore
    }
  }

  function finishOnboarding() {
    setHidden(true);

    try {
      localStorage.setItem(`${STORAGE_KEY}_hidden`, "true");
    } catch {
      // ignore
    }
  }

  if (hidden) {
    return (
      <main style={styles.page}>
        <section style={styles.finishedPanel}>
          <div style={styles.finishedIcon}>
            <CheckCircle2 size={34} />
          </div>

          <h1 style={styles.finishedTitle}>Onboarding Completed</h1>

          <p style={styles.finishedText}>
            Your Super Admin setup checklist is marked as completed. You can
            reopen or reset it anytime.
          </p>

          <div style={styles.finishedActions}>
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={() => navigate("/super-admin/dashboard")}
            >
              Go to Dashboard
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              style={styles.secondaryLightBtn}
              onClick={resetProgress}
            >
              Reset Onboarding
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroGlowOne} />
        <div style={styles.heroGlowTwo} />

        <div style={styles.heroContent}>
          <div style={styles.badge}>
            <Sparkles size={16} />
            {brand.loading
              ? "Loading Brand Setup"
              : `${brand.siteName} Super Admin Setup`}
          </div>

          <h1 style={styles.title}>Launch {brand.siteName} with confidence</h1>

          <p style={styles.subtitle}>
            Complete these platform setup steps before going live with
            academies, parents, activities, bookings, payments, and public
            content.
          </p>

          <div style={styles.heroActions}>
            {nextStep ? (
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={() => navigate(nextStep.route)}
              >
                Continue: {nextStep.title}
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                style={styles.primaryBtn}
                onClick={finishOnboarding}
              >
                Finish Onboarding
                <CheckCircle2 size={18} />
              </button>
            )}

            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={resetProgress}
            >
              Reset Progress
            </button>
          </div>
        </div>

        <div style={styles.progressCard}>
          <div style={styles.progressIcon}>
            <Rocket size={30} />
          </div>

          <div style={styles.progressValue}>{progress}%</div>

          <div style={styles.progressLabel}>
            {completedCount} of {STEPS.length} steps completed
          </div>

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          <div style={styles.statusBox}>
            <ShieldCheck size={18} />
            {progress === 100
              ? `${brand.siteName} setup is ready for launch.`
              : "Complete the essential setup before launch."}
          </div>
        </div>
      </section>

      <section style={styles.grid}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isDone = !!completed[step.id];

          return (
            <article
              key={step.id}
              style={{
                ...styles.card,
                borderColor: isDone ? rgba(primary, 0.4) : BORDER,
                background: isDone
                  ? `linear-gradient(135deg, #ffffff, ${rgba(primary, 0.09)})`
                  : "#ffffff",
              }}
            >
              <div style={styles.cardTop}>
                <div
                  style={{
                    ...styles.iconBox,
                    background: isDone ? primary : softPrimary,
                    color: isDone ? "#ffffff" : primary,
                  }}
                >
                  <Icon size={22} />
                </div>

                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  style={{
                    ...styles.doneBtn,
                    background: isDone ? primary : rgba(primary, 0.08),
                    color: isDone ? "#ffffff" : primary,
                    borderColor: isDone ? primary : rgba(primary, 0.24),
                  }}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={16} />
                      Done
                    </>
                  ) : (
                    "Mark Done"
                  )}
                </button>
              </div>

              <div style={styles.stepNumber}>Step {index + 1}</div>

              <h2 style={styles.cardTitle}>{step.title}</h2>

              <p style={styles.cardText}>{step.description}</p>

              <div style={styles.cardFooter}>
                <span
                  style={{
                    ...styles.priority,
                    background:
                      step.priority === "Essential"
                        ? rgba(primary, 0.12)
                        : "rgba(15, 23, 42, 0.06)",
                    color: step.priority === "Essential" ? primary : MUTED,
                  }}
                >
                  {step.priority}
                </span>

                <button
                  type="button"
                  style={styles.linkBtn}
                  onClick={() => navigate(step.route)}
                >
                  {step.action}
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section style={styles.bottomPanel}>
        <div>
          <h3 style={styles.bottomTitle}>Recommended launch order</h3>

          <p style={styles.bottomText}>
            Branding → Categories → Academies → Activities → Booking Flow →
            Payments → Content Pages → Parent Monitoring.
          </p>
        </div>

        <button
          type="button"
          style={styles.darkBtn}
          onClick={() => navigate("/super-admin/dashboard")}
        >
          Go to Dashboard
          <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
}

function createStyles({ primary, secondary, primaryDark, softPrimary }) {
  return {
    page: {
      minHeight: "100vh",
      background: `radial-gradient(circle at top left, ${rgba(
        primary,
        0.18,
      )}, transparent 32%), #fffaf5`,
      padding: "24px",
      color: DARK,
    },

    hero: {
      position: "relative",
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 340px",
      gap: "22px",
      padding: "28px",
      borderRadius: "28px",
      background: `linear-gradient(135deg, ${primaryDark}, ${primary} 52%, ${secondary})`,
      color: "#ffffff",
      boxShadow: `0 24px 70px ${rgba(primary, 0.26)}`,
    },

    heroGlowOne: {
      position: "absolute",
      width: "360px",
      height: "360px",
      right: "-120px",
      top: "-120px",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.22)",
      filter: "blur(4px)",
    },

    heroGlowTwo: {
      position: "absolute",
      width: "220px",
      height: "220px",
      left: "38%",
      bottom: "-120px",
      borderRadius: "999px",
      background: rgba(secondary, 0.32),
      filter: "blur(8px)",
    },

    heroContent: {
      position: "relative",
      zIndex: 1,
      maxWidth: "760px",
    },

    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "9px 13px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.26)",
      fontWeight: 900,
      fontSize: "13px",
    },

    title: {
      margin: "18px 0 10px",
      fontSize: "clamp(30px, 5vw, 54px)",
      lineHeight: 1.02,
      letterSpacing: "-0.05em",
      fontWeight: 950,
    },

    subtitle: {
      margin: 0,
      maxWidth: "680px",
      color: "rgba(255,255,255,0.9)",
      fontSize: "16px",
      lineHeight: 1.7,
      fontWeight: 650,
    },

    heroActions: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginTop: "24px",
    },

    primaryBtn: {
      border: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "9px",
      padding: "13px 18px",
      borderRadius: "16px",
      background: "#ffffff",
      color: primaryDark,
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
    },

    secondaryBtn: {
      border: "1px solid rgba(255,255,255,0.35)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "13px 18px",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.13)",
      color: "#ffffff",
      fontWeight: 900,
      cursor: "pointer",
    },

    secondaryLightBtn: {
      border: `1px solid ${rgba(primary, 0.3)}`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "13px 18px",
      borderRadius: "16px",
      background: rgba(primary, 0.08),
      color: primary,
      fontWeight: 900,
      cursor: "pointer",
    },

    progressCard: {
      position: "relative",
      zIndex: 1,
      padding: "22px",
      borderRadius: "24px",
      background: "rgba(255,255,255,0.16)",
      border: "1px solid rgba(255,255,255,0.28)",
      backdropFilter: "blur(16px)",
      alignSelf: "stretch",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },

    progressIcon: {
      width: "58px",
      height: "58px",
      display: "grid",
      placeItems: "center",
      borderRadius: "20px",
      background: "rgba(255,255,255,0.2)",
      marginBottom: "18px",
    },

    progressValue: {
      fontSize: "52px",
      lineHeight: 1,
      fontWeight: 950,
      letterSpacing: "-0.06em",
    },

    progressLabel: {
      marginTop: "8px",
      color: "rgba(255,255,255,0.84)",
      fontWeight: 850,
    },

    progressBar: {
      height: "11px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.26)",
      overflow: "hidden",
      marginTop: "20px",
    },

    progressFill: {
      height: "100%",
      borderRadius: "999px",
      background: "#ffffff",
      transition: "width 260ms ease",
    },

    statusBox: {
      marginTop: "18px",
      display: "flex",
      alignItems: "center",
      gap: "9px",
      padding: "12px",
      borderRadius: "16px",
      background: "rgba(255,255,255,0.14)",
      color: "rgba(255,255,255,0.92)",
      fontWeight: 850,
      fontSize: "13px",
    },

    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: "18px",
      marginTop: "22px",
    },

    card: {
      padding: "20px",
      borderRadius: "24px",
      border: `1px solid ${BORDER}`,
      boxShadow: `0 16px 42px ${rgba(primary, 0.07)}`,
      transition: "180ms ease",
    },

    cardTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "18px",
    },

    iconBox: {
      width: "48px",
      height: "48px",
      display: "grid",
      placeItems: "center",
      borderRadius: "17px",
    },

    doneBtn: {
      border: `1px solid ${BORDER}`,
      borderRadius: "999px",
      padding: "8px 11px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "12px",
      fontWeight: 950,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },

    stepNumber: {
      color: primary,
      fontSize: "12px",
      fontWeight: 950,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "8px",
    },

    cardTitle: {
      margin: 0,
      fontSize: "20px",
      letterSpacing: "-0.03em",
      fontWeight: 950,
    },

    cardText: {
      margin: "9px 0 18px",
      color: MUTED,
      fontWeight: 650,
      lineHeight: 1.6,
      fontSize: "14px",
    },

    cardFooter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginTop: "auto",
    },

    priority: {
      padding: "7px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 950,
      whiteSpace: "nowrap",
    },

    linkBtn: {
      border: 0,
      background: "transparent",
      color: primary,
      fontWeight: 950,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: 0,
      whiteSpace: "nowrap",
    },

    bottomPanel: {
      marginTop: "22px",
      padding: "20px",
      borderRadius: "24px",
      border: `1px solid ${BORDER}`,
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      boxShadow: `0 16px 42px ${rgba(primary, 0.06)}`,
    },

    bottomTitle: {
      margin: 0,
      fontSize: "19px",
      fontWeight: 950,
      letterSpacing: "-0.03em",
    },

    bottomText: {
      margin: "6px 0 0",
      color: MUTED,
      fontWeight: 650,
      lineHeight: 1.55,
    },

    darkBtn: {
      border: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "13px 16px",
      borderRadius: "16px",
      background: DARK,
      color: "#ffffff",
      fontWeight: 950,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },

    finishedPanel: {
      minHeight: "calc(100vh - 48px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "32px",
      borderRadius: "28px",
      background: `linear-gradient(135deg, ${rgba(primary, 0.12)}, ${rgba(
        secondary,
        0.2,
      )}), #ffffff`,
      border: `1px solid ${BORDER}`,
      boxShadow: `0 20px 60px ${rgba(primary, 0.08)}`,
    },

    finishedIcon: {
      width: "76px",
      height: "76px",
      borderRadius: "26px",
      display: "grid",
      placeItems: "center",
      color: "#ffffff",
      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
      boxShadow: `0 18px 38px ${rgba(primary, 0.25)}`,
    },

    finishedTitle: {
      margin: "20px 0 8px",
      fontSize: "clamp(28px, 4vw, 44px)",
      lineHeight: 1.05,
      letterSpacing: "-0.05em",
      fontWeight: 950,
      color: DARK,
    },

    finishedText: {
      margin: 0,
      maxWidth: "560px",
      color: MUTED,
      lineHeight: 1.7,
      fontWeight: 650,
    },

    finishedActions: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "12px",
      marginTop: "24px",
    },
  };
}
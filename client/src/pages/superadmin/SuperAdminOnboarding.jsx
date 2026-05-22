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
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const GREEN = "#16a34a";
const DARK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "rgba(15, 23, 42, 0.1)";
const SOFT_GREEN = "rgba(22, 163, 74, 0.09)";
const STORAGE_KEY = "kidgage_super_admin_onboarding";

const STEPS = [
  {
    id: "branding",
    title: "Setup App Branding",
    description: "Upload logo, favicon, colors, social links, and public site identity.",
    icon: Image,
    route: "/super-admin/settings",
    action: "Open Settings",
    priority: "Essential",
  },
  {
    id: "categories",
    title: "Create Activity Categories",
    description: "Add categories like Sports, Arts, Robotics, Swimming, and more.",
    icon: Layers3,
    route: "/super-admin/categories",
    action: "Manage Categories",
    priority: "Essential",
  },
  {
    id: "packages",
    title: "Configure Packages",
    description: "Create academy subscription plans, children limits, pricing, and features.",
    icon: BadgeCheck,
    route: "/super-admin/packages",
    action: "Setup Packages",
    priority: "Essential",
  },
  {
    id: "academies",
    title: "Register First Academy",
    description: "Add your first academy and connect it to a package.",
    icon: Building2,
    route: "/super-admin/academies",
    action: "Add Academy",
    priority: "Essential",
  },
  {
    id: "payments",
    title: "Connect Payments",
    description: "Review MyFatoorah/payment settings and confirm payment flow.",
    icon: CreditCard,
    route: "/super-admin/payments",
    action: "Check Payments",
    priority: "Important",
  },
  {
    id: "content",
    title: "Publish Content Pages",
    description: "Update About, Terms, Privacy Policy, Contact, and landing page content.",
    icon: FileText,
    route: "/super-admin/content-pages",
    action: "Edit Pages",
    priority: "Important",
  },
  {
    id: "admins",
    title: "Invite Admin Users",
    description: "Create users for academy owners, managers, or internal staff.",
    icon: Users,
    route: "/super-admin/users",
    action: "Manage Users",
    priority: "Optional",
  },
];

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

export default function SuperAdminOnboarding() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(() => readSavedProgress());
  const [hidden, setHidden] = useState(false);

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

  function toggleStep(stepId) {
    setCompleted((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  }

  function resetProgress() {
    setCompleted({});
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
    return null;
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroGlow} />

        <div style={styles.heroContent}>
          <div style={styles.badge}>
            <Sparkles size={16} />
            Super Admin Setup
          </div>

          <h1 style={styles.title}>Welcome to KidGage Control Center</h1>

          <p style={styles.subtitle}>
            Complete these setup steps to launch the platform properly for
            academies, parents, bookings, payments, and public content.
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

            <button type="button" style={styles.secondaryBtn} onClick={resetProgress}>
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
              ? "Your Super Admin setup is ready."
              : "Complete essential steps before going live."}
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
                borderColor: isDone ? "rgba(22, 163, 74, 0.38)" : BORDER,
                background: isDone
                  ? "linear-gradient(135deg, #ffffff, rgba(22,163,74,0.08))"
                  : "#ffffff",
              }}
            >
              <div style={styles.cardTop}>
                <div
                  style={{
                    ...styles.iconBox,
                    background: isDone ? GREEN : SOFT_GREEN,
                    color: isDone ? "#ffffff" : GREEN,
                  }}
                >
                  <Icon size={22} />
                </div>

                <button
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  style={{
                    ...styles.doneBtn,
                    background: isDone ? GREEN : "#f8fafc",
                    color: isDone ? "#ffffff" : MUTED,
                    borderColor: isDone ? GREEN : BORDER,
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
                        ? "rgba(22, 163, 74, 0.1)"
                        : "rgba(15, 23, 42, 0.06)",
                    color: step.priority === "Essential" ? GREEN : MUTED,
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
            Branding → Categories → Packages → Academy Registration → Payments →
            Content Pages → Admin Users.
          </p>
        </div>

        <button type="button" style={styles.darkBtn} onClick={() => navigate("/super-admin")}>
          Go to Dashboard
          <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(22,163,74,0.16), transparent 32%), #f8fafc",
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
    background: "linear-gradient(135deg, #052e16, #064e3b 48%, #16a34a)",
    color: "#ffffff",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.2)",
  },

  heroGlow: {
    position: "absolute",
    width: "360px",
    height: "360px",
    right: "-120px",
    top: "-120px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.14)",
    filter: "blur(4px)",
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
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.22)",
    fontWeight: 800,
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
    maxWidth: "660px",
    color: "rgba(255,255,255,0.82)",
    fontSize: "16px",
    lineHeight: 1.7,
    fontWeight: 600,
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
    color: "#065f46",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
  },

  secondaryBtn: {
    border: "1px solid rgba(255,255,255,0.28)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 18px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.1)",
    color: "#ffffff",
    fontWeight: 850,
    cursor: "pointer",
  },

  progressCard: {
    position: "relative",
    zIndex: 1,
    padding: "22px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.22)",
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
    background: "rgba(255,255,255,0.17)",
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
    color: "rgba(255,255,255,0.78)",
    fontWeight: 800,
  },

  progressBar: {
    height: "11px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.22)",
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
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.88)",
    fontWeight: 800,
    fontSize: "13px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginTop: "22px",
  },

  card: {
    padding: "20px",
    borderRadius: "24px",
    border: `1px solid ${BORDER}`,
    boxShadow: "0 16px 42px rgba(15, 23, 42, 0.07)",
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
    fontWeight: 900,
    cursor: "pointer",
  },

  stepNumber: {
    color: GREEN,
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
    fontWeight: 600,
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
    fontWeight: 900,
  },

  linkBtn: {
    border: 0,
    background: "transparent",
    color: GREEN,
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: 0,
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
    boxShadow: "0 16px 42px rgba(15, 23, 42, 0.06)",
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
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
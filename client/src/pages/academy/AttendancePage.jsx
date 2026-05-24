// client/src/pages/academy/AttendancePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";

const GREEN = "#16a34a";
const ORANGE = "#ec7a3b";
const BLUE = "#1877f2";

const STATUSES = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

function todayInputValue() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function getStudentRowKey(student) {
  return (
    student.studentKey ||
    student.bookingId ||
    student.childId ||
    `${student.childName}-${student.parentPhone}`
  );
}

function attendanceRate(summary) {
  if (!summary.total) return 0;
  return Math.round((summary.present / summary.total) * 100);
}

function StatMini({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="kg-stat-card">
      <div className={cx("kg-stat-icon", bg, color)}>
        <Icon size={22} />
      </div>
      <div>
        <div className="kg-stat-label">{label}</div>
        <div className="kg-stat-value">{value}</div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [certificateKey, setCertificateKey] = useState("");
  const [error, setError] = useState("");

  async function loadCourses() {
    try {
      setError("");
      setLoadingCourses(true);

      const data = await api.academyAttendanceCourses();
      const list = data?.courses || [];

      setCourses(list);

      if (!selectedCourseId && list.length > 0) {
        setSelectedCourseId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to load attendance courses."));
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadStudents(courseId = selectedCourseId) {
    if (!courseId) {
      setCourse(null);
      setStudents([]);
      return;
    }

    try {
      setError("");
      setLoadingStudents(true);

      const data = await api.academyCourseAttendanceStudents(courseId, {
        date,
      });

      setCourse(data?.course || null);
      setStudents(data?.students || []);
    } catch (err) {
      console.error(err);
      setCourse(null);
      setStudents([]);
      setError(getErrorMessage(err, "Failed to load attendance students."));
    } finally {
      setLoadingStudents(false);
    }
  }

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadStudents(selectedCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, date]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return students;

    return students.filter((student) => {
      return [
        student.childName,
        student.parentName,
        student.parentPhone,
        student.parentEmail,
        student.bookingNo,
        student.status,
        student.isGuestBooking ? "guest" : "registered",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, query]);

  const summary = useMemo(() => {
    const total = students.length;
    const present = students.filter((s) => s.status === "PRESENT").length;
    const absent = students.filter((s) => s.status === "ABSENT").length;
    const late = students.filter((s) => s.status === "LATE").length;
    const completed = students.filter((s) => s.isCompleted).length;

    return { total, present, absent, late, completed };
  }, [students]);

  const rate = attendanceRate(summary);

  async function markAttendance(student, status) {
    const rowKey = getStudentRowKey(student);
    const key = `${rowKey}-${status}`;

    try {
      setSavingKey(key);
      setError("");

      await api.markAcademyCourseAttendance({
        courseId: selectedCourseId,
        bookingId: student.bookingId,
        childId: student.childId || null,
        attendanceDate: date,
        status,
        notes: student.notes || "",
      });

      await loadStudents(selectedCourseId);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to mark attendance."));
    } finally {
      setSavingKey("");
    }
  }

  async function issueCertificate(student) {
    const rowKey = getStudentRowKey(student);

    try {
      setCertificateKey(rowKey);
      setError("");

      await api.issueAcademyCourseCertificate(
        selectedCourseId,
        student.bookingId,
      );

      await loadStudents(selectedCourseId);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to issue certificate."));
    } finally {
      setCertificateKey("");
    }
  }

  return (
    <div className="kg-attendance-page">
      <style>{`
        .kg-attendance-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(236, 122, 59, 0.16), transparent 34%),
            radial-gradient(circle at top right, rgba(24, 119, 242, 0.10), transparent 30%),
            linear-gradient(180deg, #fff8f4 0%, #f8fafc 44%, #ffffff 100%);
          padding: 24px;
          color: #0f172a;
        }

        .kg-attendance-shell {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
        }

        .kg-attendance-hero-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(236, 122, 59, 0.18);
          border-radius: 36px;
          background:
            radial-gradient(circle at right top, rgba(255, 216, 77, 0.30), transparent 32%),
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,247,237,0.72), rgba(239,246,255,0.74));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 30px;
        }

        .kg-hero-glow-a,
        .kg-hero-glow-b {
          pointer-events: none;
          position: absolute;
          border-radius: 999px;
          filter: blur(44px);
        }

        .kg-hero-glow-a {
          right: -80px;
          top: -80px;
          width: 280px;
          height: 280px;
          background: rgba(236, 122, 59, 0.22);
        }

        .kg-hero-glow-b {
          left: 38%;
          bottom: -120px;
          width: 320px;
          height: 320px;
          background: rgba(24, 119, 242, 0.12);
        }

        .kg-hero-content {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 24px;
        }

        .kg-hero-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 20px;
          align-items: center;
        }

        .kg-hero-title-wrap {
          min-width: 0;
        }

        .kg-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: 100%;
          border-radius: 999px;
          background: #ffffff;
          color: ${ORANGE};
          border: 1px solid rgba(236, 122, 59, 0.18);
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
        }

        .kg-hero-title {
          margin: 16px 0 0;
          font-size: clamp(34px, 4vw, 58px);
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.07em;
          color: #020617;
        }

        .kg-hero-description {
          margin: 12px 0 0;
          max-width: 760px;
          color: #64748b;
          font-size: 16px;
          line-height: 1.8;
          font-weight: 650;
        }

        .kg-rate-card {
          justify-self: end;
          width: 100%;
          max-width: 280px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.06);
          padding: 18px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        }

        .kg-rate-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.13em;
        }

        .kg-rate-value {
          margin-top: 8px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          color: #020617;
          font-size: 42px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .kg-rate-value span {
          font-size: 18px;
          color: #64748b;
          letter-spacing: 0;
        }

        .kg-rate-track {
          height: 10px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
          margin-top: 14px;
        }

        .kg-rate-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, ${GREEN}, ${ORANGE});
        }

        .kg-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }

        .kg-stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.04);
          padding: 18px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(10px);
        }

        .kg-stat-icon {
          width: 58px;
          height: 58px;
          border-radius: 22px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .kg-bg-orange { background: #fff1e8; }
        .kg-bg-blue { background: #eff6ff; }
        .kg-bg-green { background: #ecfdf5; }
        .kg-bg-red { background: #fef2f2; }
        .kg-bg-amber { background: #fffbeb; }
        .kg-text-orange { color: ${ORANGE}; }
        .kg-text-blue { color: ${BLUE}; }
        .kg-text-green { color: ${GREEN}; }
        .kg-text-red { color: #ef4444; }
        .kg-text-amber { color: #d97706; }

        .kg-stat-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }

        .kg-stat-value {
          margin-top: 4px;
          color: #020617;
          font-size: 32px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .kg-toolbar-card {
          margin-top: 22px;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.92);
          padding: 18px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(12px);
        }

        .kg-toolbar-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) 220px minmax(0, 1fr);
          gap: 14px;
        }

        .kg-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .kg-field label {
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .kg-input-wrap {
          position: relative;
        }

        .kg-input-wrap svg {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .kg-field select,
        .kg-field input {
          width: 100%;
          min-height: 56px;
          box-sizing: border-box;
          border: 1px solid rgba(236, 122, 59, 0.18);
          border-radius: 22px;
          background: #ffffff;
          padding: 0 16px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 850;
          outline: none;
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .kg-input-wrap input {
          padding-left: 48px;
        }

        .kg-field select:focus,
        .kg-field input:focus {
          border-color: ${ORANGE};
          box-shadow: 0 0 0 4px rgba(236, 122, 59, 0.13);
        }

        .kg-selected-card {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 30px;
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.05);
          padding: 20px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }

        .kg-selected-title {
          color: #020617;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .kg-selected-meta {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #64748b;
          font-size: 14px;
          font-weight: 750;
        }

        .kg-selected-meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .kg-refresh-btn {
          border: 0;
          border-radius: 22px;
          background: #f1f5f9;
          color: #334155;
          min-height: 56px;
          padding: 0 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          transition: transform 0.16s ease, background 0.16s ease;
        }

        .kg-refresh-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #e2e8f0;
        }

        .kg-refresh-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .kg-error {
          margin-top: 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 14px 16px;
          border-radius: 20px;
          font-weight: 850;
        }

        .kg-table-section {
          margin-top: 24px;
          overflow: hidden;
          border-radius: 34px;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }

        .kg-table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .kg-table-title {
          margin: 0;
          color: #020617;
          font-size: 24px;
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .kg-table-subtitle {
          margin-top: 6px;
          color: #64748b;
          font-size: 14px;
          font-weight: 650;
        }

        .kg-table-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .kg-table-scroll {
          overflow-x: auto;
        }

        .kg-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1120px;
        }

        .kg-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: left;
          padding: 15px 18px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .kg-table td {
          padding: 18px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          vertical-align: middle;
          font-weight: 750;
        }

        .kg-table tr:last-child td {
          border-bottom: 0;
        }

        .kg-table tr:hover td {
          background: rgba(255, 247, 237, 0.35);
        }

        .kg-child-cell {
          display: flex;
          gap: 13px;
          align-items: flex-start;
        }

        .kg-avatar {
          width: 44px;
          height: 44px;
          border-radius: 17px;
          background: #ecfdf5;
          color: ${GREEN};
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .kg-child-name {
          color: #020617;
          font-weight: 950;
        }

        .kg-muted {
          color: #64748b;
          font-size: 13px;
          margin-top: 3px;
          font-weight: 650;
        }

        .kg-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 9px;
        }

        .kg-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 9px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 950;
        }

        .kg-badge.guest {
          background: #fff7ed;
          color: #c2410c;
        }

        .kg-badge.paid {
          background: #dcfce7;
          color: #166534;
        }

        .kg-badge.pending {
          background: #fef9c3;
          color: #854d0e;
        }

        .kg-status-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .kg-status-btn {
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: white;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }

        .kg-status-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
        }

        .kg-status-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .kg-status-btn.active {
          background: ${GREEN};
          color: white;
          border-color: ${GREEN};
        }

        .kg-status-btn.absent.active {
          background: #ef4444;
          border-color: #ef4444;
        }

        .kg-status-btn.late.active {
          background: ${ORANGE};
          border-color: ${ORANGE};
        }

        .kg-progress {
          min-width: 160px;
        }

        .kg-progress strong {
          color: #020617;
          font-weight: 950;
        }

        .kg-progress-line {
          height: 10px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
          margin-top: 8px;
        }

        .kg-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${GREEN}, ${ORANGE});
        }

        .kg-cert-btn {
          border: 0;
          border-radius: 16px;
          padding: 12px 15px;
          font-weight: 950;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: white;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }

        .kg-cert-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.16);
        }

        .kg-cert-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .kg-cert-issued {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 10px 13px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 12px;
          font-weight: 950;
          max-width: 250px;
          word-break: break-word;
        }

        .kg-empty {
          padding: 48px 20px;
          text-align: center;
          color: #64748b;
          font-weight: 850;
          display: grid;
          gap: 8px;
          place-items: center;
        }

        .kg-mobile-list {
          display: none;
        }

        .spin {
          animation: kg-spin 0.8s linear infinite;
        }

        @keyframes kg-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1200px) {
          .kg-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .kg-hero-top {
            grid-template-columns: 1fr;
          }

          .kg-rate-card {
            justify-self: stretch;
            max-width: none;
          }
        }

        @media (max-width: 900px) {
          .kg-attendance-page {
            padding: 16px;
          }

          .kg-attendance-hero-card {
            border-radius: 30px;
            padding: 22px;
          }

          .kg-toolbar-grid {
            grid-template-columns: 1fr;
          }

          .kg-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kg-selected-card {
            align-items: stretch;
            flex-direction: column;
          }

          .kg-refresh-btn {
            width: 100%;
          }

          .kg-table-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 720px) {
          .kg-table-scroll {
            display: none;
          }

          .kg-mobile-list {
            display: grid;
            gap: 14px;
            padding: 16px;
          }

          .kg-mobile-card {
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 26px;
            background: #ffffff;
            padding: 16px;
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
          }

          .kg-mobile-top {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .kg-mobile-section {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
          }

          .kg-mobile-label {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 8px;
          }
        }

        @media (max-width: 560px) {
          .kg-attendance-page {
            padding: 12px;
          }

          .kg-attendance-hero-card {
            padding: 18px;
          }

          .kg-kicker {
            font-size: 10px;
            letter-spacing: 0.1em;
          }

          .kg-hero-title {
            font-size: 34px;
          }

          .kg-stats-grid {
            grid-template-columns: 1fr;
          }

          .kg-stat-card {
            padding: 16px;
          }
        }
      `}</style>

      <div className="kg-attendance-shell">
        <section className="kg-attendance-hero-card">
          <div className="kg-hero-glow-a" />
          <div className="kg-hero-glow-b" />

          <div className="kg-hero-content">
            <div className="kg-hero-top">
              <div className="kg-hero-title-wrap">
                <div className="kg-kicker">
                  <ClipboardCheck size={16} />
                  KidGage Attendance Management
                </div>

                <h1 className="kg-hero-title">Course Attendance</h1>

                <p className="kg-hero-description">
                  Mark student attendance by course, monitor progress, and issue
                  completion certificates when students finish their package.
                </p>
              </div>

              <div className="kg-rate-card">
                <div className="kg-rate-label">Attendance Rate</div>
                <div className="kg-rate-value">
                  {rate}
                  <span>%</span>
                </div>
                <div className="kg-rate-track">
                  <div className="kg-rate-fill" style={{ width: `${rate}%` }} />
                </div>
                <div className="kg-muted">
                  {summary.present} present from {summary.total} students
                </div>
              </div>
            </div>

            <div className="kg-stats-grid">
              <StatMini
                icon={Users}
                label="Students"
                value={summary.total}
                color="kg-text-blue"
                bg="kg-bg-blue"
              />
              <StatMini
                icon={CheckCircle2}
                label="Present"
                value={summary.present}
                color="kg-text-green"
                bg="kg-bg-green"
              />
              <StatMini
                icon={XCircle}
                label="Absent"
                value={summary.absent}
                color="kg-text-red"
                bg="kg-bg-red"
              />
              <StatMini
                icon={Clock3}
                label="Late"
                value={summary.late}
                color="kg-text-orange"
                bg="kg-bg-orange"
              />
              <StatMini
                icon={Award}
                label="Completed"
                value={summary.completed}
                color="kg-text-amber"
                bg="kg-bg-amber"
              />
            </div>

            <div className="kg-toolbar-card">
              <div className="kg-toolbar-grid">
                <div className="kg-field">
                  <label>Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    disabled={loadingCourses}
                  >
                    {loadingCourses ? (
                      <option>Loading courses...</option>
                    ) : courses.length === 0 ? (
                      <option>No courses found</option>
                    ) : (
                      courses.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.title} — {item.activityName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="kg-field">
                  <label>Date</label>
                  <div className="kg-input-wrap">
                    <CalendarDays size={18} />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="kg-field">
                  <label>Search</label>
                  <div className="kg-input-wrap">
                    <Search size={18} />
                    <input
                      type="search"
                      placeholder="Search child, parent, phone, booking..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="kg-selected-card">
              <div>
                <div className="kg-selected-title">
                  {course?.title || "Select a course"}
                </div>

                <div className="kg-selected-meta">
                  <span>
                    <BookOpen size={16} color={ORANGE} />
                    {course?.activityName || "Course attendance"}
                  </span>
                  <span>
                    <Users size={16} color={BLUE} />
                    {summary.total} students
                  </span>
                  <span>
                    <CalendarDays size={16} color={GREEN} />
                    {date}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="kg-refresh-btn"
                disabled={loadingStudents || !selectedCourseId}
                onClick={() => loadStudents(selectedCourseId)}
              >
                <RefreshCw
                  size={18}
                  className={loadingStudents ? "spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="kg-error">{error}</div> : null}

        <section className="kg-table-section">
          <div className="kg-table-header">
            <div>
              <h2 className="kg-table-title">Student Attendance</h2>
              <div className="kg-table-subtitle">
                Review students, update attendance status, and issue completion
                certificates.
              </div>
            </div>

            <div className="kg-table-chip">
              <Award size={15} />
              Certificates after completion
            </div>
          </div>

          <div className="kg-table-scroll">
            <table className="kg-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Attendance</th>
                  <th>Course Progress</th>
                  <th>Certificate</th>
                </tr>
              </thead>

              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="5">
                      <div className="kg-empty">
                        <Loader2 size={22} className="spin" />
                        <div>Loading students...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="kg-empty">
                        <Users size={24} />
                        <div>No students found for this course.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const rowKey = getStudentRowKey(student);
                    const required = Number(student.requiredSessions || 0);
                    const completed = Number(student.completedSessions || 0);
                    const progress =
                      required > 0
                        ? Math.min(
                            100,
                            Math.round((completed / required) * 100),
                          )
                        : 0;

                    return (
                      <tr key={rowKey}>
                        <td>
                          <StudentCell student={student} />
                        </td>

                        <td>
                          <div>{student.parentName || "N/A"}</div>
                          <div className="kg-muted">
                            {student.parentPhone || ""}
                          </div>
                          {student.parentEmail ? (
                            <div className="kg-muted">
                              {student.parentEmail}
                            </div>
                          ) : null}
                        </td>

                        <td>
                          <StatusButtons
                            student={student}
                            rowKey={rowKey}
                            savingKey={savingKey}
                            onMark={markAttendance}
                          />
                        </td>

                        <td>
                          <ProgressBlock
                            completed={completed}
                            required={required}
                            progress={progress}
                          />
                        </td>

                        <td>
                          <CertificateAction
                            student={student}
                            rowKey={rowKey}
                            certificateKey={certificateKey}
                            onIssue={issueCertificate}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="kg-mobile-list">
            {loadingStudents ? (
              <div className="kg-empty">
                <Loader2 size={22} className="spin" />
                <div>Loading students...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="kg-empty">
                <Users size={24} />
                <div>No students found for this course.</div>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const rowKey = getStudentRowKey(student);
                const required = Number(student.requiredSessions || 0);
                const completed = Number(student.completedSessions || 0);
                const progress =
                  required > 0
                    ? Math.min(100, Math.round((completed / required) * 100))
                    : 0;

                return (
                  <div key={rowKey} className="kg-mobile-card">
                    <div className="kg-mobile-top">
                      <StudentCell student={student} />
                    </div>

                    <div className="kg-mobile-section">
                      <div className="kg-mobile-label">Parent</div>
                      <div>{student.parentName || "N/A"}</div>
                      <div className="kg-muted">
                        {student.parentPhone || ""}
                      </div>
                      {student.parentEmail ? (
                        <div className="kg-muted">{student.parentEmail}</div>
                      ) : null}
                    </div>

                    <div className="kg-mobile-section">
                      <div className="kg-mobile-label">Attendance</div>
                      <StatusButtons
                        student={student}
                        rowKey={rowKey}
                        savingKey={savingKey}
                        onMark={markAttendance}
                      />
                    </div>

                    <div className="kg-mobile-section">
                      <div className="kg-mobile-label">Progress</div>
                      <ProgressBlock
                        completed={completed}
                        required={required}
                        progress={progress}
                      />
                    </div>

                    <div className="kg-mobile-section">
                      <div className="kg-mobile-label">Certificate</div>
                      <CertificateAction
                        student={student}
                        rowKey={rowKey}
                        certificateKey={certificateKey}
                        onIssue={issueCertificate}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StudentCell({ student }) {
  return (
    <div className="kg-child-cell">
      <div className="kg-avatar">
        <UserRound size={19} />
      </div>

      <div>
        <div className="kg-child-name">{student.childName}</div>

        <div className="kg-muted">
          Age: {student.age || "N/A"}
          {student.gender ? ` • ${student.gender}` : ""}
        </div>

        <div className="kg-badges">
          {student.isGuestBooking ? (
            <span className="kg-badge guest">Guest</span>
          ) : (
            <span className="kg-badge">Registered</span>
          )}

          {student.bookingNo ? (
            <span className="kg-badge">{student.bookingNo}</span>
          ) : null}

          {student.paymentStatus ? (
            <span
              className={cx(
                "kg-badge",
                student.paymentStatus === "PAID" ? "paid" : "pending",
              )}
            >
              {student.paymentStatus}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusButtons({ student, rowKey, savingKey, onMark }) {
  return (
    <div className="kg-status-buttons">
      {STATUSES.map((item) => {
        const active = student.status === item.value;
        const key = `${rowKey}-${item.value}`;

        return (
          <button
            key={item.value}
            type="button"
            className={cx(
              "kg-status-btn",
              item.value === "ABSENT" && "absent",
              item.value === "LATE" && "late",
              active && "active",
            )}
            onClick={() => onMark(student, item.value)}
            disabled={savingKey === key}
          >
            {savingKey === key ? (
              <Loader2 size={14} className="spin" />
            ) : item.value === "ABSENT" ? (
              <XCircle size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBlock({ completed, required, progress }) {
  return (
    <div className="kg-progress">
      <strong>
        {completed}/{required || "-"} sessions
      </strong>

      <div className="kg-progress-line">
        <div className="kg-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="kg-muted">{progress}% completed</div>
    </div>
  );
}

function CertificateAction({ student, rowKey, certificateKey, onIssue }) {
  if (student.certificate) {
    return (
      <div className="kg-cert-issued">
        <Award size={15} />
        Issued: {student.certificate.certificateNo}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="kg-cert-btn"
      disabled={!student.isCompleted || certificateKey === rowKey}
      onClick={() => onIssue(student)}
    >
      {certificateKey === rowKey ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <Award size={16} />
      )}
      Issue Certificate
    </button>
  );
}

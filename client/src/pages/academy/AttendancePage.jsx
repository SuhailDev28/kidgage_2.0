// client/src/pages/academy/AttendancePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
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

function getStatusMeta(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PRESENT") {
    return {
      label: "Present",
      className: "kg-status-pill present",
      icon: CheckCircle2,
    };
  }

  if (value === "ABSENT") {
    return {
      label: "Absent",
      className: "kg-status-pill absent",
      icon: XCircle,
    };
  }

  if (value === "LATE") {
    return {
      label: "Late",
      className: "kg-status-pill late",
      icon: Clock3,
    };
  }

  if (value === "EXCUSED") {
    return {
      label: "Excused",
      className: "kg-status-pill excused",
      icon: ShieldCheck,
    };
  }

  return {
    label: "Not Marked",
    className: "kg-status-pill neutral",
    icon: Clock3,
  };
}

function StatCard({ icon: Icon, label, value, tone = "green" }) {
  return (
    <div className={`kg-stat-card ${tone}`}>
      <div className="kg-stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StudentCard({
  student,
  rowKey,
  savingKey,
  certificateKey,
  markAttendance,
  issueCertificate,
}) {
  const required = Number(student.requiredSessions || 0);
  const completed = Number(student.completedSessions || 0);
  const progress =
    required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const statusMeta = getStatusMeta(student.status);
  const StatusIcon = statusMeta.icon;

  return (
    <div className="kg-student-card">
      <div className="kg-student-card-head">
        <div className="kg-child-cell">
          <div className="kg-avatar">
            <UserRound size={18} />
          </div>

          <div>
            <div className="kg-child-name">
              {student.childName || "Student"}
            </div>

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

        <div className={statusMeta.className}>
          <StatusIcon size={14} />
          {statusMeta.label}
        </div>
      </div>

      <div className="kg-mobile-info-grid">
        <div>
          <span>Parent</span>
          <strong>{student.parentName || "N/A"}</strong>
          {student.parentPhone ? <small>{student.parentPhone}</small> : null}
          {student.parentEmail ? <small>{student.parentEmail}</small> : null}
        </div>

        <div>
          <span>Progress</span>
          <strong>
            {completed}/{required || "-"} sessions
          </strong>
          <div className="kg-progress-line">
            <div
              className="kg-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small>{progress}% completed</small>
        </div>
      </div>

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
                item.value === "EXCUSED" && "excused",
                active && "active",
              )}
              onClick={() => markAttendance(student, item.value)}
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

      <div className="kg-card-footer">
        {student.certificate ? (
          <div className="kg-cert-issued">
            <Award size={15} />
            Issued: {student.certificate.certificateNo}
          </div>
        ) : (
          <button
            type="button"
            className="kg-cert-btn"
            disabled={!student.isCompleted || certificateKey === rowKey}
            onClick={() => issueCertificate(student)}
          >
            {certificateKey === rowKey ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Award size={16} />
            )}
            Issue Certificate
          </button>
        )}
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

  const attendanceRate = useMemo(() => {
    if (!summary.total) return 0;
    return Math.round((summary.present / summary.total) * 100);
  }, [summary.present, summary.total]);

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
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.14), transparent 30%),
            radial-gradient(circle at bottom right, rgba(24, 119, 242, 0.08), transparent 28%),
            #f8fafc;
          padding: 24px;
          color: #0f172a;
        }

        .kg-attendance-shell {
          max-width: 1320px;
          margin: 0 auto;
        }

        .kg-attendance-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: stretch;
          margin-bottom: 20px;
        }

        .kg-hero-main {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.08);
          padding: 24px;
        }

        .kg-hero-main::before {
          content: "";
          position: absolute;
          right: -80px;
          top: -80px;
          width: 230px;
          height: 230px;
          border-radius: 999px;
          background: rgba(236, 122, 59, 0.16);
          filter: blur(4px);
        }

        .kg-hero-main::after {
          content: "";
          position: absolute;
          left: 42%;
          bottom: -120px;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          background: rgba(22, 163, 74, 0.12);
          filter: blur(6px);
        }

        .kg-attendance-title {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 16px;
          align-items: center;
          min-width: 0;
        }

        .kg-attendance-icon {
          width: 60px;
          height: 60px;
          border-radius: 22px;
          background: linear-gradient(135deg, ${GREEN}, ${ORANGE});
          display: grid;
          place-items: center;
          color: white;
          box-shadow: 0 18px 35px rgba(22, 163, 74, 0.22);
          flex: 0 0 auto;
        }

        .kg-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #c2410c;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }

        .kg-attendance-title h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.05;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .kg-attendance-title p {
          margin: 8px 0 0;
          color: #64748b;
          font-weight: 650;
          line-height: 1.7;
          max-width: 720px;
        }

        .kg-hero-side {
          min-width: 250px;
          border-radius: 32px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          padding: 22px;
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.16);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
        }

        .kg-hero-side span {
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .kg-hero-side strong {
          display: block;
          margin-top: 8px;
          font-size: 42px;
          line-height: 1;
          font-weight: 950;
        }

        .kg-rate-line {
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          overflow: hidden;
        }

        .kg-rate-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${GREEN}, ${ORANGE});
        }

        .kg-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 26px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }

        .kg-toolbar {
          padding: 18px;
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) 220px minmax(0, 1fr) auto;
          gap: 14px;
          margin-bottom: 18px;
          align-items: end;
        }

        .kg-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .kg-field label {
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
        }

        .kg-input-wrap {
          position: relative;
        }

        .kg-input-wrap svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .kg-field select,
        .kg-field input {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 18px;
          background: white;
          padding: 13px 14px;
          font-weight: 850;
          outline: none;
          min-height: 52px;
          box-sizing: border-box;
        }

        .kg-input-wrap input {
          padding-left: 44px;
        }

        .kg-field select:focus,
        .kg-field input:focus {
          border-color: ${GREEN};
          box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
        }

        .kg-refresh-btn {
          min-height: 52px;
          border: 0;
          border-radius: 18px;
          padding: 0 16px;
          background: #0f172a;
          color: white;
          font-weight: 950;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            background 0.16s ease;
        }

        .kg-refresh-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.16);
        }

        .kg-refresh-btn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .kg-course-note {
          margin: -4px 0 18px;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
        }

        .kg-course-note strong {
          color: #0f172a;
        }

        .kg-summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .kg-stat-card {
          padding: 18px;
          border-radius: 24px;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .kg-stat-icon {
          width: 46px;
          height: 46px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .kg-stat-card.green .kg-stat-icon {
          background: #dcfce7;
          color: #166534;
        }

        .kg-stat-card.orange .kg-stat-icon {
          background: #fff7ed;
          color: #c2410c;
        }

        .kg-stat-card.red .kg-stat-icon {
          background: #fef2f2;
          color: #b91c1c;
        }

        .kg-stat-card.blue .kg-stat-icon {
          background: #eff6ff;
          color: ${BLUE};
        }

        .kg-stat-card.slate .kg-stat-icon {
          background: #f1f5f9;
          color: #334155;
        }

        .kg-stat-card span {
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kg-stat-card strong {
          display: block;
          margin-top: 4px;
          font-size: 27px;
          font-weight: 950;
          line-height: 1;
        }

        .kg-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 14px 16px;
          border-radius: 20px;
          font-weight: 850;
          margin-bottom: 18px;
        }

        .kg-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 18px 18px 0;
        }

        .kg-section-head h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .kg-section-head p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 650;
        }

        .kg-table-card {
          overflow: hidden;
        }

        .kg-table-scroll {
          overflow-x: auto;
          padding: 18px;
        }

        .kg-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 10px;
          min-width: 1080px;
        }

        .kg-table th {
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: left;
          padding: 0 16px 6px;
        }

        .kg-table td {
          padding: 16px;
          vertical-align: middle;
          font-weight: 750;
          background: #ffffff;
          border-top: 1px solid rgba(15, 23, 42, 0.07);
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .kg-table td:first-child {
          border-left: 1px solid rgba(15, 23, 42, 0.07);
          border-radius: 22px 0 0 22px;
        }

        .kg-table td:last-child {
          border-right: 1px solid rgba(15, 23, 42, 0.07);
          border-radius: 0 22px 22px 0;
        }

        .kg-table tbody tr:hover td {
          background: #fff7ed;
        }

        .kg-child-cell {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .kg-avatar {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          background: rgba(22, 163, 74, 0.1);
          color: ${GREEN};
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .kg-child-name {
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
          margin-top: 8px;
        }

        .kg-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 8px;
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

        .kg-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 950;
        }

        .kg-status-pill.present {
          background: #dcfce7;
          color: #166534;
        }

        .kg-status-pill.absent {
          background: #fef2f2;
          color: #b91c1c;
        }

        .kg-status-pill.late {
          background: #fff7ed;
          color: #c2410c;
        }

        .kg-status-pill.excused {
          background: #eff6ff;
          color: ${BLUE};
        }

        .kg-status-pill.neutral {
          background: #f1f5f9;
          color: #475569;
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
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            background 0.16s ease;
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

        .kg-status-btn.excused.active {
          background: ${BLUE};
          border-color: ${BLUE};
        }

        .kg-progress {
          min-width: 150px;
        }

        .kg-progress strong {
          font-weight: 950;
        }

        .kg-progress-line {
          height: 9px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
          margin-top: 7px;
        }

        .kg-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, ${GREEN}, ${ORANGE});
        }

        .kg-cert-btn {
          border: 0;
          border-radius: 16px;
          padding: 11px 14px;
          font-weight: 950;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: white;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease;
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
          padding: 9px 12px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 12px;
          font-weight: 950;
          max-width: 240px;
          word-break: break-word;
        }

        .kg-empty {
          padding: 42px 20px;
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

        .kg-student-card {
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
        }

        .kg-student-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .kg-mobile-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 14px 0;
        }

        .kg-mobile-info-grid > div {
          background: #f8fafc;
          border-radius: 18px;
          padding: 12px;
        }

        .kg-mobile-info-grid span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kg-mobile-info-grid strong {
          display: block;
          margin-top: 5px;
          font-size: 13px;
          font-weight: 950;
        }

        .kg-mobile-info-grid small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-weight: 650;
        }

        .kg-card-footer {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(15, 23, 42, 0.08);
          display: flex;
          justify-content: flex-end;
        }

        .spin {
          animation: kg-spin 0.8s linear infinite;
        }

        @keyframes kg-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1180px) {
          .kg-attendance-hero {
            grid-template-columns: 1fr;
          }

          .kg-hero-side {
            min-width: 0;
          }

          .kg-toolbar {
            grid-template-columns: 1fr 220px;
          }

          .kg-toolbar .kg-field:nth-child(3) {
            grid-column: 1 / -1;
          }

          .kg-refresh-btn {
            width: 100%;
          }

          .kg-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .kg-attendance-page {
            padding: 16px;
          }

          .kg-toolbar {
            grid-template-columns: 1fr;
          }

          .kg-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kg-attendance-title {
            align-items: flex-start;
          }

          .kg-attendance-title h1 {
            font-size: 28px;
          }

          .kg-table-scroll {
            display: none;
          }

          .kg-mobile-list {
            display: grid;
            gap: 14px;
            padding: 18px;
          }
        }

        @media (max-width: 560px) {
          .kg-attendance-page {
            padding: 12px;
          }

          .kg-hero-main,
          .kg-hero-side,
          .kg-card {
            border-radius: 24px;
          }

          .kg-attendance-icon {
            width: 50px;
            height: 50px;
            border-radius: 18px;
          }

          .kg-attendance-title {
            gap: 12px;
          }

          .kg-attendance-title h1 {
            font-size: 24px;
          }

          .kg-attendance-title p {
            font-size: 13px;
          }

          .kg-summary-grid,
          .kg-mobile-info-grid {
            grid-template-columns: 1fr;
          }

          .kg-stat-card {
            padding: 15px;
          }

          .kg-card-footer {
            justify-content: stretch;
          }

          .kg-cert-btn,
          .kg-cert-issued {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="kg-attendance-shell">
        <div className="kg-attendance-hero">
          <div className="kg-hero-main">
            <div className="kg-attendance-title">
              <div className="kg-attendance-icon">
                <ClipboardCheck size={30} />
              </div>

              <div>
                <div className="kg-kicker">
                  <ShieldCheck size={13} />
                  Academy Attendance
                </div>

                <h1>Course Attendance</h1>
                <p>
                  Mark daily attendance by course, track student progress, and
                  issue completion certificates once the required sessions are
                  completed.
                </p>
              </div>
            </div>
          </div>

          <div className="kg-hero-side">
            <div>
              <span>Attendance Rate</span>
              <strong>{attendanceRate}%</strong>
            </div>

            <div>
              <div className="kg-rate-line">
                <div
                  className="kg-rate-fill"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <div
                className="kg-muted"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {summary.present} present from {summary.total} students
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="kg-error">{error}</div> : null}

        <div className="kg-card kg-toolbar">
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

          <button
            type="button"
            className="kg-refresh-btn"
            onClick={() => loadStudents(selectedCourseId)}
            disabled={!selectedCourseId || loadingStudents}
          >
            <RefreshCw size={16} className={loadingStudents ? "spin" : ""} />
            Refresh
          </button>
        </div>

        {course ? (
          <div className="kg-course-note">
            Selected: <strong>{course.title}</strong>
            {course.activityName ? <> — {course.activityName}</> : null}
          </div>
        ) : null}

        <div className="kg-summary-grid">
          <StatCard
            icon={Users}
            label="Total Students"
            value={summary.total}
            tone="slate"
          />

          <StatCard
            icon={CheckCircle2}
            label="Present"
            value={summary.present}
            tone="green"
          />

          <StatCard
            icon={XCircle}
            label="Absent"
            value={summary.absent}
            tone="red"
          />

          <StatCard
            icon={Clock3}
            label="Late"
            value={summary.late}
            tone="orange"
          />

          <StatCard
            icon={Award}
            label="Completed"
            value={summary.completed}
            tone="blue"
          />
        </div>

        <div className="kg-card kg-table-card">
          <div className="kg-section-head">
            <div>
              <h2>Students Attendance</h2>
              <p>
                {filteredStudents.length} student
                {filteredStudents.length === 1 ? "" : "s"} shown for the
                selected course and date.
              </p>
            </div>

            <div className="kg-status-pill neutral">
              <CalendarDays size={14} />
              {date}
            </div>
          </div>

          <div className="kg-table-scroll">
            <table className="kg-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Course Progress</th>
                  <th>Certificate</th>
                </tr>
              </thead>

              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="6">
                      <div className="kg-empty">
                        <Loader2 size={22} className="spin" />
                        <div>Loading students...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6">
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
                    const statusMeta = getStatusMeta(student.status);
                    const StatusIcon = statusMeta.icon;

                    return (
                      <tr key={rowKey}>
                        <td>
                          <div className="kg-child-cell">
                            <div className="kg-avatar">
                              <UserRound size={18} />
                            </div>

                            <div>
                              <div className="kg-child-name">
                                {student.childName || "Student"}
                              </div>

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
                                  <span className="kg-badge">
                                    {student.bookingNo}
                                  </span>
                                ) : null}

                                {student.paymentStatus ? (
                                  <span
                                    className={cx(
                                      "kg-badge",
                                      student.paymentStatus === "PAID"
                                        ? "paid"
                                        : "pending",
                                    )}
                                  >
                                    {student.paymentStatus}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
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
                          <div className={statusMeta.className}>
                            <StatusIcon size={14} />
                            {statusMeta.label}
                          </div>
                        </td>

                        <td>
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
                                    item.value === "EXCUSED" && "excused",
                                    active && "active",
                                  )}
                                  onClick={() =>
                                    markAttendance(student, item.value)
                                  }
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
                        </td>

                        <td>
                          <div className="kg-progress">
                            <strong>
                              {completed}/{required || "-"} sessions
                            </strong>

                            <div className="kg-progress-line">
                              <div
                                className="kg-progress-fill"
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <div className="kg-muted">
                              {progress}% completed
                            </div>
                          </div>
                        </td>

                        <td>
                          {student.certificate ? (
                            <div className="kg-cert-issued">
                              <Award size={15} />
                              Issued: {student.certificate.certificateNo}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="kg-cert-btn"
                              disabled={
                                !student.isCompleted ||
                                certificateKey === rowKey
                              }
                              onClick={() => issueCertificate(student)}
                            >
                              {certificateKey === rowKey ? (
                                <Loader2 size={16} className="spin" />
                              ) : (
                                <Award size={16} />
                              )}
                              Issue Certificate
                            </button>
                          )}
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

                return (
                  <StudentCard
                    key={rowKey}
                    student={student}
                    rowKey={rowKey}
                    savingKey={savingKey}
                    certificateKey={certificateKey}
                    markAttendance={markAttendance}
                    issueCertificate={issueCertificate}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

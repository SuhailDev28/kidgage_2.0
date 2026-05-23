// client/src/pages/academy/AttendancePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "../../lib/api.js";

const GREEN = "#16a34a";
const ORANGE = "#ec7a3b";

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
            radial-gradient(circle at top left, rgba(236, 122, 59, 0.14), transparent 32%),
            radial-gradient(circle at top right, rgba(22, 163, 74, 0.12), transparent 30%),
            #f8fafc;
          padding: 24px;
          color: #0f172a;
        }

        .kg-attendance-shell {
          max-width: 1280px;
          margin: 0 auto;
        }

        .kg-attendance-hero {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .kg-attendance-title {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .kg-attendance-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: linear-gradient(135deg, ${GREEN}, ${ORANGE});
          display: grid;
          place-items: center;
          color: white;
          box-shadow: 0 18px 35px rgba(22, 163, 74, 0.22);
          flex: 0 0 auto;
        }

        .kg-attendance-title h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .kg-attendance-title p {
          margin: 6px 0 0;
          color: #64748b;
          font-weight: 600;
        }

        .kg-card {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        }

        .kg-toolbar {
          padding: 18px;
          display: grid;
          grid-template-columns: 1.4fr 220px 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }

        .kg-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .kg-field label {
          font-size: 12px;
          font-weight: 900;
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
          border-radius: 16px;
          background: white;
          padding: 13px 14px;
          font-weight: 800;
          outline: none;
          min-height: 48px;
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

        .kg-course-note {
          margin: -4px 0 18px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
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

        .kg-summary-card {
          padding: 18px;
          border-radius: 22px;
          background: white;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .kg-summary-card span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .kg-summary-card strong {
          display: block;
          margin-top: 8px;
          font-size: 28px;
          font-weight: 950;
        }

        .kg-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 14px 16px;
          border-radius: 18px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .kg-table-card {
          overflow: hidden;
        }

        .kg-table-scroll {
          overflow-x: auto;
        }

        .kg-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1080px;
        }

        .kg-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: left;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .kg-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          vertical-align: middle;
          font-weight: 700;
        }

        .kg-child-cell {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .kg-avatar {
          width: 38px;
          height: 38px;
          border-radius: 14px;
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
          font-weight: 900;
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
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 900;
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
          border-radius: 14px;
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
          font-weight: 800;
          display: grid;
          gap: 8px;
          place-items: center;
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

        @media (max-width: 900px) {
          .kg-attendance-page {
            padding: 16px;
          }

          .kg-attendance-hero {
            flex-direction: column;
          }

          .kg-toolbar {
            grid-template-columns: 1fr;
          }

          .kg-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kg-attendance-title h1 {
            font-size: 24px;
          }
        }

        @media (max-width: 520px) {
          .kg-attendance-title {
            align-items: flex-start;
          }

          .kg-attendance-icon {
            width: 48px;
            height: 48px;
            border-radius: 16px;
          }

          .kg-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="kg-attendance-shell">
        <div className="kg-attendance-hero">
          <div className="kg-attendance-title">
            <div className="kg-attendance-icon">
              <ClipboardCheck size={28} />
            </div>

            <div>
              <h1>Course Attendance</h1>
              <p>
                Mark attendance by course and issue completion certificates when
                the course is completed.
              </p>
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
        </div>

        {course ? (
          <div className="kg-course-note">
            Selected: <strong>{course.title}</strong>
            {course.activityName ? <> — {course.activityName}</> : null}
          </div>
        ) : null}

        <div className="kg-summary-grid">
          <div className="kg-summary-card">
            <span>Total Students</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="kg-summary-card">
            <span>Present</span>
            <strong>{summary.present}</strong>
          </div>

          <div className="kg-summary-card">
            <span>Absent</span>
            <strong>{summary.absent}</strong>
          </div>

          <div className="kg-summary-card">
            <span>Late</span>
            <strong>{summary.late}</strong>
          </div>

          <div className="kg-summary-card">
            <span>Completed</span>
            <strong>{summary.completed}</strong>
          </div>
        </div>

        <div className="kg-card kg-table-card">
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
                          <div className="kg-child-cell">
                            <div className="kg-avatar">
                              <UserRound size={18} />
                            </div>

                            <div>
                              <div className="kg-child-name">
                                {student.childName}
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

                            <div className="kg-muted">{progress}% completed</div>
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
        </div>
      </div>
    </div>
  );
}
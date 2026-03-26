import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getAdminStats,
  getStudents,
  deleteStudent,
  getFacultyStudents,
  addSubject,
  editSubject,
  deleteSubject,
  addFaculty,
  editFaculty,
  deleteFaculty,
  toggleSelection,
  resetSelections,
  resetAllSubjects,
  resetAllFaculty,
  resetStudents,
  exportCSV,
  exportSubjectsCSV,
  exportFacultyCSV,
  exportStudentsCSV,
  importStudents,
} from "../../services/api";
import {
  useRealtimeFaculty,
  useRealtimeSubjects,
  useRealtimeConfig,
} from "../../hooks/useRealtimeData";
import ConfirmModal from "../../components/shared/ConfirmModal";
// import Footer from "../../components/shared/Footer";

// ── Reusable CSV download helper ──────────────────────────────
async function downloadBlob(blobPromise, filename) {
  try {
    const blob = await blobPromise;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); //
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  } catch (err) {
    toast.error("Export failed.");
  }
}

function DownloadCSVButton({ onClick, label = "Download CSV" }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onClick();
    } catch {
      toast.error("Export failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`btn-secondary flex items-center gap-2 w-fit ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      }`}>
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          Exporting...
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

const TABS = ["Dashboard", "Subjects", "Faculty", "Students", "Settings"];

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "blue", icon }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-display mt-1">
            {value ?? "—"}
          </p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Faculty Students Modal ────────────────────────────────────
function FacultyStudentsModal({ faculty, subject, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!faculty) return;
    getFacultyStudents(faculty.id)
      .then((data) => setStudents(data.students || []))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoading(false));
  }, [faculty]);

  if (!faculty) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-modal overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 font-display">
                {faculty.name}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {subject?.name || "Unknown Subject"} ·{" "}
                <span className="font-medium text-primary-600">
                  {faculty.current_count} / {faculty.max_limit} seats filled
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors flex-shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="w-10 h-10 text-slate-200 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-slate-400 text-sm">
                  No students have selected this faculty yet.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    {["#", "Name", "PIN", "Branch", "Time"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr
                      key={s.pin}
                      className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {s.name || (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s.pin}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {s.branch || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {s.timestamp?.toDate
                          ? new Date(s.timestamp.toDate()).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {students.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {students.length} student{students.length !== 1 ? "s" : ""}{" "}
                selected this faculty
              </p>
              <button
                onClick={onClose}
                className="btn-secondary text-xs py-1.5 px-4">
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Seat Bar ──────────────────────────────────────────────────
function SeatBar({ faculty, subjects = [], onView }) {
  const pct =
    faculty.max_limit > 0
      ? (faculty.current_count / faculty.max_limit) * 100
      : 0;
  const barColor =
    pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-yellow-500" : "bg-green-500";
  const subject = subjects.find((s) => s.id === faculty.subject_id);
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm font-medium text-slate-800 truncate">
            {faculty.name}
          </span>
          {subject && (
            <>
              <span className="text-slate-300 flex-shrink-0">—</span>
              <span className="text-xs text-slate-500 truncate flex-shrink-0">
                {subject.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            {faculty.current_count}/{faculty.max_limit}
          </span>
          {faculty.current_count > 0 && (
            <button
              onClick={() => onView(faculty)}
              className="text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2 py-0.5 rounded transition-colors font-medium">
              View
            </button>
          )}
        </div>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────
function DashboardTab({ stats }) {
  const [viewFaculty, setViewFaculty] = useState(null);

  if (!stats)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );

  const viewSubject = viewFaculty
    ? (stats.subjects || []).find((s) => s.id === viewFaculty.subject_id)
    : null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          color="blue"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Submitted"
          value={stats.submittedStudents}
          color="green"
          sub={`${stats.totalStudents > 0 ? Math.round((stats.submittedStudents / stats.totalStudents) * 100) : 0}% done`}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={stats.pendingStudents}
          color="yellow"
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Subjects"
          value={stats.subjects?.length}
          color="slate"
          sub={`${stats.faculty?.length || 0} faculty`}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
        />
      </div>

      {stats.totalStudents > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900 font-display text-sm">
              Overall Submission Progress
            </h3>
            <span className="text-sm font-bold text-primary-600">
              {Math.round(
                (stats.submittedStudents / stats.totalStudents) * 100,
              )}
              %
            </span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-600 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(stats.submittedStudents / stats.totalStudents) * 100}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-400">
              {stats.submittedStudents} submitted
            </span>
            <span className="text-xs text-slate-400">
              {stats.pendingStudents} pending
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 font-display mb-4">
            Faculty Seat Fill
          </h3>
          {!stats.faculty?.length ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No faculty added yet.
            </p>
          ) : (
            <div>
              {stats.faculty.map((f) => (
                <SeatBar
                  key={f.id}
                  faculty={f}
                  subjects={stats.subjects || []}
                  onView={(fac) => setViewFaculty(fac)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 font-display mb-4">
            Recent Submissions
          </h3>
          {!stats.recentSelections?.length ? (
            <p className="text-slate-400 text-sm text-center py-6">
              No submissions yet.
            </p>
          ) : (
            <div className="overflow-y-auto max-h-64 divide-y divide-slate-100">
              {stats.recentSelections.map((sel, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                    <span className="font-mono text-xs font-medium text-slate-700">
                      {sel.pin}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {sel.timestamp?.toDate
                      ? new Date(sel.timestamp.toDate()).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit", hour12: true },
                        )
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
            Showing last {stats.recentSelections?.length || 0} unique
            submissions
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-4">
          Subject Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {["Subject", "Code", "Faculty", "Total Seats", "Filled"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {stats.subjectBreakdown?.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {row.subject.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-500">
                    {row.subject.code}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.faculty.length}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {row.totalSeats}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-medium ${row.filledSeats >= row.totalSeats ? "text-red-600" : "text-green-600"}`}>
                      {row.filledSeats}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewFaculty && (
        <FacultyStudentsModal
          faculty={viewFaculty}
          subject={viewSubject}
          onClose={() => setViewFaculty(null)}
        />
      )}
    </div>
  );
}

// ── Subjects Tab ──────────────────────────────────────────────
function SubjectsTab({ stats, onRefresh }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim())
      return toast.error("Name and code required");
    setLoading(true);
    try {
      await addSubject(name.trim(), code.trim());
      toast.success("Subject added!");
      setName("");
      setCode("");
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to add subject");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCode(s.code);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCode("");
  };

  const handleEdit = async (id) => {
    if (!editName.trim() || !editCode.trim())
      return toast.error("Name and code required");
    setEditLoading(true);
    try {
      await editSubject(id, editName.trim(), editCode.trim());
      toast.success("Subject updated!");
      cancelEdit();
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to update subject");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSubject(deleteId);
      toast.success("Subject deleted.");
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      await resetAllSubjects();
      toast.success("All subjects and faculty deleted.");
      setShowResetConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-4">
          Add New Subject
        </h3>
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="label">Subject Name</label>
            <input
              className="input-field"
              placeholder="e.g. Data Structures"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="w-36">
            <label className="label">Code</label>
            <input
              className="input-field"
              placeholder="e.g. CS301"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Adding..." : "+ Add Subject"}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 font-display">
            Subjects ({stats?.subjects?.length || 0})
          </h3>
          <div className="flex items-center gap-2">
            <DownloadCSVButton
              label="Download CSV"
              onClick={() =>
                downloadBlob(exportSubjectsCSV(), `subjects_${Date.now()}.csv`)
              }
            />
            {stats?.subjects?.length > 0 && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                Reset All Subjects
              </button>
            )}
          </div>
        </div>
        {!stats?.subjects?.length ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No subjects added yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Code
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.subjects.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    {editingId === s.id ? (
                      <input
                        className="input-field py-1.5 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-slate-800">
                        {s.name}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editingId === s.id ? (
                      <input
                        className="input-field py-1.5 text-sm w-24"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        {s.code}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {editingId === s.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(s.id)}
                          disabled={editLoading}
                          className="text-xs text-green-700 hover:bg-green-50 px-2.5 py-1 rounded transition-colors font-medium">
                          {editLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded transition-colors">
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded transition-colors">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Subject"
        message="This will also delete all faculty for this subject. Are you sure?"
        danger
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ConfirmModal
        open={showResetConfirm}
        title="Reset All Subjects?"
        message="This will permanently delete ALL subjects and their faculty. This cannot be undone."
        danger
        confirmText="Delete All Subjects"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetConfirm(false)}
        loading={resetting}
      />
    </div>
  );
}

// ── Faculty Tab ───────────────────────────────────────────────
function FacultyTab({ stats, onRefresh }) {
  // CHANGE 1: Removed "experience" from initial form state
  const [form, setForm] = useState({
    name: "",
    subject_id: "",
    max_limit: "",
  });
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");

  //date for csv filename
  const today = new Date();
  const formatteddate =
    String(today.getDate()).padStart(2, "0") +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    today.getFullYear() +
    "_" +
    String(today.getHours()).padStart(2, "0") +
    "_" +
    String(today.getMinutes()).padStart(2, "0");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.subject_id || !form.max_limit)
      return toast.error("Name, subject and max seats required");
    setLoading(true);
    try {
      // CHANGE 2: Removed experience from addFaculty call
      await addFaculty({
        ...form,
        max_limit: Number(form.max_limit),
      });
      toast.success("Faculty added!");
      // CHANGE 3: Removed "experience" from reset
      setForm({ name: "", subject_id: "", max_limit: "" });
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to add faculty");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    // CHANGE 4: Removed experience from edit form
    setEditForm({
      name: f.name,
      subject_id: f.subject_id,
      max_limit: f.max_limit,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEdit = async (id) => {
    setEditLoading(true);
    try {
      // CHANGE 5: Removed experience from editFaculty call
      await editFaculty(id, {
        ...editForm,
        max_limit: Number(editForm.max_limit),
      });
      toast.success("Faculty updated!");
      cancelEdit();
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to update");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFaculty(deleteId);
      toast.success("Faculty deleted.");
      setDeleteId(null);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      await resetAllFaculty();
      toast.success("All faculty deleted.");
      setShowResetConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset");
    } finally {
      setResetting(false);
    }
  };

  const filteredFaculty = filterSubject
    ? (stats?.faculty || []).filter((f) => f.subject_id === filterSubject)
    : stats?.faculty || [];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-4">
          Add New Faculty
        </h3>
        {/* CHANGE 6: Removed experience field from Add form, changed grid */}
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Faculty Name</label>
            <input
              className="input-field"
              placeholder="e.g. Dr. Reddy"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Subject</label>
            <select
              className="input-field"
              value={form.subject_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, subject_id: e.target.value }))
              }>
              <option value="">Select subject</option>
              {stats?.subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Max Seats</label>
            <input
              type="number"
              min="1"
              className="input-field"
              placeholder="30"
              value={form.max_limit}
              onChange={(e) =>
                setForm((p) => ({ ...p, max_limit: e.target.value }))
              }
            />
          </div>
          {/* CHANGE 7: Experience field REMOVED from here */}
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}>
              {loading ? "Adding..." : "+ Add Faculty"}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-slate-900 font-display">
            Faculty ({filteredFaculty.length})
          </h3>
          <div className="flex items-center gap-3">
            <DownloadCSVButton
              label="Download CSV"
              onClick={() =>
                downloadBlob(
                  exportFacultyCSV(),
                  `faculty_list_${formatteddate}.csv`,
                )
              }
            />
            <select
              className="input-field py-1.5 text-sm w-48"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {stats?.subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {stats?.faculty?.length > 0 && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                Reset All Faculty
              </button>
            )}
          </div>
        </div>
        {!filteredFaculty.length ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            No faculty found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                {/* CHANGE 8: Removed "Exp (yrs)" from table headers */}
                <tr>
                  {["Name", "Subject", "Seats", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFaculty.map((f) => {
                  const subject = stats?.subjects?.find(
                    (s) => s.id === f.subject_id,
                  );
                  const isEditing = editingId === f.id;
                  return (
                    <tr
                      key={f.id}
                      className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="input-field py-1 text-sm w-36"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="font-medium text-slate-800">
                            {f.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="input-field py-1 text-sm"
                            value={editForm.subject_id}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                subject_id: e.target.value,
                              }))
                            }>
                            {stats?.subjects?.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-600">
                            {subject?.name || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            className="input-field py-1 text-sm w-20"
                            value={editForm.max_limit}
                            onChange={(e) =>
                              setEditForm((p) => ({
                                ...p,
                                max_limit: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span
                            className={`font-medium ${f.current_count >= f.max_limit ? "text-red-600" : "text-green-600"}`}>
                            {f.current_count}/{f.max_limit}
                          </span>
                        )}
                      </td>
                      {/* CHANGE 9: Removed experience <td> column entirely */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(f.id)}
                              disabled={editLoading}
                              className="text-xs text-green-700 hover:bg-green-50 px-2.5 py-1 rounded font-medium">
                              {editLoading ? "..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(f)}
                              className="text-xs text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded">
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteId(f.id)}
                              className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded">
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete Faculty"
        message="Are you sure you want to delete this faculty member?"
        danger
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
      <ConfirmModal
        open={showResetConfirm}
        title="Reset All Faculty?"
        message="This will permanently delete ALL faculty members. This cannot be undone."
        danger
        confirmText="Delete All Faculty"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetConfirm(false)}
        loading={resetting}
      />
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────
function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column)
    return (
      <svg
        className="w-3.5 h-3.5 text-slate-300 ml-1 inline"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  return sortDir === "asc" ? (
    <svg
      className="w-3.5 h-3.5 text-primary-600 ml-1 inline"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  ) : (
    <svg
      className="w-3.5 h-3.5 text-primary-600 ml-1 inline"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function StudentsTab({ onRefresh }) {
  const [view, setView] = useState("all");
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("pin");
  const [sortDir, setSortDir] = useState("asc");
  const [deletePin, setDeletePin] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudents(view);
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleDeleteOne = async () => {
    setDeleting(true);
    try {
      await deleteStudent(deletePin);
      toast.success(`Student ${deletePin} deleted.`);
      setDeletePin(null);
      fetchStudents();
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetStudents = async () => {
    setResetting(true);
    try {
      await resetStudents();
      toast.success("All student data deleted.");
      setShowResetConfirm(false);
      fetchStudents();
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset");
    } finally {
      setResetting(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.pin?.toLowerCase().includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.year?.toString().includes(q) ||
      s.name?.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortKey] ?? "";
    let bVal = b[sortKey] ?? "";
    if (sortKey === "has_submitted") {
      aVal = a.has_submitted ? 1 : 0;
      bVal = b.has_submitted ? 1 : 0;
    }
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const COLS = [
    { key: "name", label: "Name" },
    { key: "pin", label: "PIN" },
    { key: "branch", label: "Branch" },
    { key: "year", label: "Year" },
    { key: "has_submitted", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {["all", "submitted", "pending"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                    view === v
                      ? "bg-white text-primary-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}>
                  {v}{" "}
                  {view === v && (
                    <span className="ml-1 font-bold">({total})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  className="input-field py-1.5 pl-9 text-sm w-52"
                  placeholder="Search name, PIN, branch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DownloadCSVButton
                  label="Download CSV"
                  onClick={() =>
                    downloadBlob(
                      exportStudentsCSV(),
                      `students_${Date.now()}.csv`,
                    )
                  }
                />
                {students.length > 0 && (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap">
                    Delete All Students
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : !sorted.length ? (
          <div className="py-14 text-center">
            <svg
              className="w-10 h-10 text-slate-200 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-slate-400 text-sm">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none">
                      <span className="flex items-center gap-1">
                        {col.label}
                        <SortIcon
                          column={col.key}
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                  ))}
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {sorted.map((s) => (
                    <motion.tr
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-800 font-medium">
                        {s.name || (
                          <span className="text-slate-300 italic text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {s.pin}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {s.branch || "—"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {s.year || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {s.has_submitted ? (
                          <span className="badge-green">✓ Submitted</span>
                        ) : (
                          <span className="badge-yellow">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeletePin(s.pin)}
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1 rounded transition-colors">
                          Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Showing{" "}
            <span className="font-semibold text-slate-600">
              {sorted.length}
            </span>{" "}
            of <span className="font-semibold text-slate-600">{total}</span>{" "}
            students
            {search && <span className="ml-1">(filtered)</span>}
          </p>
          {sortKey && (
            <p className="text-xs text-slate-400">
              Sorted by{" "}
              <span className="font-medium text-slate-600">{sortKey}</span> (
              {sortDir === "asc" ? "A→Z" : "Z→A"})
              <button
                onClick={() => {
                  setSortKey("pin");
                  setSortDir("asc");
                }}
                className="ml-2 text-primary-500 hover:underline">
                Reset
              </button>
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deletePin}
        title="Delete Student?"
        message={`Are you sure you want to delete student ${deletePin}? Their selections will also be removed and faculty seat counts adjusted.`}
        danger
        confirmText="Delete Student"
        onConfirm={handleDeleteOne}
        onCancel={() => setDeletePin(null)}
        loading={deleting}
      />

      <ConfirmModal
        open={showResetConfirm}
        title="Delete All Students?"
        message="This will permanently delete ALL student records. Students will no longer be able to login. This cannot be undone."
        danger
        confirmText="Delete All Students"
        onConfirm={handleResetStudents}
        onCancel={() => setShowResetConfirm(false)}
        loading={resetting}
      />
    </div>
  );
}

// ── Admin Countdown ───────────────────────────────────────────
function AdminCountdown({ endTime, selectionOpen }) {
  const [timeLeft, setTimeLeft] = React.useState(null);

  React.useEffect(() => {
    if (!endTime || !selectionOpen) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const diff = endTime - new Date();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        total: diff,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, selectionOpen]);

  if (!selectionOpen) return null;
  if (!endTime)
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-green-700">
          Open — No End Time
        </span>
      </div>
    );
  if (!timeLeft) return null;
  const isUrgent = timeLeft.total < 10 * 60 * 1000;
  const fmt = (v) => String(v).padStart(2, "0");
  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${isUrgent ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        Closes in {fmt(timeLeft.hours)}:{fmt(timeLeft.minutes)}:
        {fmt(timeLeft.seconds)}
      </span>
      {isUrgent && <span className="ml-1 animate-pulse">!</span>}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────
function SettingsTab({
  stats,
  onRefresh,
  realtimeEndTime,
  realtimeSelectionOpen,
}) {
  const tooltipRef = useRef(null);
  const buttonRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [toggling, setToggling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [endTimeError, setEndTimeError] = useState("");
  const isOpen = stats?.config?.selection_open;

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTooltip &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTooltip]);

  //date for csv filename
  const today = new Date();
  const formatteddate =
    String(today.getDate()).padStart(2, "0") +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    today.getFullYear() +
    "_" +
    String(today.getHours()).padStart(2, "0") +
    "-" +
    String(today.getMinutes()).padStart(2, "0");

  const savedEndTimeStr = realtimeEndTime
    ? realtimeEndTime.toLocaleString("en-IN", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  const handleEndTimeChange = (val) => {
    setEndTime(val);
    if (val) {
      const localDate = new Date(val);
      if (isNaN(localDate.getTime()) || localDate <= new Date()) {
        setEndTimeError("End time must be in the future");
      } else {
        setEndTimeError("");
      }
    } else {
      setEndTimeError("");
    }
  };

  const handleToggle = async () => {
    if (endTimeError) return toast.error("Fix the end time error first");
    if (endTime) {
      const selected = new Date(endTime);
      if (isNaN(selected.getTime()) || selected <= new Date()) {
        setEndTimeError("End time must be in the future");
        return toast.error("End time must be in the future");
      }
    }
    setToggling(true);
    try {
      const isoEndTime = endTime ? new Date(endTime).toISOString() : undefined;
      await toggleSelection(!isOpen, isoEndTime);
      toast.success(`Selection ${!isOpen ? "opened" : "closed"} successfully.`);
      setEndTime("");
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to toggle");
    } finally {
      setToggling(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetSelections();
      toast.success("All selections reset successfully.");
      setShowResetConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset");
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faculty_selections_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported!");
    } catch (err) {
      toast.error("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setPendingImport(null);
    try {
      const result = await importStudents(file);
      if ((result.duplicateCount ?? 0) > 0) {
        // Hold result — show warning panel instead of success
        setPendingImport(result);
      } else {
        setImportResult(result);
        toast.success(`Imported ${result.importedCount} students!`);
        onRefresh();
      }
    } catch (err) {
      toast.error(err.error || "Import failed.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
  };

  const handleConfirmImport = () => {
    setImportResult(pendingImport);
    setPendingImport(null);
    toast.success(`Imported ${pendingImport.importedCount} students!`);
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-1">
          Selection Window
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Control when students can submit faculty selections.
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpen ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
          />
          <span className="text-sm font-medium text-slate-700">
            Selection is currently{" "}
            <strong className={isOpen ? "text-green-700" : "text-slate-600"}>
              {isOpen ? "OPEN" : "CLOSED"}
            </strong>
          </span>
        </div>

        {isOpen && realtimeEndTime && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <svg
              className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Scheduled to close at
              </p>
              <p className="text-sm text-amber-700 font-mono mt-0.5">
                {savedEndTimeStr}
              </p>
            </div>
          </motion.div>
        )}

        {isOpen && !realtimeEndTime && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <svg
              className="w-4 h-4 text-green-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-700">
              Open with no end time — closes only when you manually close it.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="label">
              {isOpen
                ? "Update End Time (optional)"
                : "Set End Time (optional)"}
            </label>
            <input
              type="datetime-local"
              className={`input-field ${endTimeError ? "border-red-400 focus:ring-red-400" : ""}`}
              value={endTime}
              min={minDateTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
            />
            {endTimeError && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {endTimeError}
              </p>
            )}
            {endTime && !endTimeError && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Will close on{" "}
                {new Date(endTime).toLocaleString("en-IN", {
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling || !!endTimeError}
            className={`w-full px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isOpen
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {toggling ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isOpen ? (
              "Close Selection"
            ) : (
              "Open Selection"
            )}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="relative">
          <h3 className="font-semibold text-slate-900 font-display mb-1 inline-flex items-center gap-2">
            Import Students
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 23 23"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </h3>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              ref={tooltipRef}
              className="absolute z-50 w-74 p-3 text-sm text-slate-700 bg-slate-50 rounded-lg shadow-lg border border-slate-200 top-full mt-2 left-0">
              <p className="font-semibold mb-1">Accepted header formats:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  <span className="font-mono" style={{ fontWeight: "bold" }}>
                    Student Name column:
                  </span>{" "}
                  <span>name, student, candidate</span>
                </li>
                <li>
                  <span className="font-mono" style={{ fontWeight: "bold" }}>
                    DOB column:
                  </span>{" "}
                  <span>dob, date, birth, born</span>
                </li>
                <li>
                  <span className="font-mono" style={{ fontWeight: "bold" }}>
                    RegNo/PIN column:
                  </span>{" "}
                  <span>pin, regno, roll, id, no</span>
                </li>
              </ul>
            </motion.div>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Upload an Excel (.xlsx) file with name , regno and dob columns <br />
          eg :{" "}
          <span
            style={{
              backgroundColor: "#eff6ff",
              color: "#1d4ed8",
              borderRadius: "0.25rem",
              padding: "0.125rem 0.25rem",
              fontWeight: "bold",
            }}>
            | Name | PIN | DOB |
          </span>
        </p>
        <label
          className={`btn-secondary cursor-pointer flex items-center gap-2 w-fit ${importing ? "opacity-50 cursor-not-allowed" : ""}`}>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {importing ? "Importing..." : "Upload Excel File"}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
            disabled={importing}
          />
        </label>
        <AnimatePresence mode="wait">
          {pendingImport && (
            <motion.div
              key="dup-warning"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-800">
                    Duplicate Records Detected
                  </p>
                  <p className="text-amber-700 mt-0.5">
                    Found <strong>{pendingImport.duplicateCount}</strong>{" "}
                    duplicate PIN(s) in the file.
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Only the last occurrence of each duplicate will be saved.
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={handleCancelImport}
                      className="text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                      Cancel Import
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      className="text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors">
                      Ignore Duplicates &amp; Continue
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {importResult && !pendingImport && (
            <motion.div
              key="import-success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-green-800">Import complete!</p>
              <p className="text-green-600 mt-0.5">
                ✓ {importResult.importedCount} imported ·{" "}
                {importResult.skippedCount} skipped
              </p>
              {importResult.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-green-700 cursor-pointer">
                    View errors ({importResult.errors.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">
                        {e}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-1">
          Export Data
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Download faculty selections as CSV.
        </p>
        {/* Student-wise export */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary flex items-center gap-2 w-fit">
            {isExporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Student-wise CSV
              </>
            )}
          </button>

          {/* Faculty-wise export — NEW */}
          <DownloadCSVButton
            label="Export Faculty-wise CSV"
            onClick={() =>
              downloadBlob(
                exportFacultyCSV(),
                `faculty_wise${formatteddate}.csv`,
              )
            }
          />
        </div>
      </div>

      <div className="card p-5 border-red-200">
        <h3 className="font-semibold text-red-700 font-display mb-1">
          Danger Zone
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Reset all submissions — clears selections and resets faculty seat
          counts.
        </p>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn-danger flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset All Selections
        </button>
      </div>

      <ConfirmModal
        open={showResetConfirm}
        title="Reset All Selections?"
        message="This will permanently delete all student selections and reset faculty seat counts. This cannot be undone."
        danger
        confirmText="Yes, Reset Everything"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
        loading={resetting}
      />
    </div>
  );
}

// ── Admin Dashboard (Main) ────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { faculty: realtimeFaculty } = useRealtimeFaculty();
  const { subjects: realtimeSubjects } = useRealtimeSubjects();
  const {
    config: realtimeConfig,
    endTime: realtimeEndTime,
    selectionOpen: realtimeSelectionOpen,
  } = useRealtimeConfig();

  const mergedStats = stats
    ? {
        ...stats,
        faculty: realtimeFaculty.length > 0 ? realtimeFaculty : stats.faculty,
        subjects:
          realtimeSubjects.length > 0 ? realtimeSubjects : stats.subjects,
        config: realtimeConfig ?? stats.config,
        subjectBreakdown: (realtimeSubjects.length > 0
          ? realtimeSubjects
          : stats.subjects || []
        ).map((sub) => {
          const subFaculty = (
            realtimeFaculty.length > 0 ? realtimeFaculty : stats.faculty || []
          ).filter((f) => f.subject_id === sub.id);
          return {
            subject: sub,
            faculty: subFaculty,
            totalSeats: subFaculty.reduce((a, f) => a + f.max_limit, 0),
            filledSeats: subFaculty.reduce((a, f) => a + f.current_count, 0),
          };
        }),
      }
    : null;

  const [sessionWarning, setSessionWarning] = useState(false);
  const authErrorCount = useRef(0);

  useEffect(() => {
    const checkExpiry = () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiresIn = payload.exp * 1000 - Date.now();
        if (expiresIn < 30 * 60 * 1000 && expiresIn > 0) {
          setSessionWarning(true);
        } else {
          setSessionWarning(false);
        }
      } catch {}
    };
    checkExpiry();
    const i = setInterval(checkExpiry, 60000);
    return () => clearInterval(i);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      authErrorCount.current = 0;
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (
        err.code === "UNAUTHORIZED" ||
        err.code === "FORBIDDEN" ||
        err.status === 401 ||
        err.status === 403
      ) {
        authErrorCount.current += 1;
        console.warn(
          `Admin auth error #${authErrorCount.current}:`,
          err.code || err.status,
        );
        if (authErrorCount.current >= 3) {
          logout();
          navigate("/admin/login");
        }
      } else {
        console.warn("fetchStats failed (non-auth):", err.message || err.error);
      }
    }
  }, [logout, navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const i = setInterval(fetchStats, 60000);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchStats]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-slate-900 font-display text-sm leading-tight">
                  Admin Portal
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400 leading-tight">
                    Live
                  </span>
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                  {tab}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 flex-shrink-0">
              <AdminCountdown
                endTime={realtimeEndTime}
                selectionOpen={realtimeSelectionOpen}
              />
              {lastUpdated && (
                <span className="text-xs text-slate-400 hidden lg:inline">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh">
                <svg
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {sessionWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium text-amber-800">
                Your session expires soon. Please save your work and log in
                again to avoid being signed out.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap underline underline-offset-2">
              Re-login now
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === "Dashboard" && <DashboardTab stats={mergedStats} />}
            {activeTab === "Subjects" && (
              <SubjectsTab stats={mergedStats} onRefresh={fetchStats} />
            )}
            {activeTab === "Faculty" && (
              <FacultyTab stats={mergedStats} onRefresh={fetchStats} />
            )}
            {activeTab === "Students" && <StudentsTab onRefresh={fetchStats} />}
            {activeTab === "Settings" && (
              <SettingsTab
                stats={mergedStats}
                onRefresh={fetchStats}
                realtimeEndTime={realtimeEndTime}
                realtimeSelectionOpen={realtimeSelectionOpen}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer is commented out as requested */}
      {/* <Footer /> */}
    </div>
  );
}

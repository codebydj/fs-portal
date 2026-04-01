import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  exportStudentWiseGroupA,
  exportStudentWiseGroupB,
  resetFacultyByGroup,
  exportFacultyWiseGroupA,
  exportFacultyWiseGroupB,
} from "../../services/api";
import {
  useRealtimeFaculty,
  useRealtimeSubjects,
  useRealtimeConfig,
} from "../../hooks/useRealtimeData";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Footer from "../../components/shared/Footer";

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
    purple: "bg-purple-50 text-purple-600",
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
function DashboardTab({ stats, error }) {
  const [viewFaculty, setViewFaculty] = useState(null);
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    if (stats) {
      setLoading(false);
    }
  }, [stats]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 font-medium mb-2">
            Failed to load dashboard
          </p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !stats || !stats.groupA || !stats.groupB)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="ml-3 text-slate-500">Loading dashboard...</p>
      </div>
    );

  const GroupDashboard = ({ groupData, groupName, color }) => {
    // Defensively merge with defaults to ensure properties exist, preventing "—" from showing.
    const safeGroupData = {
      totalStudents: 0,
      submittedStudents: 0,
      pendingStudents: 0,
      faculty: [],
      recentSelections: [],
      ...groupData,
    };
    return (
      <>
        <h3 className="font-semibold text-slate-900 font-display text-lg">
          Group {groupName} Dashboard
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={safeGroupData.totalStudents}
            color={color}
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
            value={safeGroupData.submittedStudents}
            color="green"
            sub={`${safeGroupData.totalStudents > 0 ? Math.round((safeGroupData.submittedStudents / safeGroupData.totalStudents) * 100) : 0}% done`}
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
            value={safeGroupData.pendingStudents}
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
            sub={`${safeGroupData.faculty?.length || 0} faculty`}
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

        {safeGroupData.totalStudents > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900 font-display text-sm">
                Group {groupName} Submission Progress
              </h4>
              <span className="text-sm font-bold text-primary-600">
                {Math.round(
                  (safeGroupData.submittedStudents /
                    safeGroupData.totalStudents) *
                    100,
                )}
                %
              </span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-600 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${(safeGroupData.submittedStudents / safeGroupData.totalStudents) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-slate-400">
                {safeGroupData.submittedStudents} submitted
              </span>
              <span className="text-xs text-slate-400">
                {safeGroupData.pendingStudents} pending
              </span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h4 className="font-semibold text-slate-900 font-display mb-4">
              Group {groupName} Faculty Seat Fill
            </h4>
            {!safeGroupData.faculty?.length ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No faculty added yet for Group {groupName}.
              </p>
            ) : (
              <div>
                {safeGroupData.faculty.map((f) => (
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
            <h4 className="font-semibold text-slate-900 font-display mb-4">
              Group {groupName} Recent Submissions
            </h4>
            {!safeGroupData.recentSelections?.length ? (
              <p className="text-slate-400 text-sm text-center py-6">
                No submissions yet for Group {groupName}.
              </p>
            ) : (
              <div className="overflow-y-auto max-h-64 divide-y divide-slate-100">
                {safeGroupData.recentSelections.map((sel, i) => (
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
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              Showing last {safeGroupData.recentSelections?.length || 0} unique
              submissions
            </p>
          </div>
        </div>
      </>
    );
  };

  const viewSubject = viewFaculty
    ? (stats.subjects || []).find((s) => s.id === viewFaculty.subject_id)
    : null;

  return (
    <div className="space-y-8">
      <GroupDashboard groupData={stats.groupA} groupName="A" color="blue" />
      <GroupDashboard groupData={stats.groupB} groupName="B" color="purple" />
      <FacultyStudentsModal
        faculty={viewFaculty}
        subject={viewSubject}
        onClose={() => setViewFaculty(null)}
      />
    </div>
  );
}

// ── Sort Icon Component ───────────────────────────────────────
const SortIcon = ({ column, sortKey, sortDir }) => {
  if (sortKey !== column) {
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
  }
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
};

// ── Subjects Tab (Corrected) ──────────────────────────────────
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
  const [sortKey, setSortKey] = useState("name"); // Default sort key
  const [sortDir, setSortDir] = useState("asc"); // Default sort direction

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedSubjects = useMemo(() => {
    if (!stats?.subjects) return [];
    const sortable = [...stats.subjects];
    sortable.sort((a, b) => {
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [stats?.subjects, sortKey, sortDir]);

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
                <th
                  className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort("name")}>
                  <span className="flex items-center gap-1">
                    Name
                    <SortIcon
                      column="name"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th
                  className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort("code")}>
                  <span className="flex items-center gap-1">
                    Code
                    <SortIcon
                      column="code"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map((s) => (
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
                          className="text-xs text-green-700 hover:bg-green-50 px-2.5 py-1 rounded font-medium">
                          {editLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-slate-500 hover:bg-slate-100 px-2.5 py-1 rounded">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded">
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded">
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

// ── Faculty Tab (Corrected) ───────────────────────────────────
function FacultyTab({ stats, onRefresh }) {
  // CHANGE 1: Removed "experience" from initial form state
  const [form, setForm] = useState({
    name: "",
    subject_id: "",
    max_limit: "",
    group: "A",
  });
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false); // For all faculty
  const [resettingAll, setResettingAll] = useState(false);
  const [showResetGroupAConfirm, setShowResetGroupAConfirm] = useState(false); // For Group A faculty
  const [resettingGroupA, setResettingGroupA] = useState(false);
  const [showResetGroupBConfirm, setShowResetGroupBConfirm] = useState(false); // For Group B faculty
  const [resettingGroupB, setResettingGroupB] = useState(false);

  const [filterSubject, setFilterSubject] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  const [sortKey, setSortKey] = useState("name"); // Default sort key
  const [sortDir, setSortDir] = useState("asc"); // Default sort direction

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.subject_id || !form.max_limit || !form.group)
      return toast.error("Name, subject, max seats and group required");
    setLoading(true);
    try {
      // CHANGE 2: Removed experience from addFaculty call
      await addFaculty({
        ...form,
        max_limit: Number(form.max_limit),
      });
      toast.success("Faculty added!");
      // CHANGE 3: Removed "experience" from reset
      setForm({ name: "", subject_id: "", max_limit: "", group: "A" });
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
      group: f.group,
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

  const handleResetAllFaculty = async () => {
    setResettingAll(true);
    try {
      await resetAllFaculty();
      toast.success("All faculty deleted.");
      setShowResetAllConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset all faculty");
    } finally {
      setResettingAll(false);
    }
  };

  const handleResetGroupAFaculty = async () => {
    setResettingGroupA(true);
    try {
      await resetFacultyByGroup("A");
      toast.success("All faculty for Group A deleted.");
      setShowResetGroupAConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset Group A faculty");
    } finally {
      setResettingGroupA(false);
    }
  };

  const handleResetGroupBFaculty = async () => {
    setResettingGroupB(true);
    try {
      await resetFacultyByGroup("B");
      toast.success("All faculty for Group B deleted.");
      setShowResetGroupBConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to reset Group B faculty");
    } finally {
      setResettingGroupB(false);
    }
  };

  const sortedFaculty = useMemo(() => {
    if (!stats?.faculty) return [];
    const sortable = [...stats.faculty];
    sortable.sort((a, b) => {
      let aVal = a[sortKey] ?? "";
      let bVal = b[sortKey] ?? "";

      // Custom sort for 'Seats' (max_limit)
      if (sortKey === "seats") {
        aVal = a.max_limit;
        bVal = b.max_limit;
      } else if (sortKey === "subject") {
        const subjectA = stats.subjects?.find((s) => s.id === a.subject_id);
        const subjectB = stats.subjects?.find((s) => s.id === b.subject_id);
        aVal = subjectA?.name || "";
        bVal = subjectB?.name || "";
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [stats?.faculty, stats?.subjects, sortKey, sortDir]);

  const facultyA = sortedFaculty
    .filter((f) => f.group === "A")
    .filter((f) => !filterSubject || f.subject_id === filterSubject);
  const facultyB = sortedFaculty
    .filter((f) => f.group === "B")
    .filter((f) => !filterSubject || f.subject_id === filterSubject);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-4">
          Add New Faculty
        </h3>
        <form
          // CHANGE 6: Removed experience field from Add form, changed grid
          onSubmit={handleAdd}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
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
          <div>
            <label className="label">Group</label>
            <select
              className="input-field"
              value={form.group}
              onChange={(e) =>
                setForm((p) => ({ ...p, group: e.target.value }))
              }>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
            </select>
          </div>
          <div className="flex items-end col-span-2 sm:col-span-4">
            {/* CHANGE 7: Experience field REMOVED from here */}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}>
              {loading ? "Adding..." : "+ Add Faculty"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-slate-900 font-display">
            Faculty Filters
          </h3>
          <div className="flex items-center gap-3">
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
            <select
              className="input-field py-1.5 text-sm w-32"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="">All Groups</option>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
            </select>
          </div>
        </div>
      </div>

      {/* Group A Faculty Table */}
      {(filterGroup === "" || filterGroup === "A") && (
        <div
          className="card overflow-hidden"
          key={`faculty-a-${facultyA.length}`}>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-slate-900 font-display">
              Group A Faculty ({facultyA.length})
            </h3>
            <div className="flex items-center gap-2">
              <DownloadCSVButton
                label="Download CSV"
                onClick={() =>
                  // Existing export for detailed selections
                  downloadBlob(
                    exportFacultyWiseGroupA(),
                    `faculty_group_a_${Date.now()}.csv`,
                  )
                }
              />
              {facultyA.length > 0 && (
                <button
                  onClick={() => setShowResetGroupAConfirm(true)}
                  className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                  Delete All Group A Faculty
                </button>
              )}
            </div>
          </div>
          {!facultyA.length ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No faculty found for Group A with current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("name")}>
                      <span className="flex items-center gap-1">
                        Name
                        <SortIcon
                          column="name"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("subject")}>
                      <span className="flex items-center gap-1">
                        Subject
                        <SortIcon
                          column="subject"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("seats")}>
                      <span className="flex items-center gap-1">
                        Seats
                        <SortIcon
                          column="seats"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facultyA.map((f) => {
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
      )}

      {/* Group B Faculty Table */}
      {(filterGroup === "" || filterGroup === "B") && (
        <div
          className="card overflow-hidden"
          key={`faculty-b-${facultyB.length}`}>
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-slate-900 font-display">
              Group B Faculty ({facultyB.length})
            </h3>
            <div className="flex items-center gap-2">
              <DownloadCSVButton
                label="Download CSV"
                onClick={() =>
                  // Existing export for detailed selections
                  downloadBlob(
                    exportFacultyWiseGroupB(),
                    `faculty_group_b_${Date.now()}.csv`,
                  )
                }
              />
              {facultyB.length > 0 && (
                <button
                  onClick={() => setShowResetGroupBConfirm(true)}
                  className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
                  Delete All Group B Faculty
                </button>
              )}
            </div>
          </div>
          {!facultyB.length ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              No faculty found for Group B with current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("name")}>
                      <span className="flex items-center gap-1">
                        Name
                        <SortIcon
                          column="name"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("subject")}>
                      <span className="flex items-center gap-1">
                        Subject
                        <SortIcon
                          column="subject"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap cursor-pointer hover:text-primary-600 hover:bg-slate-100 transition-colors select-none"
                      onClick={() => handleSort("seats")}>
                      <span className="flex items-center gap-1">
                        Seats
                        <SortIcon
                          column="seats"
                          sortKey={sortKey}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facultyB.map((f) => {
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
      )}
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
        open={showResetAllConfirm}
        title="Reset All Faculty?"
        message="This will permanently delete ALL faculty members. This cannot be undone."
        danger
        confirmText="Delete All Faculty"
        onConfirm={handleResetAllFaculty}
        onCancel={() => setShowResetAllConfirm(false)}
        loading={resettingAll}
      />
      <ConfirmModal
        open={showResetGroupAConfirm}
        title="Delete All Group A Faculty?"
        message="This will permanently delete ALL faculty members for Group A. This cannot be undone."
        danger
        confirmText="Delete Group A Faculty"
        onConfirm={handleResetGroupAFaculty}
        onCancel={() => setShowResetGroupAConfirm(false)}
        loading={resettingGroupA}
      />
      <ConfirmModal
        open={showResetGroupBConfirm}
        title="Delete All Group B Faculty?"
        message="This will permanently delete ALL faculty members for Group B. This cannot be undone."
        danger
        confirmText="Delete Group B Faculty"
        onConfirm={handleResetGroupBFaculty}
        onCancel={() => setShowResetGroupBConfirm(false)}
        loading={resettingGroupB}
      />
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────
function StudentsTab({ onRefresh, refreshTrigger }) {
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
  const [filterBranch, setFilterBranch] = useState("");
  const [filterYear, setFilterYear] = useState("");

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
  }, [fetchStudents, refreshTrigger]);

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
    const matchesSearch =
      s.pin?.toLowerCase().includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.year?.toString().includes(q) ||
      s.name?.toLowerCase().includes(q);
    const matchesBranch = !filterBranch || s.branch === filterBranch;
    const matchesYear = !filterYear || s.year?.toString() === filterYear;
    return matchesSearch && matchesBranch && matchesYear;
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

  const studentsA = sorted.filter((s) => s.group === "A");
  const studentsB = sorted.filter((s) => s.group === "B");

  const COLS = [
    { key: "name", label: "Name" },
    { key: "pin", label: "PIN" },
    { key: "branch", label: "Branch" },
    { key: "year", label: "Year" },
    { key: "has_submitted", label: "Status" },
  ];

  return (
    <>
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
              <select
                className="input-field py-1.5 text-sm w-32"
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}>
                <option value="">All Branches</option>
                {[
                  ...new Set(students.map((s) => s.branch).filter(Boolean)),
                ].map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              <select
                className="input-field py-1.5 text-sm w-24"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {[...new Set(students.map((s) => s.year).filter(Boolean))].map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ),
                )}
              </select>
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
            <p className="text-slate-400 text-sm">
              No students found in any group.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group A Students Table */}
            <div
              className="card overflow-hidden"
              key={`students-a-${studentsA.length}`}>
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 font-display">
                  Group A Students ({studentsA.length})
                </h3>
              </div>
              {studentsA.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No students found for Group A.
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
                        {studentsA.map((s) => (
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
                    {studentsA.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">{total}</span>{" "}
                  students in Group A
                  {search && <span className="ml-1">(filtered)</span>}
                </p>
                {sortKey && (
                  <p className="text-xs text-slate-400">
                    Sorted by{" "}
                    <span className="font-medium text-slate-600">
                      {sortKey}
                    </span>{" "}
                    ({sortDir === "asc" ? "A→Z" : "Z→A"})
                  </p>
                )}
              </div>
            </div>

            {/* Group B Students Table */}
            <div
              className="card overflow-hidden"
              key={`students-b-${studentsB.length}`}>
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 font-display">
                  Group B Students ({studentsB.length})
                </h3>
              </div>
              {studentsB.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No students found for Group B.
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
                        {studentsB.map((s) => (
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
                    {studentsB.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-600">{total}</span>{" "}
                  students in Group B
                  {search && <span className="ml-1">(filtered)</span>}
                </p>
                {sortKey && (
                  <p className="text-xs text-slate-400">
                    Sorted by{" "}
                    <span className="font-medium text-slate-600">
                      {sortKey}
                    </span>{" "}
                    ({sortDir === "asc" ? "A→Z" : "Z→A"})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
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
    </>
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
  const [endTimeA, setEndTimeA] = useState("");
  const [endTimeB, setEndTimeB] = useState("");
  const [togglingA, setTogglingA] = useState(false);
  const [togglingB, setTogglingB] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [endTimeErrorA, setEndTimeErrorA] = useState("");
  const [endTimeErrorB, setEndTimeErrorB] = useState("");
  const [importGroup, setImportGroup] = useState("A");
  const isOpenA = stats?.config?.selection_open_a;
  const isOpenB = stats?.config?.selection_open_b;

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

  const savedEndTimeA = stats?.config?.end_time_a
    ? stats.config.end_time_a.toDate().toLocaleString("en-IN", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  const savedEndTimeB = stats?.config?.end_time_b
    ? stats.config.end_time_b.toDate().toLocaleString("en-IN", {
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

  const handleEndTimeChangeA = (val) => {
    setEndTimeA(val);
    if (val) {
      const localDate = new Date(val);
      if (isNaN(localDate.getTime()) || localDate <= new Date()) {
        setEndTimeErrorA("End time must be in the future");
      } else {
        setEndTimeErrorA("");
      }
    } else {
      setEndTimeErrorA("");
    }
  };

  const handleEndTimeChangeB = (val) => {
    setEndTimeB(val);
    if (val) {
      const localDate = new Date(val);
      if (isNaN(localDate.getTime()) || localDate <= new Date()) {
        setEndTimeErrorB("End time must be in the future");
      } else {
        setEndTimeErrorB("");
      }
    } else {
      setEndTimeErrorB("");
    }
  };

  const handleToggleA = async () => {
    if (endTimeErrorA) return toast.error("Fix the end time error first");
    if (endTimeA) {
      const selected = new Date(endTimeA);
      if (isNaN(selected.getTime()) || selected <= new Date()) {
        setEndTimeErrorA("End time must be in the future");
        return toast.error("End time must be in the future");
      }
    }
    setTogglingA(true);
    try {
      const isoEndTime = endTimeA
        ? new Date(endTimeA).toISOString()
        : undefined;
      await toggleSelection(!isOpenA, isoEndTime, "A");
      toast.success(
        `Selection for Group A ${!isOpenA ? "opened" : "closed"} successfully.`,
      );
      setEndTimeA("");
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to toggle");
    } finally {
      setTogglingA(false);
    }
  };

  const handleToggleB = async () => {
    if (endTimeErrorB) return toast.error("Fix the end time error first");
    if (endTimeB) {
      const selected = new Date(endTimeB);
      if (isNaN(selected.getTime()) || selected <= new Date()) {
        setEndTimeErrorB("End time must be in the future");
        return toast.error("End time must be in the future");
      }
    }
    setTogglingB(true);
    try {
      const isoEndTime = endTimeB
        ? new Date(endTimeB).toISOString()
        : undefined;
      await toggleSelection(!isOpenB, isoEndTime, "B");
      toast.success(
        `Selection for Group B ${!isOpenB ? "opened" : "closed"} successfully.`,
      );
      setEndTimeB("");
      onRefresh();
    } catch (err) {
      toast.error(err.error || "Failed to toggle");
    } finally {
      setTogglingB(false);
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
      const result = await importStudents(file, importGroup);
      if ((result.duplicateCount ?? 0) > 0) {
        // Hold result — show warning panel instead of success
        setPendingImport(result);
      } else {
        setImportResult(result);
        toast.success(
          `Imported ${result.importedCount} students to Group ${importGroup}!`,
        );
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
    toast.success(
      `Imported ${pendingImport.importedCount} students to Group ${importGroup}!`,
    );
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Group A Selection Window */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-1">
          Group A Selection Window
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Control when Group A students can submit faculty selections.
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpenA ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
          />
          <span className="text-sm font-medium text-slate-700">
            Group A selection is currently{" "}
            <strong className={isOpenA ? "text-green-700" : "text-slate-600"}>
              {isOpenA ? "OPEN" : "CLOSED"}
            </strong>
          </span>
        </div>

        {isOpenA && stats?.config?.end_time_a && (
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
                {savedEndTimeA}
              </p>
            </div>
          </motion.div>
        )}

        {isOpenA && !stats?.config?.end_time_a && (
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
              {isOpenA
                ? "Update End Time (optional)"
                : "Set End Time (optional)"}
            </label>
            <input
              type="datetime-local"
              className={`input-field ${endTimeErrorA ? "border-red-400 focus:ring-red-400" : ""}`}
              value={endTimeA}
              min={minDateTime}
              onChange={(e) => handleEndTimeChangeA(e.target.value)}
            />
            {endTimeErrorA && (
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
                {endTimeErrorA}
              </p>
            )}
            {endTimeA && !endTimeErrorA && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Will close on{" "}
                {new Date(endTimeA).toLocaleString("en-IN", {
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
            onClick={handleToggleA}
            disabled={togglingA || !!endTimeErrorA}
            className={`w-full px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isOpenA
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {togglingA ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isOpenA ? (
              "Close Group A Selection"
            ) : (
              "Open Group A Selection"
            )}
          </button>
        </div>
      </div>

      {/* Group B Selection Window */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 font-display mb-1">
          Group B Selection Window
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Control when Group B students can submit faculty selections.
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpenB ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
          />
          <span className="text-sm font-medium text-slate-700">
            Group B selection is currently{" "}
            <strong className={isOpenB ? "text-green-700" : "text-slate-600"}>
              {isOpenB ? "OPEN" : "CLOSED"}
            </strong>
          </span>
        </div>

        {isOpenB && stats?.config?.end_time_b && (
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
                {savedEndTimeB}
              </p>
            </div>
          </motion.div>
        )}

        {isOpenB && !stats?.config?.end_time_b && (
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
              {isOpenB
                ? "Update End Time (optional)"
                : "Set End Time (optional)"}
            </label>
            <input
              type="datetime-local"
              className={`input-field ${endTimeErrorB ? "border-red-400 focus:ring-red-400" : ""}`}
              value={endTimeB}
              min={minDateTime}
              onChange={(e) => handleEndTimeChangeB(e.target.value)}
            />
            {endTimeErrorB && (
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
                {endTimeErrorB}
              </p>
            )}
            {endTimeB && !endTimeErrorB && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Will close on{" "}
                {new Date(endTimeB).toLocaleString("en-IN", {
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
            onClick={handleToggleB}
            disabled={togglingB || !!endTimeErrorB}
            className={`w-full px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isOpenB
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}>
            {togglingB ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isOpenB ? (
              "Close Group B Selection"
            ) : (
              "Open Group B Selection"
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
        <div className="flex gap-3 mb-4">
          <div>
            <label className="label">Select Group</label>
            <select
              className="input-field"
              value={importGroup}
              onChange={(e) => setImportGroup(e.target.value)}>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
            </select>
          </div>
        </div>
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
        {/* Group A Exports */}
        <div className="mb-6">
          <h4 className="font-medium text-slate-800 mb-3">Group A Export</h4>
          <div className="flex flex-col gap-3">
            <DownloadCSVButton
              label="Student-wise CSV (Group A)"
              onClick={() =>
                downloadBlob(
                  exportStudentWiseGroupA(),
                  `student_wise_group_a_${formatteddate}.csv`,
                )
              }
            />
            <DownloadCSVButton
              label="Faculty-wise CSV (Group A)"
              onClick={() =>
                downloadBlob(
                  exportFacultyWiseGroupA(),
                  `faculty_wise_group_a_${formatteddate}.csv`,
                )
              }
            />
          </div>
        </div>

        {/* Group B Exports */}
        <div className="mb-6">
          <h4 className="font-medium text-slate-800 mb-3">Group B Export</h4>
          <div className="flex flex-col gap-3">
            <DownloadCSVButton
              label="Student-wise CSV (Group B)"
              onClick={() =>
                downloadBlob(
                  exportStudentWiseGroupB(),
                  `student_wise_group_b_${formatteddate}.csv`,
                )
              }
            />
            <DownloadCSVButton
              label="Faculty-wise CSV (Group B)"
              onClick={() =>
                downloadBlob(
                  exportFacultyWiseGroupB(),
                  `faculty_wise_group_b_${formatteddate}.csv`,
                )
              }
            />
          </div>
        </div>

        {/* All Groups Exports */}
        <div>
          <h4 className="font-medium text-slate-800 mb-3">All Groups Export</h4>
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
                  Export Student-wise CSV (All Groups)
                </>
              )}
            </button>

            {/* Faculty-wise export — NEW */}
            <DownloadCSVButton
              label="Export Faculty-wise CSV (All Groups)"
              onClick={() =>
                downloadBlob(
                  exportFacultyCSV(),
                  `faculty_wise${formatteddate}.csv`,
                )
              }
            />
          </div>
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { faculty: realtimeFaculty } = useRealtimeFaculty();
  const { subjects: realtimeSubjects } = useRealtimeSubjects();
  const {
    config: realtimeConfig,
    endTime: realtimeEndTime,
    selectionOpen: realtimeSelectionOpen,
  } = useRealtimeConfig();

  const mergedStats = useMemo(() => {
    if (!stats) return null;

    // 1. Consolidate initial faculty from both groups in the fetched stats
    const initialFaculty = [
      ...(stats.groupA?.faculty || []),
      ...(stats.groupB?.faculty || []),
    ];

    // 2. Merge initial faculty with real-time faculty updates
    const finalFaculty =
      realtimeFaculty.length > 0
        ? realtimeFaculty.map((realtimeF) => {
            const statsF = initialFaculty.find((f) => f.id === realtimeF.id);
            return {
              ...realtimeF,
              current_count:
                statsF?.current_count ?? realtimeF.current_count ?? 0,
            };
          })
        : initialFaculty; // If no real-time faculty, use the initial fetched faculty

    // 3. Determine the final list of subjects (from real-time or initial fetch)
    const finalSubjects =
      realtimeSubjects.length > 0 ? realtimeSubjects : stats.subjects || [];

    // 4. Filter faculty by group based on the finalFaculty list
    const groupAFaculty = finalFaculty.filter((f) => f.group === "A");
    const groupBFaculty = finalFaculty.filter((f) => f.group === "B");

    // 5. Re-calculate subject breakdown for each group using the filtered faculty
    const subjectBreakdownA = finalSubjects.map((sub) => {
      const subFaculty = groupAFaculty.filter((f) => f.subject_id === sub.id);
      return {
        subject: sub,
        faculty: subFaculty,
        totalSeats: subFaculty.reduce((a, f) => a + (f.max_limit || 0), 0),
        filledSeats: subFaculty.reduce((a, f) => a + (f.current_count || 0), 0),
      };
    });

    const subjectBreakdownB = finalSubjects.map((sub) => {
      const subFaculty = groupBFaculty.filter((f) => f.subject_id === sub.id);
      return {
        subject: sub,
        faculty: subFaculty,
        totalSeats: subFaculty.reduce((a, f) => a + (f.max_limit || 0), 0),
        filledSeats: subFaculty.reduce((a, f) => a + (f.current_count || 0), 0),
      };
    });

    // 6. Calculate overall subject breakdown using the finalFaculty list
    const overallSubjectBreakdown = finalSubjects.map((sub) => {
      const subFaculty = finalFaculty.filter((f) => f.subject_id === sub.id);
      return {
        subject: sub,
        faculty: subFaculty,
        totalSeats: subFaculty.reduce((a, f) => a + (f.max_limit || 0), 0),
        filledSeats: subFaculty.reduce((a, f) => a + (f.current_count || 0), 0),
      };
    });

    return {
      ...stats, // Spread original stats to retain other properties (totalStudents, submittedStudents, etc.)
      faculty: finalFaculty, // Provide a consolidated faculty array for other tabs
      subjects: finalSubjects,
      config: realtimeConfig ?? stats.config,
      groupA: {
        ...stats.groupA,
        faculty: groupAFaculty,
        subjectBreakdown: subjectBreakdownA,
      },
      groupB: {
        ...stats.groupB,
        faculty: groupBFaculty,
        subjectBreakdown: subjectBreakdownB,
      },
      subjectBreakdown: overallSubjectBreakdown, // Use the overall breakdown
    };
  }, [stats, realtimeFaculty, realtimeSubjects, realtimeConfig]);

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
      setRefreshTrigger((prev) => prev + 1);
      setError(null);
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
        setError(
          "Failed to load dashboard data. Please check your connection.",
        );
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl ">
                <img
                  src="/logo.png"
                  alt="clg logo"
                  style={{ borderRadius: 10 }}
                />
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
            {activeTab === "Dashboard" && (
              <DashboardTab stats={mergedStats} error={error} />
            )}
            {activeTab === "Subjects" && (
              <SubjectsTab stats={mergedStats} onRefresh={fetchStats} />
            )}
            {activeTab === "Faculty" && (
              <FacultyTab stats={mergedStats} onRefresh={fetchStats} />
            )}
            {activeTab === "Students" && (
              <StudentsTab
                onRefresh={fetchStats}
                refreshTrigger={refreshTrigger}
              />
            )}
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
      <Footer />
    </div>
  );
}

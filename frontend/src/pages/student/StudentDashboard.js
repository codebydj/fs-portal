import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { db } from "../../services/firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import * as htmlToImage from "html-to-image";
import { useAuth } from "../../context/AuthContext";
import { useCountdown } from "../../hooks/useCountdown";
import { submitSelection } from "../../services/api";
import StudentNavbar from "../../components/shared/StudentNavbar";
import SubjectAccordionList from "../../components/student/SubjectAccordionList";
import ConfirmModal from "../../components/shared/ConfirmModal";
import Footer from "../../components/shared/Footer";

const PreviousSelectionsView = React.forwardRef(({ selections, user }, ref) => {
  const [enriched, setEnriched] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selections || selections.length === 0) {
      setLoading(false);
      return;
    }

    async function enrich() {
      try {
        const results = await Promise.all(
          selections.map(async (sel) => {
            const [subjectSnap, facultySnap] = await Promise.all([
              getDoc(doc(db, "subjects", sel.subject_id)),
              getDoc(doc(db, "faculty", sel.faculty_id)),
            ]);
            return {
              subject: subjectSnap.exists()
                ? subjectSnap.data()
                : { name: sel.subject_id, code: "—" },
              faculty: facultySnap.exists()
                ? facultySnap.data()
                : { name: sel.faculty_id },
            };
          }),
        );
        setEnriched(results);
      } catch {
        /* show raw IDs if fetch fails */
      } finally {
        setLoading(false);
      }
    }
    enrich();
  }, [selections]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full spinner" />
      </div>
    );

  if (!enriched.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden mt-6"
      ref={ref}>
      <div className="p-6 bg-white">
        <h2 className="text-2xl font-bold text-slate-900 font-display">
          {user?.name}
        </h2>
        <p className="text-sm text-slate-600 font-mono">{user?.pin}</p>
      </div>
      <div className="px-5 py-4 border-t border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-900 font-display text-sm">
          Your Faculty Selections
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
              Subject
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
              Code
            </th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
              Faculty Selected
            </th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-slate-100 last:border-0 ${i % 2 !== 1 ? "bg-[#eeeeee]" : ""}`}>
              <td className="px-5 py-3 font-medium text-slate-800">
                {row.subject.name}
              </td>
              <td className="px-5 py-3 font-mono text-xs text-slate-500">
                {row.subject.code}
              </td>
              <td className="px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-green-700 font-medium">
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {row.faculty.name}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
});

export default function StudentDashboard() {
  const { user, updateUser } = useAuth();
  const { selectionOpen, expired, configLoaded } = useCountdown(
    user?.group || "A",
  );

  const [subjects, setSubjects] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previousSelections, setPreviousSelections] = useState(null);
  const selectionsRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const isSubmitted = user?.has_submitted;
  // Wait for config to load before deciding if selection is closed
  // null = still loading, don't show "closed" yet
  const isSelectionClosed =
    configLoaded && (selectionOpen === false || expired);
  const totalSubjects = subjects.length;
  const selectedCount = Object.keys(selections).length;
  const allSelected = totalSubjects > 0 && selectedCount === totalSubjects;
  const canSubmit = allSelected && !isSubmitted && !isSelectionClosed;

  // Load subjects from Firestore with real-time updates
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load previous selections if already submitted
  useEffect(() => {
    if (isSubmitted) {
      const storedSelections = localStorage.getItem("previous_selections");
      if (storedSelections) {
        try {
          const parsed = JSON.parse(storedSelections);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPreviousSelections(parsed);
          }
        } catch {}
      }
    }
  }, [isSubmitted]);

  const handleSelect = (subjectId, facultyId) => {
    if (isSubmitted || isSelectionClosed) return;
    setSelections((prev) => ({ ...prev, [subjectId]: facultyId }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(selections).map(
        ([subject_id, faculty_id]) => ({
          subject_id,
          faculty_id,
        }),
      );
      await submitSelection(payload);
      // Save submitted selections for display
      const selectionData = payload.map(({ subject_id, faculty_id }) => ({
        subject_id,
        faculty_id,
        pin: user.pin,
      }));
      localStorage.setItem(
        "previous_selections",
        JSON.stringify(selectionData),
      );
      updateUser({ has_submitted: true });
      toast.success("Faculty selection submitted successfully!");
      setShowConfirm(false);
    } catch (err) {
      toast.error(err.error || "Submission failed. Please try again.");
      if (err.code === "ALREADY_SUBMITTED") {
        updateUser({ has_submitted: true });
      }
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadJpg = async () => {
    if (!selectionsRef.current) {
      toast.error("Could not find content to download.");
      return;
    }
    setDownloading(true);

    const element = selectionsRef.current;
    // Store original styles to revert them later
    const originalOverflow = element.style.overflow;
    const originalMaxHeight = element.style.maxHeight;
    const originalHeight = element.style.height;
    const originalPaddingBottom = element.style.paddingBottom; // Store original padding

    try {
      // Temporarily remove overflow and set height to auto to capture full content
      element.style.overflow = "visible";
      element.style.maxHeight = "none";
      element.style.height = "auto"; // Ensure height adjusts to content
      element.style.paddingBottom = "50px"; // Add extra space at the bottom

      // Add a small delay to allow DOM to re-render with new styles
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay

      const dataUrl = await htmlToImage.toJpeg(element, {
        quality: 0.95,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `faculty-selections-${user.pin}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloaded selections as JPG!");
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Failed to download image.");
    } finally {
      // Revert styles to their original state
      element.style.overflow = originalOverflow;
      element.style.maxHeight = originalMaxHeight;
      element.style.height = originalHeight;
      element.style.paddingBottom = originalPaddingBottom; // Revert padding
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <StudentNavbar />
        <div className="flex-grow flex items-center justify-center h-96">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full spinner" />
        </div>
        {/* <Footer /> */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <StudentNavbar />

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Student info banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card px-5 py-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-slate-900 font-display text-lg">
              {user?.name ? `Welcome, ${user.name}` : "Faculty Selection"}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-sm text-slate-500">
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                  {user?.pin}
                </span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{user?.branch}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500">{user?.year}</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Group: {user?.group || "A"}
              </span>
            </div>
          </div>

          {isSubmitted ? (
            <span className="badge-green text-sm px-3 py-1.5 font-medium">
              ✓ Submitted
            </span>
          ) : isSelectionClosed ? (
            <span className="badge-red text-sm px-3 py-1.5 font-medium">
              Selection Closed
            </span>
          ) : (
            <span className="badge-blue text-sm px-3 py-1.5 font-medium">
              Selection Open
            </span>
          )}
        </motion.div>

        {/* Already submitted message */}
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-green-800">
                You have already submitted your faculty selection.
              </p>
              <p className="text-sm text-green-600 mt-0.5">
                Your selections are locked and cannot be changed.
              </p>
            </div>
          </motion.div>
        )}

        {/* Previous selections table for submitted students */}
        {isSubmitted && previousSelections && previousSelections.length > 0 && (
          <>
            <PreviousSelectionsView
              selections={previousSelections}
              user={user}
              ref={selectionsRef}
            />
            <div className="mt-2 mb-2 flex justify-end ">
              <button
                onClick={handleDownloadJpg}
                disabled={downloading}
                className="btn-secondary flex items-center gap-2 w-fit bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                {downloading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Downloading...
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
                    Download as JPG
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Selection closed message */}
        {isSelectionClosed && !isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-red-800">
                Faculty selection window is closed.
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Please contact your administrator for assistance.
              </p>
            </div>
          </motion.div>
        )}

        {/* Progress bar */}
        {!isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card px-5 py-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Selection Progress
              </span>
              <span className="text-sm font-semibold text-primary-600">
                {selectedCount} / {totalSubjects} subjects
              </span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary-600 rounded-full"
                animate={{
                  width:
                    totalSubjects > 0
                      ? `${(selectedCount / totalSubjects) * 100}%`
                      : "0%",
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            {allSelected && (
              <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                All subjects selected! Ready to submit.
              </p>
            )}
          </motion.div>
        )}

        {/* Subjects list */}
        {!isSubmitted &&
          (subjects.length === 0 ? (
            <div className="card px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-slate-300 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <p className="text-slate-500 font-medium">
                No subjects available yet.
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Please check back later.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}>
              <SubjectAccordionList
                subjects={subjects}
                selections={selections}
                onSelect={handleSelect}
                disabled={isSubmitted || isSelectionClosed}
                userGroup={user?.group || "A"}
              />
            </motion.div>
          ))}

        {/* Submit button */}
        {!isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex justify-end">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              className="btn-primary px-8 py-3 text-base flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow">
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
              Submit Selection
            </button>
          </motion.div>
        )}
      </main>

      <ConfirmModal
        open={showConfirm}
        title="Confirm Faculty Selection"
        message={`You're about to submit your faculty selections for ${selectedCount} subject(s). This action cannot be undone.`}
        confirmText="Submit Now"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        loading={submitting}
      />

      <Footer />
    </div>
  );
}

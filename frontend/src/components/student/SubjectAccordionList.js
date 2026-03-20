import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../services/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

function getSeatColor(current, max) {
  const pct = max > 0 ? current / max : 1;
  if (pct >= 0.8) return { bar: "bg-red-500", text: "text-red-600", badge: "badge-red", label: "Almost Full" };
  if (pct >= 0.5) return { bar: "bg-yellow-500", text: "text-yellow-600", badge: "badge-yellow", label: "Filling Up" };
  return { bar: "bg-green-500", text: "text-green-600", badge: "badge-green", label: "Available" };
}

function FacultyOption({ faculty, selected, onSelect, disabled }) {
  const seatsLeft = faculty.max_limit - faculty.current_count;
  const isFull = seatsLeft <= 0;
  const color = getSeatColor(faculty.current_count, faculty.max_limit);
  const isSelected = selected === faculty.id;

  return (
    <motion.div
      layout
      className={`relative border rounded-lg p-3.5 cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
          : isFull
          ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
          : "border-slate-200 hover:border-primary-300 hover:bg-blue-50/40"
      }`}
      onClick={() => !isFull && !disabled && onSelect(faculty.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {/* Radio indicator */}
          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            isSelected ? "border-primary-600 bg-primary-600" : "border-slate-300"
          }`}>
            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 text-sm truncate">{faculty.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {faculty.experience != null && faculty.experience !== "" && (
                <span className="text-xs text-slate-500">{faculty.experience} yrs exp</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          {isFull ? (
            <span className="badge-red">Full</span>
          ) : (
            <span className={`text-xs font-semibold ${color.text}`}>
              {seatsLeft} left
            </span>
          )}
        </div>
      </div>

      {/* Seat bar */}
      <div className="mt-2.5">
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color.bar}`}
            initial={false}
            animate={{ width: `${Math.min(100, (faculty.current_count / faculty.max_limit) * 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{faculty.current_count}/{faculty.max_limit} seats filled</p>
      </div>
    </motion.div>
  );
}

function SubjectAccordion({ subject, selectedFacultyId, onSelect, isOpen, onToggle, disabled }) {
  const [faculty, setFaculty] = useState([]);
  const [loadingFaculty, setLoadingFaculty] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "faculty"), where("subject_id", "==", subject.id));
    const unsub = onSnapshot(q, (snap) => {
      setFaculty(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingFaculty(false);
    });
    return () => unsub();
  }, [subject.id]);

  const selectedFaculty = faculty.find((f) => f.id === selectedFacultyId);
  const isComplete = !!selectedFacultyId;

  return (
    <div className={`card overflow-hidden transition-shadow duration-200 ${isOpen ? "shadow-card-hover" : ""}`}>
      {/* Accordion Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            isComplete ? "bg-green-500" : "bg-slate-200"
          }`}>
            {isComplete ? (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-2 h-2 bg-slate-400 rounded-full" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm font-display">{subject.name}</span>
              <span className="badge-blue text-xs">{subject.code}</span>
            </div>
            {isComplete && selectedFaculty && (
              <p className="text-xs text-green-600 mt-0.5 font-medium">
                Selected: {selectedFaculty.name}
              </p>
            )}
            {!isComplete && (
              <p className="text-xs text-slate-400 mt-0.5">No faculty selected</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">{faculty.length} faculty</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-slate-100 px-5 py-4">
              {loadingFaculty ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full spinner" />
                </div>
              ) : faculty.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No faculty assigned yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {faculty.map((f) => (
                    <FacultyOption
                      key={f.id}
                      faculty={f}
                      selected={selectedFacultyId}
                      onSelect={(id) => onSelect(subject.id, id)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SubjectAccordionList({ subjects, selections, onSelect, disabled }) {
  const [openSubject, setOpenSubject] = useState(subjects[0]?.id || null);

  const handleToggle = (subjectId) => {
    setOpenSubject((prev) => (prev === subjectId ? null : subjectId));
  };

  // Auto-open next incomplete subject
  const handleSelect = (subjectId, facultyId) => {
    onSelect(subjectId, facultyId);
    const currentIdx = subjects.findIndex((s) => s.id === subjectId);
    const nextIncomplete = subjects.slice(currentIdx + 1).find((s) => !selections[s.id]);
    if (nextIncomplete) {
      setTimeout(() => setOpenSubject(nextIncomplete.id), 300);
    }
  };

  return (
    <div className="space-y-3">
      {subjects.map((subject) => (
        <SubjectAccordion
          key={subject.id}
          subject={subject}
          selectedFacultyId={selections[subject.id]}
          onSelect={handleSelect}
          isOpen={openSubject === subject.id}
          onToggle={() => handleToggle(subject.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
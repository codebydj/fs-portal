import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountdown } from "../../hooks/useCountdown";

// Animated flip-style digit
function Digit({ value }) {
  const prev = useRef(value);
  const changed = prev.current !== value;
  useEffect(() => { prev.current = value; });

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={changed ? { y: -16, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="inline-block tabular-nums"
      >
        {String(value).padStart(2, "0")}
      </motion.span>
    </AnimatePresence>
  );
}

function Segment({ value, label, urgent }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`relative overflow-hidden rounded-lg px-2.5 py-1.5 min-w-[2.8rem] text-center font-mono font-bold text-xl leading-none shadow-inner ${
        urgent
          ? "bg-red-700/80 text-white"
          : "bg-white/15 text-white"
      }`}>
        <Digit value={value} />
      </div>
      <span className={`text-[9px] font-semibold tracking-widest uppercase ${urgent ? "text-red-200" : "text-white/60"}`}>
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer() {
  const { timeLeft, selectionOpen, expired, configLoaded } = useCountdown();

  if (!configLoaded) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium">
        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  if (!selectionOpen || expired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 border border-red-200"
      >
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
          {!selectionOpen ? "Selection Closed" : "Time Expired"}
        </span>
      </motion.div>
    );
  }

  if (!timeLeft) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 border border-green-200"
      >
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Selection Open</span>
      </motion.div>
    );
  }

  const isUrgent = timeLeft.total < 10 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
        isUrgent
          ? "bg-gradient-to-r from-red-600 to-red-500"
          : "bg-gradient-to-r from-primary-700 to-primary-600"
      }`}
    >
      {/* Clock icon */}
      <svg className="w-3.5 h-3.5 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <div className="flex items-end gap-1.5">
        <Segment value={timeLeft.hours} label="hrs" urgent={isUrgent} />
        <span className="text-white/50 font-bold text-lg leading-none mb-3.5">:</span>
        <Segment value={timeLeft.minutes} label="min" urgent={isUrgent} />
        <span className="text-white/50 font-bold text-lg leading-none mb-3.5">:</span>
        <Segment value={timeLeft.seconds} label="sec" urgent={isUrgent} />
      </div>

      {isUrgent && (
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-red-200 text-[10px] font-bold uppercase tracking-wide ml-0.5"
        >
          Closing!
        </motion.span>
      )}
    </motion.div>
  );
}
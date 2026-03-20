import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectionOpen, setSelectionOpen] = useState(null); // null = still loading
  const [endTime, setEndTime] = useState(null);
  const [expired, setExpired] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSelectionOpen(data.selection_open === true);
          setEndTime(data.end_time ? data.end_time.toDate() : null);
        } else {
          // Document doesn't exist yet — treat as closed
          setSelectionOpen(false);
          setEndTime(null);
        }
        setConfigLoaded(true);
      },
      (error) => {
        console.error("useCountdown snapshot error:", error);
        setSelectionOpen(false);
        setConfigLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const now = new Date();
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft(null);
        setExpired(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, total: diff });
      setExpired(false);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return { timeLeft, selectionOpen, expired, endTime, configLoaded };
}
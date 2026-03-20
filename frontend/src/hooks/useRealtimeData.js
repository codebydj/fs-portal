import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, onSnapshot, doc } from "firebase/firestore";

export function useRealtimeFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "faculty"), (snap) => {
      setFaculty(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { faculty, loading };
}

export function useRealtimeSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { subjects, loading };
}

export function useRealtimeConfig() {
  const [config, setConfig] = useState(null);
  const [selectionOpen, setSelectionOpen] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "config"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig(data);
          setSelectionOpen(data.selection_open === true);
          setEndTime(data.end_time ? data.end_time.toDate() : null);
        } else {
          setConfig({});
          setSelectionOpen(false);
          setEndTime(null);
        }
        setConfigLoaded(true);
      },
      (err) => {
        console.error("useRealtimeConfig error:", err);
        setConfig({});
        setSelectionOpen(false);
        setConfigLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  return { config, selectionOpen, endTime, configLoaded };
}
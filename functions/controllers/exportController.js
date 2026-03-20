const admin = require("firebase-admin");
const db = admin.firestore();

exports.exportCSV = async (req, res) => {
  try {
    const [selectionsSnap, studentsSnap, subjectsSnap, facultySnap] = await Promise.all([
      db.collection("selections").get(),
      db.collection("students").get(),
      db.collection("subjects").get(),
      db.collection("faculty").get(),
    ]);

    const students = {};
    studentsSnap.docs.forEach((d) => { students[d.id] = d.data(); });
    const subjects = {};
    subjectsSnap.docs.forEach((d) => { subjects[d.id] = d.data(); });
    const faculty = {};
    facultySnap.docs.forEach((d) => { faculty[d.id] = d.data(); });

    // Group selections by PIN so each student is one row
    const byPin = {};
    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      if (!byPin[sel.pin]) byPin[sel.pin] = {};
      byPin[sel.pin][sel.subject_id] = sel.faculty_id;
    });

    // Build dynamic subject columns
    const subjectList = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const header = ["PIN", "Name", ...subjectList.map((s) => s.name)];
    const rows = [header];

    Object.entries(byPin).forEach(([pin, subjectMap]) => {
      const student = students[pin] || {};
      const row = [pin, student.name || ""];
      subjectList.forEach((sub) => {
        const facId = subjectMap[sub.id];
        const fac = facId ? faculty[facId] : null;
        row.push(fac ? fac.name : "");
      });
      rows.push(row);
    });

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="faculty_selections_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error("Export CSV error:", err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export submitted students list
exports.exportSubmitted = async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const submitted = studentsSnap.docs
      .map((d) => d.data())
      .filter((s) => s.has_submitted);

    const rows = [["PIN", "Status"]];
    submitted.forEach((s) => rows.push([s.pin, "Submitted"]));

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="submitted_students_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export subjects list
exports.exportSubjectsCSV = async (req, res) => {
  try {
    const subjectsSnap = await db.collection("subjects").get();
    const facultySnap = await db.collection("faculty").get();
    const faculty = facultySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const rows = [["Subject Name", "Code", "Total Faculty", "Total Seats", "Seats Filled"]];
    subjectsSnap.docs.forEach((d) => {
      const sub = d.data();
      const subFaculty = faculty.filter((f) => f.subject_id === d.id);
      const totalSeats = subFaculty.reduce((a, f) => a + (f.max_limit || 0), 0);
      const filled = subFaculty.reduce((a, f) => a + (f.current_count || 0), 0);
      rows.push([sub.name, sub.code, subFaculty.length, totalSeats, filled]);
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="subjects_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export faculty list
exports.exportFacultyCSV = async (req, res) => {
  try {
    const [facultySnap, subjectsSnap, selectionsSnap] = await Promise.all([
      db.collection("faculty").get(),
      db.collection("subjects").get(),
      db.collection("selections").get(),
    ]);

    const subjects = {};
    subjectsSnap.docs.forEach((d) => { subjects[d.id] = d.data(); });

    // Count actual selections per faculty from selections collection (source of truth)
    const actualCount = {};
    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      if (sel.faculty_id) actualCount[sel.faculty_id] = (actualCount[sel.faculty_id] || 0) + 1;
    });

    const rows = [["Faculty Name", "Subject", "Subject Code", "Max Seats", "Seats Filled", "Seats Available", "Experience (yrs)"]];
    facultySnap.docs.forEach((d) => {
      const f = d.data();
      const sub = subjects[f.subject_id] || {};
      const filled = actualCount[d.id] || 0;
      const available = (f.max_limit || 0) - filled;
      rows.push([
        f.name, sub.name || "", sub.code || "",
        f.max_limit || 0, filled, available,
        f.experience != null && f.experience !== "" ? f.experience : "",
      ]);
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="faculty_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export students list
exports.exportStudentsCSV = async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const rows = [["Name", "PIN", "Branch", "Year", "Status"]];
    studentsSnap.docs.forEach((d) => {
      const s = d.data();
      rows.push([s.name || "", s.pin, s.branch || "", s.year || "", s.has_submitted ? "Submitted" : "Pending"]);
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="students_${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", code: "SERVER_ERROR" });
  }
};
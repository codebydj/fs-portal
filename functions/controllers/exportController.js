const admin = require("firebase-admin");
const db = admin.firestore();

exports.exportCSV = async (req, res) => {
  try {
    const [selectionsSnap, studentsSnap, subjectsSnap, facultySnap] =
      await Promise.all([
        db.collection("selections").get(),
        db.collection("students").get(),
        db.collection("subjects").get(),
        db.collection("faculty").get(),
      ]);

    const students = {};
    studentsSnap.docs.forEach((d) => {
      students[d.id] = d.data();
    });
    const subjects = {};
    subjectsSnap.docs.forEach((d) => {
      subjects[d.id] = d.data();
    });
    const faculty = {};
    facultySnap.docs.forEach((d) => {
      faculty[d.id] = d.data();
    });

    const byPin = {};
    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      if (!byPin[sel.pin]) byPin[sel.pin] = {};
      byPin[sel.pin][sel.subject_id] = sel.faculty_id;
    });

    const subjectList = subjectsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
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
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="faculty_selections_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error("exportCSV error:", err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="submitted_students_${Date.now()}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export subjects list
exports.exportSubjectsCSV = async (req, res) => {
  try {
    const subjectsSnap = await db.collection("subjects").get();
    const facultySnap = await db.collection("faculty").get();
    const faculty = facultySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const rows = [
      ["Subject Name", "Code", "Total Faculty", "Total Seats", "Seats Filled"],
    ];
    subjectsSnap.docs.forEach((d) => {
      const sub = d.data();
      const subFaculty = faculty.filter((f) => f.subject_id === d.id);
      const totalSeats = subFaculty.reduce((a, f) => a + (f.max_limit || 0), 0);
      const filled = subFaculty.reduce((a, f) => a + (f.current_count || 0), 0);
      rows.push([sub.name, sub.code, subFaculty.length, totalSeats, filled]);
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="subjects_${Date.now()}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Export faculty — GROUPED format ───────────────────────────
//
//  "Faculty Name: Dr. X"
//  "Subject: Machine Learning"
//  ""
//  "S.No","Student Name","PIN","Branch"
//  "1","Alice","23091A0501","A05"
//  ...
//  "---"
//  (repeated for every faculty)
//
// ─────────────────────────────────────────────────────────────
exports.exportFacultyCSV = async (req, res) => {
  try {
    const [facultySnap, subjectsSnap, selectionsSnap, studentsSnap] =
      await Promise.all([
        db.collection("faculty").get(),
        db.collection("subjects").get(),
        db.collection("selections").get(),
        db.collection("students").get(),
      ]);

    // Build lookup maps
    const subjectsMap = {};
    subjectsSnap.docs.forEach((d) => {
      subjectsMap[d.id] = d.data();
    });

    const studentsMap = {};
    studentsSnap.docs.forEach((d) => {
      studentsMap[d.id] = d.data();
    });

    // Group selections by faculty_id, dedup by PIN per faculty
    const facultySelections = {};
    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      if (!sel.faculty_id || !sel.pin) return;

      if (!facultySelections[sel.faculty_id]) {
        facultySelections[sel.faculty_id] = { seen: new Set(), list: [] };
      }

      if (!facultySelections[sel.faculty_id].seen.has(sel.pin)) {
        facultySelections[sel.faculty_id].seen.add(sel.pin);
        const student = studentsMap[sel.pin] || {};
        facultySelections[sel.faculty_id].list.push({
          name: student.name || "",
          pin: sel.pin || "",
          branch: student.branch || "",
        });
      }
    });

    const csvRows = [];
    const facultyDocs = facultySnap.docs;

    facultyDocs.forEach((d, index) => {
      const f = d.data();
      const sub = subjectsMap[f.subject_id] || {};
      const selectedStudents = (facultySelections[d.id] || {}).list || [];

      // Faculty + subject header
      csvRows.push(
        `"Faculty Name: ${String(f.name || "").replace(/"/g, '""')}"`,
      );
      csvRows.push(
        `"Subject: ${String(sub.name || "Unknown Subject").replace(/"/g, '""')}"`,
      );
      csvRows.push("");

      // Column headers
      csvRows.push('"S.No","Student Name","PIN","Branch"');

      // Data rows
      if (selectedStudents.length > 0) {
        selectedStudents.forEach((student, i) => {
          csvRows.push(
            `"${i + 1}","${String(student.name).replace(/"/g, '""')}","${String(student.pin).replace(/"/g, '""')}","${String(student.branch).replace(/"/g, '""')}"`,
          );
        });
      } else {
        csvRows.push('"No students assigned"');
      }

      // Separator between blocks (skip after last)
      if (index < facultyDocs.length - 1) {
        csvRows.push("");
        csvRows.push('"---"');
        csvRows.push("");
      }
    });

    const csv = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="faculty_students_grouped.csv"',
    );
    return res.status(200).send(csv);
  } catch (err) {
    console.error("exportFacultyCSV error:", err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export faculty selections with student details (flat, unchanged)
exports.exportFacultySelectionsWithStudentsCSV = async (req, res) => {
  try {
    const [facultySnap, subjectsSnap, selectionsSnap, studentsSnap] =
      await Promise.all([
        db.collection("faculty").get(),
        db.collection("subjects").get(),
        db.collection("selections").get(),
        db.collection("students").get(),
      ]);
    console.log("RUNNING NEW EXPORT FUNCTION");
    const subjects = {};
    subjectsSnap.docs.forEach((d) => {
      subjects[d.id] = d.data();
    });
    const students = {};
    studentsSnap.docs.forEach((d) => {
      students[d.id] = d.data();
    });

    const facultySelections = {};
    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      const student = students[sel.pin] || {};
      if (!facultySelections[sel.faculty_id])
        facultySelections[sel.faculty_id] = [];
      facultySelections[sel.faculty_id].push({ selection: sel, student });
    });

    const rows = [
      [
        "Faculty Name",
        "Subject",
        "Subject Code",
        "Max Seats",
        "Seats Filled",
        "Student Name",
        "Student PIN",
        "Student Branch",
        "Selection Time",
      ],
    ];

    facultySnap.docs.forEach((d) => {
      const f = d.data();
      const sub = subjects[f.subject_id] || {};
      const selectedStudents = facultySelections[d.id] || [];

      selectedStudents.forEach((item, index) => {
        const student = item.student;
        const selection = item.selection;
        rows.push([
          index === 0 ? f.name : "",
          index === 0 ? sub.name || "" : "",
          index === 0 ? sub.code || "" : "",
          index === 0 ? f.max_limit || 0 : "",
          index === 0 ? selectedStudents.length : "",
          student.name || "",
          student.pin || "",
          student.branch || "",
          selection.timestamp?.toDate
            ? new Date(selection.timestamp.toDate()).toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                },
              )
            : "",
        ]);
      });

      if (selectedStudents.length === 0) {
        rows.push([
          f.name,
          sub.name || "",
          sub.code || "",
          f.max_limit || 0,
          0,
          "",
          "",
          "",
          "",
        ]);
      }
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="faculty_selections_with_students_${Date.now()}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// Export students list
exports.exportStudentsCSV = async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const rows = [["Name", "PIN", "Branch", "Year", "Status"]];
    studentsSnap.docs.forEach((d) => {
      const s = d.data();
      rows.push([
        s.name || "",
        s.pin,
        s.branch || "",
        s.year || "",
        s.has_submitted ? "Submitted" : "Pending",
      ]);
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="students_${Date.now()}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

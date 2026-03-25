const admin = require("firebase-admin");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const db = admin.firestore();

// ── Subjects ─────────────────────────────────────────────────
exports.addSubject = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code)
      return res
        .status(400)
        .json({ error: "Name and code required", code: "INVALID_REQUEST" });

    const trimmedName = name.trim().toLowerCase();
    const trimmedCode = code.trim().toUpperCase();

    // Check for duplicate name or code
    const existingSnap = await db.collection("subjects").get();
    for (const doc of existingSnap.docs) {
      const data = doc.data();
      if (data.name.trim().toLowerCase() === trimmedName) {
        return res.status(409).json({
          error: `Subject "${name.trim()}" already exists`,
          code: "ALREADY_EXISTS",
        });
      }
      if (data.code.trim().toUpperCase() === trimmedCode) {
        return res.status(409).json({
          error: `Subject code "${trimmedCode}" already exists`,
          code: "ALREADY_EXISTS",
        });
      }
    }

    const ref = await db
      .collection("subjects")
      .add({ name: name.trim(), code: trimmedCode });
    return res
      .status(201)
      .json({ id: ref.id, name: name.trim(), code: trimmedCode });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("subjects").doc(id).delete();
    const facultySnap = await db
      .collection("faculty")
      .where("subject_id", "==", id)
      .get();
    const batch = db.batch();
    facultySnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Faculty ──────────────────────────────────────────────────
exports.addFaculty = async (req, res) => {
  try {
    const { name, subject_id, experience, max_limit } = req.body;
    if (!name || !subject_id || !max_limit) {
      return res.status(400).json({
        error: "Name, subject_id and max_limit required",
        code: "INVALID_REQUEST",
      });
    }

    const subjectSnap = await db.collection("subjects").doc(subject_id).get();
    if (!subjectSnap.exists) {
      return res
        .status(404)
        .json({ error: "Subject not found", code: "NOT_FOUND" });
    }

    const trimmedName = name.trim().toLowerCase();
    const existingSnap = await db
      .collection("faculty")
      .where("subject_id", "==", subject_id)
      .get();
    for (const doc of existingSnap.docs) {
      if (doc.data().name.trim().toLowerCase() === trimmedName) {
        return res.status(409).json({
          error: `Faculty "${name.trim()}" already exists for this subject`,
          code: "ALREADY_EXISTS",
        });
      }
    }

    const ref = await db.collection("faculty").add({
      name: name.trim(),
      subject_id,
      experience: experience ? Number(experience) : null,
      max_limit: Number(max_limit),
      current_count: 0,
    });
    return res
      .status(201)
      .json({ id: ref.id, name: name.trim(), subject_id, max_limit });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("faculty").doc(id).delete();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Settings ─────────────────────────────────────────────────
exports.toggleSelection = async (req, res) => {
  try {
    const { selection_open, end_time } = req.body;
    const data = { selection_open: Boolean(selection_open) };

    if (end_time && String(end_time).trim() !== "") {
      const parsedDate = new Date(end_time);
      console.log("toggleSelection: raw end_time received:", end_time);
      console.log(
        "toggleSelection: parsed as:",
        parsedDate.toISOString(),
        "local:",
        parsedDate.toString(),
      );
      if (!isNaN(parsedDate.getTime())) {
        data.end_time = Timestamp.fromDate(parsedDate);
      }
    }

    await db.collection("settings").doc("config").set(data, { merge: true });
    console.log("toggleSelection saved:", {
      selection_open: data.selection_open,
      end_time: data.end_time,
    });
    return res
      .status(200)
      .json({ success: true, selection_open: data.selection_open });
  } catch (err) {
    console.error("toggleSelection error:", err.message);
    return res
      .status(500)
      .json({ error: "Server error: " + err.message, code: "SERVER_ERROR" });
  }
};

exports.resetSelections = async (req, res) => {
  try {
    const selectionsSnap = await db.collection("selections").get();
    const selBatch = db.batch();
    selectionsSnap.docs.forEach((d) => selBatch.delete(d.ref));
    await selBatch.commit();

    const facultySnap = await db.collection("faculty").get();
    const facBatch = db.batch();
    facultySnap.docs.forEach((d) =>
      facBatch.update(d.ref, { current_count: 0 }),
    );
    await facBatch.commit();

    const studSnap = await db.collection("students").get();
    const studBatch = db.batch();
    studSnap.docs.forEach((d) =>
      studBatch.update(d.ref, { has_submitted: false }),
    );
    await studBatch.commit();

    return res
      .status(200)
      .json({ success: true, message: "All selections reset successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Stats ─────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    // 1. Fetch all data
    const [
      studentsSnap,
      selectionsSnap,
      facultySnap,
      subjectsSnap,
      configSnap,
    ] = await Promise.all([
      db.collection("students").get(),
      db.collection("selections").get(),
      db.collection("faculty").get(),
      db.collection("subjects").get(),
      db.collection("settings").doc("config").get(),
    ]);

    // 2. Count UNIQUE students who have actually submitted a selection
    const submittedPins = new Set();
    const facultySelectionCount = {};

    selectionsSnap.docs.forEach((d) => {
      const sel = d.data();
      if (sel.pin) {
        submittedPins.add(sel.pin);
      }
      if (sel.faculty_id) {
        facultySelectionCount[sel.faculty_id] =
          (facultySelectionCount[sel.faculty_id] || 0) + 1;
      }
    });

    // 3. FORCE the counts based on actual database sizes
    const totalStudents = studentsSnap.size;
    const submittedStudents = submittedPins.size;
    const pendingStudents = Math.max(0, totalStudents - submittedStudents);

    // 4. Map Faculty with actual counts from the selections collection
    const faculty = facultySnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      current_count: facultySelectionCount[d.id] || 0,
    }));

    const subjects = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 5. Build the Subject Breakdown
    const subjectBreakdown = subjects.map((sub) => {
      const subFaculty = faculty.filter((f) => f.subject_id === sub.id);
      const totalSeats = subFaculty.reduce(
        (acc, f) => acc + (Number(f.max_limit) || 0),
        0,
      );
      const filledSeats = subFaculty.reduce(
        (acc, f) => acc + (f.current_count || 0),
        0,
      );
      return { subject: sub, faculty: subFaculty, totalSeats, filledSeats };
    });

    // 6. Final JSON Response — matching exactly what AdminDashboard.js expects
    return res.status(200).json({
      totalStudents,
      submittedStudents,
      pendingStudents,
      totalSelections: selectionsSnap.size,
      faculty,
      subjects,
      subjectBreakdown,
      recentSelections: selectionsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort(
          (a, b) => (b.timestamp?._seconds || 0) - (a.timestamp?._seconds || 0),
        )
        .slice(0, 8),
      config: configSnap.exists ? configSnap.data() : { selection_open: false },
    });
  } catch (err) {
    console.error("Stats Calculation Error:", err);
    return res
      .status(500)
      .json({ error: "Server error", message: err.message });
  }
};
// The updateStatsSummary function is not actively used in the current frontend
// logic as getStats now calculates all necessary data directly.
// Call this after a student submits their selection
exports.updateStatsSummary = async () => {
  const [studentsSnap, selectionsSnap] = await Promise.all([
    db.collection("students").get(),
    db.collection("selections").get(),
  ]);

  const submittedPins = new Set();
  selectionsSnap.docs.forEach((d) => {
    if (d.data().pin) submittedPins.add(d.data().pin);
  });

  await db.collection("stats").doc("summary").set({
    totalStudents: studentsSnap.size,
    submittedStudents: submittedPins.size,
    totalSelections: selectionsSnap.size,
    updatedAt: new Date(),
  });
};
// ── Helper: parse DOB to DD/MM/YYYY ──────────────────────────
function parseDob(raw) {
  if (!raw && raw !== 0) return null;
  const str = String(raw).trim();

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str.replace(/-/g, "/");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }

  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(str)) {
    const serial = Math.floor(Number(str));
    if (serial > 0 && serial < 100000) {
      try {
        const jsDate = new Date(Date.UTC(1900, 0, 1) + (serial - 2) * 86400000);
        const d = String(jsDate.getUTCDate()).padStart(2, "0");
        const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
        const y = jsDate.getUTCFullYear();
        if (y > 1950 && y < 2100) return `${d}/${m}/${y}`;
      } catch (_) {}
    }
  }

  // Try JS Date parse as last resort
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
  } catch (_) {}

  return null;
}

// ── Import Students from Excel ────────────────────────────────
exports.importStudents = async (req, res) => {
  console.log("=== importStudents called ===");

  try {
    // Check file received
    if (!req.file) {
      console.log("ERROR: req.file is undefined");
      console.log("req.headers['content-type']:", req.headers["content-type"]);
      return res.status(400).json({
        error: "No file received. Make sure you are uploading a .xlsx file.",
        code: "INVALID_REQUEST",
        debug: { contentType: req.headers["content-type"] },
      });
    }

    console.log(
      "File received:",
      req.file.originalname,
      "size:",
      req.file.size,
    );

    // Lazy-require xlsx to avoid load errors
    let XLSX;
    try {
      XLSX = require("xlsx");
    } catch (e) {
      console.error("XLSX module not found:", e.message);
      return res.status(500).json({
        error: "xlsx module not installed. Run: npm install xlsx in functions/",
        code: "SERVER_ERROR",
      });
    }

    // Parse workbook
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: false,
        raw: false,
      });
    } catch (e) {
      console.error("Failed to parse Excel file:", e.message);
      return res.status(400).json({
        error: "Could not parse Excel file: " + e.message,
        code: "INVALID_REQUEST",
      });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
    });

    console.log("Total rows:", rows.length);
    console.log("Header row:", JSON.stringify(rows[0]));
    if (rows[1]) console.log("First data row:", JSON.stringify(rows[1]));
    if (rows[2]) console.log("Second data row:", JSON.stringify(rows[2]));

    if (!rows || rows.length < 2) {
      return res
        .status(400)
        .json({ error: "File has no data rows", code: "INVALID_REQUEST" });
    }

    // Detect column indexes
    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    console.log("Detected headers:", headers);

    const pinIdx = headers.findIndex(
      (h) =>
        h.includes("pin") ||
        h.includes("reg") ||
        h.includes("roll") ||
        h.includes("id") ||
        h.includes("no"),
    );
    const dobIdx = headers.findIndex(
      (h) =>
        h.includes("dob") ||
        h.includes("date") ||
        h.includes("birth") ||
        h.includes("born"),
    );

    console.log("pinIdx:", pinIdx, "dobIdx:", dobIdx);

    if (pinIdx === -1) {
      return res.status(400).json({
        error: `PIN column not found. Detected headers: [${headers.join(", ")}]. Add a column named 'PIN' or 'REG'.`,
        code: "INVALID_REQUEST",
      });
    }
    if (dobIdx === -1) {
      return res.status(400).json({
        error: `DOB column not found. Detected headers: [${headers.join(", ")}]. Add a column named 'DOB' or 'DATE'.`,
        code: "INVALID_REQUEST",
      });
    }

    const PIN_REGEX = /^\d{5}[A-Z]\d{2}[A-Z0-9]+$/;
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];
    let currentBatch = db.batch();
    let batchCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => String(c).trim() === "")) continue;

      const rawPin = String(row[pinIdx] || "")
        .trim()
        .toUpperCase();
      const rawDob = row[dobIdx];
      const parsedDob = parseDob(rawDob);

      if (!PIN_REGEX.test(rawPin)) {
        skippedCount++;
        if (errors.length < 20)
          errors.push(`Row ${i + 1}: Invalid PIN "${rawPin}"`);
        continue;
      }

      if (!parsedDob) {
        skippedCount++;
        if (errors.length < 20)
          errors.push(
            `Row ${i + 1}: Cannot parse DOB "${rawDob}" for PIN ${rawPin}`,
          );
        continue;
      }

      const year = "20" + rawPin.substring(0, 2);
      const branch = rawPin.substring(5, 8);

      const studentRef = db.collection("students").doc(rawPin);
      currentBatch.set(
        studentRef,
        {
          pin: rawPin,
          dob: parsedDob,
          branch,
          year,
          name: "",
          has_submitted: false,
        },
        { merge: true },
      );

      importedCount++;
      batchCount++;

      if (batchCount >= 499) {
        await currentBatch.commit();
        currentBatch = db.batch();
        batchCount = 0;
        console.log("Batch committed, total so far:", importedCount);
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit();
    }

    console.log(
      `Import done: ${importedCount} imported, ${skippedCount} skipped`,
    );

    return res.status(200).json({
      success: true,
      importedCount,
      skippedCount,
      errors,
      message: `Successfully imported ${importedCount} students. Skipped ${skippedCount}.`,
    });
  } catch (err) {
    console.error("importStudents CRASH:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      error: "Import crashed: " + err.message,
      code: "SERVER_ERROR",
    });
  }
};

// ── Edit Subject ──────────────────────────────────────────────
exports.editSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    if (!name || !code)
      return res
        .status(400)
        .json({ error: "Name and code required", code: "INVALID_REQUEST" });

    const trimmedName = name.trim().toLowerCase();
    const trimmedCode = code.trim().toUpperCase();

    // Check duplicate excluding self
    const existingSnap = await db.collection("subjects").get();
    for (const doc of existingSnap.docs) {
      if (doc.id === id) continue;
      const data = doc.data();
      if (data.name.trim().toLowerCase() === trimmedName) {
        return res.status(409).json({
          error: `Subject "${name.trim()}" already exists`,
          code: "ALREADY_EXISTS",
        });
      }
      if (data.code.trim().toUpperCase() === trimmedCode) {
        return res.status(409).json({
          error: `Subject code "${trimmedCode}" already exists`,
          code: "ALREADY_EXISTS",
        });
      }
    }

    await db
      .collection("subjects")
      .doc(id)
      .update({ name: name.trim(), code: trimmedCode });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Edit Faculty ──────────────────────────────────────────────
exports.editFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject_id, experience, max_limit } = req.body;
    if (!name || !subject_id || !max_limit) {
      return res.status(400).json({
        error: "Name, subject_id and max_limit required",
        code: "INVALID_REQUEST",
      });
    }

    const trimmedName = name.trim().toLowerCase();
    const existingSnap = await db
      .collection("faculty")
      .where("subject_id", "==", subject_id)
      .get();
    for (const doc of existingSnap.docs) {
      if (doc.id === id) continue;
      if (doc.data().name.trim().toLowerCase() === trimmedName) {
        return res.status(409).json({
          error: `Faculty "${name.trim()}" already exists for this subject`,
          code: "ALREADY_EXISTS",
        });
      }
    }

    await db
      .collection("faculty")
      .doc(id)
      .update({
        name: name.trim(),
        subject_id,
        experience: experience ? Number(experience) : null,
        max_limit: Number(max_limit),
      });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Reset All Subjects ────────────────────────────────────────
exports.resetAllSubjects = async (req, res) => {
  try {
    // Delete all faculty first (they depend on subjects)
    const facultySnap = await db.collection("faculty").get();
    const facBatch = db.batch();
    facultySnap.docs.forEach((d) => facBatch.delete(d.ref));
    await facBatch.commit();

    // Delete all subjects
    const subjectsSnap = await db.collection("subjects").get();
    const subBatch = db.batch();
    subjectsSnap.docs.forEach((d) => subBatch.delete(d.ref));
    await subBatch.commit();

    return res
      .status(200)
      .json({ success: true, message: "All subjects and faculty deleted" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Reset All Faculty ─────────────────────────────────────────
exports.resetAllFaculty = async (req, res) => {
  try {
    const facultySnap = await db.collection("faculty").get();
    const batch = db.batch();
    facultySnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return res
      .status(200)
      .json({ success: true, message: "All faculty deleted" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Reset Students Data ───────────────────────────────────────
exports.resetStudents = async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const batch = db.batch();
    studentsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return res
      .status(200)
      .json({ success: true, message: "All student data deleted" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Get Students List (submitted + pending) ───────────────────
exports.getStudents = async (req, res) => {
  try {
    const { status } = req.query; // "submitted", "pending", or "all"
    const studentsSnap = await db.collection("students").get();
    let students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (status === "submitted")
      students = students.filter((s) => s.has_submitted);
    else if (status === "pending")
      students = students.filter((s) => !s.has_submitted);

    return res.status(200).json({ students, total: students.length });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Delete Single Student ─────────────────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    const { pin } = req.params;
    if (!pin)
      return res
        .status(400)
        .json({ error: "PIN required", code: "INVALID_REQUEST" });

    // Also delete their selections if any
    const selectionsSnap = await db
      .collection("selections")
      .where("pin", "==", pin)
      .get();
    if (!selectionsSnap.empty) {
      const batch = db.batch();
      // Decrement faculty counts for each selection
      for (const selDoc of selectionsSnap.docs) {
        const sel = selDoc.data();
        batch.delete(selDoc.ref);
        if (sel.faculty_id) {
          const facRef = db.collection("faculty").doc(sel.faculty_id);
          batch.update(facRef, { current_count: FieldValue.increment(-1) });
        }
      }
      await batch.commit();
    }

    await db.collection("students").doc(pin).delete();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("deleteStudent error:", err.message);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

// ── Get Students Who Selected a Specific Faculty ──────────────
exports.getFacultyStudents = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const [selectionsSnap, studentsSnap] = await Promise.all([
      db.collection("selections").where("faculty_id", "==", facultyId).get(),
      db.collection("students").get(),
    ]);

    const studentsMap = {};
    studentsSnap.docs.forEach((d) => {
      studentsMap[d.id] = d.data();
    });

    const students = selectionsSnap.docs.map((d) => {
      const sel = d.data();
      const student = studentsMap[sel.pin] || {};
      return {
        pin: sel.pin,
        name: student.name || "",
        branch: student.branch || "",
        year: student.year || "",
        timestamp: sel.timestamp,
      };
    });

    // Sort by timestamp desc
    students.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return res.status(200).json({ students, total: students.length });
  } catch (err) {
    console.error("getFacultyStudents error:", err.message);
    return res
      .status(500)
      .json({ error: "Server error", code: "SERVER_ERROR" });
  }
};

//adminController.js

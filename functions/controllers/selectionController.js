const admin = require("firebase-admin");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const db = admin.firestore();

exports.submitSelection = async (req, res) => {
  const { pin } = req.user;
  const { selections } = req.body;

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    return res
      .status(400)
      .json({ error: "Selections are required", code: "INVALID_REQUEST" });
  }

  try {
    // Check selection window using server time
    const configSnap = await db.collection("settings").doc("config").get();
    if (!configSnap.exists) {
      return res.status(403).json({
        error: "Selection configuration not found",
        code: "SELECTION_CLOSED",
      });
    }

    const config = configSnap.data();
    const now = Timestamp.now();

    // Fetch student data early to determine group for window check
    const studentSnap = await db.collection("students").doc(pin).get();
    if (!studentSnap.exists) {
      return res
        .status(404)
        .json({ error: "Student not found", code: "NOT_FOUND" });
    }

    const studentGroupRaw = studentSnap.data().group || "A";
    const studentGroup = String(studentGroupRaw).trim().toUpperCase();
    const groupKey = studentGroup === "B" ? "b" : "a";

    const groupOpenKey = `selection_open_${groupKey}`;
    const groupEndTimeKey = `end_time_${groupKey}`;

    const groupSelectionOpen = config[groupOpenKey] === true;
    const groupEndTime = config[groupEndTimeKey] || null;

    if (!groupSelectionOpen) {
      return res.status(403).json({
        error: "Faculty selection is currently closed",
        code: "SELECTION_CLOSED",
      });
    }

    if (groupEndTime && groupEndTime.toMillis() < now.toMillis()) {
      return res.status(403).json({
        error: "Faculty selection window has expired",
        code: "SELECTION_CLOSED",
      });
    }

    // Validate all subjects are covered
    const subjectsSnap = await db.collection("subjects").get();
    const allSubjectIds = subjectsSnap.docs.map((d) => d.id);
    const selectedSubjectIds = selections.map((s) => s.subject_id);

    if (allSubjectIds.length !== selectedSubjectIds.length) {
      return res.status(400).json({
        error: "You must select faculty for all subjects",
        code: "INCOMPLETE_SELECTION",
      });
    }

    const missingSubjects = allSubjectIds.filter(
      (id) => !selectedSubjectIds.includes(id),
    );
    if (missingSubjects.length > 0) {
      return res.status(400).json({
        error: "You must select faculty for all subjects",
        code: "INCOMPLETE_SELECTION",
      });
    }

    const uniqueSubjects = new Set(selectedSubjectIds);
    if (uniqueSubjects.size !== selectedSubjectIds.length) {
      return res.status(400).json({
        error: "Duplicate subject selections found",
        code: "INVALID_REQUEST",
      });
    }

    // Custom error class so code property survives Firestore transaction wrapper
    class PortalError extends Error {
      constructor(code, message) {
        super(message);
        this.portalCode = code;
      }
    }

    // Run Firestore transaction for concurrency control
    await db.runTransaction(async (transaction) => {
      // 1. Read student doc
      const studentRef = db.collection("students").doc(pin);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw new PortalError("NOT_FOUND", "Student not found");
      }

      // 2. Check has_submitted
      if (studentSnap.data().has_submitted) {
        throw new PortalError(
          "ALREADY_SUBMITTED",
          "You have already submitted your faculty selection.",
        );
      }

      // 3. Read all faculty docs and validate seats
      const facultyRefs = selections.map((s) =>
        db.collection("faculty").doc(s.faculty_id),
      );
      const facultySnaps = await Promise.all(
        facultyRefs.map((ref) => transaction.get(ref)),
      );

      for (let i = 0; i < facultySnaps.length; i++) {
        const snap = facultySnaps[i];
        const sel = selections[i];

        if (!snap.exists) {
          throw new PortalError(
            "NOT_FOUND",
            `Faculty not found: ${sel.faculty_id}`,
          );
        }

        const faculty = snap.data();

        if (faculty.subject_id !== sel.subject_id) {
          throw new PortalError("INVALID_REQUEST", "Faculty-subject mismatch");
        }

        if (faculty.current_count >= faculty.max_limit) {
          throw new PortalError(
            "SEATS_FULL",
            `No seats available for ${faculty.name}`,
          );
        }
      }

      // 4. Create selection documents
      const serverTimestamp = FieldValue.serverTimestamp();

      for (let i = 0; i < selections.length; i++) {
        const sel = selections[i];
        const selectionRef = db.collection("selections").doc();
        transaction.set(selectionRef, {
          pin,
          subject_id: sel.subject_id,
          faculty_id: sel.faculty_id,
          timestamp: serverTimestamp,
        });

        // 5. Increment faculty current_count
        transaction.update(facultyRefs[i], {
          current_count: FieldValue.increment(1),
        });
      }

      // 6. Mark student as submitted and store submission timestamp
      transaction.update(studentRef, {
        has_submitted: true,
        submitted_at: now,
      });
    });

    return res.status(200).json({
      success: true,
      message: "Faculty selection submitted successfully",
    });
  } catch (err) {
    console.error("Submit selection error:", err);

    if (err.portalCode === "ALREADY_SUBMITTED") {
      return res
        .status(409)
        .json({ error: err.message, code: "ALREADY_SUBMITTED" });
    }
    if (err.portalCode === "SEATS_FULL") {
      return res.status(409).json({ error: err.message, code: "SEATS_FULL" });
    }
    if (err.portalCode === "NOT_FOUND") {
      return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
    }
    if (err.portalCode === "INVALID_REQUEST") {
      return res
        .status(400)
        .json({ error: err.message, code: "INVALID_REQUEST" });
    }

    return res
      .status(500)
      .json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};

const admin = require("firebase-admin");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const db = admin.firestore();

const RESERVATION_DURATION_MINUTES = 5;
const RESERVATION_CLEANUP_INTERVAL_MS = 60 * 1000;

function normalizeFacultyData(data) {
  const totalSeats = Number(data.totalSeats ?? data.max_limit ?? 0);
  const enrolled = Number(data.enrolled ?? data.current_count ?? 0);
  const reservedSeats = Number(data.reservedSeats ?? 0);
  const availableSeats = data.availableSeats != null
    ? Number(data.availableSeats)
    : Math.max(0, totalSeats - enrolled - reservedSeats);

  return {
    ...data,
    totalSeats,
    enrolled,
    reservedSeats,
    availableSeats,
  };
}

function createPortalError(code, message) {
  const err = new Error(message);
  err.portalCode = code;
  return err;
}

exports.reserveSelection = async (req, res) => {
  const { pin } = req.user;
  const { subjectId, facultyId } = req.body;

  if (!subjectId || !facultyId) {
    return res
      .status(400)
      .json({ error: "subjectId and facultyId are required", code: "INVALID_REQUEST" });
  }

  try {
    await db.runTransaction(async (transaction) => {
      const studentRef = db.collection("students").doc(pin);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw createPortalError("NOT_FOUND", "Student not found");
      }

      if (studentSnap.data().has_submitted) {
        throw createPortalError(
          "ALREADY_SUBMITTED",
          "You have already submitted your faculty selection.",
        );
      }

      const existingReservationQuery = db
        .collection("reservations")
        .where("pin", "==", pin)
        .where("subjectId", "==", subjectId)
        .where("active", "==", true);
      const existingReservationSnap = await transaction.get(existingReservationQuery);

      if (!existingReservationSnap.empty) {
        const existing = existingReservationSnap.docs[0].data();
        if (existing.facultyId === facultyId) {
          return;
        }
        throw createPortalError(
          "ALREADY_RESERVED",
          "You already have an active reservation for this subject.",
        );
      }

      const facultyRef = db.collection("faculty").doc(facultyId);
      const facultySnap = await transaction.get(facultyRef);
      if (!facultySnap.exists) {
        throw createPortalError("NOT_FOUND", "Faculty not found");
      }

      const faculty = normalizeFacultyData(facultySnap.data());
      if (faculty.subject_id !== subjectId) {
        throw createPortalError("INVALID_REQUEST", "Faculty-subject mismatch");
      }

      if (faculty.availableSeats <= 0) {
        throw createPortalError("SEATS_FULL", "No seats available for this faculty.");
      }

      const reservationRef = db.collection("reservations").doc();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(
        now.toMillis() + RESERVATION_DURATION_MINUTES * 60 * 1000,
      );

      transaction.set(reservationRef, {
        pin,
        facultyId,
        subjectId,
        createdAt: now,
        expiresAt,
        active: true,
      });

      transaction.update(facultyRef, {
        totalSeats: faculty.totalSeats,
        enrolled: faculty.enrolled,
        reservedSeats: faculty.reservedSeats + 1,
        availableSeats: faculty.availableSeats - 1,
      });
    });

    return res.status(200).json({ success: true, message: "Reservation created" });
  } catch (err) {
    console.error("Reserve selection error:", err);
    if (err.portalCode === "ALREADY_SUBMITTED") {
      return res.status(409).json({ error: err.message, code: "ALREADY_SUBMITTED" });
    }
    if (err.portalCode === "ALREADY_RESERVED") {
      return res.status(409).json({ error: err.message, code: "ALREADY_RESERVED" });
    }
    if (err.portalCode === "SEATS_FULL") {
      return res.status(409).json({ error: err.message, code: "SEATS_FULL" });
    }
    if (err.portalCode === "NOT_FOUND") {
      return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
    }
    if (err.portalCode === "INVALID_REQUEST") {
      return res.status(400).json({ error: err.message, code: "INVALID_REQUEST" });
    }
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};

exports.releaseReservation = async (req, res) => {
  const { pin } = req.user;
  const { subjectId, facultyId } = req.body;

  if (!subjectId || !facultyId) {
    return res
      .status(400)
      .json({ error: "subjectId and facultyId are required", code: "INVALID_REQUEST" });
  }

  try {
    await db.runTransaction(async (transaction) => {
      const reservationQuery = db
        .collection("reservations")
        .where("pin", "==", pin)
        .where("subjectId", "==", subjectId)
        .where("facultyId", "==", facultyId)
        .where("active", "==", true);
      const reservationSnap = await transaction.get(reservationQuery);

      if (reservationSnap.empty) {
        throw createPortalError("NOT_FOUND", "Active reservation not found");
      }

      const reservationDoc = reservationSnap.docs[0];
      const facultyRef = db.collection("faculty").doc(facultyId);
      const facultySnap = await transaction.get(facultyRef);
      if (!facultySnap.exists) {
        transaction.update(reservationDoc.ref, { active: false });
        return;
      }

      const faculty = normalizeFacultyData(facultySnap.data());
      const newReservedSeats = Math.max(0, faculty.reservedSeats - 1);
      const newAvailableSeats = Math.max(
        0,
        faculty.totalSeats - faculty.enrolled - newReservedSeats,
      );

      transaction.update(facultyRef, {
        totalSeats: faculty.totalSeats,
        enrolled: faculty.enrolled,
        reservedSeats: newReservedSeats,
        availableSeats: newAvailableSeats,
      });

      transaction.update(reservationDoc.ref, { active: false });
    });

    return res.status(200).json({ success: true, message: "Reservation released" });
  } catch (err) {
    console.error("Release reservation error:", err);
    if (err.portalCode === "NOT_FOUND") {
      return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
    }
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};

exports.releaseAllReservations = async (req, res) => {
  const { pin } = req.user;

  try {
    await db.runTransaction(async (transaction) => {
      const reservationQuery = db
        .collection("reservations")
        .where("pin", "==", pin)
        .where("active", "==", true);
      const reservationSnap = await transaction.get(reservationQuery);

      if (reservationSnap.empty) {
        return;
      }

      const facultyIds = [
        ...new Set(reservationSnap.docs.map((doc) => doc.data().facultyId)),
      ];
      const facultyRefs = facultyIds.map((facultyId) =>
        db.collection("faculty").doc(facultyId),
      );
      const facultySnaps = await Promise.all(
        facultyRefs.map((ref) => transaction.get(ref)),
      );

      const facultyById = {};
      facultyIds.forEach((facultyId, index) => {
        const snap = facultySnaps[index];
        if (snap.exists) {
          facultyById[facultyId] = normalizeFacultyData(snap.data());
        }
      });

      for (const reservationDoc of reservationSnap.docs) {
        const { facultyId } = reservationDoc.data();
        const faculty = facultyById[facultyId];
        if (!faculty) {
          transaction.update(reservationDoc.ref, { active: false });
          continue;
        }

        const newReservedSeats = Math.max(0, faculty.reservedSeats - 1);
        const newAvailableSeats = Math.max(
          0,
          faculty.totalSeats - faculty.enrolled - newReservedSeats,
        );

        transaction.update(db.collection("faculty").doc(facultyId), {
          totalSeats: faculty.totalSeats,
          enrolled: faculty.enrolled,
          reservedSeats: newReservedSeats,
          availableSeats: newAvailableSeats,
        });
        transaction.update(reservationDoc.ref, { active: false });
      }
    });

    return res.status(200).json({ success: true, message: "All reservations released" });
  } catch (err) {
    console.error("Release all reservations error:", err);
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};

exports.getActiveReservations = async (req, res) => {
  const { pin } = req.user;

  try {
    const snap = await db
      .collection("reservations")
      .where("pin", "==", pin)
      .where("active", "==", true)
      .get();

    const reservations = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, reservations });
  } catch (err) {
    console.error("Get active reservations error:", err);
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};

exports.submitSelection = async (req, res) => {
  const { pin } = req.user;
  const { selections } = req.body;

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    return res
      .status(400)
      .json({ error: "Selections are required", code: "INVALID_REQUEST" });
  }

  try {
    const configSnap = await db.collection("settings").doc("config").get();
    if (!configSnap.exists) {
      return res.status(403).json({
        error: "Selection configuration not found",
        code: "SELECTION_CLOSED",
      });
    }

    const config = configSnap.data();
    const now = Timestamp.now();

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

    await db.runTransaction(async (transaction) => {
      const studentRef = db.collection("students").doc(pin);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw createPortalError("NOT_FOUND", "Student not found");
      }

      if (studentSnap.data().has_submitted) {
        throw createPortalError(
          "ALREADY_SUBMITTED",
          "You have already submitted your faculty selection.",
        );
      }

      const reservationQuery = db
        .collection("reservations")
        .where("pin", "==", pin)
        .where("active", "==", true);
      const reservationSnap = await transaction.get(reservationQuery);

      if (reservationSnap.empty) {
        throw createPortalError(
          "INVALID_REQUEST",
          "No active reservations found for submission.",
        );
      }

      if (reservationSnap.size !== selections.length) {
        throw createPortalError(
          "INVALID_REQUEST",
          "Your submission does not match active reservations.",
        );
      }

      const reservedMap = new Map(
        reservationSnap.docs.map((doc) => {
          const data = doc.data();
          return [data.subjectId, data.facultyId];
        }),
      );

      for (const sel of selections) {
        if (reservedMap.get(sel.subject_id) !== sel.faculty_id) {
          throw createPortalError(
            "INVALID_REQUEST",
            "Your selection must match active reservations.",
          );
        }
      }

      const facultyRefs = selections.map((s) =>
        db.collection("faculty").doc(s.faculty_id),
      );
      const facultySnaps = await Promise.all(
        facultyRefs.map((ref) => transaction.get(ref)),
      );

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

        const facultySnap = facultySnaps[i];
        if (!facultySnap.exists) {
          throw createPortalError(
            "NOT_FOUND",
            `Faculty not found: ${sel.faculty_id}`,
          );
        }

        const faculty = normalizeFacultyData(facultySnap.data());
        if (faculty.subject_id !== sel.subject_id) {
          throw createPortalError("INVALID_REQUEST", "Faculty-subject mismatch");
        }

        const newEnrolled = faculty.enrolled + 1;
        const newReservedSeats = Math.max(0, faculty.reservedSeats - 1);
        const newAvailableSeats = Math.max(
          0,
          faculty.totalSeats - newEnrolled - newReservedSeats,
        );

        transaction.update(facultyRefs[i], {
          totalSeats: faculty.totalSeats,
          enrolled: newEnrolled,
          reservedSeats: newReservedSeats,
          availableSeats: newAvailableSeats,
        });
      }

      for (const reservationDoc of reservationSnap.docs) {
        transaction.update(reservationDoc.ref, { active: false });
      }

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

async function cleanupExpiredReservations() {
  try {
    const now = Timestamp.now();
    const expiredQuery = db
      .collection("reservations")
      .where("active", "==", true)
      .where("expiresAt", "<", now);
    const expiredSnap = await expiredQuery.get();

    if (expiredSnap.empty) {
      return;
    }

    for (const reservationDoc of expiredSnap.docs) {
      const reservationData = reservationDoc.data();
      const facultyRef = db.collection("faculty").doc(reservationData.facultyId);

      await db.runTransaction(async (transaction) => {
        const facultySnap = await transaction.get(facultyRef);
        if (!facultySnap.exists) {
          transaction.update(reservationDoc.ref, { active: false });
          return;
        }

        const faculty = normalizeFacultyData(facultySnap.data());
        const newReservedSeats = Math.max(0, faculty.reservedSeats - 1);
        const newAvailableSeats = Math.max(
          0,
          faculty.totalSeats - faculty.enrolled - newReservedSeats,
        );

        transaction.update(facultyRef, {
          totalSeats: faculty.totalSeats,
          enrolled: faculty.enrolled,
          reservedSeats: newReservedSeats,
          availableSeats: newAvailableSeats,
        });

        transaction.update(reservationDoc.ref, { active: false });
      });
    }
  } catch (err) {
    console.error("Reservation cleanup error:", err);
  }
}

exports.startReservationCleanup = () => {
  cleanupExpiredReservations();
  setInterval(cleanupExpiredReservations, RESERVATION_CLEANUP_INTERVAL_MS);
};

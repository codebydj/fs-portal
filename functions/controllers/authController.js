const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const db = admin.firestore();

// Must match studentAuth.js exactly
const JWT_SECRET = process.env.JWT_SECRET || "faculty_portal_jwt_secret";

// PIN: 23091A05R4 → Year(23)+College(091)+Branch(A05)+Roll(R4)
const PIN_REGEX = /^\d{5}[A-Z]\d{2}[A-Z0-9]+$/;

function parsePIN(pin) {
  return {
    year: "20" + pin.substring(0, 2),
    college: pin.substring(2, 5),
    branch: pin.substring(5, 8),
    roll: pin.substring(8),
  };
}

exports.studentLogin = async (req, res) => {
  try {
    const { pin, dob } = req.body;

    if (!pin || !dob) {
      return res.status(400).json({ error: "PIN and date of birth are required", code: "INVALID_CREDENTIALS" });
    }

    const normalizedPin = pin.trim().toUpperCase();

    if (!PIN_REGEX.test(normalizedPin)) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const dobRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dobRegex.test(dob.trim())) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const studentSnap = await db.collection("students").doc(normalizedPin).get();

    if (!studentSnap.exists) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const student = studentSnap.data();

    if (dob.trim() !== student.dob.trim()) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const parsed = parsePIN(normalizedPin);

    const token = jwt.sign(
      {
        pin: normalizedPin,
        branch: student.branch || parsed.branch,
        year: student.year || parsed.year,
        name: student.name || "",
        role: "student",
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log("studentLogin: token signed for pin:", normalizedPin, "role: student");

    let previousSelections = null;
    if (student.has_submitted) {
      const sel = await db.collection("selections").where("pin", "==", normalizedPin).get();
      previousSelections = sel.docs.map((d) => d.data());
    }

    return res.status(200).json({
      token,
      student: {
        pin: normalizedPin,
        name: student.name || "",
        branch: student.branch || parsed.branch,
        year: student.year || parsed.year,
        has_submitted: student.has_submitted || false,
      },
      has_submitted: student.has_submitted || false,
      previous_selections: previousSelections,
      message: student.has_submitted ? "You have already submitted your faculty selection." : null,
    });
  } catch (err) {
    console.error("Student login error:", err);
    return res.status(500).json({ error: "Internal server error", code: "SERVER_ERROR" });
  }
};
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ── Firebase Admin init with service account from env ─────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.vercel\.app$/,
  /\.web\.app$/,
  /\.firebaseapp\.com$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
  },
  credentials: true,
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ── Routes ────────────────────────────────────────────────────
const { studentLogin } = require("./controllers/authController");
const { adminLogin } = require("./controllers/adminAuthController");
const { submitSelection } = require("./controllers/selectionController");
const {
  addSubject, deleteSubject, editSubject,
  addFaculty, deleteFaculty, editFaculty,
  toggleSelection, resetSelections,
  resetAllSubjects, resetAllFaculty, resetStudents,
  getStats, getStudents, deleteStudent, getFacultyStudents,
} = require("./controllers/adminController");
const { importStudents } = require("./controllers/importController");
const { exportCSV, exportSubjectsCSV, exportFacultyCSV, exportStudentsCSV } = require("./controllers/exportController");
const { verifyAdmin } = require("./middlewares/adminAuth");
const { verifyStudent } = require("./middlewares/studentAuth");

// Auth
app.post("/auth/student/login", studentLogin);
app.post("/auth/admin/login", adminLogin);

// Student
app.post("/selection/submit", verifyStudent, submitSelection);

// Admin — Subjects
app.get("/admin/stats", verifyAdmin, getStats);
app.post("/admin/subjects", verifyAdmin, addSubject);
app.put("/admin/subjects/:id", verifyAdmin, editSubject);
app.delete("/admin/subjects/:id", verifyAdmin, deleteSubject);

// Admin — Faculty
app.post("/admin/faculty", verifyAdmin, addFaculty);
app.put("/admin/faculty/:id", verifyAdmin, editFaculty);
app.delete("/admin/faculty/:id", verifyAdmin, deleteFaculty);
app.get("/admin/faculty/:facultyId/students", verifyAdmin, getFacultyStudents);

// Admin — Settings & Resets
app.post("/admin/toggle-selection", verifyAdmin, toggleSelection);
app.post("/admin/reset-selections", verifyAdmin, resetSelections);
app.post("/admin/reset-subjects", verifyAdmin, resetAllSubjects);
app.post("/admin/reset-faculty", verifyAdmin, resetAllFaculty);
app.post("/admin/reset-students", verifyAdmin, resetStudents);

// Admin — Students
app.get("/admin/students", verifyAdmin, getStudents);
app.delete("/admin/students/:pin", verifyAdmin, deleteStudent);

// Admin — Import & Export
app.post("/admin/import-students", verifyAdmin, importStudents);
app.get("/admin/export-csv", verifyAdmin, exportCSV);
app.get("/admin/export-subjects-csv", verifyAdmin, exportSubjectsCSV);
app.get("/admin/export-faculty-csv", verifyAdmin, exportFacultyCSV);
app.get("/admin/export-students-csv", verifyAdmin, exportStudentsCSV);

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Faculty Portal API running on port ${PORT}`);
});
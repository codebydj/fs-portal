const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Load .env for local emulator development
// In production, Firebase Functions uses functions:config:set
const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

// Also support Firebase functions config (production)
// Maps functions.config().app.* to process.env.*
try {
  const config = functions.config();
  if (config.app) {
    if (config.app.jwt_secret && !process.env.JWT_SECRET)
      process.env.JWT_SECRET = config.app.jwt_secret;
    if (config.app.admin_user && !process.env.ADMIN_USER)
      process.env.ADMIN_USER = config.app.admin_user;
    if (config.app.admin_pass && !process.env.ADMIN_PASS)
      process.env.ADMIN_PASS = config.app.admin_pass;
  }
} catch (_) {}

admin.initializeApp();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.vercel\.app$/, // any vercel.app subdomain
  /\.web\.app$/, // Firebase Hosting
  /\.firebaseapp\.com$/, // Firebase Hosting alt domain
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    credentials: true,
  }),
);

app.use(express.json());

const { studentLogin } = require("./controllers/authController");
const { adminLogin } = require("./controllers/adminAuthController");
const { submitSelection } = require("./controllers/selectionController");
const {
  addSubject,
  deleteSubject,
  editSubject,
  addFaculty,
  deleteFaculty,
  editFaculty,
  toggleSelection,
  resetSelections,
  resetAllSubjects,
  resetAllFaculty,
  resetStudents,
  getStats,
  resetFacultyByGroup,
  getStudents,
  deleteStudent,
  getFacultyStudents,
} = require("./controllers/adminController");
const { importStudents } = require("./controllers/importController");
const {
  exportCSV,
  exportSubjectsCSV,
  exportFacultyCSV,
  exportStudentsCSV,
  exportFacultySelectionsWithStudentsCSV,
} = require("./controllers/exportController");
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

// Admin — Settings & Resets
app.post("/admin/toggle-selection", verifyAdmin, toggleSelection);
app.post("/admin/reset-selections", verifyAdmin, resetSelections);
app.post("/admin/reset-subjects", verifyAdmin, resetAllSubjects);
app.post("/admin/reset-faculty", verifyAdmin, resetAllFaculty);
app.post("/admin/reset-students", verifyAdmin, resetStudents);
app.post("/admin/reset-faculty-by-group", verifyAdmin, resetFacultyByGroup);

// Admin — Students view
app.get("/admin/students", verifyAdmin, getStudents);
app.delete("/admin/students/:pin", verifyAdmin, deleteStudent);
app.get("/admin/faculty/:facultyId/students", verifyAdmin, getFacultyStudents);

// Admin — Import & Export
app.post("/admin/import-students", verifyAdmin, importStudents);
app.get("/admin/export-csv", verifyAdmin, exportCSV);
app.get("/admin/export-subjects-csv", verifyAdmin, exportSubjectsCSV);
app.get("/admin/export-faculty-csv", verifyAdmin, exportFacultyCSV);
app.get(
  "/admin/export-faculty-selections-with-students-csv",
  verifyAdmin,
  exportFacultySelectionsWithStudentsCSV,
);
app.get("/admin/export-students-csv", verifyAdmin, exportStudentsCSV);

exports.api = functions.https.onRequest(app);

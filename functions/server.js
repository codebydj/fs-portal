const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

// ── Firebase Admin init ───────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.vercel\.app$/,
  /\.web\.app$/,
  /\.firebaseapp\.com$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      callback(allowed ? null : new Error("Not allowed by CORS"), allowed);
    },
    credentials: true,
  }),
);

// ── File upload BEFORE express.json ──────────────────────────
const { importStudents } = require("./controllers/importController");
const { verifyAdmin } = require("./middlewares/adminAuth");
app.post(
  "/admin/import-students",
  verifyAdmin,
  upload.single("file"),
  importStudents,
);

// ── JSON body parsing for all other routes ────────────────────
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

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
  getStudents,
  deleteStudent,
  getFacultyStudents,
} = require("./controllers/adminController");
const {
  exportCSV,
  exportSubjectsCSV,
  exportFacultyCSV,
  exportStudentsCSV,
  exportStudentWiseGroupA,
  exportStudentWiseGroupB,
  exportFacultyWiseGroupA,
  exportFacultyWiseGroupB,
} = require("./controllers/exportController");
const { verifyStudent } = require("./middlewares/studentAuth");

app.post("/auth/student/login", studentLogin);
app.post("/auth/admin/login", adminLogin);
app.post("/selection/submit", verifyStudent, submitSelection);

app.get("/admin/stats", verifyAdmin, getStats);
app.post("/admin/subjects", verifyAdmin, addSubject);
app.put("/admin/subjects/:id", verifyAdmin, editSubject);
app.delete("/admin/subjects/:id", verifyAdmin, deleteSubject);
app.post("/admin/faculty", verifyAdmin, addFaculty);
app.put("/admin/faculty/:id", verifyAdmin, editFaculty);
app.delete("/admin/faculty/:id", verifyAdmin, deleteFaculty);
app.get("/admin/faculty/:facultyId/students", verifyAdmin, getFacultyStudents);
app.post("/admin/toggle-selection", verifyAdmin, toggleSelection);
app.post("/admin/reset-selections", verifyAdmin, resetSelections);
app.post("/admin/reset-subjects", verifyAdmin, resetAllSubjects);
app.post("/admin/reset-faculty", verifyAdmin, resetAllFaculty);
app.post("/admin/reset-students", verifyAdmin, resetStudents);
app.get("/admin/students", verifyAdmin, getStudents);
app.delete("/admin/students/:pin", verifyAdmin, deleteStudent);
app.get("/admin/export-csv", verifyAdmin, exportCSV);
app.get("/admin/export-subjects-csv", verifyAdmin, exportSubjectsCSV);
app.get("/admin/export-faculty-csv", verifyAdmin, exportFacultyCSV);
app.get("/admin/export-students-csv", verifyAdmin, exportStudentsCSV);
app.get(
  "/admin/export-student-wise-group-a",
  verifyAdmin,
  exportStudentWiseGroupA,
);
app.get(
  "/admin/export-student-wise-group-b",
  verifyAdmin,
  exportStudentWiseGroupB,
);
app.get(
  "/admin/export-faculty-wise-group-a",
  verifyAdmin,
  exportFacultyWiseGroupA,
);
app.get(
  "/admin/export-faculty-wise-group-b",
  verifyAdmin,
  exportFacultyWiseGroupB,
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`✅ Faculty Portal API running on port ${PORT}`),
);

//server.js

const BASE_URL = process.env.REACT_APP_API_URL;

// Get correct token based on current role
function getToken() {
  const role = localStorage.getItem("portal_role");
  if (role === "admin") return localStorage.getItem("admin_token");
  if (role === "student") return localStorage.getItem("student_token");
  return null;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.code = data.code;
    err.status = res.status;
    Object.assign(err, data);
    throw err;
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────
export const studentLogin = (pin, dob) =>
  request("/auth/student/login", {
    method: "POST",
    body: JSON.stringify({ pin, dob }),
  });

export const adminLogin = (username, password) =>
  request("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

// ── Student ──────────────────────────────────────────────────
export const submitSelection = (selections) =>
  request("/selection/submit", {
    method: "POST",
    body: JSON.stringify({ selections }),
  });

// ── Admin — Stats & Students ─────────────────────────────────
export const getAdminStats = () => request("/admin/stats");
export const getStudents = (status = "all") =>
  request(`/admin/students?status=${status}`);
export const deleteStudent = (pin) =>
  request(`/admin/students/${pin}`, { method: "DELETE" });
export const getFacultyStudents = (facultyId) =>
  request(`/admin/faculty/${facultyId}/students`);

// ── Admin — Subjects ─────────────────────────────────────────
export const addSubject = (name, code) =>
  request("/admin/subjects", {
    method: "POST",
    body: JSON.stringify({ name, code }),
  });
export const editSubject = (id, name, code) =>
  request(`/admin/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, code }),
  });
export const deleteSubject = (id) =>
  request(`/admin/subjects/${id}`, { method: "DELETE" });

// ── Admin — Faculty ───────────────────────────────────────────
export const addFaculty = (data) =>
  request("/admin/faculty", { method: "POST", body: JSON.stringify(data) });
export const editFaculty = (id, data) =>
  request(`/admin/faculty/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteFaculty = (id) =>
  request(`/admin/faculty/${id}`, { method: "DELETE" });

// ── Admin — Settings & Resets ─────────────────────────────────
export const toggleSelection = (selection_open, end_time, group) =>
  request("/admin/toggle-selection", {
    method: "POST",
    body: JSON.stringify({ selection_open, end_time, group }),
  });
export const resetSelections = () =>
  request("/admin/reset-selections", { method: "POST" });
export const resetAllSubjects = () =>
  request("/admin/reset-subjects", { method: "POST" });
export const resetAllFaculty = () =>
  request("/admin/reset-faculty", { method: "POST" });
export const resetStudents = () =>
  request("/admin/reset-students", { method: "POST" });

// ── Admin — Import & Export ───────────────────────────────────
export const exportCSV = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportSubjectsCSV = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-subjects-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportFacultyCSV = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-faculty-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportStudentsCSV = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-students-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportFacultySelectionsWithStudentsCSV = () => {
  const token = getToken();
  return fetch(
    `${BASE_URL}/admin/export-faculty-selections-with-students-csv`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  ).then((res) => res.blob());
};

// Admin - Reset Faculty by Group
export const resetFacultyByGroup = (group) =>
  request("/admin/reset-faculty-by-group", {
    method: "POST",
    body: JSON.stringify({ group }),
  });

export const exportStudentWiseGroupA = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-student-wise-group-a`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportStudentWiseGroupB = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-student-wise-group-b`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportFacultyWiseGroupA = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-faculty-wise-group-a`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const exportFacultyWiseGroupB = () => {
  const token = getToken();
  return fetch(`${BASE_URL}/admin/export-faculty-wise-group-b`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.blob());
};

export const importStudents = (file, group) => {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("group", group);
  return fetch(`${BASE_URL}/admin/import-students`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  });
};

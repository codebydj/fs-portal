import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import StudentLogin from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import "./index.css";

function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user || role !== requiredRole) {
    return <Navigate to={requiredRole === "admin" ? "/admin/login" : "/login"} replace />;
  }
  return children;
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={
        user && role === "student" ? <Navigate to="/dashboard" replace /> :
        user && role === "admin" ? <Navigate to="/admin" replace /> :
        <Navigate to="/login" replace />
      } />
      <Route path="/login" element={
        user && role === "student" ? <Navigate to="/dashboard" replace /> : <StudentLogin />
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/login" element={
        user && role === "admin" ? <Navigate to="/admin" replace /> : <AdminLogin />
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: "'DM Sans', sans-serif", fontSize: "14px", borderRadius: "8px" },
            success: { iconTheme: { primary: "#2563eb", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

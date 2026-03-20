import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// Use role-specific keys so student and admin tokens never collide
const STUDENT_TOKEN_KEY = "student_token";
const ADMIN_TOKEN_KEY = "admin_token";
const USER_KEY = "portal_user";
const ROLE_KEY = "portal_role";

function getToken(role) {
  if (role === "admin") return localStorage.getItem(ADMIN_TOKEN_KEY);
  if (role === "student") return localStorage.getItem(STUDENT_TOKEN_KEY);
  return null;
}

function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem(ROLE_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    const token = getToken(storedRole);

    if (token && storedUser && isTokenValid(token)) {
      try {
        setUser(JSON.parse(storedUser));
        setRole(storedRole);
      } catch {
        clearAll();
      }
    } else {
      clearAll();
    }
    setLoading(false);
  }, []);

  function clearAll() {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    // Also clear old keys in case of migration
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
  }

  const loginStudent = (token, student) => {
    // Clear any existing admin token to avoid collision
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(student));
    localStorage.setItem(ROLE_KEY, "student");
    setUser(student);
    setRole("student");
  };

  const loginAdmin = (token) => {
    // Clear any existing student token to avoid collision
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    const adminUser = { username: "admin", role: "admin" };
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
    localStorage.setItem(ROLE_KEY, "admin");
    setUser(adminUser);
    setRole("admin");
  };

  const logout = () => {
    clearAll();
    setUser(null);
    setRole(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginStudent, loginAdmin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
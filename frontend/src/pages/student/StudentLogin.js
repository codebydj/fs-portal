import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { studentLogin } from "../../services/api";

export default function StudentLogin() {
  const [pin, setPin] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginStudent } = useAuth();
  const navigate = useNavigate();

  //logic for data of birth / format
  const handleDobChange = (e) => {
    // ❌ Remove everything except digits
    let value = e.target.value.replace(/[^0-9]/g, "");

    // Limit to 8 digits (DDMMYYYY)
    if (value.length > 8) value = value.slice(0, 8);

    let formatted = value;

    if (value.length > 4) {
      formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    setDob(formatted);
  };

  //for slash
  const handleKeyDown = (e) => {
    if (e.key === "/") {
      e.preventDefault(); // ❌ block manual slash
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!pin.trim() || !dob.trim()) {
      setError("Please enter your PIN and date of birth.");
      return;
    }
    setLoading(true);
    try {
      const data = await studentLogin(pin.trim(), dob.trim());
      loginStudent(data.token, data.student);
      // Save previous selections if already submitted
      if (data.previous_selections) {
        localStorage.setItem(
          "previous_selections",
          JSON.stringify(data.previous_selections),
        );
      }
      if (data.has_submitted) {
        toast.success("Welcome back! Your selection is already submitted.");
      } else {
        toast.success("Login successful! Welcome.");
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-display">
              Faculty Selection Portal
            </h1>
            <p className="text-slate-500 text-sm mt-1">Student Login</p>
          </div>

          {/* Card */}
          <div className="card p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Registration PIN</label>
                <input
                  type="text"
                  className="input-field font-mono uppercase"
                  placeholder="e.g. 23091A05XX"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Date of Birth</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="DDMMYYYY (e.g. 01012000)"
                  value={dob}
                  onChange={handleDobChange}
                  onKeyDown={handleKeyDown}
                  maxLength={10}
                  autoComplete="off"
                  inputMode="numeric"
                />
                <p className="text-sm text-slate-400 mt-2">
                   Note: "/" is automatically inserted as you type. Do not enter it manually.
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    Login
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-base text-slate-400 mt-6">
            Admin?{" "}
            <Link
              to="/admin/login"
              className="text-primary-600 hover:underline font-medium">
              Admin Login →
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

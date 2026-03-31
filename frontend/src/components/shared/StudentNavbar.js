import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import CountdownTimer from "./CountdownTimer";

export default function StudentNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl ">
              <img
                src="/logo.png"
                alt="clg logo"
                style={{ borderRadius: 10 }}
              />
            </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 font-display leading-tight">
              Faculty Portal
            </p>
            <p className="text-xs text-slate-400 leading-tight">
              Selection System
            </p>
          </div>
        </div>

        {/* Timer (center) */}
        <div className="flex-1 flex justify-center">
          <CountdownTimer />
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-800 leading-tight">
              PIN: {user?.pin}
            </p>
            {/* <p className="text-xs text-slate-400 leading-tight">
              {user?.branch} · {user?.year}
            </p> */}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582M20 20v-5h-.581M5.23 9A7 7 0 0119 12m-14 0a7 7 0 0013.77 3"
              />
            </svg>
            Refresh
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

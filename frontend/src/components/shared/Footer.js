import React, { useState } from "react";

// GitHub SVG Icon
const GitHubIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0.297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// Pulse dot animation
// const PulseDot = () => (
//   <span className="relative flex h-2 w-2">
//     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
//   </span>
// );

const developers = [
  {
    name: "P Dhanunjaya",
    github: "codebydj",
    role: "Full Stack Developer",
    url: "https://github.com/codebydj",
    initial: "D",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    name: "K Haritha",
    github: "HarithaKongi",
    role: "Full Stack Developer",
    url: "https://github.com/HarithaKongi",
    initial: "H",
    gradient: "from-rose-500 to-pink-600",
  },
];

export default function Footer() {
  const [year] = useState(new Date().getFullYear());
  const [hovered, setHovered] = useState(null);

  return (
    <footer className="relative mt-auto w-full overflow-hidden">
      {/* Top border gradient */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      {/* Main footer */}
      <div className="bg-white from-slate-900 to-slate-950 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Top row */}
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            {/* Developer Cards */}
            <div className="bg-slate-800 flex flex-col sm:flex-row items-center justify-center gap-6 z-10 w-full px-10 py-6 rounded-2xl border border-white/10 backdrop-blur-sm">
              {developers.map((dev, i) => (
                <a
                  key={i}
                  href={dev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className=" group relative flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.07] hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    boxShadow:
                      hovered === i
                        ? i === 0
                          ? "0 8px 32px rgba(139,92,246,0.15)"
                          : "0 8px 32px rgba(244,63,94,0.15)"
                        : "none",
                  }}>
                  {/* Avatar */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${dev.gradient} text-sm font-bold text-white shadow-md`}>
                    {dev.initial}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-100 leading-tight">
                      {dev.name}
                    </span>
                    <span className="text-xs text-slate-400 leading-tight">
                      {dev.role}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                        <GitHubIcon size={12} />
                      </span>
                      <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors truncate">
                        {dev.github}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-600 transition-all duration-200 group-hover:text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 17L17 7M17 7H7M17 7v10"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

          {/* Bottom row */}
          <div className="flex flex-col items-center justify-center w-full">
            <p className="text-xs text-slate-500 text-center">
              © {year} Faculty Selection Portal. Built with ❤️ for academic
              excellence.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

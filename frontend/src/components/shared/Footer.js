import React from "react";

const mainDevelopers = [
  { name: "Haritha Kongi", url: "https://github.com/HarithaKongi" },
  { name: "Dhanunjaya P", url: "https://github.com/codebydj" },
  // { name: "member 2", url: "https://github.com/HarithaKongi" },
];

const teamMembers = [
  { name: "M. Suhitha", url: "" },
  { name: "|", url: "" },
  { name: "G. Akshitha", url: "" },
  { name: "|", url: "" },
  { name: "B. Keerthana", url: "" },
];

export default function Footer() {
  const GitHubIcon = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 25 25" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.8-.26.8-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.05.14 3 .4 2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.2.69.8.57C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
  return (
    <footer className="py-6 bg-white flex flex-col items-center gap-3">
      <p className="text-sm text-gray-500 font-semibold">
        {" "}
        Designed & Developed by:{" "}
      </p>

      {/* 🔹 Main Developers */}
      <div className="flex flex-wrap justify-center gap-3">
        {mainDevelopers.map((user, i) => (
          <a
            key={i}
            href={user.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center bg-blue-100 gap-2 text-blue-700 text-sm font-bold px-5 py-1 border-2 border-blue-300 rounded-full hover:bg-blue-700 hover:text-white hover:border-blue-700 transition">
            <GitHubIcon />
            {user.name}
          </a>
        ))}
      </div>

      {/* 🔹 Team Members */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500 font-semibold">Assisted By :</p>

        <div className="flex flex-wrap justify-center gap-3">
          {teamMembers.map((user, i) => (
            <p
              key={i}
              className="flex items-center gap-1  text-gray-500 text-xs font-medium font-display hover:bg-gray-100 transition cursor-default">
              {user.name}
            </p>
          ))}
        </div>
      </div>
      {/* Footer Text */}
      <p className="text-sm font-medium text-gray-700 text-center border-0 border-t-2 border-gray-300 pt-3 mt-3">
        © {new Date().getFullYear()} Department of CSE - Faculty Selection Portal
      </p>
    </footer>
  );
}

import React from "react";

const mainDevelopers = [
  { name: "codebydj", url: "https://github.com/codebydj" },
  { name: "HarithaKongi", url: "https://github.com/HarithaKongi" },
  // { name: "member 2", url: "https://github.com/HarithaKongi" },
];

// const teamMembers = [
//   { name: "member1", url: "https://github.com/member1" },
//   { name: "member2", url: "https://github.com/member2" },
//   { name: "member3", url: "https://github.com/member3" },
// ];

export default function Footer() {
  const GitHubIcon = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.8-.26.8-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.05.14 3 .4 2.3-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.2.69.8.57C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
  return (
    <footer className="py-6 bg-white flex flex-col items-center gap-3">
      <p className="text-xs text-gray-500 font-semibold"> Developed by: </p>

      {/* 🔹 Main Developers */}
      <div className="flex flex-wrap justify-center gap-3">
        {mainDevelopers.map((user, i) => (
          <a
            key={i}
            href={user.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 text-sm font-bold px-3 py-1 border border-gray-400 rounded-full hover:bg-gray-100 transition">
            <GitHubIcon />
            {user.name}
          </a>
        ))}
      </div>

      {/* 🔹 Team Members */}
      {/* <div className="flex flex-col items-center gap-1">
        <p className="text-xs text-gray-500 font-semibold">Team Members</p>

        <div className="flex flex-wrap justify-center gap-2">
          {teamMembers.map((user, i) => (
            <a
              key={i}
              href={user.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-600 text-xs font-bold px-3 py-1 border border-gray-400 rounded-full hover:bg-gray-100 transition">
              <GitHubIcon  />
              {user.name}
            </a>
          ))}
        </div>
      </div> */}

      {/* Footer Text */}
      <p className="text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} Faculty Selection Portal
      </p>
    </footer>
  );
}

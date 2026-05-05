import { useEffect, useState } from "react";

export function Nav() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="topbar-name">Middleware</span>
        <span className="topbar-version">v1.0</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-time">
          {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="topbar-status">Live</span>
      </div>
    </header>
  );
}

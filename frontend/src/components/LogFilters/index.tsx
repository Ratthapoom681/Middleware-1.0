import { useMemo } from "react";
import type { LogLevel, LogSource } from "../../hooks/useLogStream";

interface LogFiltersProps {
  search: string;
  level: LogLevel | "ALL";
  source: LogSource | "ALL";
  onSearch: (v: string) => void;
  onLevel: (v: LogLevel | "ALL") => void;
  onSource: (v: LogSource | "ALL") => void;
}

const LEVELS: (LogLevel | "ALL")[] = ["ALL", "INFO", "WARN", "ERROR", "CRITICAL"];
const SOURCES: (LogSource | "ALL")[] = ["ALL", "Wazuh", "DefectDojo", "Redmine", "System"];

const LEVEL_COLORS: Record<string, string> = {
  ALL:      "var(--text-secondary)",
  INFO:     "#22d47a",
  WARN:     "#ffd166",
  ERROR:    "#ff8c42",
  CRITICAL: "#ff4d6a",
};

export function LogFilters({ search, level, source, onSearch, onLevel, onSource }: LogFiltersProps) {
  return (
    <div className="log-filter-bar">
      {/* Search */}
      <div className="log-search-wrap">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="log-search-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="log-search"
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Level chips */}
      <div className="log-chip-group">
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`log-chip ${level === l ? "active" : ""}`}
            style={{ "--chip-color": LEVEL_COLORS[l] } as React.CSSProperties}
            onClick={() => onLevel(l)}
          >
            {l !== "ALL" && <span className="chip-dot" style={{ background: LEVEL_COLORS[l] }} />}
            {l}
          </button>
        ))}
      </div>

      {/* Source select */}
      <select
        className="filter-select log-source-select"
        value={source}
        onChange={(e) => onSource(e.target.value as LogSource | "ALL")}
      >
        {SOURCES.map((s) => (
          <option key={s} value={s}>{s === "ALL" ? "All Sources" : s}</option>
        ))}
      </select>
    </div>
  );
}

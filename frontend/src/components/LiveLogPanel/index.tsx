import { useEffect, useRef } from "react";
import type { LogEntry, LogLevel } from "../../hooks/useLogStream";

interface LiveLogPanelProps {
  logs: LogEntry[];
  paused: boolean;
  userScrolled: boolean;
  onScroll: (userScrolled: boolean) => void;
}

const LEVEL_META: Record<LogLevel, { color: string; bg: string; tag: string }> = {
  INFO:     { color: "#22d47a", bg: "rgba(34,212,122,0.08)",  tag: "INFO" },
  WARN:     { color: "#ffd166", bg: "rgba(255,209,102,0.08)", tag: "WARN" },
  ERROR:    { color: "#ff8c42", bg: "rgba(255,140,66,0.08)",  tag: "ERR " },
  CRITICAL: { color: "#ff4d6a", bg: "rgba(255,77,106,0.10)",  tag: "CRIT" },
};

const SOURCE_COLORS: Record<string, string> = {
  API:        "#4f86ff",
  Auth:       "#ffd166",
  Audit:      "#2dc1c6",
  Errors:     "#ff4d6a",
  Frontend:   "#a07cff",
  Jobs:       "#22d47a",
  Wazuh:      "#4f86ff",
  DefectDojo: "#7c5cfc",
  Redmine:    "#2dc1c6",
  System:     "#8da6c7",
};

export function LiveLogPanel({ logs, paused, userScrolled, onScroll }: LiveLogPanelProps) {
  const linesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = linesRef.current;
    if (!userScrolled && node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [logs, userScrolled]);

  const handleLinesScroll = () => {
    const node = linesRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    onScroll(distanceFromBottom > 24);
  };

  return (
    <div className="log-panel">
      {/* Terminal header bar */}
      <div className="log-panel-topbar">
        <div className="terminal-dots">
          <span style={{ background: "#ff5f57" }} />
          <span style={{ background: "#febc2e" }} />
          <span style={{ background: "#28c840" }} />
        </div>
        <span className="terminal-title">
          LIVE LOG STREAM &nbsp;—&nbsp;
          <span style={{ color: paused ? "#ffd166" : "#22d47a" }}>
            {paused ? "● PAUSED" : "▶ STREAMING"}
          </span>
        </span>
        <span className="terminal-count">{logs.length} entries</span>
      </div>

      {/* Log lines */}
      <div className="log-lines" onScroll={handleLinesScroll} ref={linesRef}>
        {[...logs].reverse().map((entry) => {
          const meta = LEVEL_META[entry.level];
          return (
            <div
              key={entry.id}
              className={`log-row ${entry.isNew ? "log-row--new" : ""} ${entry.level === "CRITICAL" ? "log-row--critical" : ""}`}
              style={{ background: entry.isNew ? meta.bg : undefined }}
            >
              <span className="log-time">{entry.time}</span>
              <span className="log-source" style={{ color: SOURCE_COLORS[entry.source] }}>
                {entry.source.padEnd(10)}
              </span>
              <span className="log-level" style={{ color: meta.color }}>
                [{meta.tag}]
              </span>
              <span className="log-message">
                <span className="log-message-text">{entry.message}</span>
                {entry.path || entry.caller || entry.container ? (
                  <span className="log-meta-row">
                    {entry.path ? <span className="log-meta-chip">{entry.path}</span> : null}
                    {entry.caller ? <span className="log-meta-chip">caller {entry.caller}</span> : null}
                    {entry.container ? <span className="log-meta-chip log-meta-chip--container">api {entry.container}</span> : null}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

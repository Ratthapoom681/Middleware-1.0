import { useEffect, useRef } from "react";

export type LogLevel = "INFO" | "ERROR" | "WARN" | "SUCCESS";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
}

export function makeLog(level: LogLevel, msg: string): LogEntry {
  const d = new Date();
  const ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  return { ts, level, msg };
}

export function ActivityLog({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  const levelClass: Record<LogLevel, string> = {
    INFO: "log-level-info",
    ERROR: "log-level-error",
    WARN: "log-level-warn",
    SUCCESS: "log-level-success",
  };

  return (
    <div className="dojo-log-panel">
      <div className="dojo-log-header">
        <span className="dojo-log-title">⬛ Activity Log</span>
        <button className="button button--ghost" style={{ fontSize: "0.72rem", padding: "4px 10px" }} onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="dojo-log-body" ref={bodyRef}>
        {logs.length === 0 && <span className="log-msg" style={{ color: "var(--text-muted)" }}>No activity yet…</span>}
        {logs.map((l, i) => (
          <div key={i} className="log-line">
            <span className="log-ts">{l.ts}</span>
            <span className={levelClass[l.level]}>[{l.level}]</span>
            <span className="log-msg">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

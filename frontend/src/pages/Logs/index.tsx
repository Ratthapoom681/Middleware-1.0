import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useLogStream } from "../../hooks/useLogStream";
import { LiveLogPanel } from "../../components/LiveLogPanel";
import { LogFilters } from "../../components/LogFilters";
import type { LogLevel, LogSource } from "../../hooks/useLogStream";

/* ─── Stat card mini ─── */
function LogStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="log-stat-card">
      <div className="log-stat-value" style={{ color }}>{value}</div>
      <div className="log-stat-label">{label}</div>
    </div>
  );
}

/* ─── Source bar ─── */
function SourceBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="source-bar-row">
      <div className="source-bar-meta">
        <span style={{ color }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Audio alert (one-shot beep via AudioContext) ─── */
function beepAlert() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (_) { /* ignore if AudioContext blocked */ }
}

/* ─── Download helpers ─── */
function downloadFile(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function Logs() {
  const [paused, setPaused] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<LogSource | "ALL">("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const { logs, addLog, clear } = useLogStream(paused);

  // Sound on new CRITICAL
  const prevCritCount = useRef(0);
  const critCount = useMemo(() => logs.filter((l) => l.level === "CRITICAL").length, [logs]);
  useEffect(() => {
    if (soundEnabled && critCount > prevCritCount.current) beepAlert();
    prevCritCount.current = critCount;
  }, [critCount, soundEnabled]);

  // Derived stats
  const todayCount   = logs.length;
  const warnCount    = useMemo(() => logs.filter((l) => l.level === "WARN").length, [logs]);
  const errorCount   = useMemo(() => logs.filter((l) => l.level === "ERROR").length, [logs]);
  const connSources  = useMemo(() => new Set(logs.map((l) => l.source)).size, [logs]);

  // Source distribution
  const sourceDist = useMemo(() => {
    const total = logs.length || 1;
    const counts: Record<string, number> = {};
    logs.forEach((l) => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([src, n]) => ({
      label: src,
      pct: Math.round((n / total) * 100),
    })).sort((a, b) => b.pct - a.pct);
  }, [logs]);

  // Filtered logs
  const filtered = useMemo(() => logs.filter((l) => {
    if (levelFilter !== "ALL" && l.level !== levelFilter) return false;
    if (sourceFilter !== "ALL" && l.source !== sourceFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) &&
        !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, levelFilter, sourceFilter, search]);

  const handleScroll = useCallback(() => setUserScrolled(true), []);

  const exportTxt = () => downloadFile(
    filtered.map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`).join("\n"),
    `logs-${new Date().toISOString().split("T")[0]}.txt`, "text/plain"
  );
  const exportCsv = () => downloadFile(
    ["time,level,source,message", ...filtered.map((l) => `${l.time},${l.level},${l.source},"${l.message.replace(/"/g, "'")}"`)].join("\n"),
    `logs-${new Date().toISOString().split("T")[0]}.csv`, "text/csv"
  );

  const SOURCE_COLORS: Record<string, string> = {
    Wazuh: "#4f86ff", DefectDojo: "#7c5cfc", Redmine: "#2dc1c6", System: "#8da6c7"
  };

  const lastEvent = logs[0];

  return (
    <div className={`logs-page ${fullscreen ? "logs-fullscreen" : ""}`}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Real-Time Monitoring</p>
          <h1 className="page-title">Live Log Stream</h1>
          <p className="page-subtitle">SOC console — live security event feed from all connected sources</p>
        </div>
        <div className="page-actions">
          <button
            className={`button ${soundEnabled ? "button--success" : "button--ghost"}`}
            onClick={() => setSoundEnabled((s) => !s)}
            title="Toggle sound alerts"
          >
            {soundEnabled ? (
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0-12L8 9H4v6h4l4 3V6z" />
              </svg>
            ) : (
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
          <button className="button button--danger" onClick={clear}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
          <button className="button button--ghost" onClick={() => setFullscreen((f) => !f)}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="log-stats-row">
        <LogStat label="Logs Today"        value={todayCount}  color="var(--accent)" />
        <LogStat label="Critical Events"   value={critCount}   color="#ff4d6a" />
        <LogStat label="Warnings"          value={warnCount}   color="#ffd166" />
        <LogStat label="Connected Sources" value={connSources} color="#22d47a" />
      </div>

      {/* Filters */}
      <LogFilters
        search={search} level={levelFilter} source={sourceFilter}
        onSearch={setSearch} onLevel={setLevelFilter} onSource={setSourceFilter}
      />

      {/* Main layout: log panel + sidebar */}
      <div className="logs-main">
        {/* Controls */}
        <div className="log-controls">
          <button
            className={`button ${paused ? "button--primary" : "button--secondary"}`}
            onClick={() => { setPaused((p) => !p); setUserScrolled(false); }}
          >
            {paused ? (
              <><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg> Resume</>
            ) : (
              <><svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/></svg> Pause</>
            )}
          </button>
          <button className="button button--ghost" onClick={exportTxt}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            TXT
          </button>
          <button className="button button--ghost" onClick={exportCsv}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          {userScrolled && (
            <button className="button button--secondary" onClick={() => setUserScrolled(false)}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
              </svg>
              Jump to Latest
            </button>
          )}
          <span className="log-count-badge">{filtered.length} / {logs.length} shown</span>
        </div>

        <div className="logs-content-row">
          {/* Log panel */}
          <LiveLogPanel
            logs={filtered}
            paused={paused}
            userScrolled={userScrolled}
            onScroll={handleScroll}
          />

          {/* Right sidebar */}
          <div className="log-sidebar-panel">
            {/* Stream status */}
            <div className="panel log-status-panel">
              <p className="panel-title" style={{ marginBottom: "1rem" }}>Stream Status</p>
              <div className="log-status-rows">
                <div className="log-status-row">
                  <span className="log-status-dot" style={{ background: paused ? "#ffd166" : "#22d47a" }} />
                  <span>{paused ? "Stream Paused" : "WebSocket Active"}</span>
                </div>
                <div className="log-status-row" style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                  </svg>
                  Last event: {lastEvent?.time ?? "—"}
                </div>
                <div className="log-status-row" style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  ~{paused ? "0" : "1"} event/2s
                </div>
              </div>
            </div>

            {/* Top sources */}
            <div className="panel">
              <p className="panel-title" style={{ marginBottom: "1rem" }}>Top Sources</p>
              <div style={{ display: "grid", gap: "0.85rem" }}>
                {sourceDist.map((s) => (
                  <SourceBar key={s.label} label={s.label} pct={s.pct} color={SOURCE_COLORS[s.label] ?? "#8da6c7"} />
                ))}
              </div>
            </div>

            {/* Level breakdown */}
            <div className="panel">
              <p className="panel-title" style={{ marginBottom: "1rem" }}>Level Breakdown</p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {(["CRITICAL", "ERROR", "WARN", "INFO"] as const).map((lvl) => {
                  const count = logs.filter((l) => l.level === lvl).length;
                  const COLORS: Record<string, string> = { CRITICAL: "#ff4d6a", ERROR: "#ff8c42", WARN: "#ffd166", INFO: "#22d47a" };
                  const pct = logs.length ? Math.round((count / logs.length) * 100) : 0;
                  return (
                    <div key={lvl} className="level-breakdown-row">
                      <span style={{ color: COLORS[lvl], fontSize: "0.75rem", fontWeight: 700, width: 60 }}>{lvl}</span>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[lvl] }} />
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", width: 30, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

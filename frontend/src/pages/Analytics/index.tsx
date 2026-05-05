import { useState } from "react";
import { ChartCard } from "../../components/ChartCard";
import { DataTable } from "../../components/DataTable";
import { StatCard } from "../../components/StatCard";

/* ── Mock KPI ── */
const kpis = [
  { label: "Monthly Alerts", value: "1,204", delta: "+18% vs last month", deltaDir: "up" as const, color: "#4f86ff", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
  { label: "Closed Tickets", value: "640", delta: "+9% vs last month", deltaDir: "up" as const, color: "#22d47a", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { label: "Avg Response Time", value: "4.2h", delta: "-11% faster", deltaDir: "down" as const, color: "#ffd166", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg> },
  { label: "Resolved Findings", value: "87.3%", delta: "+2.1% resolution rate", deltaDir: "up" as const, color: "#7c5cfc", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];

/* ── Monthly Trend data ── */
const monthlyTrend = [
  { month: "Jan", wazuh: 120, defectdojo: 80, redmine: 45 },
  { month: "Feb", wazuh: 145, defectdojo: 95, redmine: 60 },
  { month: "Mar", wazuh: 130, defectdojo: 110, redmine: 55 },
  { month: "Apr", wazuh: 190, defectdojo: 125, redmine: 70 },
  { month: "May", wazuh: 175, defectdojo: 140, redmine: 80 },
  { month: "Jun", wazuh: 220, defectdojo: 155, redmine: 90 },
];

/* ── Source comparison ── */
const sources = [
  { name: "Wazuh", alerts: 980, open: 200, closed: 780, color: "#4f86ff" },
  { name: "DefectDojo", alerts: 705, open: 130, closed: 575, color: "#7c5cfc" },
  { name: "Redmine", alerts: 400, open: 51, closed: 349, color: "#2dc1c6" },
];

/* ── Aging data ── */
const agingBuckets = [
  { label: "< 1 day", value: 312, color: "#22d47a" },
  { label: "1-3 days", value: 218, color: "#4f86ff" },
  { label: "3-7 days", value: 145, color: "#ffd166" },
  { label: "7-14 days", value: 89, color: "#ff8c42" },
  { label: "> 14 days", value: 47, color: "#ff4d6a" },
];

/* ── Team performance ── */
const teamData = [
  { name: "Team Alpha", resolved: 187, avg: "3.1h", score: 94 },
  { name: "Team Beta", resolved: 142, avg: "4.7h", score: 81 },
  { name: "Team Gamma", resolved: 203, avg: "2.8h", score: 97 },
  { name: "Team Delta", resolved: 108, avg: "6.2h", score: 72 },
];

/* ── Top issues ── */
type Issue = { id: number; title: string; source: string; severity: string; age: string; owner: string; score: number };
const topIssues: Issue[] = [
  { id: 1, title: "Remote code execution via deserialization", source: "DefectDojo", severity: "critical", age: "18d", owner: "Team Gamma", score: 9.8 },
  { id: 2, title: "Privilege escalation in sudo config", source: "Wazuh", severity: "critical", age: "12d", owner: "Team Alpha", score: 9.1 },
  { id: 3, title: "Sensitive data exposure in error logs", source: "DefectDojo", severity: "high", age: "9d", owner: "Team Beta", score: 7.6 },
  { id: 4, title: "Open redirect in auth flow", source: "Wazuh", severity: "high", age: "7d", owner: "Team Gamma", score: 7.2 },
  { id: 5, title: "Outdated TLS cipher suites", source: "Redmine", severity: "medium", age: "21d", owner: "Team Delta", score: 5.9 },
  { id: 6, title: "Missing rate limiting on /api/login", source: "DefectDojo", severity: "medium", age: "5d", owner: "Team Alpha", score: 5.4 },
];

/* ── Charts ── */
function GroupedBarChart({ data }: { data: typeof monthlyTrend }) {
  const max = Math.max(...data.flatMap((d) => [d.wazuh, d.defectdojo, d.redmine]));
  const colors = ["#4f86ff", "#7c5cfc", "#2dc1c6"];
  const keys = ["wazuh", "defectdojo", "redmine"] as const;
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", height: 130, paddingTop: "0.5rem" }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", width: "100%", height: "calc(100% - 20px)", justifyContent: "center" }}>
            {keys.map((k, i) => (
              <div key={k} style={{ flex: 1, background: colors[i], borderRadius: "3px 3px 0 0", height: `${(d[k] / max) * 90}%`, opacity: 0.85, transition: "height 600ms" }} />
            ))}
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.62rem" }}>{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function HorizBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function SourceCompare() {
  const maxAlerts = Math.max(...sources.map((s) => s.alerts));
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {sources.map((s) => (
        <div key={s.name} style={{ display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{s.name}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ background: "rgba(34,212,122,0.1)", border: "1px solid rgba(34,212,122,0.2)", borderRadius: "99px", color: "#22d47a", fontSize: "0.7rem", padding: "2px 8px" }}>✓ {s.closed}</span>
              <span style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", borderRadius: "99px", color: "#ff4d6a", fontSize: "0.7rem", padding: "2px 8px" }}>● {s.open}</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(s.alerts / maxAlerts) * 100}%`, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Severity / Status badge helpers ── */
function SeverityBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = { critical: "badge-critical", high: "badge-high", medium: "badge-medium", low: "badge-low" };
  return <span className={`badge ${map[sev] ?? "badge-info"}`}>{sev}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 9 ? "#ff4d6a" : score >= 7 ? "#ff8c42" : "#ffd166";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div className="progress-bar" style={{ width: 60 }}>
        <div className="progress-fill" style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <span style={{ color, fontWeight: 700, fontSize: "0.8rem" }}>{score}</span>
    </div>
  );
}

export function Analytics() {
  const [dateRange, setDateRange] = useState("last30");
  const [severity, setSeverity] = useState("all");
  const [source, setSource] = useState("all");

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Analytics</p>
          <h1 className="page-title">Deep Insights</h1>
          <p className="page-subtitle">Security posture trends, team performance, and vulnerability aging</p>
        </div>
        <div className="page-actions">
          <button className="button button--ghost">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button className="button button--primary">Generate Report</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid-4">
        {kpis.map((k) => <StatCard key={k.label} {...k} />)}
      </div>

      {/* Filters */}
      <div className="panel" style={{ padding: "1rem 1.5rem" }}>
        <div className="filter-bar">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Filters</span>
          <select className="filter-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </select>
          <select className="filter-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="filter-select" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="wazuh">Wazuh</option>
            <option value="defectdojo">DefectDojo</option>
            <option value="redmine">Redmine</option>
          </select>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-grid-2">
        <ChartCard title="Monthly Alert Trend" subtitle="Breakdown by source — last 6 months"
          action={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[["Wazuh","#4f86ff"],["DefectDojo","#7c5cfc"],["Redmine","#2dc1c6"]].map(([l,c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  {l}
                </div>
              ))}
            </div>
          }
        >
          <GroupedBarChart data={monthlyTrend} />
        </ChartCard>

        <ChartCard title="Source Comparison" subtitle="Total alerts &amp; resolution rate by source">
          <SourceCompare />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-grid-2">
        <ChartCard title="Vulnerability Aging" subtitle="Open findings by age bucket">
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.25rem" }}>
            {agingBuckets.map((b) => (
              <HorizBar key={b.label} label={b.label} value={b.value} max={agingBuckets[0].value} color={b.color} />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Team Performance" subtitle="Resolution stats per team">
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {teamData.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0", borderBottom: "1px solid rgba(79,134,255,0.08)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(79,134,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>
                  {t.name.split(" ")[1][0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.resolved} resolved · avg {t.avg}</p>
                </div>
                <ScoreBar score={t.score} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Top Issues Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Top Issues</p>
            <p className="panel-subtitle">Highest-risk open findings ranked by CVSS score</p>
          </div>
        </div>
        <DataTable<Issue>
          columns={[
            { key: "title", label: "Title", render: (r) => <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{r.title}</span> },
            { key: "source", label: "Source", render: (r) => <span style={{ color: "#7c5cfc", fontWeight: 600, fontSize: "0.8rem" }}>{r.source}</span> },
            { key: "severity", label: "Severity", render: (r) => <SeverityBadge sev={r.severity} /> },
            { key: "age", label: "Age", render: (r) => <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.age}</span> },
            { key: "owner", label: "Owner", render: (r) => <span style={{ fontSize: "0.8rem" }}>{r.owner}</span> },
            { key: "score", label: "CVSS", render: (r) => <ScoreBar score={r.score} /> },
          ]}
          rows={topIssues}
          getRowKey={(r) => r.id}
          emptyMessage="No issues found."
        />
      </div>
    </div>
  );
}

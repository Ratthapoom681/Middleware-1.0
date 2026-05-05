import { useState } from "react";
import { ChartCard } from "../../components/ChartCard";
import { DataTable } from "../../components/DataTable";
import { StatCard } from "../../components/StatCard";

/* ── Mock data ── */
const summaryCards = [
  { label: "Total Alerts", value: "2,847", delta: "+12% this week", deltaDir: "up" as const, color: "#4f86ff", iconBg: "#4f86ff22", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
  { label: "Critical Findings", value: "143", delta: "-8% vs last week", deltaDir: "down" as const, color: "#ff4d6a", iconBg: "#ff4d6a22", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
  { label: "Open Tickets", value: "381", delta: "+5 today", deltaDir: "up" as const, color: "#ffd166", iconBg: "#ffd16622", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { label: "Active Agents", value: "12", delta: "All online", deltaDir: "neutral" as const, color: "#22d47a", iconBg: "#22d47a22", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg> },
  { label: "Sync Status", value: "99.8%", delta: "Last: 2m ago", deltaDir: "neutral" as const, color: "#2dc1c6", iconBg: "#2dc1c622", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> },
  { label: "System Health", value: "Healthy", delta: "All services up", deltaDir: "up" as const, color: "#7c5cfc", iconBg: "#7c5cfc22", icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
];

const alertTrend = [38, 52, 44, 70, 63, 91, 78, 102, 88, 120, 110, 143];
const trendLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const severityData = [
  { label: "Critical", value: 143, color: "#ff4d6a" },
  { label: "High", value: 487, color: "#ff8c42" },
  { label: "Medium", value: 821, color: "#ffd166" },
  { label: "Low", value: 1396, color: "#22d47a" },
];

const ticketStatus = [
  { label: "Open", value: 381, color: "#4f86ff" },
  { label: "In Progress", value: 212, color: "#7c5cfc" },
  { label: "Pending", value: 94, color: "#ffd166" },
  { label: "Closed", value: 640, color: "#22d47a" },
];

type ActivityRow = { id: number; source: string; title: string; severity: string; status: string; updated: string };

const recentActivity: ActivityRow[] = [
  { id: 1, source: "Wazuh", title: "Brute-force login attempt detected", severity: "critical", status: "open", updated: "2m ago" },
  { id: 2, source: "DefectDojo", title: "SQL injection in /api/users endpoint", severity: "high", status: "open", updated: "15m ago" },
  { id: 3, source: "Redmine", title: "SSL certificate expires in 14 days", severity: "medium", status: "pending", updated: "1h ago" },
  { id: 4, source: "Wazuh", title: "Unusual outbound traffic on port 4444", severity: "high", status: "open", updated: "2h ago" },
  { id: 5, source: "DefectDojo", title: "Insecure direct object reference", severity: "medium", status: "closed", updated: "3h ago" },
  { id: 6, source: "Wazuh", title: "New process spawned by webserver", severity: "low", status: "closed", updated: "5h ago" },
];

/* ── Inline SVG Line Chart ── */
function LineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const w = 600, h = 120, pad = 8;
  const max = Math.max(...values);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `${pts[0].split(",")[0]},${h} ` + pts.join(" ") + ` ${pts[pts.length-1].split(",")[0]},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="line-chart-svg" style={{ height: 130 }}>
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f86ff" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#4f86ff" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#lg1)" />
      <polyline points={polyline} fill="none" stroke="#4f86ff" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v / max) * (h - pad * 2));
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.5} fill="#4f86ff" />
            {i % 2 === 0 && (
              <text x={x} y={h - 1} textAnchor="middle" fontSize={8} fill="#4e6a8e">{labels[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Donut Chart ── */
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 46, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map((d) => {
    const dash = (d.value / total) * circumference;
    const gap = circumference - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(79,134,255,0.08)" strokeWidth={14} />
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={14}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset + circumference * 0.25}
            strokeLinecap="butt"
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#e8f0ff">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={7} fill="#4e6a8e">TOTAL</text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div key={d.label} className="legend-item">
            <div className="legend-dot" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Bar Chart ── */
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.label} className="bar-col">
          <span style={{ color: d.color, fontSize: "0.65rem", fontWeight: 700 }}>{d.value}</span>
          <div className="bar-fill" style={{ height: `${(d.value / max) * 85}%`, background: d.color, opacity: 0.85 }} />
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Severity badge ── */
function SeverityBadge({ sev }: { sev: string }) {
  const map: Record<string, string> = { critical: "badge-critical", high: "badge-high", medium: "badge-medium", low: "badge-low" };
  return <span className={`badge ${map[sev] ?? "badge-info"}`}>{sev}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { open: "badge-open", closed: "badge-closed", pending: "badge-pending" };
  return <span className={`badge ${map[status] ?? "badge-info"}`}>{status}</span>;
}

/* ── Main Component ── */
export function Dashboard() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Dashboard</p>
          <h1 className="page-title">System Overview</h1>
          <p className="page-subtitle">Real-time monitoring of Middleware-1.0 security pipeline</p>
        </div>
        <div className="page-actions">
          <button className="button button--ghost" onClick={() => window.location.reload()}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          <button className="button button--secondary" disabled={syncing} onClick={handleSync}>
            {syncing ? "Syncing…" : "⚡ Sync Now"}
          </button>
          <button className="button button--primary">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid-6">
        {summaryCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <ChartCard title="Alerts Trend" subtitle="Monthly alert volume — last 12 months">
          <LineChart values={alertTrend} labels={trendLabels} />
        </ChartCard>

        <ChartCard title="Severity Distribution" subtitle="By finding severity">
          <DonutChart data={severityData} />
        </ChartCard>

        <ChartCard title="Ticket Status" subtitle="Current ticket breakdown">
          <BarChart data={ticketStatus} />
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Recent Activity</p>
            <p className="panel-subtitle">Latest security events across all sources</p>
          </div>
          <div className="quick-actions">
            <button className="button button--ghost" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }}>
              Generate Report
            </button>
            <button className="button button--secondary" style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }}>
              View All →
            </button>
          </div>
        </div>
        <DataTable<ActivityRow>
          columns={[
            { key: "source", label: "Source", render: (r) => <span style={{ color: "#7c5cfc", fontWeight: 600, fontSize: "0.8rem" }}>{r.source}</span> },
            { key: "title", label: "Title", render: (r) => <span style={{ fontSize: "0.85rem" }}>{r.title}</span> },
            { key: "severity", label: "Severity", render: (r) => <SeverityBadge sev={r.severity} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "updated", label: "Updated", render: (r) => <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.updated}</span> },
          ]}
          rows={recentActivity}
          getRowKey={(r) => r.id}
          emptyMessage="No recent activity."
        />
      </div>
    </div>
  );
}

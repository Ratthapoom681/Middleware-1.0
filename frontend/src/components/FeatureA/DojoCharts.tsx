import type { DojoFinding } from "../../services/featureA.service";

const SEV_COLORS: Record<string, string> = {
  Critical: "#ff4d6a",
  High: "#ff8c42",
  Medium: "#ffd166",
  Low: "#22d47a",
  Info: "#4f86ff",
};

function PieChart({ findings }: { findings: DojoFinding[] }) {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = findings.length || 1;

  let cumAngle = -Math.PI / 2;
  const cx = 80, cy = 80, r = 65, hole = 38;

  const slices = entries.map(([sev, count]) => {
    const angle = (count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const hx1 = cx + hole * Math.cos(cumAngle - angle);
    const hy1 = cy + hole * Math.sin(cumAngle - angle);
    const hx2 = cx + hole * Math.cos(cumAngle);
    const hy2 = cy + hole * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${hx2} ${hy2} A ${hole} ${hole} 0 ${large} 0 ${hx1} ${hy1} Z`;
    return { sev, count, d };
  });

  return (
    <div className="dojo-pie-wrap">
      <svg width={160} height={160} viewBox="0 0 160 160">
        {findings.length === 0 ? (
          <circle cx={80} cy={80} r={65} fill="rgba(79,134,255,0.08)" stroke="rgba(79,134,255,0.2)" strokeWidth={1} />
        ) : (
          slices.map((s) => (
            <path key={s.sev} d={s.d} fill={SEV_COLORS[s.sev] ?? "#8da6c7"} opacity={0.9} />
          ))
        )}
        <text x={80} y={76} textAnchor="middle" fill="#e8f0ff" fontSize={18} fontWeight={800}>{findings.length}</text>
        <text x={80} y={92} textAnchor="middle" fill="#8da6c7" fontSize={9}>findings</text>
      </svg>
      <div className="dojo-pie-legend">
        {entries.map(([sev, count]) => (
          <div key={sev} className="dojo-pie-legend-item">
            <span className="dojo-pie-dot" style={{ background: SEV_COLORS[sev] ?? "#8da6c7" }} />
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>{sev}</span>
            <span style={{ fontWeight: 700 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ findings }: { findings: DojoFinding[] }) {
  // Group by date
  const byDate: Record<string, number> = {};
  for (const f of findings) {
    const d = f.date ?? "Unknown";
    byDate[d] = (byDate[d] ?? 0) + 1;
  }
  const entries = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  if (entries.length < 2) {
    return (
      <div className="dojo-empty" style={{ padding: "2rem" }}>Not enough date data to render trend</div>
    );
  }
  const W = 400, H = 120, PAD = 20;
  const max = Math.max(...entries.map((e) => e[1]), 1);
  const points = entries.map(([, v], i) => {
    const x = PAD + (i / (entries.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v / max) * (H - PAD * 2));
    return { x, y, v };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = [
    `M ${points[0].x} ${H - PAD}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${H - PAD} Z`,
  ].join(" ");

  return (
    <div className="dojo-line-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="dojo-line-svg" height={H}>
        <defs>
          <linearGradient id="dojo-line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f86ff" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f86ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dojo-line-grad)" />
        <polyline points={polyline} fill="none" stroke="#4f86ff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#4f86ff" />
        ))}
        {entries.map(([label], i) => {
          if (entries.length > 6 && i % 2 !== 0) return null;
          return (
            <text key={i} x={points[i].x} y={H - 4} textAnchor="middle" fill="#4e6a8e" fontSize={8}>{label.slice(5)}</text>
          );
        })}
      </svg>
    </div>
  );
}

export function DojoCharts({ findings }: { findings: DojoFinding[] }) {
  return (
    <div className="dojo-charts-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Severity Distribution</p>
            <p className="panel-subtitle">Pie breakdown by severity</p>
          </div>
        </div>
        <PieChart findings={findings} />
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Findings Trend</p>
            <p className="panel-subtitle">Count by discovery date</p>
          </div>
        </div>
        <LineChart findings={findings} />
      </div>
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  color?: string;
  icon: ReactNode;
  iconBg?: string;
}

export function StatCard({ label, value, delta, deltaDir = "neutral", color = "#4f86ff", icon, iconBg }: StatCardProps) {
  return (
    <article className="stat-card" style={{ "--card-color": color } as CSSProperties}>
      <div className="stat-card-icon" style={{ background: iconBg ?? `${color}22` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {delta && (
        <p className={`stat-card-delta ${deltaDir}`}>
          {deltaDir === "up" && "↑"}
          {deltaDir === "down" && "↓"}
          {deltaDir === "neutral" && "·"}
          {" "}{delta}
        </p>
      )}
    </article>
  );
}

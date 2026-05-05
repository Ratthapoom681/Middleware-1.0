import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function ChartCard({ title, subtitle, children, action }: ChartCardProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-title">{title}</p>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}

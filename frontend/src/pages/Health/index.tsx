import { useCallback, useEffect, useMemo, useState } from "react";
import { getHealthReport, type HealthComponent, type HealthReport } from "../../services/ops.service";

const COMPONENT_LABELS: Record<string, string> = {
  db: "Database",
  elasticsearch: "Elasticsearch",
  wazuh_ingest: "Wazuh Ingest",
  redmine: "Redmine Config",
  index_freshness: "Index Freshness",
};

const STATUS_COLORS: Record<string, string> = {
  ok: "var(--accent-green)",
  empty: "var(--accent-yellow)",
  disabled: "var(--text-secondary)",
  stale: "var(--accent-orange)",
  misconfigured: "var(--accent-orange)",
  unknown: "var(--accent-yellow)",
  down: "var(--accent-red)",
};

function statusClass(status: string) {
  if (status === "ok") return "ops-status ops-status--success";
  if (status === "down" || status === "failed") return "ops-status ops-status--failed";
  return "ops-status ops-status--running";
}

function DetailValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span>-</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "object") return <span>{JSON.stringify(value)}</span>;
  return <span>{String(value)}</span>;
}

function HealthTile({ name, component }: { name: string; component: HealthComponent }) {
  const label = COMPONENT_LABELS[name] ?? name;
  const entries = Object.entries(component.details ?? {});

  return (
    <article className="panel health-tile">
      <div className="health-tile-top">
        <div className="health-tile-icon" style={{ color: STATUS_COLORS[component.status] ?? "var(--text-secondary)" }}>
          <span />
        </div>
        <div>
          <p className="panel-title">{label}</p>
          <p className="panel-subtitle">{component.message ?? "No detail reported"}</p>
        </div>
        <span className={statusClass(component.status)}>{component.status}</span>
      </div>

      {entries.length ? (
        <div className="health-detail-grid">
          {entries.map(([key, value]) => (
            <div className="health-detail" key={key}>
              <small>{key.replaceAll("_", " ")}</small>
              <DetailValue value={value} />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function Health() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthReport(signal);
      setReport(data);
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load health report");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadHealth();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadHealth]);

  const components = useMemo(() => Object.entries(report?.components ?? {}), [report]);
  const generatedAt = report?.generated_at ? new Date(report.generated_at).toLocaleString("en-GB") : "-";

  return (
    <div className="page-stack health-page">
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">System Health</p>
          <h1 className="page-title">Middleware Readiness</h1>
          <p className="page-subtitle">Database, search, ingest worker, Redmine, and index freshness in one operational view</p>
        </div>
        <div className="page-actions">
          <button className="button button--secondary" onClick={() => void loadHealth()} disabled={loading}>
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="panel detection-error-panel">
          <strong>Health check failed.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="health-summary-band">
        <div>
          <p className="page-eyebrow">Overall</p>
          <h2>{report?.status ?? "loading"}</h2>
          <span>Generated {generatedAt}</span>
        </div>
        <div className="health-summary-meter">
          {components.map(([key, item]) => (
            <span
              key={key}
              title={`${COMPONENT_LABELS[key] ?? key}: ${item.status}`}
              style={{ background: STATUS_COLORS[item.status] ?? "var(--text-muted)" }}
            />
          ))}
        </div>
      </section>

      <div className="health-grid">
        {components.map(([key, component]) => (
          <HealthTile key={key} name={key} component={component} />
        ))}
      </div>
    </div>
  );
}

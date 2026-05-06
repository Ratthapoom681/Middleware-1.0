import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataTable } from "../../components/DataTable";
import {
  listDetectionAlerts,
  type DetectionAlert,
} from "../../services/detection.service";

const PAGE_SIZE = 25;
const POLL_INTERVAL_MS = 5000;
const DEFAULT_USE_CASES = [
  "Brute Force",
  "Abnormal Network Connection",
  "Impossible Travel",
  "Port Scan",
];

const SEVERITY_META: Record<string, { color: string; label: string; badge: string }> = {
  critical: { color: "#ff4d6a", label: "Critical", badge: "badge-critical" },
  high: { color: "#ff8c42", label: "High", badge: "badge-high" },
  medium: { color: "#ffd166", label: "Medium", badge: "badge-medium" },
  low: { color: "#22d47a", label: "Low", badge: "badge-low" },
};

function severityMeta(severity: string | null | undefined) {
  return SEVERITY_META[String(severity || "medium").toLowerCase()] ?? {
    color: "#4f86ff",
    label: severity || "Info",
    badge: "badge-info",
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function detailText(details: Record<string, unknown> | null | undefined, key: string) {
  const value = details?.[key];
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function detailsSummary(alert: DetectionAlert) {
  const details = alert.details ?? {};
  const preferred = [
    ["srcip", detailText(details, "srcip") ?? alert.source_ip],
    ["target", targetLabel(alert)],
    ["device", detailText(details, "devname")],
    ["dstip", detailText(details, "dstip")],
    ["dstport", detailText(details, "dstport")],
    ["user", detailText(details, "user")],
    ["count", detailText(details, "failed_count") ?? detailText(details, "distinct_port_count")],
    ["country", detailText(details, "current_country")],
  ].filter(([, value]) => value);

  return preferred.slice(0, 4) as [string, string][];
}

function targetLabel(alert: DetectionAlert) {
  const details = alert.details ?? {};
  const devname = detailText(details, "devname");
  const dstip = detailText(details, "dstip");
  const dstport = detailText(details, "dstport");

  if (devname && dstip && dstport) return `${devname} (${dstip}:${dstport})`;
  if (devname && dstip) return `${devname} (${dstip})`;
  if (dstip && dstport) return `${dstip}:${dstport}`;
  return devname ?? dstip ?? "-";
}

function DetectionStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="log-stat-card detection-stat-card">
      <div className="log-stat-value" style={{ color }}>
        {value}
      </div>
      <div className="log-stat-label">{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const meta = severityMeta(severity);
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
}

function DetectionLine({
  alert,
  highlighted,
}: {
  alert: DetectionAlert;
  highlighted: boolean;
}) {
  const meta = severityMeta(alert.severity);
  const summary = detailsSummary(alert);

  return (
    <div
      className={`detection-log-row ${highlighted ? "detection-log-row--new" : ""}`}
      style={{ borderLeftColor: meta.color }}
    >
      <span className="log-time">{formatTime(alert.timestamp)}</span>
      <span className="log-source" style={{ color: meta.color }}>
        {alert.use_case}
      </span>
      <span className="log-level" style={{ color: meta.color }}>
        [{meta.label.toUpperCase().slice(0, 4).padEnd(4)}]
      </span>
      <div className="detection-log-message">
        <strong>{alert.title}</strong>
        <span className="detection-target-line">Target: {targetLabel(alert)}</span>
        {alert.description ? <span>{alert.description}</span> : null}
        {summary.length ? (
          <div className="detection-pill-row">
            {summary.map(([key, value]) => (
              <span className="detection-pill" key={`${alert.id}-${key}`}>
                {key}: {value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function exportJson(items: DetectionAlert[]) {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `detection-alerts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DetectionLogWatcher() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [severity, setSeverity] = useState("all");
  const [useCase, setUseCase] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DetectionAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [severityCounts, setSeverityCounts] = useState<Record<string, number>>({});
  const [useCaseCounts, setUseCaseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const latestSeenId = useRef<number | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const fetchDetections = useCallback(
    async (signal?: AbortSignal, quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await listDetectionAlerts(
          {
            page,
            page_size: PAGE_SIZE,
            query: deferredQuery || undefined,
            severity,
            use_case: useCase,
          },
          signal,
        );

        const newestId = res.items[0]?.id ?? null;
        if (latestSeenId.current !== null && newestId !== null && newestId !== latestSeenId.current) {
          setHighlightedId(newestId);
          if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
          highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 2500);
        }
        latestSeenId.current = newestId;

        startTransition(() => {
          setItems(res.items);
          setTotal(res.total);
          setSeverityCounts(res.severity_counts);
          setUseCaseCounts(res.use_case_counts);
          setLastUpdated(new Date());
        });
      } catch (err: unknown) {
        if (signal?.aborted) return;
        const msg = err instanceof Error ? err.message : "Failed to load detection logs";
        setError(msg);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [deferredQuery, page, severity, useCase],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDetections(controller.signal);
    return () => controller.abort();
  }, [fetchDetections]);

  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => {
      fetchDetections(undefined, true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [fetchDetections, live]);

  useEffect(() => {
    startTransition(() => setPage(1));
  }, [deferredQuery, severity, useCase]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const criticalCount = severityCounts.critical ?? severityCounts.Critical ?? 0;
  const highCount = severityCounts.high ?? severityCounts.High ?? 0;
  const useCaseOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_USE_CASES, ...Object.keys(useCaseCounts)])).sort(),
    [useCaseCounts],
  );

  const latestAlert = items[0];

  return (
    <div className="detection-watch">
      <div className="detection-watch-hero">
        <div>
          <p className="eyebrow">Detection Watch</p>
          <h2>Generated security detections</h2>
          <p>
            Live polling view for alerts created by brute force, abnormal network,
            impossible travel, and port scan rules.
          </p>
        </div>
        <div className="detection-watch-controls">
          <span className={`detection-live-chip ${live ? "on" : ""}`}>
            <span />
            {live ? "Watching every 5s" : "Paused"}
          </span>
          <button
            className={`button ${live ? "button--success" : "button--ghost"}`}
            onClick={() => setLive((value) => !value)}
          >
            {live ? "Pause Watch" : "Resume Watch"}
          </button>
          <button className="button button--secondary" onClick={() => fetchDetections(undefined, true)}>
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          <button className="button button--ghost" onClick={() => exportJson(items)} disabled={!items.length}>
            Export Page
          </button>
        </div>
      </div>

      <div className="log-stats-row">
        <DetectionStat label="Matching Detections" value={total} color="var(--accent)" />
        <DetectionStat label="Critical" value={criticalCount} color="#ff4d6a" />
        <DetectionStat label="High" value={highCount} color="#ff8c42" />
        <DetectionStat
          label="Last Refresh"
          value={lastUpdated ? lastUpdated.toLocaleTimeString("en-GB") : "-"}
          color="#22d47a"
        />
      </div>

      <div className="log-filter-bar detection-filter-bar">
        <div className="log-search-wrap">
          <svg
            className="log-search-icon"
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="log-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, description, use case, severity, or source IP..."
          />
        </div>
        <select className="filter-select" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="filter-select" value={useCase} onChange={(event) => setUseCase(event.target.value)}>
          <option value="all">All use cases</option>
          {useCaseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="panel detection-error-panel">
          <strong>Detection watch failed.</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="detection-console-layout">
        <div className="log-panel detection-log-panel">
          <div className="log-panel-topbar">
            <div className="terminal-dots">
              <span style={{ background: "#ff5f57" }} />
              <span style={{ background: "#febc2e" }} />
              <span style={{ background: "#28c840" }} />
            </div>
            <span className="terminal-title">
              DETECTION ALERT STREAM &nbsp;-&nbsp;
              <span style={{ color: live ? "#22d47a" : "#ffd166" }}>
                {live ? "LIVE POLLING" : "PAUSED"}
              </span>
            </span>
            <span className="terminal-count">{items.length} visible</span>
          </div>
          <div className="log-lines">
            {loading ? (
              <div className="table-empty">Loading detection alerts...</div>
            ) : items.length ? (
              items.map((alert) => (
                <DetectionLine
                  alert={alert}
                  highlighted={alert.id === highlightedId}
                  key={alert.id}
                />
              ))
            ) : (
              <div className="table-empty">No detection logs found for this filter.</div>
            )}
          </div>
        </div>

        <div className="detection-side-stack">
          <div className="panel log-status-panel">
            <p className="panel-title" style={{ marginBottom: "1rem" }}>Latest Detection</p>
            {latestAlert ? (
              <div className="detection-latest">
                <SeverityBadge severity={latestAlert.severity} />
                <strong>{latestAlert.title}</strong>
                <span>{formatDateTime(latestAlert.timestamp)}</span>
                <span>Use case: {latestAlert.use_case}</span>
                <span>Source: {latestAlert.source_ip ?? "-"}</span>
                <span>Target: {targetLabel(latestAlert)}</span>
              </div>
            ) : (
              <p className="panel-subtitle">No detection has matched this view yet.</p>
            )}
          </div>

          <div className="panel">
            <p className="panel-title" style={{ marginBottom: "1rem" }}>Use Case Mix</p>
            <div className="detection-breakdown">
              {useCaseOptions.map((option) => {
                const count = useCaseCounts[option] ?? 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div className="source-bar-row" key={option}>
                    <div className="source-bar-meta">
                      <span>{option}</span>
                      <span style={{ color: "var(--text-muted)" }}>{count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Detection Archive</p>
            <p className="panel-subtitle">
              {total} matching detections · page {page} of {totalPages}
            </p>
          </div>
        </div>
        <DataTable<DetectionAlert>
          columns={[
            {
              key: "timestamp",
              label: "Timestamp",
              render: (alert) => <span className="detection-table-time">{formatDateTime(alert.timestamp)}</span>,
            },
            {
              key: "severity",
              label: "Severity",
              render: (alert) => <SeverityBadge severity={alert.severity} />,
            },
            {
              key: "use_case",
              label: "Use Case",
              render: (alert) => <span className="detection-use-case">{alert.use_case}</span>,
            },
            {
              key: "source_ip",
              label: "Source",
              render: (alert) => <span className="detection-code">{alert.source_ip ?? "-"}</span>,
            },
            {
              key: "target",
              label: "Target",
              render: (alert) => <span className="detection-code detection-target-code">{targetLabel(alert)}</span>,
            },
            {
              key: "title",
              label: "Detection",
              render: (alert) => (
                <div className="detection-table-title">
                  <strong>{alert.title}</strong>
                  {alert.description ? <span>{alert.description}</span> : null}
                </div>
              ),
            },
            {
              key: "details",
              label: "Key Details",
              render: (alert) => (
                <div className="detection-pill-row">
                  {detailsSummary(alert).map(([key, value]) => (
                    <span className="detection-pill" key={`${alert.id}-table-${key}`}>
                      {key}: {value}
                    </span>
                  ))}
                </div>
              ),
            },
          ]}
          rows={items}
          getRowKey={(alert) => alert.id}
          emptyMessage={loading ? "Loading detection logs..." : "No detection logs found."}
        />

        {total > 0 ? (
          <div className="detection-pagination">
            <button
              className="button button--secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              className="button button--secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

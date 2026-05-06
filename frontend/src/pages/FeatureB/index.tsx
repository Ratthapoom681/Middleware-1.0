import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "../../components/DataTable";
import { StatCard } from "../../components/StatCard";
import {
  searchWazuhAlerts,
  reindexWazuhAlerts,
  type WazuhAlert,
} from "../../services/wazuh.service";
import { DetectionLogWatcher } from "./DetectionLogWatcher";
import { WazuhSettings } from "./WazuhSettings";

type FeatureBTab = "alerts" | "detections" | "settings";

function isFeatureBTab(value: string | null): value is FeatureBTab {
  return value === "alerts" || value === "detections" || value === "settings";
}

/* ── Level → badge class mapping ── */
function levelBadge(level: number | null) {
  if (level === null) return <span className="badge badge-info">—</span>;
  if (level >= 12) return <span className="badge badge-critical">Critical ({level})</span>;
  if (level >= 7) return <span className="badge badge-high">High ({level})</span>;
  if (level >= 4) return <span className="badge badge-medium">Medium ({level})</span>;
  return <span className="badge badge-low">Low ({level})</span>;
}

/* ── Truncated log preview ── */
function LogPreview({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (text.length <= 100) return <span style={{ fontSize: "0.82rem" }}>{text}</span>;
  return (
    <span style={{ fontSize: "0.82rem" }}>
      {expanded ? text : text.slice(0, 100) + "…"}
      <button
        className="button--ghost"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: "var(--accent)",
          cursor: "pointer",
          fontSize: "0.72rem",
          marginLeft: "0.3rem",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {expanded ? "less" : "more"}
      </button>
    </span>
  );
}

export function FeatureB() {
  /* ── State ── */
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: FeatureBTab = isFeatureBTab(tabParam) ? tabParam : "alerts";
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<WazuhAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [tookMs, setTookMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<string | null>(null);

  /* ── Debounce search input ── */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  /* ── Fetch alerts ── */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchWazuhAlerts({
        query: debouncedQuery || undefined,
        page,
        page_size: pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
      setTookMs(res.took_ms);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch alerts";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, pageSize]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ── Reindex handler ── */
  const handleReindex = async () => {
    setReindexing(true);
    setReindexResult(null);
    try {
      const res = await reindexWazuhAlerts();
      setReindexResult(`✓ Re-indexed ${res.indexed} alerts`);
      fetchAlerts();
    } catch {
      setReindexResult("✗ Reindex failed");
    } finally {
      setReindexing(false);
      setTimeout(() => setReindexResult(null), 4000);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setActiveTab = useCallback(
    (tab: FeatureBTab) => {
      const next = new URLSearchParams(searchParams);
      if (tab === "alerts") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    document.title = "Wazuh Alerts — Middleware 1.0";
  }, []);

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-left">
          <p className="page-eyebrow">Security Intelligence</p>
          <h1 className="page-title">Wazuh Alerts & Settings</h1>
          <p className="page-subtitle">
            Search raw Wazuh alerts, watch generated detections, and tune detection rules.
          </p>
        </div>
        {activeTab === "alerts" && (
          <div className="page-actions">
            <button
              className="button button--ghost"
              onClick={() => fetchAlerts()}
              disabled={loading}
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <button
              className="button button--secondary"
              onClick={handleReindex}
              disabled={reindexing}
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              {reindexing ? "Reindexing…" : "Reindex"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", marginTop: "1rem" }}>
        <button
          className={`button ${activeTab === "alerts" ? "button--primary" : "button--ghost"}`}
          onClick={() => setActiveTab("alerts")}
          style={{ borderRadius: "8px 8px 0 0", padding: "0.75rem 1.5rem", marginBottom: "-1px", borderBottom: activeTab === "alerts" ? "2px solid var(--accent)" : "none", fontWeight: activeTab === "alerts" ? 600 : 400 }}
        >
          Wazuh Alerts
        </button>
        <button
          className={`button ${activeTab === "detections" ? "button--primary" : "button--ghost"}`}
          onClick={() => setActiveTab("detections")}
          style={{ borderRadius: "8px 8px 0 0", padding: "0.75rem 1.5rem", marginBottom: "-1px", borderBottom: activeTab === "detections" ? "2px solid var(--accent)" : "none", fontWeight: activeTab === "detections" ? 600 : 400 }}
        >
          Detection Watch
        </button>
        <button
          className={`button ${activeTab === "settings" ? "button--primary" : "button--ghost"}`}
          onClick={() => setActiveTab("settings")}
          style={{ borderRadius: "8px 8px 0 0", padding: "0.75rem 1.5rem", marginBottom: "-1px", borderBottom: activeTab === "settings" ? "2px solid var(--accent)" : "none", fontWeight: activeTab === "settings" ? 600 : 400 }}
        >
          Configuration
        </button>
      </div>

      {activeTab === "settings" ? (
        <WazuhSettings />
      ) : activeTab === "detections" ? (
        <DetectionLogWatcher />
      ) : (
        <>
          {/* Reindex toast */}
      {reindexResult && (
        <div
          className={`toast ${reindexResult.startsWith("✓") ? "toast-success" : "toast-error"}`}
        >
          {reindexResult}
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid-4">
        <StatCard
          label="Total Results"
          value={String(total)}
          delta="-"
          deltaDir="neutral"
          color="#4f86ff"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />
        <StatCard
          label="Query Time"
          value={`${tookMs} ms`}
          delta="-"
          deltaDir="neutral"
          color="#22d47a"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2"
              />
            </svg>
          }
        />
        <StatCard
          label="Current Page"
          value={`${page} / ${totalPages}`}
          delta="-"
          deltaDir="neutral"
          color="#7c5cfc"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          label="Page Size"
          value={String(pageSize)}
          delta="-"
          deltaDir="neutral"
          color="#2dc1c6"
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          }
        />
      </div>

      {/* Search bar */}
      <div className="panel" style={{ padding: "1rem 1.5rem" }}>
        <div className="filter-bar">
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="var(--text-muted)"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search alerts by devname, devid, rule_id, or full_log…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          {query && (
            <button
              className="button button--ghost"
              onClick={() => setQuery("")}
              style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="panel"
          style={{
            borderColor: "rgba(255,77,106,0.3)",
            color: "var(--accent-red)",
            padding: "1rem 1.5rem",
          }}
        >
          <p style={{ fontSize: "0.85rem" }}>⚠ {error}</p>
        </div>
      )}

      {/* Results table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Alert Results</p>
            <p className="panel-subtitle">
              {total} alerts found
              {debouncedQuery ? ` matching "${debouncedQuery}"` : ""} ·{" "}
              {tookMs}ms
            </p>
          </div>
        </div>
        <DataTable<WazuhAlert>
          columns={[
            {
              key: "timestamp",
              label: "Timestamp",
              render: (r) => (
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.timestamp
                    ? new Date(r.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—"}
                </span>
              ),
            },
            {
              key: "level",
              label: "Level",
              render: (r) => levelBadge(r.level),
            },
            {
              key: "rule_id",
              label: "Rule ID",
              render: (r) => (
                <span
                  style={{
                    color: "var(--accent)",
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  {r.rule_id ?? "—"}
                </span>
              ),
            },
            {
              key: "devname",
              label: "Device",
              render: (r) => (
                <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                  {r.devname ?? "—"}
                </span>
              ),
            },
            {
              key: "devid",
              label: "Device ID",
              render: (r) => (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                  }}
                >
                  {r.devid ?? "—"}
                </span>
              ),
            },
            {
              key: "full_log",
              label: "Log",
              render: (r) => <LogPreview text={r.full_log} />,
            },
            {
              key: "score",
              label: "Score",
              render: (r) =>
                r.score !== null ? (
                  <span
                    style={{
                      color: "var(--accent-green)",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                    }}
                  >
                    {r.score.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                ),
            },
          ]}
          rows={items}
          getRowKey={(r) => r.id}
          emptyMessage={
            loading
              ? "Loading alerts…"
              : "No Wazuh alerts found. Try a different search or reindex."
          }
        />

        {/* Pagination */}
        {total > 0 && (
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "1rem",
              paddingTop: "1rem",
            }}
          >
            <button
              className="button button--secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}
            >
              ← Previous
            </button>
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 500,
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              className="button button--secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}

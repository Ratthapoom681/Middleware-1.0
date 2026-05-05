import { Link } from "react-router-dom";
import { Table } from "../../components/Table";
import { useFetch } from "../../hooks/useFetch";
import type { Feature } from "../../services/feature.service";
import type { SearchMeta } from "../../services/search.service";
import { formatDate } from "../../utils/formatDate";

export function Dashboard() {
  const { data: meta } = useFetch<SearchMeta>("/api/search/meta");
  const { data: features } = useFetch<Feature[]>("/api/feature");
  const recentFeatures = features?.slice(0, 4) ?? [];

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Middleware workspace at a glance</h1>
          <p className="hero-copy">
            Track API resources, inspect indexed content, and validate the search pipeline from one place.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button button--primary" to="/search">
            Open search
          </Link>
          <Link className="button button--secondary" to="/feature-a">
            Review features
          </Link>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Database records</span>
          <strong>{meta?.total_features ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Indexed documents</span>
          <strong>{meta?.indexed_features ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Available statuses</span>
          <strong>{meta?.available_statuses.length ?? 0}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Recent records</p>
            <h2>Latest features</h2>
          </div>
        </div>
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status", render: (row) => <span className="status-pill">{String(row.status)}</span> },
            { key: "created_at", label: "Created", render: (row) => formatDate(String(row.created_at)) }
          ]}
          emptyMessage="No features have been created yet."
          getRowKey={(row) => row.id}
          rows={recentFeatures}
        />
      </section>
    </div>
  );
}

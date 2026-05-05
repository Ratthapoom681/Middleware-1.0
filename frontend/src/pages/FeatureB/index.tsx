import { useFetch } from "../../hooks/useFetch";
import type { SearchMeta } from "../../services/search.service";

type HealthResponse = {
  status: string;
};

export function FeatureB() {
  const { data, error, loading } = useFetch<HealthResponse>("/api/health");
  const { data: meta } = useFetch<SearchMeta>("/api/search/meta");

  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">Diagnostics</p>
        <h1>Feature B</h1>
        <p className="section-copy">A lightweight service check page for the API and search index layer.</p>
        {loading && <p>Loading backend status...</p>}
        {error && <p className="error-text">{error}</p>}
        {data && (
          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">API status</span>
              <strong>{data.status}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Indexed docs</span>
              <strong>{meta?.indexed_features ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Known statuses</span>
              <strong>{meta?.available_statuses.join(", ") || "none"}</strong>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

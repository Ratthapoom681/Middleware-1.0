import { useDeferredValue } from "react";
import { SearchBar } from "../../components/SearchBar";
import { Table } from "../../components/Table";
import { useFetch } from "../../hooks/useFetch";
import { useSearch } from "../../hooks/useSearch";
import type { SearchMeta } from "../../services/search.service";
import { formatDate } from "../../utils/formatDate";

export function Search() {
  const { data: meta } = useFetch<SearchMeta>("/api/search/meta");
  const {
    clearFilters,
    clearQuery,
    error,
    loading,
    page,
    pageSize,
    query,
    results,
    setPage,
    setQuery,
    statusFilters,
    tookMs,
    toggleFilterValue,
    total
  } = useSearch();

  const deferredResults = useDeferredValue(results);

  return (
    <div className="page-stack">
      <section className="panel">
        <p className="eyebrow">Elasticsearch UI</p>
        <h1>Search</h1>
        <p className="section-copy">Query the indexed feature records with debounced input, status filters, and paginated results.</p>
        <SearchBar onChange={setQuery} onClear={clearQuery} query={query} />
        <div className="filter-row">
          {(meta?.available_statuses ?? []).map((status) => {
            const active = statusFilters.includes(status);

            return (
              <button
                key={status}
                className={`filter-chip ${active ? "filter-chip--active" : ""}`.trim()}
                onClick={() => toggleFilterValue("status", status)}
                type="button"
              >
                {status}
              </button>
            );
          })}
          <button className="button button--secondary" onClick={clearFilters} type="button">
            Reset filters
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Results</p>
            <h2>
              {total} matches{loading ? " ..." : ""}
            </h2>
          </div>
          <p className="meta-copy">Query time: {tookMs} ms</p>
        </div>
        {error && <p className="error-text">{error}</p>}
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status", render: (row) => <span className="status-pill">{String(row.status)}</span> },
            { key: "description", label: "Description" },
            { key: "created_at", label: "Created", render: (row) => formatDate(String(row.created_at)) }
          ]}
          emptyMessage="No search results matched the current filters."
          getRowKey={(row) => row.id}
          rows={deferredResults}
        />

        <div className="pagination-row">
          <button className="button button--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <button
            className="button button--secondary"
            disabled={page >= Math.ceil(total / pageSize) || total === 0}
            onClick={() => setPage(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

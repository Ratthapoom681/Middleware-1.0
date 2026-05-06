import { useState, useMemo } from "react";
import type { DojoFinding } from "../../services/featureA.service";

const PAGE_SIZE = 15;

const SEV_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

function sevClass(s: string) {
  const map: Record<string, string> = {
    Critical: "sev-critical",
    High: "sev-high",
    Medium: "sev-medium",
    Low: "sev-low",
    Info: "sev-info",
  };
  return map[s] ?? "sev-info";
}

type SortKey = "id" | "title" | "severity" | "status" | "cwe" | "date";

export function FindingsTable({ findings }: { findings: DojoFinding[] }) {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = findings;
    if (sevFilter !== "All") rows = rows.filter((f) => f.severity === sevFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          String(f.id).includes(q) ||
          f.status.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "severity") {
        av = SEV_ORDER[a.severity] ?? 99;
        bv = SEV_ORDER[b.severity] ?? 99;
      } else if (sortKey === "id" || sortKey === "cwe") {
        av = (a[sortKey] as number | null) ?? 0;
        bv = (b[sortKey] as number | null) ?? 0;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [findings, search, sevFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return <span className="sort-arrow">↕</span>;
    return <span className={`sort-arrow active`}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const SEVS = ["All", "Critical", "High", "Medium", "Low", "Info"];

  return (
    <div>
      {/* Controls */}
      <div className="dojo-table-controls">
        <input
          className="dojo-search"
          placeholder="Search ID, title, status…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="dojo-select" value={sevFilter} onChange={(e) => { setSevFilter(e.target.value); setPage(1); }}>
          {SEVS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              {(["id", "title", "severity", "status", "cwe", "date"] as SortKey[]).map((k) => (
                <th key={k} className="dojo-th-sort" onClick={() => toggleSort(k)}>
                  {k.toUpperCase()} {arrow(k)}
                </th>
              ))}
              <th>ACTIVE</th>
              <th>VERIFIED</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">No findings match the current filters</td>
              </tr>
            ) : (
              paginated.map((f) => (
                <tr key={f.id}>
                  <td style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>#{f.id}</td>
                  <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.title}>{f.title}</td>
                  <td><span className={sevClass(f.severity)}>{f.severity}</span></td>
                  <td><span className="badge badge-open" style={{ textTransform: "uppercase", fontSize: "0.65rem" }}>{f.status}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{f.cwe ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{f.date ?? "—"}</td>
                  <td><span className={f.active ? "bool-yes" : "bool-no"}>{f.active ? "✓" : "✗"}</span></td>
                  <td><span className={f.verified ? "bool-yes" : "bool-no"}>{f.verified ? "✓" : "✗"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="dojo-pagination">
        <span>Page {page} of {totalPages}</span>
        <div className="dojo-pagination-btns">
          <button className="dojo-page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button className="dojo-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pg = Math.min(Math.max(page - 2, 1) + i, totalPages);
            return (
              <button key={pg} className={`dojo-page-btn${pg === page ? " active" : ""}`} onClick={() => setPage(pg)}>{pg}</button>
            );
          })}
          <button className="dojo-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          <button className="dojo-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

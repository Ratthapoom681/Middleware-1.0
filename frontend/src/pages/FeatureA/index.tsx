import { useState, useCallback, useEffect, useRef } from "react";
import "../../components/FeatureA/styles.css";
import { DojoCharts } from "../../components/FeatureA/DojoCharts";
import { FindingsTable } from "../../components/FeatureA/FindingsTable";
import { ActivityLog, makeLog } from "../../components/FeatureA/ActivityLog";
import type { LogEntry } from "../../components/FeatureA/ActivityLog";
import {
  loadDojoConfig,
  saveDojoConfig,
  testDojoConnection,
  fetchFindings,
  fetchProducts,
  fetchEngagements,
  fetchTests,
  syncFindingsToPostgres,
  extractError,
} from "../../services/featureA.service";
import type { DojoConfig, DojoFinding } from "../../services/featureA.service";

const DEFAULT_CFG: DojoConfig = {
  url: "",
  apiKey: "",
  productId: "",
  engagementId: "",
  testId: "",
  verifySSL: true,
  autoSync: false,
};

type ConnStatus = "idle" | "ok" | "err";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
  closing?: boolean;
}

interface StatusMsg {
  msg: string;
  type: "success" | "error" | "processing";
}

interface ProgressInfo {
  step: number;
  total: number;
  label: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Toggle({ on, label, desc, onChange }: { on: boolean; label: string; desc: string; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <span className="toggle-name">{label}</span>
        <span className="toggle-desc">{desc}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`toggle-switch${on ? " on" : ""}`}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="dojo-stat" style={{ "--stat-color": color } as React.CSSProperties}>
      <div className="dojo-stat-label">{label}</div>
      <div className="dojo-stat-value" style={{ color }}>{value}</div>
    </div>
  );
}

function Spinner() {
  return <span className="dojo-spinner" style={{ marginRight: "6px" }} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function FeatureA() {
  const [cfg, setCfg] = useState<DojoConfig>(() => loadDojoConfig() ?? DEFAULT_CFG);
  const [connStatus, setConnStatus] = useState<ConnStatus>("idle");
  const [findings, setFindings] = useState<DojoFinding[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // UI Feedback States
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  // Guard: prevent auto-sync from firing more than once (React StrictMode)
  const hasAutoSynced = useRef(false);

  const addLog = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((prev) => [...prev.slice(-199), makeLog(level, msg)]);
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const updateStatus = useCallback((type: StatusMsg["type"], msg: string) => {
    setStatusMsg({ type, msg });
  }, []);

  // ── Config helpers ──────────────────────────────────────────────────────────
  function handleSave() {
    setBusy("save");
    updateStatus("processing", "Saving configuration...");
    setTimeout(() => {
      saveDojoConfig(cfg);
      addLog("SUCCESS", "Configuration saved to localStorage");
      showToast("success", "✅ Config saved");
      updateStatus("success", "Last Action: Configuration saved successfully");
      setBusy(null);
    }, 300);
  }

  function handleLoad() {
    setBusy("load");
    updateStatus("processing", "Loading configuration...");
    setTimeout(() => {
      const saved = loadDojoConfig();
      if (saved) {
        setCfg(saved);
        addLog("INFO", "Loaded saved configuration");
        showToast("success", "✅ Database loaded");
        updateStatus("success", "Last Action: Configuration loaded successfully");
      } else {
        addLog("WARN", "No saved configuration found");
        showToast("error", "❌ No configuration found");
        updateStatus("error", "Last Action: Load failed — no saved config");
      }
      setBusy(null);
    }, 300);
  }

  // ── Test Connection ─────────────────────────────────────────────────────────
  async function handleTest() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ URL and API Key required");
      addLog("ERROR", "Missing DefectDojo configuration");
      return;
    }
    setBusy("test");
    setConnStatus("idle");
    updateStatus("processing", "Testing connection to DefectDojo...");
    try {
      await testDojoConnection(cfg);
      setConnStatus("ok");
      addLog("SUCCESS", `Connected to ${cfg.url}`);
      showToast("success", "✅ Connection successful");
      updateStatus("success", `Last Action: Connected to ${cfg.url}`);
    } catch (e: unknown) {
      setConnStatus("err");
      const msg = extractError(e);
      addLog("ERROR", `Connection failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", `Last Action: Connection failed — ${msg}`);
    } finally {
      setBusy(null);
    }
  }

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  async function handleFetchFindings() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ Missing DefectDojo configuration");
      return;
    }
    setBusy("findings");
    updateStatus("processing", "Fetching findings...");
    try {
      addLog("INFO", "Fetching findings from DefectDojo…");
      const data = await fetchFindings(cfg);
      setFindings(data);
      addLog("INFO", `Findings fetched — ${data.length} rows`);
      addLog("INFO", "Syncing findings to Postgres…");
      updateStatus("processing", "Syncing findings to Postgres...");
      await syncFindingsToPostgres(data, cfg.url);
      addLog("SUCCESS", `${data.length} findings saved to Postgres`);
      showToast("success", `✅ Findings synced successfully (${data.length})`);
      updateStatus("success", `Last Action: Findings fetched at ${new Date().toLocaleTimeString()}`);
    } catch (e: unknown) {
      const msg = extractError(e);
      addLog("ERROR", `Fetch findings failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", "Last Action: Fetch findings failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleFetchProducts() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ Missing DefectDojo configuration");
      return;
    }
    setBusy("products");
    updateStatus("processing", "Fetching products...");
    try {
      addLog("INFO", "Fetching products…");
      const data = await fetchProducts(cfg);
      addLog("INFO", `Products fetched — ${data.length} items`);
      showToast("success", `✅ Products fetched (${data.length})`);
      updateStatus("success", `Last Action: Products fetched at ${new Date().toLocaleTimeString()}`);
    } catch (e: unknown) {
      const msg = extractError(e);
      addLog("ERROR", `Fetch products failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", "Last Action: Fetch products failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleFetchEngagements() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ Missing DefectDojo configuration");
      return;
    }
    setBusy("engagements");
    updateStatus("processing", "Fetching engagements...");
    try {
      addLog("INFO", "Fetching engagements…");
      const data = await fetchEngagements(cfg);
      addLog("INFO", `Engagements fetched — ${data.length} items`);
      showToast("success", `✅ Engagements fetched (${data.length})`);
      updateStatus("success", `Last Action: Engagements fetched at ${new Date().toLocaleTimeString()}`);
    } catch (e: unknown) {
      const msg = extractError(e);
      addLog("ERROR", `Fetch engagements failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", "Last Action: Fetch engagements failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleFetchTests() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ Missing DefectDojo configuration");
      return;
    }
    setBusy("tests");
    updateStatus("processing", "Fetching tests...");
    try {
      addLog("INFO", "Fetching tests…");
      const data = await fetchTests(cfg);
      addLog("INFO", `Tests fetched — ${data.length} items`);
      showToast("success", `✅ Tests fetched (${data.length})`);
      updateStatus("success", `Last Action: Tests fetched at ${new Date().toLocaleTimeString()}`);
    } catch (e: unknown) {
      const msg = extractError(e);
      addLog("ERROR", `Fetch tests failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", "Last Action: Fetch tests failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncAll() {
    if (!cfg.url || !cfg.apiKey) {
      showToast("error", "❌ Missing DefectDojo configuration");
      return;
    }
    setBusy("sync-all");
    addLog("INFO", "Started Sync All");
    updateStatus("processing", "Syncing DefectDojo data...");

    try {
      setProgress({ step: 1, total: 4, label: "Fetch Findings" });
      const fData = await fetchFindings(cfg);
      setFindings(fData);
      addLog("INFO", `Findings imported ${fData.length} rows`);

      setProgress({ step: 2, total: 4, label: "Fetch Products" });
      const pData = await fetchProducts(cfg);
      addLog("INFO", `Products imported ${pData.length} rows`);

      setProgress({ step: 3, total: 4, label: "Fetch Engagements" });
      const eData = await fetchEngagements(cfg);
      addLog("INFO", `Engagements imported ${eData.length} rows`);

      setProgress({ step: 4, total: 4, label: "Save Database" });
      await syncFindingsToPostgres(fData, cfg.url);
      addLog("INFO", `${fData.length} findings saved to database`);

      addLog("SUCCESS", "Completed successfully");
      showToast("success", "✅ Sync All completed");
      updateStatus("success", `🟢 Last Action: Sync completed at ${new Date().toLocaleTimeString()}`);
    } catch (e: unknown) {
      const msg = extractError(e);
      addLog("ERROR", `Sync failed: ${msg}`);
      showToast("error", `❌ ${msg}`);
      updateStatus("error", `🔴 Last Action: Sync failed — ${msg}`);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  }

  // ── Auto Sync (run exactly once on mount) ───────────────────────────────────
  useEffect(() => {
    if (hasAutoSynced.current) return;       // already ran
    if (!cfg.autoSync) return;               // auto-sync disabled
    if (!cfg.url || !cfg.apiKey) return;     // no config yet
    hasAutoSynced.current = true;
    addLog("INFO", "Auto-sync enabled — starting initial data fetch…");
    handleSyncAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Export helpers ──────────────────────────────────────────────────────────
  function exportCSV() {
    if (findings.length === 0) { showToast("error", "No findings to export"); return; }
    setBusy("export");
    setTimeout(() => {
      const headers = ["ID", "Title", "Severity", "Status", "CWE", "Date", "Active", "Verified"];
      const rows = findings.map((f) =>
        [f.id, `"${f.title.replace(/"/g, '""')}"`, f.severity, f.status, f.cwe ?? "", f.date ?? "", f.active, f.verified].join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "dojo_findings.csv"; a.click();
      URL.revokeObjectURL(url);
      addLog("SUCCESS", `Exported ${findings.length} findings as CSV`);
      showToast("success", "✅ CSV Exported");
      setBusy(null);
    }, 500);
  }

  function exportPDF() {
    if (findings.length === 0) { showToast("error", "No findings to export"); return; }
    setBusy("export");
    addLog("INFO", "Generating PDF…");
    import("jspdf").then(({ jsPDF }) =>
      import("jspdf-autotable").then(() => {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text("DefectDojo Findings Report", 14, 16);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${findings.length}`, 14, 23);
        (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
          startY: 28,
          head: [["ID", "Title", "Severity", "Status", "CWE", "Date", "Active", "Verified"]],
          body: findings.map((f) => [f.id, f.title, f.severity, f.status, f.cwe ?? "", f.date ?? "", f.active ? "Yes" : "No", f.verified ? "Yes" : "No"]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [79, 134, 255] },
          alternateRowStyles: { fillColor: [240, 244, 255] },
        });
        doc.save("dojo_findings.pdf");
        addLog("SUCCESS", "Export PDF success");
        showToast("success", "✅ PDF Exported");
        setBusy(null);
      })
    ).catch(() => {
      addLog("ERROR", "PDF export failed — library error");
      showToast("error", "❌ PDF Export failed");
      setBusy(null);
    });
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = {
    total: findings.length,
    critical: findings.filter((f) => f.severity === "Critical").length,
    high: findings.filter((f) => f.severity === "High").length,
    medium: findings.filter((f) => f.severity === "Medium").length,
    low: findings.filter((f) => f.severity === "Low").length,
    closed: findings.filter((f) => !f.active).length,
  };

  const field = (id: string, label: string, ph: string, key: keyof DojoConfig, type = "text") => (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        type={type}
        placeholder={ph}
        value={String(cfg[key])}
        onChange={(e) => setCfg((c) => ({ ...c, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div className="dojo-page">
      {/* ── Toast Container ───────────────────────────────────────────── */}
      <div className="dojo-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`dojo-toast ${t.type} ${t.closing ? "closing" : ""}`}>
            <span className="dojo-toast-icon">
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Status Banner ─────────────────────────────────────────────── */}
      {statusMsg && (
        <div className={`dojo-status-banner ${statusMsg.type}`}>
          {statusMsg.type === "processing" && <Spinner />}
          {statusMsg.type === "success" && "🟢 "}
          {statusMsg.type === "error" && "🔴 "}
          {statusMsg.type === "processing" && "🟡 "}
          {statusMsg.msg}
        </div>
      )}

      {/* ── Hero Header ───────────────────────────────────────────────── */}
      <div className="dojo-hero">
        <div className="dojo-hero-header">
          <div>
            <span className="dojo-hero-badge">DefectDojo Integration</span>
            <h1 className="dojo-hero-title">Feature A — DefectDojo Center</h1>
            <p className="dojo-hero-sub">Enterprise vulnerability management &amp; sync hub</p>
          </div>
          <span className={`conn-status ${connStatus}`}>
            {connStatus === "ok" ? "Connected" : connStatus === "err" ? "Error" : "Not Connected"}
          </span>
        </div>
      </div>

      {/* ── Section 1: Connection Settings ───────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">🔧 Connection Settings</p>
            <p className="panel-subtitle">Configure your DefectDojo instance</p>
          </div>
        </div>
        <div className="dojo-config-grid">
          {field("dojo-url", "DefectDojo URL", "https://dojo.example.com", "url")}
          {field("dojo-key", "API Key", "Token xxxxxxxxxxxxxxxx", "apiKey", "password")}
          {field("dojo-pid", "Product ID", "1", "productId")}
          {field("dojo-eid", "Engagement ID", "1", "engagementId")}
          {field("dojo-tid", "Test ID (optional)", "1", "testId")}
        </div>
        <div className="dojo-config-toggles">
          <Toggle on={cfg.verifySSL} label="Verify SSL" desc="Validate TLS certificates" onChange={(v) => setCfg((c) => ({ ...c, verifySSL: v }))} />
          <Toggle on={cfg.autoSync} label="Auto Sync" desc="Sync findings on page load" onChange={(v) => setCfg((c) => ({ ...c, autoSync: v }))} />
        </div>
        <div className="dojo-config-actions" style={{ marginTop: "1rem" }}>
          <button id="btn-test-conn" className="button button--primary" disabled={!!busy} onClick={handleTest}>
            {busy === "test" ? <><Spinner /> Testing...</> : "⚡ Test Connection"}
          </button>
          <button id="btn-save-cfg" className="button button--secondary" disabled={!!busy} onClick={handleSave}>
            {busy === "save" ? <><Spinner /> Saving...</> : "💾 Save Config"}
          </button>
          <button id="btn-load-cfg" className="button button--ghost" disabled={!!busy} onClick={handleLoad}>
            {busy === "load" ? <><Spinner /> Loading...</> : "📂 Load Saved Config"}
          </button>
        </div>
      </div>

      {/* ── Section 2: Live Data Fetch ────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <p className="panel-title">⚡ Live Data Fetch</p>
        </div>

        {/* Progress Indicator for Sync All */}
        {progress && (
          <div className="dojo-progress-container">
            <div className="dojo-progress-header">
              <span>Step {progress.step}/{progress.total}</span>
              <span>{progress.label}</span>
            </div>
            <div className="dojo-progress-bar">
              <div
                className="dojo-progress-fill"
                style={{ width: `${(progress.step / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="dojo-action-bar" style={{ marginTop: progress ? "1rem" : "0" }}>
          <button id="btn-fetch-findings" className="button button--primary" disabled={!!busy} onClick={handleFetchFindings}>
            {busy === "findings" ? <><Spinner /> Fetching...</> : "🔍 Fetch Findings"}
          </button>
          <button id="btn-fetch-products" className="button button--secondary" disabled={!!busy} onClick={handleFetchProducts}>
            {busy === "products" ? <><Spinner /> Fetching...</> : "📦 Fetch Products"}
          </button>
          <button id="btn-fetch-engagements" className="button button--secondary" disabled={!!busy} onClick={handleFetchEngagements}>
            {busy === "engagements" ? <><Spinner /> Fetching...</> : "🎯 Fetch Engagements"}
          </button>
          <button id="btn-fetch-tests" className="button button--secondary" disabled={!!busy} onClick={handleFetchTests}>
            {busy === "tests" ? <><Spinner /> Fetching...</> : "🧪 Fetch Tests"}
          </button>
          <button id="btn-sync-all" className="button button--success" disabled={!!busy} onClick={handleSyncAll}>
            {busy === "sync-all" ? <><Spinner /> Syncing...</> : "🔄 Sync All"}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="dojo-summary-grid">
        <StatBox label="Total Findings" value={stats.total} color="var(--accent)" />
        <StatBox label="Critical" value={stats.critical} color="#ff4d6a" />
        <StatBox label="High" value={stats.high} color="#ff8c42" />
        <StatBox label="Medium" value={stats.medium} color="#ffd166" />
        <StatBox label="Low" value={stats.low} color="#22d47a" />
        <StatBox label="Closed" value={stats.closed} color="var(--text-muted)" />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────── */}
      <DojoCharts findings={findings} />

      {/* ── Findings Table ────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">📋 Findings Table</p>
            <p className="panel-subtitle">Searchable, sortable, paginated</p>
          </div>
        </div>
        <FindingsTable findings={findings} />
      </div>

      {/* ── Export ─────────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <p className="panel-title">📤 Export</p>
        </div>
        <div className="dojo-export-bar">
          <button id="btn-export-csv" className="button button--secondary" disabled={!!busy} onClick={exportCSV}>
            {busy === "export" ? <><Spinner /> Processing...</> : "⬇ Export CSV"}
          </button>
          <button id="btn-export-pdf" className="button button--secondary" disabled={!!busy} onClick={exportPDF}>
            {busy === "export" ? <><Spinner /> Processing...</> : "📄 Export PDF"}
          </button>
          <button id="btn-refresh" className="button button--ghost" disabled={!!busy} onClick={handleFetchFindings}>
            {busy === "findings" ? <><Spinner /> Refreshing...</> : "↺ Refresh Data"}
          </button>
        </div>
      </div>

      {/* ── Activity Log ──────────────────────────────────────────────── */}
      <ActivityLog logs={logs} onClear={() => setLogs([])} />

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { LogEntry, makeLog } from "./ActivityLog";
import { loadRedmineConfig, saveRedmineConfig, extractError, RedmineConfigPayload } from "../../services/featureA.service";
import axios from "axios";
import "./styles.css";

async function apiTestRedmine(url: string, apiKey: string) {
  return { status: "success", message: "Connected!" };
}

export function RedmineAutomationTab({ addLog, showToast, updateStatus }: any) {
  const [config, setConfig] = useState<any>({
    enable_automation: false,
    url: "",
    api_key: "",
    project_id: "",
    tracker_id: "",
    default_assignee_id: "",
    auto_close_resolved_ticket: false
  });
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<any[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Live Send Status state
  const [runState, setRunState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runStep, setRunStep] = useState<string>("");
  const [runProgress, setRunProgress] = useState<number>(0);
  const [runResults, setRunResults] = useState<any>(null);

  useEffect(() => {
    // Load config
    loadRedmineConfig().then((data) => {
      const isMasked = !!(data.api_key && data.api_key.includes("*"));
      setHasApiKey(isMasked);
      setConfig({
        enabled: data.enabled ?? false,
        enable_automation: data.enable_automation ?? false,
        url: data.url ?? "",
        api_key: isMasked ? "********" : "", // Show mask if exists
        project_id: data.project_id ?? "",
        tracker_id: data.tracker_id ?? "",
        default_assignee_id: data.default_assignee_id ?? "",
        auto_close_resolved_ticket: data.auto_close_resolved_ticket ?? false
      });
    }).catch((e) => {
      showToast("error", "❌ Failed to load config");
      addLog("ERROR", `Load config failed: ${e.message}`);
    });
  }, []);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleRunAutomation = async () => {
    setRunState("running");
    setRunStep("🟡 Connecting to Redmine...");
    setRunProgress(10);
    setRunResults(null);
    updateStatus("processing", "Sending to Redmine...");

    try {
      await new Promise(r => setTimeout(r, 800));
      setRunStep("🟡 Loading Project Settings...");
      setRunProgress(25);
      
      await new Promise(r => setTimeout(r, 800));
      setRunStep("🟡 Checking Duplicate Tickets...");
      setRunProgress(50);

      await new Promise(r => setTimeout(r, 800));
      setRunStep("🟡 Creating Tickets...");
      setRunProgress(75);

      const res = await axios.post("/api/feature/redmine/run", {
        url: config.url,
        api_key: config.api_key
      });

      setRunProgress(100);
      setRunStep("🟢 Send completed successfully");
      setRunState("done");
      setRunResults(res.data);
      
      res.data.logs.forEach((l: any) => addLog("INFO", `[${l.time}] ${l.msg}`));
      
      const failed = res.data.failed > 0;
      if (failed) {
         showToast("warning", `⚠ ${res.data.total - res.data.failed} success, ${res.data.failed} failed`);
      } else {
         showToast("success", `✅ ${res.data.total} tickets processed successfully`);
      }
      updateStatus("success", "Automation completed");

    } catch (e: any) {
      setRunStep("🔴 Redmine API failed");
      setRunState("error");
      setRunProgress(0);
      showToast("error", `❌ Automation failed: ${extractError(e)}`);
      addLog("ERROR", `Automation failed: ${extractError(e)}`);
      updateStatus("error", "Automation failed.");
    }
  };

  const handleTest = async () => {
    setBusy(true);
    updateStatus("processing", "Testing Redmine Connection...");
    try {
      const payload = {
        url: config.url,
        api_key: config.api_key
      };
      await axios.post("/api/feature/redmine/test", payload);
      showToast("success", "✅ Redmine connected!");
      addLog("SUCCESS", "Tested Redmine connection successfully.");
      updateStatus("success", "Redmine connected successfully.");
    } catch (e: any) {
      showToast("error", `❌ Connection failed: ${extractError(e)}`);
      addLog("ERROR", `Redmine connection failed: ${extractError(e)}`);
      updateStatus("error", "Connection failed.");
    }
    setBusy(false);
  };

  const handleLoadProjects = async () => {
    if (!config.url || (!config.api_key && !hasApiKey)) {
      showToast("error", "❌ Please enter Redmine URL and API Key first");
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (config.url) params.append("url", config.url);
      if (config.api_key) params.append("api_key", config.api_key);
      const res = await axios.get("/api/feature/redmine/projects", { params });
      setProjects(res.data);
      showToast("success", `✅ ${res.data.length} Projects loaded`);
      addLog("SUCCESS", `Loaded ${res.data.length} projects from Redmine`);
    } catch (e: any) {
      showToast("error", `❌ Load projects failed: ${extractError(e)}`);
      addLog("ERROR", `Load projects failed: ${extractError(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadTrackers = async () => {
    if (!config.url || (!config.api_key && !hasApiKey)) {
      showToast("error", "❌ Please enter Redmine URL and API Key first");
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (config.url) params.append("url", config.url);
      if (config.api_key) params.append("api_key", config.api_key);
      const res = await axios.get("/api/feature/redmine/trackers", { params });
      setTrackers(res.data);
      showToast("success", `✅ ${res.data.length} Trackers loaded`);
      addLog("SUCCESS", `Loaded ${res.data.length} trackers from Redmine`);
    } catch (e: any) {
      showToast("error", `❌ Load trackers failed: ${extractError(e)}`);
      addLog("ERROR", `Load trackers failed: ${extractError(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload: RedmineConfigPayload = {
        enabled: config.enabled,
        enable_automation: config.enable_automation,
        url: config.url,
        api_key: config.api_key,
        project_id: config.project_id,
        tracker_id: config.tracker_id ? Number(config.tracker_id) : null,
        default_assignee_id: config.default_assignee_id ? Number(config.default_assignee_id) : null,
        auto_close_resolved_ticket: config.auto_close_resolved_ticket
      };
      
      const res = await saveRedmineConfig(payload);
      showToast("success", "✅ Redmine configuration saved successfully");
      addLog("SUCCESS", "Redmine config saved.");
      
      // Show mask and mark as saved
      setHasApiKey(true);
      setConfig((prev: any) => ({ ...prev, api_key: "********" }));
      
    } catch (e: any) {
      showToast("error", "❌ Save failed");
      addLog("ERROR", `Failed to save Redmine config: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="panel-title">🤖 Redmine Automation Config</p>
        {config.enable_automation && (
          <div style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--color-success)", color: "var(--color-success)", padding: "0.4rem 0.8rem", borderRadius: "20px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-success)", display: "inline-block", boxShadow: "0 0 5px var(--color-success)" }}></span>
            Scheduler Active (Every 10 min) | Next Run: 15:00:00
          </div>
        )}
      </div>
      <div className="dojo-config-grid">
        <label className="field">
          <span className="field-label">Enable Automation</span>
          <input type="checkbox" name="enable_automation" checked={config.enable_automation} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Redmine URL</span>
          <input type="text" name="url" value={config.url} onChange={handleChange} placeholder="https://redmine.example.com" />
        </label>
        <label className="field">
          <span className="field-label">API Key {hasApiKey && <span style={{color: "#22d47a", fontSize: "0.8em"}}>✓ Saved</span>}</span>
          <input type="password" name="api_key" value={config.api_key} onChange={handleChange} placeholder={hasApiKey ? "Leave empty to keep existing key" : "Enter API Key"} />
        </label>
        <label className="field">
          <span className="field-label">Project</span>
          <select name="project_id" value={config.project_id} onChange={handleChange}>
            <option value="">-- Select Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Issue Tracking</span>
          <select name="tracker_id" value={config.tracker_id} onChange={handleChange}>
            <option value="">-- Select Tracker --</option>
            {trackers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Default Assignee ID</span>
          <input type="text" name="default_assignee_id" value={config.default_assignee_id} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Auto Close Resolved Ticket</span>
          <input type="checkbox" name="auto_close_resolved_ticket" checked={config.auto_close_resolved_ticket} onChange={handleChange} />
        </label>
      </div>

      <button 
        className="button button--primary" 
        disabled={busy || runState === "running"} 
        onClick={handleRunAutomation}
        style={{ width: "100%", marginTop: "1.5rem", padding: "0.75rem", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "var(--color-primary)", color: "white", fontWeight: "bold" }}
      >
        {runState === "running" ? (
          <><span className="dojo-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderColor: "white transparent transparent transparent" }}></span> Sending to Redmine...</>
        ) : (
          "🚀 Run Automation"
        )}
      </button>

      <div className="dojo-config-actions" style={{ marginTop: "1rem" }}>
        <button className="button button--primary" disabled={busy} onClick={handleTest}>Test Connection</button>
        <button className="button button--secondary" disabled={busy} onClick={handleLoadProjects}>Load Projects</button>
        <button className="button button--secondary" disabled={busy} onClick={handleLoadTrackers}>Load Trackers</button>
        <button className="button button--success" disabled={busy} onClick={handleSave}>Save Config</button>
      </div>

      {runState !== "idle" && (
        <div className="run-status-panel" style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
          <h4 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Live Send Status</h4>
          
          <div className="status-banner" style={{ 
            padding: "1rem", 
            borderRadius: "6px", 
            backgroundColor: runState === "error" ? "rgba(239, 68, 68, 0.1)" : runState === "done" ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)",
            border: `1px solid ${runState === "error" ? "var(--color-critical)" : runState === "done" ? "var(--color-success)" : "var(--color-warning)"}`,
            marginBottom: "1.5rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "var(--text-primary)"
          }}>
            {runState === "running" && <span className="dojo-spinner" style={{ borderColor: "var(--color-warning) transparent transparent transparent", width: "18px", height: "18px" }} />}
            {runStep}
          </div>

          {runState === "running" && (
            <div className="progress-container" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                <span>Sending tickets</span>
                <span>{runProgress}%</span>
              </div>
              <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${runProgress}%`, height: "100%", backgroundColor: "var(--color-primary)", transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}

          {runResults && (
            <div className="run-results" style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="dojo-stat" style={{ "--stat-color": "var(--color-info)" } as React.CSSProperties}>
                  <div className="dojo-stat-label">Total Processed</div>
                  <div className="dojo-stat-value" style={{ color: "var(--color-info)" }}>{runResults.total}</div>
                </div>
                <div className="dojo-stat" style={{ "--stat-color": "var(--color-success)" } as React.CSSProperties}>
                  <div className="dojo-stat-label">Created</div>
                  <div className="dojo-stat-value" style={{ color: "var(--color-success)" }}>{runResults.created}</div>
                </div>
                <div className="dojo-stat" style={{ "--stat-color": "var(--color-warning)" } as React.CSSProperties}>
                  <div className="dojo-stat-label">Updated</div>
                  <div className="dojo-stat-value" style={{ color: "var(--color-warning)" }}>{runResults.updated}</div>
                </div>
                <div className="dojo-stat" style={{ "--stat-color": "var(--color-critical)" } as React.CSSProperties}>
                  <div className="dojo-stat-label">Failed</div>
                  <div className="dojo-stat-value" style={{ color: "var(--color-critical)" }}>{runResults.failed}</div>
                </div>
              </div>

              <h5 style={{ marginBottom: "0.75rem", color: "var(--text-primary)", fontSize: "1rem" }}>Per Ticket Result</h5>
              <table className="dojo-table" style={{ width: "100%", marginBottom: "1.5rem" }}>
                <thead>
                  <tr>
                    <th>Finding ID</th>
                    <th>CVE</th>
                    <th>IP:Port</th>
                    <th>Action</th>
                    <th>Redmine Ticket</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runResults.results.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.cve}</td>
                      <td>{r.ip}:{r.port}</td>
                      <td>{r.action}</td>
                      <td>{r.ticket}</td>
                      <td style={{ color: r.status === "Success" ? "var(--color-success)" : "var(--color-critical)", fontWeight: "500" }}>
                        {r.status === "Success" ? "✓ " : "✗ "}
                        {r.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h5 style={{ marginBottom: "0.75rem", color: "var(--text-primary)", fontSize: "1rem" }}>Live Activity Logs</h5>
              <div className="terminal-logs" style={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", padding: "1rem", borderRadius: "6px", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", color: "#e2e8f0", maxHeight: "250px", overflowY: "auto" }}>
                {runResults.logs.map((l: any, i: number) => (
                  <div key={i} style={{ marginBottom: "6px", display: "flex", gap: "8px" }}>
                    <span style={{ color: "#64748b", flexShrink: 0 }}>[{l.time}]</span> 
                    <span style={{ color: l.msg.includes("Failed") || l.msg.includes("Error") ? "#ef4444" : l.msg.includes("success") || l.msg.includes("Created") ? "#22c55e" : "#e2e8f0" }}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

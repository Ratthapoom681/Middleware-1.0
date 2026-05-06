import React, { useState } from "react";
import "./styles.css";

export function SchedulerTab({ showToast }: any) {
  const [config, setConfig] = useState<any>({
    enableAutoQuery: false,
    intervalMinutes: 10,
    fetchNewFindings: true,
    autoCreateTicket: true,
    autoUpdateExistingTicket: true,
    autoVerifySync: true
  });
  const [status, setStatus] = useState("Idle");
  const [busy, setBusy] = useState(false);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setConfig((p: any) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleStart = () => {
    setBusy(true);
    setStatus("Running");
    showToast("success", "✅ Scheduler Started");
    setBusy(false);
  };

  const handleStop = () => {
    setBusy(true);
    setStatus("Stopped");
    showToast("info", "ℹ️ Scheduler Stopped");
    setBusy(false);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <p className="panel-title">⏳ Scheduler</p>
        <span style={{color: status === "Running" ? "green" : "red"}}>Status: {status}</span>
      </div>

      <div className="dojo-config-grid">
        <label className="field">
          <span className="field-label">Enable Auto Query</span>
          <input type="checkbox" name="enableAutoQuery" checked={config.enableAutoQuery} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Interval Minutes</span>
          <input type="number" name="intervalMinutes" value={config.intervalMinutes} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Fetch New Findings</span>
          <input type="checkbox" name="fetchNewFindings" checked={config.fetchNewFindings} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Auto Create Ticket</span>
          <input type="checkbox" name="autoCreateTicket" checked={config.autoCreateTicket} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Auto Update Existing Ticket</span>
          <input type="checkbox" name="autoUpdateExistingTicket" checked={config.autoUpdateExistingTicket} onChange={handleChange} />
        </label>
        <label className="field">
          <span className="field-label">Auto Verify Sync</span>
          <input type="checkbox" name="autoVerifySync" checked={config.autoVerifySync} onChange={handleChange} />
        </label>
      </div>

      <div className="dojo-config-actions" style={{ marginTop: "1rem" }}>
        <button className="button button--primary" disabled={busy || status === "Running"} onClick={handleStart}>Start Scheduler</button>
        <button className="button button--secondary" disabled={busy || status !== "Running"} onClick={handleStop}>Stop Scheduler</button>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  getDetectionConfig,
  updateDetectionConfig,
  getRedmineConfig,
  updateRedmineConfig,
  DetectionSettings,
  RedmineSettings,
} from "../../services/config.service";

export function WazuhSettings() {
  const [detectionConfig, setDetectionConfig] = useState<DetectionSettings>({});
  const [redmineConfig, setRedmineConfig] = useState<RedmineSettings>({
    enabled: false,
    url: "",
    api_key: "",
    project_id: "",
    tracker_id: null,
  });

  const [loading, setLoading] = useState(true);
  const [savingDetection, setSavingDetection] = useState(false);
  const [savingRedmine, setSavingRedmine] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    async function loadConfigs() {
      try {
        const [det, red] = await Promise.all([
          getDetectionConfig(),
          getRedmineConfig(),
        ]);
        setDetectionConfig(det);
        setRedmineConfig(red);
      } catch (err: any) {
        showMessage("error", "Failed to load configurations.");
      } finally {
        setLoading(false);
      }
    }
    loadConfigs();
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveDetection = async () => {
    setSavingDetection(true);
    try {
      const updated = await updateDetectionConfig(detectionConfig);
      setDetectionConfig(updated);
      showMessage("success", "Detection rules saved successfully.");
    } catch (err) {
      showMessage("error", "Failed to save detection rules.");
    } finally {
      setSavingDetection(false);
    }
  };

  const handleSaveRedmine = async () => {
    setSavingRedmine(true);
    try {
      const updated = await updateRedmineConfig(redmineConfig);
      setRedmineConfig(updated);
      showMessage("success", "Redmine configuration saved successfully.");
    } catch (err) {
      showMessage("error", "Failed to save Redmine configuration.");
    } finally {
      setSavingRedmine(false);
    }
  };

  const updateDetectionField = (key: string, value: any) => {
    setDetectionConfig(prev => ({ ...prev, [key]: value }));
  };

  const removeDetectionField = (key: string) => {
    const updated = { ...detectionConfig };
    delete updated[key];
    setDetectionConfig(updated);
  };

  const addNewDetectionField = () => {
    if (!newKey.trim()) return;
    
    // Attempt to parse value as number or JSON
    let parsedValue: any = newValue;
    if (!isNaN(Number(newValue)) && newValue.trim() !== "") {
      parsedValue = Number(newValue);
    } else {
      try {
        parsedValue = JSON.parse(newValue);
      } catch (e) {
        // Keep as string
      }
    }

    setDetectionConfig(prev => ({ ...prev, [newKey]: parsedValue }));
    setNewKey("");
    setNewValue("");
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading settings...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {message && (
        <div className={`toast ${message.type === "success" ? "toast-success" : "toast-error"}`} style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 1000 }}>
          {message.text}
        </div>
      )}

      {/* Detection Rules Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Security Detection Rules</p>
            <p className="panel-subtitle">Configure thresholds and settings for the detection engine.</p>
          </div>
          <button
            className="button button--primary"
            onClick={handleSaveDetection}
            disabled={savingDetection}
          >
            {savingDetection ? "Saving..." : "Save Rules"}
          </button>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
            {Object.entries(detectionConfig).map(([key, value]) => (
              <div key={key} style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-secondary)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <div style={{ flex: "1" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>{key}</label>
                  <input
                    type="text"
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    onChange={(e) => {
                      let val: any = e.target.value;
                      if (!isNaN(Number(val)) && val.trim() !== "") val = Number(val);
                      else {
                        try { val = JSON.parse(val); } catch {}
                      }
                      updateDetectionField(key, val);
                    }}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
                  />
                </div>
                <button
                  className="button button--ghost"
                  onClick={() => removeDetectionField(key)}
                  style={{ color: "var(--accent-red)", padding: "0.5rem" }}
                  title="Remove Rule"
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", padding: "1rem", background: "rgba(124, 92, 252, 0.05)", borderRadius: "8px", border: "1px dashed var(--accent)" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>New Rule Key</label>
              <input
                type="text"
                placeholder="e.g. brute_force_threshold"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Value</label>
              <input
                type="text"
                placeholder="e.g. 5 or [4444, 1337]"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
              />
            </div>
            <button
              className="button button--secondary"
              onClick={addNewDetectionField}
              disabled={!newKey.trim()}
              style={{ padding: "0.5rem 1rem" }}
            >
              Add Parameter
            </button>
          </div>
        </div>
      </div>

      {/* Redmine Integration Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-title">Redmine Integration</p>
            <p className="panel-subtitle">Configure the static schema for connecting to Redmine.</p>
          </div>
          <button
            className="button button--primary"
            onClick={handleSaveRedmine}
            disabled={savingRedmine}
          >
            {savingRedmine ? "Saving..." : "Save Integration"}
          </button>
        </div>
        <div style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1.5rem", maxWidth: "600px" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ position: "relative", display: "inline-block", width: "40px", height: "24px" }}>
                <input
                  type="checkbox"
                  checked={redmineConfig.enabled}
                  onChange={(e) => setRedmineConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                  id="redmine-toggle"
                />
                <label
                  htmlFor="redmine-toggle"
                  style={{
                    position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: redmineConfig.enabled ? "var(--accent)" : "var(--border)",
                    transition: ".4s", borderRadius: "24px"
                  }}
                >
                  <span style={{
                    position: "absolute", content: '""', height: "18px", width: "18px", left: "3px", bottom: "3px",
                    backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                    transform: redmineConfig.enabled ? "translateX(16px)" : "translateX(0)"
                  }} />
                </label>
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: redmineConfig.enabled ? "var(--accent)" : "var(--text-muted)" }}>
                {redmineConfig.enabled ? "Integration Enabled" : "Integration Disabled"}
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>Redmine URL</label>
              <input
                type="url"
                placeholder="https://redmine.example.com"
                value={redmineConfig.url}
                onChange={(e) => setRedmineConfig(prev => ({ ...prev, url: e.target.value }))}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>API Key</label>
              <input
                type="password"
                placeholder="Enter API Key"
                value={redmineConfig.api_key}
                onChange={(e) => setRedmineConfig(prev => ({ ...prev, api_key: e.target.value }))}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>Project ID</label>
                <input
                  type="text"
                  placeholder="e.g. project-name"
                  value={redmineConfig.project_id}
                  onChange={(e) => setRedmineConfig(prev => ({ ...prev, project_id: e.target.value }))}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.5rem" }}>Tracker ID</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  value={redmineConfig.tracker_id === null ? "" : redmineConfig.tracker_id}
                  onChange={(e) => setRedmineConfig(prev => ({ ...prev, tracker_id: e.target.value ? Number(e.target.value) : null }))}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text)" }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

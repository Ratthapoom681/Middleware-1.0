import { useCallback, useEffect, useState } from "react";
import {
  getDetectionConfig,
  updateDetectionConfig,
  getRedmineConfig,
  updateRedmineConfig,
  type DetectionSettings,
  type RedmineSettings,
  DEFAULT_REDMINE,
} from "../../services/config.service";

/* ── Reusable field ── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/* ── Toggle ── */
function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <p className="toggle-name">{label}</p>
        {desc && <p className="toggle-desc">{desc}</p>}
      </div>
      <div className={`toggle-switch ${checked ? "on" : ""}`} onClick={onChange} role="switch" aria-checked={checked} />
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  icon, iconBg, title, desc, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div className="settings-section-icon" style={{ background: iconBg }}>{icon}</div>
        <div>
          <p className="settings-section-title">{title}</p>
          <p className="settings-section-desc">{desc}</p>
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

/* ── Password field ── */
function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

/* ── Toast display ── */
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return <div className={`toast ${type === "success" ? "toast-success" : "toast-error"}`}>{message}</div>;
}

/* ────────────────────────────────────────────────── */
/* ── MAIN SETTINGS COMPONENT                      ── */
/* ────────────────────────────────────────────────── */
export function Settings() {
  /* ── Detection rules state ── */
  const [detectionRules, setDetectionRules] = useState<DetectionSettings>({});
  const [detectionLoading, setDetectionLoading] = useState(true);
  const [detectionSaving, setDetectionSaving] = useState(false);
  const [newRuleKey, setNewRuleKey] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("");

  /* ── Redmine state ── */
  const [redmine, setRedmine] = useState<RedmineSettings>(DEFAULT_REDMINE);
  const [redmineLoading, setRedmineLoading] = useState(true);
  const [redmineSaving, setRedmineSaving] = useState(false);

  /* ── UI state ── */
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch detection config on mount ── */
  const fetchDetection = useCallback(async () => {
    setDetectionLoading(true);
    try {
      const data = await getDetectionConfig();
      setDetectionRules(data);
    } catch {
      showToast("Failed to load detection rules", "error");
    } finally {
      setDetectionLoading(false);
    }
  }, []);

  /* ── Fetch redmine config on mount ── */
  const fetchRedmine = useCallback(async () => {
    setRedmineLoading(true);
    try {
      const data = await getRedmineConfig();
      setRedmine(data);
    } catch {
      showToast("Failed to load Redmine config", "error");
    } finally {
      setRedmineLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetection();
    fetchRedmine();
  }, [fetchDetection, fetchRedmine]);

  /* ── Save detection rules ── */
  const handleSaveDetection = async () => {
    setDetectionSaving(true);
    try {
      const updated = await updateDetectionConfig(detectionRules);
      setDetectionRules(updated);
      showToast("Detection rules saved successfully", "success");
    } catch {
      showToast("Failed to save detection rules", "error");
    } finally {
      setDetectionSaving(false);
    }
  };

  /* ── Save redmine config ── */
  const handleSaveRedmine = async () => {
    if (redmine.enabled && !redmine.project_id) {
      showToast("Project ID is required when Redmine is enabled", "error");
      return;
    }
    if (redmine.enabled && redmine.url && !redmine.url.startsWith("http")) {
      showToast("Redmine URL must start with http:// or https://", "error");
      return;
    }
    setRedmineSaving(true);
    try {
      const updated = await updateRedmineConfig(redmine);
      setRedmine(updated);
      showToast("Redmine settings saved successfully", "success");
    } catch {
      showToast("Failed to save Redmine settings", "error");
    } finally {
      setRedmineSaving(false);
    }
  };

  /* ── Detection rule helpers ── */
  const updateRuleValue = (key: string, rawValue: string) => {
    let parsed: unknown = rawValue;
    // Try to parse as JSON (for arrays/numbers)
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      // keep as string
    }
    setDetectionRules((prev) => ({ ...prev, [key]: parsed }));
  };

  const deleteRule = (key: string) => {
    setDetectionRules((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addRule = () => {
    const k = newRuleKey.trim();
    if (!k) return;
    if (k in detectionRules) {
      showToast(`Rule "${k}" already exists`, "error");
      return;
    }
    let parsed: unknown = newRuleValue;
    try { parsed = JSON.parse(newRuleValue); } catch { /* keep string */ }
    setDetectionRules((prev) => ({ ...prev, [k]: parsed }));
    setNewRuleKey("");
    setNewRuleValue("");
  };

  const setRedmineField = <K extends keyof RedmineSettings>(key: K, val: RedmineSettings[K]) =>
    setRedmine((prev) => ({ ...prev, [key]: val }));

  useEffect(() => { document.title = "Settings — Middleware 1.0"; }, []);

  return (
    <div className="page-stack">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Configuration</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage detection rules and integration settings</p>
        </div>
      </div>

      {/* ════════════════════════════════════════ */}
      {/* SECTION A: Detection Rules              */}
      {/* ════════════════════════════════════════ */}
      <Section
        iconBg="rgba(79,134,255,0.15)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#4f86ff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        title="Security Detection Rules"
        desc="Dynamic rule thresholds for the detection engine — changes apply in real-time"
      >
        {detectionLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading detection rules…</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {/* Existing rules */}
            {Object.entries(detectionRules).map(([key, value]) => (
              <div key={key} className="rule-row">
                <div className="rule-key">
                  <span style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "var(--accent)" }}>
                    {key}
                  </span>
                </div>
                <div className="rule-value">
                  <input
                    type="text"
                    value={typeof value === "object" ? JSON.stringify(value) : String(value)}
                    onChange={(e) => updateRuleValue(key, e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                  />
                </div>
                <button
                  className="button button--danger"
                  onClick={() => deleteRule(key)}
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem" }}
                  title={`Delete ${key}`}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add new rule row */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Add New Parameter
              </p>
              <div className="rule-row">
                <div className="rule-key">
                  <input
                    type="text"
                    placeholder="parameter_name"
                    value={newRuleKey}
                    onChange={(e) => setNewRuleKey(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                  />
                </div>
                <div className="rule-value">
                  <input
                    type="text"
                    placeholder='value (e.g. 5, [4444, 1337], "text")'
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                  />
                </div>
                <button
                  className="button button--success"
                  onClick={addRule}
                  disabled={!newRuleKey.trim()}
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem" }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button className="button button--primary" onClick={handleSaveDetection} disabled={detectionSaving}>
                {detectionSaving ? "Saving…" : "Save Detection Rules"}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ════════════════════════════════════════ */}
      {/* SECTION B: Redmine Integration           */}
      {/* ════════════════════════════════════════ */}
      <Section
        iconBg="rgba(45,193,198,0.15)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2dc1c6" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
        title="Redmine Integration"
        desc="Global issue tracker configuration — used by all services to create tickets"
      >
        {redmineLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading Redmine config…</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <Toggle
              label="Enable Redmine Integration"
              desc="When enabled, security findings will automatically create Redmine issues"
              checked={redmine.enabled}
              onChange={() => setRedmineField("enabled", !redmine.enabled)}
            />

            <div className="form-grid form-grid-2" style={{ marginTop: "0.5rem" }}>
              <Field label="Redmine URL" hint="Base URL of your Redmine instance">
                <input
                  type="url"
                  value={redmine.url}
                  onChange={(e) => setRedmineField("url", e.target.value)}
                  placeholder="https://redmine.example.com"
                />
              </Field>
              <Field label="API Key" hint="Found under My Account → API access key">
                <PasswordField
                  value={redmine.api_key}
                  onChange={(v) => setRedmineField("api_key", v)}
                  placeholder="your_api_key"
                />
              </Field>
              <Field label="Project ID / Identifier" hint="Required when integration is enabled">
                <input
                  type="text"
                  value={redmine.project_id}
                  onChange={(e) => setRedmineField("project_id", e.target.value)}
                  placeholder="project-name"
                />
              </Field>
              <Field label="Tracker ID" hint="Numeric ID for the issue tracker type (optional)">
                <input
                  type="number"
                  value={redmine.tracker_id ?? ""}
                  onChange={(e) => setRedmineField("tracker_id", e.target.value ? Number(e.target.value) : null)}
                  placeholder="1"
                />
              </Field>
            </div>

            {/* Save button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button className="button button--primary" onClick={handleSaveRedmine} disabled={redmineSaving}>
                {redmineSaving ? "Saving…" : "Save Redmine Settings"}
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

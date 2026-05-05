import { useEffect, useState } from "react";

/* ── Types ── */
interface AppSettings {
  wazuhUrl: string;
  wazuhUser: string;
  wazuhPassword: string;
  defectdojoUrl: string;
  defectdojoApiKey: string;
  defectdojoProductId: string;
  redmineUrl: string;
  redmineApiKey: string;
  redmineProjectId: string;
  darkMode: boolean;
  autoRefresh: boolean;
  language: string;
  timezone: string;
  emailNotif: boolean;
  telegramNotif: boolean;
  slackNotif: boolean;
  emailAddress: string;
  telegramToken: string;
  slackWebhook: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  wazuhUrl: "", wazuhUser: "", wazuhPassword: "",
  defectdojoUrl: "", defectdojoApiKey: "", defectdojoProductId: "",
  redmineUrl: "", redmineApiKey: "", redmineProjectId: "",
  darkMode: true, autoRefresh: false, language: "en", timezone: "UTC+7",
  emailNotif: false, telegramNotif: false, slackNotif: false,
  emailAddress: "", telegramToken: "", slackWebhook: "",
};

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

/* ── Connection test status ── */
type TestStatus = "idle" | "testing" | "ok" | "fail";

function TestBtn({ status, onClick }: { status: TestStatus; onClick: () => void }) {
  const label = status === "testing" ? "Testing…" : status === "ok" ? "✓ Connected" : status === "fail" ? "✗ Failed" : "Test Connection";
  const cls = status === "ok" ? "button--success" : status === "fail" ? "button--danger" : "button--ghost";
  return (
    <button className={`button ${cls}`} style={{ justifySelf: "start", fontSize: "0.8rem", padding: "0.5rem 1rem" }} onClick={onClick} disabled={status === "testing"}>
      {label}
    </button>
  );
}

/* ── Main ── */
export function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem("mw_settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [saved, setSaved] = useState(false);
  const [wazuhTest, setWazuhTest] = useState<TestStatus>("idle");
  const [ddTest, setDdTest] = useState<TestStatus>("idle");
  const [rmTest, setRmTest] = useState<TestStatus>("idle");

  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  const toggle = (key: keyof AppSettings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    localStorage.setItem("mw_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "middleware-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem("mw_settings");
    }
  };

  const fakeTest = (setter: (s: TestStatus) => void) => {
    setter("testing");
    setTimeout(() => setter(Math.random() > 0.3 ? "ok" : "fail"), 1500);
  };

  useEffect(() => { document.title = "Settings — Middleware 1.0"; }, []);

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <p className="page-eyebrow">Configuration</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage integrations, notifications, and system preferences</p>
        </div>
        <div className="page-actions">
          <button className="button button--ghost" onClick={handleReset}>Reset Defaults</button>
          <button className="button button--secondary" onClick={handleExport}>Export JSON</button>
          <button className="button button--primary" onClick={handleSave}>
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Wazuh */}
      <Section
        iconBg="rgba(79,134,255,0.15)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#4f86ff" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        title="Wazuh"
        desc="SIEM / security monitoring integration"
      >
        <div className="form-grid form-grid-2">
          <Field label="Wazuh URL">
            <input type="url" value={settings.wazuhUrl} onChange={(e) => set("wazuhUrl", e.target.value)} placeholder="https://wazuh.example.com" />
          </Field>
          <Field label="Username">
            <input type="text" value={settings.wazuhUser} onChange={(e) => set("wazuhUser", e.target.value)} placeholder="admin" />
          </Field>
          <Field label="Password">
            <PasswordField value={settings.wazuhPassword} onChange={(v) => set("wazuhPassword", v)} placeholder="••••••••" />
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <TestBtn status={wazuhTest} onClick={() => fakeTest(setWazuhTest)} />
          </div>
        </div>
      </Section>

      {/* DefectDojo */}
      <Section
        iconBg="rgba(124,92,252,0.15)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#7c5cfc" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        title="DefectDojo"
        desc="Vulnerability management platform integration"
      >
        <div className="form-grid form-grid-2">
          <Field label="DefectDojo URL">
            <input type="url" value={settings.defectdojoUrl} onChange={(e) => set("defectdojoUrl", e.target.value)} placeholder="https://defectdojo.example.com" />
          </Field>
          <Field label="API Key" hint="Found under your profile → API v2 key">
            <PasswordField value={settings.defectdojoApiKey} onChange={(v) => set("defectdojoApiKey", v)} placeholder="Token xxxxxxxxxxxxxxxx" />
          </Field>
          <Field label="Product ID">
            <input type="number" value={settings.defectdojoProductId} onChange={(e) => set("defectdojoProductId", e.target.value)} placeholder="1" />
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <TestBtn status={ddTest} onClick={() => fakeTest(setDdTest)} />
          </div>
        </div>
      </Section>

      {/* Redmine */}
      <Section
        iconBg="rgba(45,193,198,0.15)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2dc1c6" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
        title="Redmine"
        desc="Issue tracker and project management integration"
      >
        <div className="form-grid form-grid-2">
          <Field label="Redmine URL">
            <input type="url" value={settings.redmineUrl} onChange={(e) => set("redmineUrl", e.target.value)} placeholder="https://redmine.example.com" />
          </Field>
          <Field label="API Key">
            <PasswordField value={settings.redmineApiKey} onChange={(v) => set("redmineApiKey", v)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </Field>
          <Field label="Project ID / Identifier">
            <input type="text" value={settings.redmineProjectId} onChange={(e) => set("redmineProjectId", e.target.value)} placeholder="my-project" />
          </Field>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <TestBtn status={rmTest} onClick={() => fakeTest(setRmTest)} />
          </div>
        </div>
      </Section>

      {/* General */}
      <Section
        iconBg="rgba(255,209,102,0.12)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffd166" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        title="General"
        desc="System-wide preferences"
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Toggle label="Dark Mode" desc="Use dark color theme throughout the app" checked={settings.darkMode} onChange={() => toggle("darkMode")} />
          <Toggle label="Auto Refresh" desc="Automatically refresh dashboard data every 60 seconds" checked={settings.autoRefresh} onChange={() => toggle("autoRefresh")} />
          <div className="form-grid form-grid-2" style={{ marginTop: "0.5rem" }}>
            <Field label="Language">
              <select value={settings.language} onChange={(e) => set("language", e.target.value)}>
                <option value="en">English</option>
                <option value="th">Thai (ภาษาไทย)</option>
                <option value="ja">Japanese (日本語)</option>
              </select>
            </Field>
            <Field label="Timezone">
              <select value={settings.timezone} onChange={(e) => set("timezone", e.target.value)}>
                <option value="UTC">UTC</option>
                <option value="UTC+7">UTC+7 (Bangkok)</option>
                <option value="UTC+8">UTC+8 (Singapore)</option>
                <option value="UTC+9">UTC+9 (Tokyo)</option>
              </select>
            </Field>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section
        iconBg="rgba(34,212,122,0.12)"
        icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#22d47a" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
        title="Notifications"
        desc="Alert channels for critical security events"
      >
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Toggle label="Email Notifications" desc="Send alerts to email" checked={settings.emailNotif} onChange={() => toggle("emailNotif")} />
          {settings.emailNotif && (
            <Field label="Email Address">
              <input type="email" value={settings.emailAddress} onChange={(e) => set("emailAddress", e.target.value)} placeholder="security@example.com" />
            </Field>
          )}

          <Toggle label="Telegram Bot" desc="Push alerts to Telegram channel" checked={settings.telegramNotif} onChange={() => toggle("telegramNotif")} />
          {settings.telegramNotif && (
            <Field label="Bot Token" hint="From @BotFather — format: 123456:ABC-DEF…">
              <PasswordField value={settings.telegramToken} onChange={(v) => set("telegramToken", v)} placeholder="123456789:ABCDEF..." />
            </Field>
          )}

          <Toggle label="Slack Webhook" desc="Post alerts to Slack channel" checked={settings.slackNotif} onChange={() => toggle("slackNotif")} />
          {settings.slackNotif && (
            <Field label="Webhook URL">
              <input type="url" value={settings.slackWebhook} onChange={(e) => set("slackWebhook", e.target.value)} placeholder="https://hooks.slack.com/services/..." />
            </Field>
          )}
        </div>
      </Section>

      {/* Bottom Action Bar */}
      <div className="panel" style={{ padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Settings are stored locally in your browser (localStorage)
          </p>
          <div className="page-actions">
            <button className="button button--ghost" onClick={handleReset}>Reset Defaults</button>
            <button className="button button--secondary" onClick={handleExport}>Export JSON</button>
            <button className="button button--primary" onClick={handleSave}>
              {saved ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

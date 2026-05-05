import { useState, useEffect, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { getDetectionConfig, updateDetectionConfig, getRedmineConfig, updateRedmineConfig, type RedmineConfig } from "../../services/configService";

export function Settings() {
  const [detectionRules, setDetectionRules] = useState<Record<string, any>>({});
  const [redmineSettings, setRedmineSettings] = useState<RedmineConfig>({
    enabled: false,
    url: "",
    api_key: "",
    project_id: "",
    tracker_id: null,
  });

  const [newRuleKey, setNewRuleKey] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingDetection, setSavingDetection] = useState(false);
  const [savingRedmine, setSavingRedmine] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [detectionData, redmineData] = await Promise.all([
          getDetectionConfig(),
          getRedmineConfig()
        ]);
        setDetectionRules(detectionData);
        setRedmineSettings(redmineData);
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDetectionRuleChange = (key: string, value: string) => {
    // Attempt to parse value as number or array if applicable, otherwise keep as string
    let parsedValue: any = value;
    if (!isNaN(Number(value)) && value.trim() !== "") {
      parsedValue = Number(value);
    } else if (value.startsWith("[") && value.endsWith("]")) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // keep as string if parse fails
      }
    }

    setDetectionRules(prev => ({
      ...prev,
      [key]: parsedValue
    }));
  };

  const handleAddRule = () => {
    if (newRuleKey.trim() === "") return;
    handleDetectionRuleChange(newRuleKey, newRuleValue);
    setNewRuleKey("");
    setNewRuleValue("");
  };

  const handleRemoveRule = (keyToRemove: string) => {
    setDetectionRules(prev => {
      const updated = { ...prev };
      delete updated[keyToRemove];
      return updated;
    });
  };

  const saveDetection = async (e: FormEvent) => {
    e.preventDefault();
    setSavingDetection(true);
    try {
      await updateDetectionConfig(detectionRules);
      alert("Detection rules saved successfully!");
    } catch (error) {
      console.error("Failed to save detection rules", error);
      alert("Failed to save detection rules");
    } finally {
      setSavingDetection(false);
    }
  };

  const saveRedmine = async (e: FormEvent) => {
    e.preventDefault();
    setSavingRedmine(true);
    try {
      await updateRedmineConfig(redmineSettings);
      alert("Redmine settings saved successfully!");
    } catch (error) {
      console.error("Failed to save Redmine settings", error);
      alert("Failed to save Redmine settings");
    } finally {
      setSavingRedmine(false);
    }
  };

  if (loading) return <div className="page-stack"><p>Loading settings...</p></div>;

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">System Configuration</p>
            <h1>Detection Rules</h1>
            <p className="section-copy">Manage dynamic thresholds and parameters for security detection rules.</p>
          </div>
        </div>
        
        <form className="form-stack" onSubmit={saveDetection}>
          {Object.entries(detectionRules).map(([key, value]) => (
            <div key={key} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <label className="field" style={{ flex: 1 }}>
                <span>{key}</span>
                <input
                  value={typeof value === 'object' ? JSON.stringify(value) : value}
                  onChange={(e) => handleDetectionRuleChange(key, e.target.value)}
                />
              </label>
              <Button type="button" onClick={() => handleRemoveRule(key)}>Remove</Button>
            </div>
          ))}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", padding: "1rem", border: "1px dashed var(--border)" }}>
            <label className="field" style={{ flex: 1 }}>
              <span>New Rule Key</span>
              <input value={newRuleKey} onChange={(e) => setNewRuleKey(e.target.value)} placeholder="e.g., custom_threshold" />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Value</span>
              <input value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} placeholder="e.g., 100 or [1,2]" />
            </label>
            <Button type="button" onClick={handleAddRule} disabled={!newRuleKey}>Add Rule</Button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <Button disabled={savingDetection} type="submit">
              {savingDetection ? "Saving..." : "Save Detection Rules"}
            </Button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Integrations</p>
            <h1>Redmine Configuration</h1>
            <p className="section-copy">Global configuration for Redmine issue creation.</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={saveRedmine}>
          <label className="field">
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                checked={redmineSettings.enabled}
                onChange={(e) => setRedmineSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              Enable Redmine Integration
            </span>
          </label>
          <label className="field">
            <span>Redmine URL</span>
            <input
              type="url"
              required={redmineSettings.enabled}
              value={redmineSettings.url}
              onChange={(e) => setRedmineSettings(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://redmine.example.com"
            />
          </label>
          <label className="field">
            <span>API Key</span>
            <input
              type="password"
              required={redmineSettings.enabled}
              value={redmineSettings.api_key}
              onChange={(e) => setRedmineSettings(prev => ({ ...prev, api_key: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Project ID</span>
            <input
              required={redmineSettings.enabled}
              value={redmineSettings.project_id}
              onChange={(e) => setRedmineSettings(prev => ({ ...prev, project_id: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Tracker ID (Optional)</span>
            <input
              type="number"
              value={redmineSettings.tracker_id || ""}
              onChange={(e) => setRedmineSettings(prev => ({ ...prev, tracker_id: e.target.value ? Number(e.target.value) : null }))}
            />
          </label>

          <div style={{ marginTop: "1rem" }}>
            <Button disabled={savingRedmine} type="submit">
              {savingRedmine ? "Saving..." : "Save Redmine Settings"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

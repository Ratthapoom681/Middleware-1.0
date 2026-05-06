import React, { useState } from "react";
import "./styles.css";

export function MappingRulesTab({ showToast }: any) {
  const [rules, setRules] = useState<any>({
    severity: {
      Critical: "Send Immediately",
      High: "Send Immediately",
      Medium: "Manual Review",
      Low: "Ignore",
      Info: "Ignore"
    },
    priority: {
      Critical: "Urgent",
      High: "High",
      Medium: "Normal",
      Low: "Low",
      Info: "Trivial"
    },
    status: {
      Open: "New",
      "Accepted Risk": "Closed",
      "False Positive": "Rejected"
    }
  });
  const [busy, setBusy] = useState(false);

  const handleSeverityChange = (level: string, val: string) => {
    setRules((p: any) => ({ ...p, severity: { ...p.severity, [level]: val } }));
  };

  const handlePriorityChange = (level: string, val: string) => {
    setRules((p: any) => ({ ...p, priority: { ...p.priority, [level]: val } }));
  };

  const handleStatusChange = (level: string, val: string) => {
    setRules((p: any) => ({ ...p, status: { ...p.status, [level]: val } }));
  };

  const handleSave = () => {
    setBusy(true);
    // API call to save rules
    setTimeout(() => {
      showToast("success", "✅ Rules Saved");
      setBusy(false);
    }, 500);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <p className="panel-title">📋 Mapping Rules</p>
      </div>

      <h4>Severity Rules</h4>
      <div className="dojo-config-grid">
        {["Critical", "High", "Medium", "Low", "Info"].map(lvl => (
          <label key={lvl} className="field">
            <span className="field-label">{lvl}</span>
            <select value={rules.severity[lvl]} onChange={(e) => handleSeverityChange(lvl, e.target.value)}>
              <option value="Send Immediately">Send Immediately</option>
              <option value="Manual Review">Manual Review</option>
              <option value="Ignore">Ignore</option>
            </select>
          </label>
        ))}
      </div>

      <h4 style={{marginTop: "1rem"}}>Priority Mapping</h4>
      <div className="dojo-config-grid">
        {["Critical", "High", "Medium", "Low", "Info"].map(lvl => (
          <label key={lvl} className="field">
            <span className="field-label">{lvl}</span>
            <select value={rules.priority[lvl]} onChange={(e) => handlePriorityChange(lvl, e.target.value)}>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
              <option value="Trivial">Trivial</option>
            </select>
          </label>
        ))}
      </div>

      <h4 style={{marginTop: "1rem"}}>Status Mapping</h4>
      <div className="dojo-config-grid">
        {["Open", "Accepted Risk", "False Positive"].map(lvl => (
          <label key={lvl} className="field">
            <span className="field-label">{lvl}</span>
            <select value={rules.status[lvl]} onChange={(e) => handleStatusChange(lvl, e.target.value)}>
              <option value="New">New</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
        ))}
      </div>

      <div className="dojo-config-actions" style={{ marginTop: "1rem" }}>
        <button className="button button--success" disabled={busy} onClick={handleSave}>Save Rules</button>
      </div>
    </div>
  );
}

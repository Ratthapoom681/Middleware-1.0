import React, { useState } from "react";
import "./styles.css";

export function TicketAuditTab({ showToast }: any) {
  const [logs, setLogs] = useState<any[]>([
    { id: 1, cve: "CVE-2024-1234", ip: "10.1.1.5", port: "443", status: "Matched", severity: "Critical" },
    { id: 2, cve: "CVE-2024-1235", ip: "10.1.1.6", port: "80", status: "Severity mismatch", severity: "High" },
    { id: 3, cve: "CVE-2024-1236", ip: "10.1.1.7", port: "8080", status: "Missing Ticket", severity: "Medium" }
  ]);
  const [busy, setBusy] = useState(false);

  const handleVerify = () => {
    setBusy(true);
    // API call to verify sync
    setTimeout(() => {
      showToast("success", "✅ Audit completed");
      setBusy(false);
    }, 1000);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <p className="panel-title">🛡️ Ticket Audit</p>
      </div>

      <div className="dojo-action-bar" style={{ marginBottom: "1rem" }}>
        <button className="button button--primary" disabled={busy} onClick={handleVerify}>Verify Ticket Sync</button>
      </div>

      <table className="dojo-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>CVE</th>
            <th>IP:Port</th>
            <th>Severity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.cve}</td>
              <td>{log.ip}:{log.port}</td>
              <td>{log.severity}</td>
              <td style={{ color: log.status === "Matched" ? "green" : log.status === "Severity mismatch" ? "orange" : "red" }}>
                {log.status === "Matched" && "✓ "}
                {log.status === "Severity mismatch" && "⚠ "}
                {log.status === "Missing Ticket" && "✗ "}
                {log.status}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>No logs available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

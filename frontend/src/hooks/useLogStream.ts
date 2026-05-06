import { useCallback, useEffect, useRef, useState } from "react";
import { listAppLogs } from "../services/ops.service";

/* ─── Types ─── */
export type LogLevel = "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type LogSource =
  | "API"
  | "Auth"
  | "Audit"
  | "DefectDojo"
  | "Errors"
  | "Frontend"
  | "Jobs"
  | "Redmine"
  | "System"
  | "Wazuh";

export interface LogEntry {
  id: string;
  time: string;
  source: LogSource;
  level: LogLevel;
  message: string;
  path?: string | null;
  requestId?: string | null;
  statusCode?: number | null;
  container?: string | null;
  caller?: string | null;
  isNew?: boolean;
}

/* ─── Real-Time Hook ─── */
export function useLogStream(paused: boolean, maxLogs = 500) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      const next = [{ ...entry, isNew: true }, ...prev].slice(0, maxLogs);
      
      // ลบสถานะ isNew หลังจากแสดงผล 1.5 วินาที
      setTimeout(() => {
        setLogs((p) => p.map((l) => (l.id === entry.id ? { ...l, isNew: false } : l)));
      }, 1500);
      
      return next;
    });
  }, [maxLogs]);

  const refresh = useCallback(async (signal?: AbortSignal, quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);

    try {
      const rows = await listAppLogs({ limit: maxLogs }, signal);
      const nextLogs = rows.map<LogEntry>((row) => {
        const id = String(row.id);
        const source = normalizeSource(row.source);
        return {
          id,
          time: formatTime(row.created_at),
          source,
          level: normalizeLevel(row.level),
          message: row.message,
          path: row.path,
          requestId: row.request_id,
          statusCode: row.status_code,
          container: containerLabel(row.details),
          caller: callerLabel(row.details),
          isNew: initialized.current && !seenIds.current.has(id),
        };
      });

      seenIds.current = new Set(nextLogs.map((log) => log.id));
      initialized.current = true;
      setLogs(nextLogs);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load production logs");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [maxLogs]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (paused) return;

    const interval = window.setInterval(() => {
      refresh(undefined, true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [paused, refresh]);

  const clear = () => setLogs([]);

  return { logs, addLog, clear, error, loading, lastUpdated, refresh };
}

function containerLabel(details: Record<string, unknown> | null) {
  const service = details?.api_service ?? details?.job_service;
  const container = details?.api_container ?? details?.job_container;
  if (service && container) return `${String(service)}@${String(container)}`;
  if (container) return String(container);
  if (service) return String(service);
  return null;
}

function callerLabel(details: Record<string, unknown> | null) {
  const service = details?.caller_service;
  const container = details?.caller_container;
  if (service && container) return `${String(service)}@${String(container)}`;
  if (container) return String(container);
  if (service) return String(service);
  return null;
}

function normalizeLevel(value: string): LogLevel {
  const level = value.toUpperCase();
  if (level === "WARN" || level === "ERROR" || level === "CRITICAL") return level;
  return "INFO";
}

function normalizeSource(value: string): LogSource {
  const source = value.trim();
  const knownSources: LogSource[] = [
    "API",
    "Auth",
    "Audit",
    "DefectDojo",
    "Errors",
    "Frontend",
    "Jobs",
    "Redmine",
    "System",
    "Wazuh",
  ];
  return knownSources.includes(source as LogSource) ? (source as LogSource) : "System";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

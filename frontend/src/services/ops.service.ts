import { api } from "./api";

export interface AppLog {
  id: number;
  level: string;
  source: string;
  message: string;
  request_id: string | null;
  path: string | null;
  status_code: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  actor: string;
  action: string;
  resource: string;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ErrorEvent {
  id: number;
  error_type: string;
  message: string;
  method: string | null;
  path: string | null;
  request_id: string | null;
  stack: string | null;
  resolved: boolean;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface JobRun {
  id: number;
  name: string;
  status: string;
  message: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface OperationsSummary {
  auth_enabled: boolean;
  logs_24h: number;
  audit_events_24h: number;
  unresolved_errors: number;
  failed_jobs_24h: number;
  latest_job: JobRun | null;
  level_counts: Record<string, number>;
}

export interface HealthComponent {
  status: string;
  message: string | null;
  details: Record<string, unknown>;
}

export interface HealthReport {
  status: string;
  generated_at: string;
  components: Record<string, HealthComponent>;
}

export interface ListLogsParams {
  limit?: number;
  level?: string;
  source?: string;
  query?: string;
}

export async function listAppLogs(params: ListLogsParams = {}, signal?: AbortSignal) {
  const res = await api.get<AppLog[]>("/ops/logs", { params, signal });
  return res.data;
}

export async function listAuditEvents(limit = 100, signal?: AbortSignal) {
  const res = await api.get<AuditEvent[]>("/ops/audit", {
    params: { limit },
    signal,
  });
  return res.data;
}

export async function listErrorEvents(limit = 100, signal?: AbortSignal) {
  const res = await api.get<ErrorEvent[]>("/ops/errors", {
    params: { limit },
    signal,
  });
  return res.data;
}

export async function listJobRuns(limit = 50, signal?: AbortSignal) {
  const res = await api.get<JobRun[]>("/ops/jobs", {
    params: { limit },
    signal,
  });
  return res.data;
}

export async function getOperationsSummary(signal?: AbortSignal) {
  const res = await api.get<OperationsSummary>("/ops/summary", { signal });
  return res.data;
}

export async function getHealthReport(signal?: AbortSignal) {
  const res = await api.get<HealthReport>("/health", { signal });
  return res.data;
}

export async function enqueueMaintenanceJob() {
  await api.post("/ops/jobs/maintenance/run");
}

export async function captureClientError(payload: {
  message: string;
  path?: string;
  stack?: string;
  details?: Record<string, unknown>;
}) {
  await api.post("/ops/errors/client", {
    source: "frontend",
    path: window.location.pathname,
    ...payload,
  });
}

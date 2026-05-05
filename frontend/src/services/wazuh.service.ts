import { api } from "./api";

/* ── Types matching api_wazuh.md ── */

export interface WazuhAlert {
  [key: string]: unknown;
  id: number;
  timestamp: string;
  level: number | null;
  rule_id: string | null;
  devname: string | null;
  devid: string | null;
  full_log: string | null;
  score: number | null;
}

export interface WazuhSearchRequest {
  query?: string;
  page?: number;
  page_size?: number;
}

export interface WazuhSearchResponse {
  items: WazuhAlert[];
  page: number;
  page_size: number;
  total: number;
  took_ms: number;
}

export interface WazuhReindexResponse {
  indexed: number;
}

/* ── API calls ── */

export async function searchWazuhAlerts(
  params: WazuhSearchRequest,
  signal?: AbortSignal
): Promise<WazuhSearchResponse> {
  const res = await api.post<WazuhSearchResponse>("/search/wazuh", params, { signal });
  return res.data;
}

export async function reindexWazuhAlerts(): Promise<WazuhReindexResponse> {
  const res = await api.post<WazuhReindexResponse>("/search/wazuh/reindex");
  return res.data;
}

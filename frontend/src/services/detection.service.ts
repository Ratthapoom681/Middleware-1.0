import { api } from "./api";

export interface DetectionAlert {
  [key: string]: unknown;
  id: number;
  title: string;
  description: string | null;
  use_case: string;
  severity: string;
  source_ip: string | null;
  details: Record<string, unknown> | null;
  timestamp: string;
  created_at: string;
}

export interface DetectionAlertsRequest {
  page?: number;
  page_size?: number;
  query?: string;
  severity?: string;
  use_case?: string;
}

export interface DetectionAlertsResponse {
  items: DetectionAlert[];
  page: number;
  page_size: number;
  total: number;
  severity_counts: Record<string, number>;
  use_case_counts: Record<string, number>;
}

export async function listDetectionAlerts(
  params: DetectionAlertsRequest,
  signal?: AbortSignal,
): Promise<DetectionAlertsResponse> {
  const res = await api.get<DetectionAlertsResponse>("/detections", {
    params,
    signal,
  });
  return res.data;
}

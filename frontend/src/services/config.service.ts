import { api } from "./api";

/* ── Detection Rules (Dynamic JSON) ── */

export type DetectionSettings = Record<string, unknown>;

export async function getDetectionConfig(signal?: AbortSignal): Promise<DetectionSettings> {
  const res = await api.get<DetectionSettings>("/config/detection", { signal });
  return res.data;
}

export async function updateDetectionConfig(settings: DetectionSettings): Promise<DetectionSettings> {
  const res = await api.put<DetectionSettings>("/config/detection", settings);
  return res.data;
}

/* ── Redmine Integration (Static Schema) ── */

export interface RedmineSettings {
  enabled: boolean;
  url: string;
  api_key: string;
  project_id: string;
  tracker_id: number | null;
}

export const DEFAULT_REDMINE: RedmineSettings = {
  enabled: false,
  url: "",
  api_key: "",
  project_id: "",
  tracker_id: null,
};

export async function getRedmineConfig(signal?: AbortSignal): Promise<RedmineSettings> {
  const res = await api.get<RedmineSettings>("/config/redmine", { signal });
  return res.data;
}

export async function updateRedmineConfig(config: RedmineSettings): Promise<RedmineSettings> {
  const res = await api.put<RedmineSettings>("/config/redmine", config);
  return res.data;
}

import { api } from './api';

export const getDetectionConfig = async () => {
  const response = await api.get('/config/detection');
  return response.data;
};

export const updateDetectionConfig = async (payload: Record<string, any>) => {
  const response = await api.put('/config/detection', payload);
  return response.data;
};

export interface RedmineConfig {
  enabled: boolean;
  url: string;
  api_key: string;
  project_id: string;
  tracker_id: number | null;
}

export const getRedmineConfig = async (): Promise<RedmineConfig> => {
  const response = await api.get('/config/redmine');
  return response.data;
};

export const updateRedmineConfig = async (payload: RedmineConfig): Promise<RedmineConfig> => {
  const response = await api.put('/config/redmine', payload);
  return response.data;
};

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDetectionConfig = async () => {
  const response = await apiClient.get('/api/config/detection');
  return response.data;
};

export const updateDetectionConfig = async (payload: Record<string, any>) => {
  const response = await apiClient.put('/api/config/detection', payload);
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
  const response = await apiClient.get('/api/config/redmine');
  return response.data;
};

export const updateRedmineConfig = async (payload: RedmineConfig): Promise<RedmineConfig> => {
  const response = await apiClient.put('/api/config/redmine', payload);
  return response.data;
};

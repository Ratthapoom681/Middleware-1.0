import { api } from "./api";

export type Feature = {
  created_at: string;
  description?: string | null;
  id: number;
  name: string;
  status: string;
};

export type FeatureCreate = {
  name: string;
  description?: string | null;
  status?: string;
};

export async function getFeatures() {
  const response = await api.get<Feature[]>("/feature");
  return response.data;
}

export async function createFeature(payload: FeatureCreate) {
  const response = await api.post<Feature>("/feature", payload);
  return response.data;
}

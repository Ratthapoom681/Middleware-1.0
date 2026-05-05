import { api } from "./api";

export type Feature = {
  id: number;
  name: string;
  description?: string | null;
};

export type FeatureCreate = {
  name: string;
  description?: string | null;
};

export async function getFeatures() {
  const response = await api.get<Feature[]>("/feature");
  return response.data;
}

export async function createFeature(payload: FeatureCreate) {
  const response = await api.post<Feature>("/feature", payload);
  return response.data;
}


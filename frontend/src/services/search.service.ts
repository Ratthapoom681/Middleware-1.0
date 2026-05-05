import { api } from "./api";

export type SearchFilter = {
  field: "status";
  values: string[];
};

export type SearchRequest = {
  filters: SearchFilter[];
  page: number;
  page_size: number;
  query: string;
};

export type SearchResultItem = {
  created_at: string;
  description?: string | null;
  id: number;
  name: string;
  score?: number | null;
  status: string;
};

export type SearchResponse = {
  items: SearchResultItem[];
  page: number;
  page_size: number;
  took_ms: number;
  total: number;
};

export type SearchMeta = {
  available_statuses: string[];
  indexed_features: number;
  total_features: number;
};

export async function searchFeatures(payload: SearchRequest, signal?: AbortSignal) {
  const response = await api.post<SearchResponse>("/search", payload, { signal });
  return response.data;
}

export async function getSearchMeta(signal?: AbortSignal) {
  const response = await api.get<SearchMeta>("/search/meta", { signal });
  return response.data;
}

import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const envApiKey = import.meta.env.VITE_API_KEY as string | undefined;
  const storedApiKey = window.localStorage.getItem("middleware.apiKey") ?? undefined;
  const apiKey = envApiKey || storedApiKey;

  if (apiKey) {
    config.headers.set("X-API-Key", apiKey);
  }

  return config;
});

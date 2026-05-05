import { useEffect, useState } from "react";

type FetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useFetch<T>(url: string, options?: RequestInit): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setState((current) => ({ ...current, loading: true }));

      try {
        const response = await fetch(url, { ...options, signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = (await response.json()) as T;
        setState({ data, error: null, loading: false });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({ data: null, error: error instanceof Error ? error.message : "Unknown error", loading: false });
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url]);

  return state;
}


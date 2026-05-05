import { useEffect, useState } from "react";

type FetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
};

export function useFetch<T>(url: string, options?: RequestInit, dependencies: unknown[] = []): FetchState<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: true,
    refetch: () => setReloadToken((value) => value + 1)
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
        setState({
          data,
          error: null,
          loading: false,
          refetch: () => setReloadToken((value) => value + 1)
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
          loading: false,
          refetch: () => setReloadToken((value) => value + 1)
        });
      }
    }

    fetchData();

    return () => controller.abort();
  }, [reloadToken, url, ...dependencies]);

  return state;
}

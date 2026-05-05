import { startTransition, useEffect } from "react";
import { searchFeatures } from "../services/search.service";
import { useAppStore } from "../store";
import { useDebounce } from "./useDebounce";

export function useSearch() {
  const query = useAppStore((state) => state.searchQuery);
  const page = useAppStore((state) => state.searchPage);
  const pageSize = useAppStore((state) => state.searchPageSize);
  const results = useAppStore((state) => state.searchResults);
  const total = useAppStore((state) => state.searchTotal);
  const tookMs = useAppStore((state) => state.searchTookMs);
  const loading = useAppStore((state) => state.searchLoading);
  const error = useAppStore((state) => state.searchError);
  const statusFilters = useAppStore((state) => state.searchFilters.status);
  const setQuery = useAppStore((state) => state.setSearchQuery);
  const clearQuery = useAppStore((state) => state.clearSearchQuery);
  const setPage = useAppStore((state) => state.setSearchPage);
  const setLoading = useAppStore((state) => state.setSearchLoading);
  const setError = useAppStore((state) => state.setSearchError);
  const applyResponse = useAppStore((state) => state.applySearchResponse);
  const toggleFilterValue = useAppStore((state) => state.toggleSearchFilterValue);
  const clearFilters = useAppStore((state) => state.clearSearchFilters);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const controller = new AbortController();

    async function runSearch() {
      setLoading(true);
      setError(null);

      try {
        const response = await searchFeatures(
          {
            filters: statusFilters.length ? [{ field: "status", values: statusFilters }] : [],
            page,
            page_size: pageSize,
            query: debouncedQuery
          },
          controller.signal
        );

        startTransition(() => {
          applyResponse(response);
        });
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") {
          return;
        }

        setLoading(false);
        setError(searchError instanceof Error ? searchError.message : "Search failed.");
      }
    }

    runSearch();

    return () => controller.abort();
  }, [applyResponse, debouncedQuery, page, pageSize, setError, setLoading, statusFilters]);

  return {
    clearFilters,
    clearQuery,
    error,
    loading,
    page,
    pageSize,
    query,
    results,
    setPage,
    setQuery,
    statusFilters,
    tookMs,
    toggleFilterValue,
    total
  };
}

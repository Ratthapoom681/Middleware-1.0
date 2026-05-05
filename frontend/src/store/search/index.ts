import type { StateCreator } from "zustand";
import type { SearchResponse, SearchResultItem } from "../../services/search.service";
import type { AppStore } from "..";

export type SearchSlice = {
  applySearchResponse: (payload: SearchResponse) => void;
  clearSearchFilters: () => void;
  clearSearchQuery: () => void;
  searchError: string | null;
  searchFilters: {
    status: string[];
  };
  searchLoading: boolean;
  searchPage: number;
  searchPageSize: number;
  searchQuery: string;
  searchResults: SearchResultItem[];
  searchTookMs: number;
  searchTotal: number;
  setSearchError: (message: string | null) => void;
  setSearchLoading: (loading: boolean) => void;
  setSearchPage: (page: number) => void;
  setSearchQuery: (query: string) => void;
  toggleSearchFilterValue: (field: "status", value: string) => void;
};

export const createSearchSlice: StateCreator<AppStore, [], [], SearchSlice> = (set) => ({
  applySearchResponse: (payload) =>
    set({
      searchError: null,
      searchLoading: false,
      searchPage: payload.page,
      searchPageSize: payload.page_size,
      searchResults: payload.items,
      searchTookMs: payload.took_ms,
      searchTotal: payload.total
    }),
  clearSearchFilters: () =>
    set({
      searchFilters: { status: [] },
      searchPage: 1
    }),
  clearSearchQuery: () => set({ searchPage: 1, searchQuery: "" }),
  searchError: null,
  searchFilters: {
    status: []
  },
  searchLoading: false,
  searchPage: 1,
  searchPageSize: 10,
  searchQuery: "",
  searchResults: [],
  searchTookMs: 0,
  searchTotal: 0,
  setSearchError: (searchError) => set({ searchError }),
  setSearchLoading: (searchLoading) => set({ searchLoading }),
  setSearchPage: (searchPage) => set({ searchPage }),
  setSearchQuery: (searchQuery) => set({ searchPage: 1, searchQuery }),
  toggleSearchFilterValue: (field, value) =>
    set((state) => {
      const values = state.searchFilters[field];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

      return {
        searchFilters: {
          ...state.searchFilters,
          [field]: nextValues
        },
        searchPage: 1
      };
    })
});

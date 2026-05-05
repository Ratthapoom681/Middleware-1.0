import { create } from "zustand";
import { createSearchSlice, type SearchSlice } from "./search";
import { createUiSlice, type UiSlice } from "./ui";

export type AppStore = SearchSlice & UiSlice;

export const useAppStore = create<AppStore>()((...args) => ({
  ...createUiSlice(...args),
  ...createSearchSlice(...args)
}));

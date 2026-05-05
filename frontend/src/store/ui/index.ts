import type { StateCreator } from "zustand";
import type { AppStore } from "..";

export type UiSlice = {
  activeModal: string | null;
  closeModal: () => void;
  openModal: (modalId: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  toggleSidebar: () => void;
};

export type ModalState = {
  activeModal: string | null;
};

export const initialModalState: ModalState = {
  activeModal: null
};

export const createUiSlice: StateCreator<AppStore, [], [], UiSlice> = (set) => ({
  ...initialModalState,
  closeModal: () => set({ activeModal: null }),
  openModal: (activeModal) => set({ activeModal }),
  setTheme: (theme) => set({ theme }),
  sidebarOpen: true,
  theme: "light",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
});

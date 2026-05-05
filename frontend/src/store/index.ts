import { create } from "zustand";

type AppState = {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  setTheme: (theme: AppState["theme"]) => void;
  toggleSidebar: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));


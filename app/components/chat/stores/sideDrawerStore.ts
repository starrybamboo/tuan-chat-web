import { create } from "zustand";

export type SideDrawerState =
  | "none"
  | "user"
  | "role"
  | "search"
  | "initiative"
  | "map"
  | "clue"
  | "export"
  | "webgal";

type SideDrawerStore = {
  state: SideDrawerState;
  setState: (next: SideDrawerState) => void;
  reset: () => void;
};

export const useSideDrawerStore = create<SideDrawerStore>(set => ({
  state: "none",
  setState: next => set({ state: next }),
  reset: () => set({ state: "none" }),
}));

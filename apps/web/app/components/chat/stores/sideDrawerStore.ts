import { create } from "zustand";

export type SideDrawerState
  = | "none"
    | "user"
    | "role"
    | "search"
    | "combat"
    | "clue"
    | "initiative"
    | "map"
    | "state"
    | "export";

type SubRoomDrawerState = "none" | "map" | "combat" | "clue" | "initiative" | "state";

type SideDrawerStore = {
  state: SideDrawerState;
  subState: SubRoomDrawerState;
  webgalOpen: boolean;
  setState: (next: SideDrawerState) => void;
  setSubState: (next: SubRoomDrawerState) => void;
  setWebgalOpen: (next: boolean) => void;
  reset: () => void;
};

export const useSideDrawerStore = create<SideDrawerStore>(set => ({
  state: "none",
  subState: "none",
  webgalOpen: false,
  setState: next => set(state => (state.state === next ? state : { state: next })),
  setSubState: next => set(state => (state.subState === next ? state : { subState: next })),
  setWebgalOpen: next => set(state => (state.webgalOpen === next ? state : { webgalOpen: next })),
  reset: () => set(state => (
    state.state === "none" && state.subState === "none" && !state.webgalOpen
      ? state
      : { state: "none", subState: "none", webgalOpen: false }
  )),
}));

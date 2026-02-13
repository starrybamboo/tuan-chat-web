import { create } from "zustand";

export type SideDrawerState
  = | "none"
    | "user"
    | "role"
    | "thread"
    | "search"
    | "initiative"
    | "map"
    | "doc"
    | "docFolder"
    | "export"
    | "webgal";

type SubRoomDrawerState = "none" | "map" | "webgal" | "doc";

type SideDrawerStore = {
  state: SideDrawerState;
  subState: SubRoomDrawerState;
  setState: (next: SideDrawerState) => void;
  setSubState: (next: SubRoomDrawerState) => void;
  reset: () => void;
};

export const useSideDrawerStore = create<SideDrawerStore>(set => ({
  state: "none",
  subState: "none",
  setState: next => set(state => (state.state === next ? state : { state: next })),
  setSubState: next => set(state => (state.subState === next ? state : { subState: next })),
  reset: () => set(state => (
    state.state === "none" && state.subState === "none"
      ? state
      : { state: "none", subState: "none" }
  )),
}));

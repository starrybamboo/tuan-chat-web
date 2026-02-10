import { useEffect, useRef } from "react";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";

interface Props {
  spaceId: number;
}

export default function RoomSideDrawerGuards({ spaceId }: Props) {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);

  // 切换空间时关闭“空间相关”的侧边栏（仅在 spaceId 变化时触发）
  const prevSpaceIdRef = useRef<number | null>(null);
  useEffect(() => {
    const prevSpaceId = prevSpaceIdRef.current;
    prevSpaceIdRef.current = spaceId;
    if (prevSpaceId === null) {
      return;
    }
    if (prevSpaceId !== spaceId) {
      const currentState = useSideDrawerStore.getState().state;
      if (currentState === "docFolder") {
        setSideDrawerState("none");
      }
    }
  }, [setSideDrawerState, spaceId]);

  // 关闭跑团模式时，自动关闭跑团相关侧边栏
  useEffect(() => {
    const runModeDrawers: Array<typeof sideDrawerState> = ["docFolder", "initiative", "map"];
    if (!runModeEnabled && runModeDrawers.includes(sideDrawerState)) {
      setSideDrawerState("none");
    }
  }, [runModeEnabled, setSideDrawerState, sideDrawerState]);

  return null;
}

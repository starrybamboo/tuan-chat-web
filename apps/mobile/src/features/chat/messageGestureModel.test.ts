import type { GestureType } from "react-native-gesture-handler";

import { describe, expect, it } from "vitest";

import { getMessageItemSimultaneousGestures } from "./messageGestureModel";

describe("messageGestureModel", () => {
  it("消息项并行手势只保留滚动手势", () => {
    const nativeScrollGesture = Symbol("scroll") as unknown as GestureType;
    const drawerPanGesture = Symbol("drawer") as unknown as GestureType;

    expect(getMessageItemSimultaneousGestures(nativeScrollGesture)).toEqual([nativeScrollGesture]);
    expect(getMessageItemSimultaneousGestures(nativeScrollGesture)).not.toContain(drawerPanGesture);
  });
});

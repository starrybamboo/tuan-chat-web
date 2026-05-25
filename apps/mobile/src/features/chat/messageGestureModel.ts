import type { GestureType } from "react-native-gesture-handler";

/**
 * 消息项只需要和原生滚动手势并行，不能和右抽屉 pan 共享同一条长按识别链。
 */
export function getMessageItemSimultaneousGestures(nativeScrollGesture: GestureType): GestureType[] {
  return [nativeScrollGesture];
}

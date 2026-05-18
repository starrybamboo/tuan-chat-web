import type { GestureType } from "react-native-gesture-handler";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { clamp, snapPoint, SPRING_CONFIG } from "@/lib/animations";
import {
  LEFT_DRAWER_WIDTH,
  RIGHT_DRAWER_WIDTH,
} from "@/lib/layout-constants";

import { getGestureDrawerAxisConfig } from "./useGestureDrawerConfig";

function logGestureDrawer(event: string, detail?: Record<string, number>) {
  if (!__DEV__)
    return;
  console.log("[gesture-drawer]", event, detail ?? {});
}

function adjacentSnapPoints(position: number): readonly number[] {
  "worklet";
  if (position > LEFT_DRAWER_WIDTH * 0.5)
    return [0, LEFT_DRAWER_WIDTH];
  if (position < -RIGHT_DRAWER_WIDTH * 0.5)
    return [-RIGHT_DRAWER_WIDTH, 0];
  return [-RIGHT_DRAWER_WIDTH, 0, LEFT_DRAWER_WIDTH];
}

export function useGestureDrawer(scrollGesture?: GestureType) {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const axisConfig = getGestureDrawerAxisConfig();

  const basePanGesture = Gesture.Pan()
    .activeOffsetX(axisConfig.activeOffsetX)
    .failOffsetY(axisConfig.failOffsetY)
    .onBegin((e) => {
      runOnJS(logGestureDrawer)("pan-begin", {
        translateX: translateX.value,
        absoluteX: e.absoluteX,
      });
    })
    .onStart(() => {
      context.value = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = clamp(
        context.value + e.translationX,
        -RIGHT_DRAWER_WIDTH,
        LEFT_DRAWER_WIDTH,
      );
    })
    .onEnd((e) => {
      const targets = adjacentSnapPoints(translateX.value);
      const destination = snapPoint(translateX.value, e.velocityX, targets);
      runOnJS(logGestureDrawer)("pan-end", {
        velocityX: e.velocityX,
        destination,
      });
      translateX.value = withSpring(destination, SPRING_CONFIG);
    });
  const panGesture = scrollGesture
    ? basePanGesture.simultaneousWithExternalGesture(scrollGesture)
    : basePanGesture;

  const openLeft = () => {
    translateX.value = withSpring(LEFT_DRAWER_WIDTH, SPRING_CONFIG);
  };

  const openRight = () => {
    translateX.value = withSpring(-RIGHT_DRAWER_WIDTH, SPRING_CONFIG);
  };

  const close = () => {
    translateX.value = withSpring(0, SPRING_CONFIG);
  };

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - LEFT_DRAWER_WIDTH }],
  }));

  const rightDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value + RIGHT_DRAWER_WIDTH }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(translateX.value) / LEFT_DRAWER_WIDTH * 0.5,
  }));

  return {
    panGesture,
    translateX,
    openLeft,
    openRight,
    close,
    centerStyle,
    leftDrawerStyle,
    rightDrawerStyle,
    overlayStyle,
  };
}

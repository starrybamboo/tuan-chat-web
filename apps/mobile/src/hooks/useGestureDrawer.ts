import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { clamp, snapPoint, SPRING_CONFIG } from "@/lib/animations";
import {
  DRAWER_ACTIVE_OFFSET_X,
  LEFT_DRAWER_WIDTH,
  RIGHT_DRAWER_WIDTH,
} from "@/lib/layout-constants";
import { getGestureDrawerAxisConfig } from "./useGestureDrawerConfig";

function adjacentSnapPoints(startPosition: number): readonly number[] {
  "worklet";
  if (startPosition >= LEFT_DRAWER_WIDTH) return [0, LEFT_DRAWER_WIDTH];
  if (startPosition <= -RIGHT_DRAWER_WIDTH) return [-RIGHT_DRAWER_WIDTH, 0];
  return [-RIGHT_DRAWER_WIDTH, 0, LEFT_DRAWER_WIDTH];
}

export function useGestureDrawer() {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const axisConfig = getGestureDrawerAxisConfig();

  const panGesture = Gesture.Pan()
    .activeOffsetX(axisConfig.activeOffsetX)
    .failOffsetY(axisConfig.failOffsetY)
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
      const targets = adjacentSnapPoints(context.value);
      const destination = snapPoint(translateX.value, e.velocityX, targets);
      translateX.value = withSpring(destination, SPRING_CONFIG);
    });

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
    pointerEvents: translateX.value === 0 ? "none" : "auto",
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

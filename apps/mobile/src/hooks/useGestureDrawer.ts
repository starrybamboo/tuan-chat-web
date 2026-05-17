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

const SNAP_POINTS = [-RIGHT_DRAWER_WIDTH, 0, LEFT_DRAWER_WIDTH] as const;

export function useGestureDrawer() {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX(DRAWER_ACTIVE_OFFSET_X)
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
      const destination = snapPoint(translateX.value, e.velocityX, [...SNAP_POINTS]);
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

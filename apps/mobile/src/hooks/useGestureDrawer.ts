import type { GestureType } from "react-native-gesture-handler";

import { useCallback } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { clamp, snapPoint, SPRING_CONFIG } from "@/lib/animations";
import { RIGHT_DRAWER_WIDTH } from "@/lib/layout-constants";

import {
  getGestureDrawerAxisConfig,
  getRightDrawerClampRange,
  getRightDrawerEdgeHitSlop,
  getRightDrawerSnapPoints,
} from "./useGestureDrawerConfig";

export function useGestureDrawer(scrollGesture?: GestureType) {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const axisConfig = getGestureDrawerAxisConfig();
  const snapPoints = getRightDrawerSnapPoints(RIGHT_DRAWER_WIDTH);

  const basePanGesture = Gesture.Pan()
    .hitSlop(getRightDrawerEdgeHitSlop())
    .activeOffsetX(axisConfig.activeOffsetX)
    .failOffsetY(axisConfig.failOffsetY)
    .onStart(() => {
      context.set(translateX.get());
    })
    .onUpdate((e) => {
      const range = getRightDrawerClampRange(RIGHT_DRAWER_WIDTH);
      translateX.set(clamp(
        context.get() + e.translationX,
        range.min,
        range.max,
      ));
    })
    .onEnd((e) => {
      const currentPosition = translateX.get();
      const destination = snapPoint(currentPosition, e.velocityX, snapPoints);
      translateX.set(withSpring(destination, SPRING_CONFIG));
    });
  const panGesture = scrollGesture
    ? basePanGesture.simultaneousWithExternalGesture(scrollGesture)
    : basePanGesture;

  const close = useCallback(() => {
    translateX.set(withSpring(0, SPRING_CONFIG));
  }, [translateX]);

  const closeImmediately = useCallback(() => {
    cancelAnimation(translateX);
    translateX.set(0);
  }, [translateX]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const rightDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() + RIGHT_DRAWER_WIDTH }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(translateX.get()) / RIGHT_DRAWER_WIDTH * 0.5,
  }));

  return {
    panGesture,
    translateX,
    close,
    closeImmediately,
    centerStyle,
    rightDrawerStyle,
    overlayStyle,
  };
}

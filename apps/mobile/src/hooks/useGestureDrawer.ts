import type { GestureType } from "react-native-gesture-handler";

import { useCallback } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { clamp, snapPoint, SPRING_CONFIG } from "@/lib/animations";
import {
  LEFT_DRAWER_WIDTH,
  RIGHT_DRAWER_WIDTH,
} from "@/lib/layout-constants";

import type { GestureDrawerSwipeOptions } from "./useGestureDrawerConfig";

import {
  DRAWER_SWIPE_HINT_DELAY_MS,
  getGestureDrawerAxisConfig,
  getGestureDrawerClampRange,
  getGestureDrawerSnapPoints,
  resolveCloseWithSwipeHintStartPosition,
  shouldUseSyntheticSwipeHint,
} from "./useGestureDrawerConfig";

export function useGestureDrawer(scrollGesture?: GestureType, swipeOptions: GestureDrawerSwipeOptions = {}) {
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const axisConfig = getGestureDrawerAxisConfig();

  const basePanGesture = Gesture.Pan()
    .activeOffsetX(axisConfig.activeOffsetX)
    .failOffsetY(axisConfig.failOffsetY)
    .onStart(() => {
      context.set(translateX.get());
    })
    .onUpdate((e) => {
      const range = getGestureDrawerClampRange({
        ...swipeOptions,
        leftDrawerWidth: LEFT_DRAWER_WIDTH,
        rightDrawerWidth: RIGHT_DRAWER_WIDTH,
      });
      translateX.set(clamp(
        context.get() + e.translationX,
        range.min,
        range.max,
      ));
    })
    .onEnd((e) => {
      const currentPosition = translateX.get();
      const targets = getGestureDrawerSnapPoints(currentPosition, {
        ...swipeOptions,
        leftDrawerWidth: LEFT_DRAWER_WIDTH,
        rightDrawerWidth: RIGHT_DRAWER_WIDTH,
      });
      const destination = snapPoint(currentPosition, e.velocityX, targets);
      translateX.set(withSpring(destination, SPRING_CONFIG));
    });
  const panGesture = scrollGesture
    ? basePanGesture.simultaneousWithExternalGesture(scrollGesture)
    : basePanGesture;

  const openLeft = useCallback(() => {
    translateX.set(withSpring(LEFT_DRAWER_WIDTH, SPRING_CONFIG));
  }, [translateX]);

  const openRight = useCallback(() => {
    translateX.set(withSpring(-RIGHT_DRAWER_WIDTH, SPRING_CONFIG));
  }, [translateX]);

  const close = useCallback(() => {
    translateX.set(withSpring(0, SPRING_CONFIG));
  }, [translateX]);

  const closeImmediately = useCallback(() => {
    cancelAnimation(translateX);
    translateX.set(0);
  }, [translateX]);

  const closeWithSwipeHint = useCallback(() => {
    const currentPosition = translateX.get();
    const shouldDelaySpring = shouldUseSyntheticSwipeHint(currentPosition);
    // Route 页没有真实展开的抽屉位移时，先补一个短促的左侧 peek，再弹回 0。
    cancelAnimation(translateX);
    translateX.set(resolveCloseWithSwipeHintStartPosition(currentPosition));
    translateX.set(shouldDelaySpring
      ? withDelay(DRAWER_SWIPE_HINT_DELAY_MS, withSpring(0, SPRING_CONFIG))
      : withSpring(0, SPRING_CONFIG));
  }, [translateX]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const leftDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() - LEFT_DRAWER_WIDTH }],
  }));

  const rightDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() + RIGHT_DRAWER_WIDTH }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(translateX.get()) / LEFT_DRAWER_WIDTH * 0.5,
  }));

  return {
    panGesture,
    translateX,
    openLeft,
    openRight,
    close,
    closeImmediately,
    closeWithSwipeHint,
    centerStyle,
    leftDrawerStyle,
    rightDrawerStyle,
    overlayStyle,
  };
}

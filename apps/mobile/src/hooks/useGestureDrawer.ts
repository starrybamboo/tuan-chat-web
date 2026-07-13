import { useCallback, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { clamp, snapPoint, SPRING_CONFIG } from "@/lib/animations";
import { resolveRightDrawerWidth } from "@/lib/layout-constants";

import {
  getGestureDrawerAxisConfig,
  getRightDrawerClampRange,
  getRightDrawerSnapPoints,
} from "./useGestureDrawerConfig";

export function useGestureDrawer() {
  const { width: windowWidth } = useWindowDimensions();
  const rightDrawerWidth = resolveRightDrawerWidth(windowWidth);
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);
  const axisConfig = getGestureDrawerAxisConfig();
  const snapPoints = getRightDrawerSnapPoints(rightDrawerWidth);

  const panGesture = Gesture.Pan()
    .activeOffsetX(axisConfig.activeOffsetX)
    .failOffsetY(axisConfig.failOffsetY)
    .onStart(() => {
      context.set(translateX.get());
    })
    .onUpdate((e) => {
      const range = getRightDrawerClampRange(rightDrawerWidth);
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

  const close = useCallback(() => {
    translateX.set(withSpring(0, SPRING_CONFIG));
  }, [translateX]);

  const open = useCallback(() => {
    translateX.set(withSpring(-rightDrawerWidth, SPRING_CONFIG));
  }, [rightDrawerWidth, translateX]);

  const closeImmediately = useCallback(() => {
    cancelAnimation(translateX);
    translateX.set(0);
  }, [translateX]);

  useEffect(() => {
    closeImmediately();
  }, [closeImmediately, rightDrawerWidth]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const rightDrawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() + rightDrawerWidth }],
  }), [rightDrawerWidth]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(translateX.get()) / rightDrawerWidth * 0.5,
  }), [rightDrawerWidth]);

  return {
    panGesture,
    translateX,
    open,
    close,
    closeImmediately,
    centerStyle,
    rightDrawerStyle,
    overlayStyle,
    rightDrawerWidth,
  };
}

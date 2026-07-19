import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Radius, Spacing } from "@/constants/theme";
import { resolveMobileKeyboardAvoidance } from "@/lib/mobileKeyboardAvoidance";
import { MOBILE_MODAL_ORIENTATIONS } from "@/lib/modal";

const ENTER_BACKDROP_DURATION_MS = 250;
const EXIT_BACKDROP_DURATION_MS = 200;
const EXIT_SHEET_DURATION_MS = 200;
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 500;
const SHEET_SPRING_CONFIG = {
  damping: 20,
  mass: 0.8,
  reduceMotion: ReduceMotion.System,
  stiffness: 200,
} as const;
const MODAL_KEYBOARD_AVOIDANCE = resolveMobileKeyboardAvoidance(Platform.OS, "modal");

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
  },
  sheetAnchor: {
    flex: 1,
    justifyContent: "flex-end",
  },
  handleArea: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  handle: {
    borderRadius: Radius.full,
    height: 4,
    width: 36,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
});

export type BottomSheetModalProps = {
  backgroundColor: string;
  children: ReactNode;
  handleColor: string;
  maxHeight?: number | `${number}%`;
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  visible: boolean;
};

export function resolveBottomSheetMaxHeight(maxHeight: number | `${number}%`, windowHeight: number): number {
  if (typeof maxHeight === "number") {
    return maxHeight;
  }
  const percent = Number.parseFloat(maxHeight);
  return (percent / 100) * windowHeight;
}

export function BottomSheetModal({
  backgroundColor,
  children,
  handleColor,
  maxHeight = "70%",
  onClose,
  sheetStyle,
  visible,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [modalVisible, setModalVisible] = useState(visible);
  const backdropOpacity = useSharedValue(0);
  const gestureStartTranslateY = useSharedValue(0);
  const sheetTranslateY = useSharedValue(windowHeight);
  const onCloseRef = useRef(onClose);
  const resolvedMaxHeight = resolveBottomSheetMaxHeight(maxHeight, windowHeight);
  const hideModal = useCallback(() => setModalVisible(false), []);
  const requestClose = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetY(5)
    .onStart(() => {
      cancelAnimation(sheetTranslateY);
      gestureStartTranslateY.set(sheetTranslateY.get());
    })
    .onUpdate((event) => {
      sheetTranslateY.set(Math.max(0, gestureStartTranslateY.get() + event.translationY));
    })
    .onEnd((event) => {
      if (sheetTranslateY.get() > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(requestClose);
      }
      else {
        sheetTranslateY.set(withSpring(0, SHEET_SPRING_CONFIG));
      }
    })
    .onFinalize((_event, success) => {
      if (!success) {
        sheetTranslateY.set(withSpring(0, SHEET_SPRING_CONFIG));
      }
    }), [gestureStartTranslateY, requestClose, sheetTranslateY]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.get(),
  }));
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.get() }],
  }));

  useEffect(() => {
    if (visible) {
      queueMicrotask(() => setModalVisible(true));
      cancelAnimation(backdropOpacity);
      cancelAnimation(sheetTranslateY);
      backdropOpacity.set(0);
      sheetTranslateY.set(windowHeight);
      backdropOpacity.set(withTiming(1, {
        duration: ENTER_BACKDROP_DURATION_MS,
        reduceMotion: ReduceMotion.System,
      }));
      sheetTranslateY.set(withSpring(0, SHEET_SPRING_CONFIG));
      return;
    }

    if (!modalVisible) {
      return;
    }

    cancelAnimation(backdropOpacity);
    cancelAnimation(sheetTranslateY);
    backdropOpacity.set(withTiming(0, {
      duration: EXIT_BACKDROP_DURATION_MS,
      reduceMotion: ReduceMotion.System,
    }));
    sheetTranslateY.set(withTiming(windowHeight, {
      duration: EXIT_SHEET_DURATION_MS,
      reduceMotion: ReduceMotion.System,
    }, (finished) => {
      if (finished) {
        scheduleOnRN(hideModal);
      }
    }));
  }, [backdropOpacity, hideModal, modalVisible, sheetTranslateY, visible, windowHeight]);

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={requestClose}
      supportedOrientations={MOBILE_MODAL_ORIENTATIONS}
      transparent
      visible={modalVisible}
    >
      <GestureHandlerRootView style={styles.container}>
        <KeyboardAvoidingView
          behavior={MODAL_KEYBOARD_AVOIDANCE.behavior}
          enabled={MODAL_KEYBOARD_AVOIDANCE.enabled}
          style={styles.container}
        >
          <Pressable
            accessibilityLabel="关闭弹窗"
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
          >
            <Animated.View pointerEvents="none" style={[styles.backdrop, backdropAnimatedStyle]} />
          </Pressable>
          <View pointerEvents="box-none" style={styles.sheetAnchor}>
            <Animated.View style={sheetAnimatedStyle}>
              <View style={[styles.sheet, { backgroundColor, maxHeight: resolvedMaxHeight, paddingBottom: insets.bottom || Spacing.xl }, sheetStyle]}>
                <GestureDetector gesture={panGesture}>
                  <View
                    accessibilityLabel="拖拽把手"
                    accessibilityHint="可向下拖拽关闭"
                    style={styles.handleArea}
                  >
                    <View style={[styles.handle, { backgroundColor: handleColor }]} />
                  </View>
                </GestureDetector>
                {children}
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

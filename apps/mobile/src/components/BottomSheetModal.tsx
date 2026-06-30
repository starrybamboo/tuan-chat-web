import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useEffect, useMemo, useState } from "react";
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Radius, Spacing } from "@/constants/theme";

const ENTER_BACKDROP_DURATION_MS = 250;
const EXIT_BACKDROP_DURATION_MS = 200;
const EXIT_SHEET_DURATION_MS = 200;
const DISMISS_THRESHOLD = 120;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
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

function getScreenHeight() {
  return Dimensions.get("window").height;
}

export type BottomSheetModalProps = {
  backgroundColor: string;
  children: ReactNode;
  handleColor: string;
  maxHeight?: number | `${number}%`;
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  visible: boolean;
};

function resolveMaxHeight(maxHeight: number | `${number}%`): number {
  if (typeof maxHeight === "number") {
    return maxHeight;
  }
  const percent = Number.parseFloat(maxHeight);
  return (percent / 100) * getScreenHeight();
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
  const [modalVisible, setModalVisible] = useState(visible);
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(getScreenHeight()));
  const resolvedMaxHeight = resolveMaxHeight(maxHeight);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        sheetTranslateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
        onClose();
      }
      else {
        Animated.spring(sheetTranslateY, {
          damping: 20,
          mass: 0.8,
          stiffness: 200,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  }), [onClose, sheetTranslateY]);

  useEffect(() => {
    if (visible) {
      queueMicrotask(() => setModalVisible(true));
      backdropOpacity.stopAnimation();
      sheetTranslateY.stopAnimation();
      sheetTranslateY.setValue(getScreenHeight());

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          duration: ENTER_BACKDROP_DURATION_MS,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          damping: 20,
          mass: 0.8,
          stiffness: 200,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!modalVisible) {
      return;
    }

    backdropOpacity.stopAnimation();
    sheetTranslateY.stopAnimation();
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: EXIT_BACKDROP_DURATION_MS,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        duration: EXIT_SHEET_DURATION_MS,
        toValue: getScreenHeight(),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
      }
    });
  }, [backdropOpacity, modalVisible, sheetTranslateY, visible]);

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal animationType="none" transparent visible={modalVisible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, transform: [{ translateY: sheetTranslateY }] }}>
          <View style={[styles.sheet, { backgroundColor, maxHeight: resolvedMaxHeight, paddingBottom: insets.bottom || Spacing.xl }, sheetStyle]}>
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: handleColor }]} />
            </View>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

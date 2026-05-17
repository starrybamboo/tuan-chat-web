import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useEffect, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";

const ENTER_BACKDROP_DURATION_MS = 250;
const EXIT_BACKDROP_DURATION_MS = 200;
const EXIT_SHEET_DURATION_MS = 200;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  handle: {
    alignSelf: "center",
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.xl,
    width: 36,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
});

function getScreenHeight() {
  return Dimensions.get("window").height;
}

/**
 * Mobile bottom sheet modal with a fixed backdrop and independently animated panel.
 * The backdrop only fades, so it stays visually stable while the sheet slides.
 */
export interface BottomSheetModalProps {
  backgroundColor: string;
  children: ReactNode;
  handleColor: string;
  maxHeight?: number | `${number}%`;
  onClose: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  visible: boolean;
}

/**
 * Renders a reusable mobile bottom sheet with decoupled backdrop and panel animations.
 */
export function BottomSheetModal({
  backgroundColor,
  children,
  handleColor,
  maxHeight = "70%",
  onClose,
  sheetStyle,
  visible,
}: BottomSheetModalProps) {
  const [modalVisible, setModalVisible] = useState(visible);
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(getScreenHeight()));

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
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <View style={[styles.sheet, { backgroundColor, maxHeight }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

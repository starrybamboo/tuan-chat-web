import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { MOBILE_MODAL_ORIENTATIONS } from "@/lib/modal";

import { clampAvatarCropTranslation } from "./avatarCropGeometry";

const DEFAULT_OUTPUT_SIZE = 256;
const DEFAULT_OUTPUT_COMPRESS = 0.85;
const CROP_CONTROLS_RESERVED_HEIGHT = 88;
const CROP_SETTLE_ANIMATION_CONFIG = {
  duration: 150,
  reduceMotion: ReduceMotion.System,
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalRoot: {
    flex: 1,
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  cropFrame: {
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 4,
    borderCurve: "continuous",
    borderWidth: 2,
    position: "absolute",
  },
  maskTop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  maskBottom: {
    backgroundColor: "rgba(0,0,0,0.5)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  maskLeft: {
    backgroundColor: "rgba(0,0,0,0.5)",
    left: 0,
    position: "absolute",
  },
  maskRight: {
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "absolute",
    right: 0,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingHorizontal: Spacing.xxl,
    position: "absolute",
    right: 0,
  },
  actionButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  error: {
    left: Spacing.xxl,
    position: "absolute",
    right: Spacing.xxl,
  },
});

type AvatarCropModalProps = {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onConfirm: (croppedUri: string) => Promise<void> | void;
  onCancel: () => void;
  outputCompress?: number;
  outputFormat?: ImageManipulator.SaveFormat;
  outputSize?: number;
  processingErrorMessage?: string;
};

export function AvatarCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  onConfirm,
  onCancel,
  outputCompress = DEFAULT_OUTPUT_COMPRESS,
  outputFormat = ImageManipulator.SaveFormat.JPEG,
  outputSize = DEFAULT_OUTPUT_SIZE,
  processingErrorMessage = "头像处理失败，请重试。",
}: AvatarCropModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const cropViewportTop = insets.top + Spacing.xl;
  const cropViewportHeight = Math.max(
    1,
    windowHeight - cropViewportTop - insets.bottom - CROP_CONTROLS_RESERVED_HEIGHT,
  );
  const cropSize = Math.max(1, Math.min(windowWidth * 0.8, cropViewportHeight));
  const cropTop = cropViewportTop + (cropViewportHeight - cropSize) / 2;
  const cropLeft = (windowWidth - cropSize) / 2;
  const safeImageWidth = Math.max(1, imageWidth);
  const safeImageHeight = Math.max(1, imageHeight);
  const baseScale = Math.max(cropSize / safeImageWidth, cropSize / safeImageHeight);
  const displayWidth = safeImageWidth * baseScale;
  const displayHeight = safeImageHeight * baseScale;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    scale.set(1);
    savedScale.set(1);
    translateX.set(0);
    translateY.set(0);
    savedTranslateX.set(0);
    savedTranslateY.set(0);
    setErrorMessage(null);
  }, [cropSize, imageUri, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, visible]);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(5, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      const clamped = clampAvatarCropTranslation({
        cropSize,
        displayHeight,
        displayWidth,
        scale: scale.get(),
        translateX: translateX.get(),
        translateY: translateY.get(),
      });
      translateX.set(withTiming(clamped.x, CROP_SETTLE_ANIMATION_CONFIG));
      translateY.set(withTiming(clamped.y, CROP_SETTLE_ANIMATION_CONFIG));
      savedTranslateX.set(clamped.x);
      savedTranslateY.set(clamped.y);
    }), [cropSize, displayHeight, displayWidth, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((e) => {
      translateX.set(savedTranslateX.get() + e.translationX);
      translateY.set(savedTranslateY.get() + e.translationY);
    })
    .onEnd(() => {
      const clamped = clampAvatarCropTranslation({
        cropSize,
        displayHeight,
        displayWidth,
        scale: scale.get(),
        translateX: translateX.get(),
        translateY: translateY.get(),
      });
      translateX.set(withTiming(clamped.x, CROP_SETTLE_ANIMATION_CONFIG));
      translateY.set(withTiming(clamped.y, CROP_SETTLE_ANIMATION_CONFIG));
      savedTranslateX.set(clamped.x);
      savedTranslateY.set(clamped.y);
    }), [cropSize, displayHeight, displayWidth, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [panGesture, pinchGesture],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    width: displayWidth,
    height: displayHeight,
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  const handleConfirm = useCallback(async () => {
    if (isProcessing) {
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const currentScale = scale.get() * baseScale;
      const currentTx = translateX.get();
      const currentTy = translateY.get();

      const cropX = (safeImageWidth / 2) - (cropSize / (2 * currentScale)) - (currentTx / currentScale);
      const cropY = (safeImageHeight / 2) - (cropSize / (2 * currentScale)) - (currentTy / currentScale);
      const cropSide = cropSize / currentScale;

      const originX = Math.max(0, Math.round(cropX));
      const originY = Math.max(0, Math.round(cropY));
      const width = Math.min(Math.round(cropSide), safeImageWidth - originX);
      const height = Math.min(Math.round(cropSide), safeImageHeight - originY);

      if (width <= 0 || height <= 0) {
        throw new Error("裁剪区域无效，请重新调整图片。");
      }

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width, height } },
          { resize: { width: outputSize, height: outputSize } },
        ],
        { compress: outputCompress, format: outputFormat },
      );

      await onConfirm(result.uri);
    }
    catch (error) {
      setErrorMessage(error instanceof Error && error.message.trim() ? error.message.trim() : processingErrorMessage);
    }
    finally {
      setIsProcessing(false);
    }
  }, [baseScale, cropSize, imageUri, isProcessing, onConfirm, outputCompress, outputFormat, outputSize, processingErrorMessage, safeImageHeight, safeImageWidth, scale, translateX, translateY]);

  const handleCancel = useCallback(() => {
    if (isProcessing) {
      return;
    }
    scale.set(1);
    savedScale.set(1);
    translateX.set(0);
    translateY.set(0);
    savedTranslateX.set(0);
    savedTranslateY.set(0);
    setErrorMessage(null);
    onCancel();
  }, [onCancel, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY, isProcessing]);

  if (!visible)
    return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={MOBILE_MODAL_ORIENTATIONS}
      onRequestClose={handleCancel}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <View style={styles.overlay}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                styles.imageContainer,
                { height: cropSize, left: cropLeft, top: cropTop, width: cropSize },
              ]}
            >
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  contentFit="fill"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          <View style={[styles.maskTop, { height: cropTop }]} pointerEvents="none" />
          <View style={[styles.maskBottom, { height: windowHeight - cropTop - cropSize }]} pointerEvents="none" />
          <View style={[styles.maskLeft, { height: cropSize, top: cropTop, width: cropLeft }]} pointerEvents="none" />
          <View style={[styles.maskRight, { height: cropSize, top: cropTop, width: windowWidth - cropLeft - cropSize }]} pointerEvents="none" />
          <View style={[styles.cropFrame, { height: cropSize, left: cropLeft, top: cropTop, width: cropSize }]} pointerEvents="none" />

          <View style={[styles.actions, { bottom: insets.bottom + Spacing.xxl }]}>
            <Pressable
              accessibilityHint="放弃裁剪并关闭"
              accessibilityRole="button"
              accessibilityState={{ disabled: isProcessing }}
              disabled={isProcessing}
              onPress={handleCancel}
              style={styles.actionButton}
            >
              <ThemedText style={{ color: isProcessing ? "rgba(255,255,255,0.45)" : "#fff" }}>取消</ThemedText>
            </Pressable>
            <Pressable
              accessibilityHint="应用当前裁剪区域并保存头像"
              accessibilityRole="button"
              accessibilityState={{ disabled: isProcessing, busy: isProcessing }}
              disabled={isProcessing}
              onPress={handleConfirm}
              style={styles.actionButton}
            >
              <ThemedText style={{ color: isProcessing ? theme.textSecondary : theme.accent }}>
                {isProcessing ? "处理中…" : "确认"}
              </ThemedText>
            </Pressable>
          </View>
          {errorMessage
            ? (
                <View style={[styles.error, { bottom: insets.bottom + 112 }]}>
                  <ThemedText style={{ color: "#fca5a5", textAlign: "center" }}>
                    {errorMessage}
                  </ThemedText>
                </View>
              )
            : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { useCallback, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { clampAvatarCropTranslation } from "./avatarCropGeometry";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CROP_SIZE = SCREEN_WIDTH * 0.8;
const CROP_TOP = (SCREEN_HEIGHT - CROP_SIZE) / 2;
const CROP_LEFT = (SCREEN_WIDTH - CROP_SIZE) / 2;
const DEFAULT_OUTPUT_SIZE = 256;
const DEFAULT_OUTPUT_COMPRESS = 0.85;

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
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  cropFrame: {
    position: "absolute",
    top: CROP_TOP,
    left: CROP_LEFT,
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 4,
  },
  maskTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CROP_TOP,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  maskBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT - CROP_TOP - CROP_SIZE,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  maskLeft: {
    position: "absolute",
    top: CROP_TOP,
    left: 0,
    width: CROP_LEFT,
    height: CROP_SIZE,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  maskRight: {
    position: "absolute",
    top: CROP_TOP,
    right: 0,
    width: SCREEN_WIDTH - CROP_LEFT - CROP_SIZE,
    height: CROP_SIZE,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  actions: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.xxl,
  },
  actionButton: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const baseScale = Math.max(CROP_SIZE / imageWidth, CROP_SIZE / imageHeight);
  const displayWidth = imageWidth * baseScale;
  const displayHeight = imageHeight * baseScale;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(5, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      const clamped = clampAvatarCropTranslation({
        cropSize: CROP_SIZE,
        displayHeight,
        displayWidth,
        scale: scale.get(),
        translateX: translateX.get(),
        translateY: translateY.get(),
      });
      translateX.set(withTiming(clamped.x, { duration: 150 }));
      translateY.set(withTiming(clamped.y, { duration: 150 }));
      savedTranslateX.set(clamped.x);
      savedTranslateY.set(clamped.y);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.set(savedTranslateX.get() + e.translationX);
      translateY.set(savedTranslateY.get() + e.translationY);
    })
    .onEnd(() => {
      const clamped = clampAvatarCropTranslation({
        cropSize: CROP_SIZE,
        displayHeight,
        displayWidth,
        scale: scale.get(),
        translateX: translateX.get(),
        translateY: translateY.get(),
      });
      translateX.set(withTiming(clamped.x, { duration: 150 }));
      translateY.set(withTiming(clamped.y, { duration: 150 }));
      savedTranslateX.set(clamped.x);
      savedTranslateY.set(clamped.y);
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

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

      const cropX = (imageWidth / 2) - (CROP_SIZE / (2 * currentScale)) - (currentTx / currentScale);
      const cropY = (imageHeight / 2) - (CROP_SIZE / (2 * currentScale)) - (currentTy / currentScale);
      const cropSide = CROP_SIZE / currentScale;

      const originX = Math.max(0, Math.round(cropX));
      const originY = Math.max(0, Math.round(cropY));
      const width = Math.min(Math.round(cropSide), imageWidth - originX);
      const height = Math.min(Math.round(cropSide), imageHeight - originY);

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
  }, [imageUri, imageWidth, imageHeight, baseScale, scale, translateX, translateY, outputCompress, outputFormat, outputSize, onConfirm, processingErrorMessage, isProcessing]);

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
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={styles.modalRoot}>
        <View style={styles.overlay}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.imageContainer]}>
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="fill"
                />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          <View style={styles.maskTop} pointerEvents="none" />
          <View style={styles.maskBottom} pointerEvents="none" />
          <View style={styles.maskLeft} pointerEvents="none" />
          <View style={styles.maskRight} pointerEvents="none" />
          <View style={styles.cropFrame} pointerEvents="none" />

          <View style={styles.actions}>
            <Pressable disabled={isProcessing} onPress={handleCancel} style={styles.actionButton}>
              <ThemedText style={{ color: isProcessing ? "rgba(255,255,255,0.45)" : "#fff" }}>取消</ThemedText>
            </Pressable>
            <Pressable disabled={isProcessing} onPress={handleConfirm} style={styles.actionButton}>
              <ThemedText style={{ color: isProcessing ? theme.textSecondary : theme.accent }}>
                {isProcessing ? "处理中…" : "确认"}
              </ThemedText>
            </Pressable>
          </View>
          {errorMessage
            ? (
                <View style={{ bottom: 120, left: Spacing.xxl, position: "absolute", right: Spacing.xxl }}>
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

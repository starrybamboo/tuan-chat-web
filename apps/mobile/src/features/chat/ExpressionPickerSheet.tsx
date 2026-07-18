import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

import { FlashList } from "@shopify/flash-list";
import * as ImageManipulator from "expo-image-manipulator";
import { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { SquareUploadButton } from "@/components/SquareUploadButton";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { AvatarCropModal } from "@/features/roles/edit/AvatarCropModal";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { mediaFileUrl } from "@/lib/media-url";
import { isGifAttachment } from "@/lib/mobile-gif-to-webp";

import { buildStickerCreateRequest, createStickerCropFileName, getStickerUploadErrorMessage } from "./expressionStickerUpload";
import { useCreateStickerMutation } from "./useStickerMutations";
import { useUserStickersQuery } from "./useUserStickersQuery";

const STICKER_SIZE = 72;
const GRID_GAP = 12;
const STICKER_UPLOAD_SCENE = 2;
const STICKER_CROP_SIZE = 256;

type StickerCropSource = MobileMessageAttachment & {
  height: number;
  width: number;
};

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  feedbackText: {
    fontSize: 12,
    maxWidth: 240,
    textAlign: "center",
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingBottom: Spacing.md,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: GRID_GAP,
    width: "100%",
  },
  sticker: {
    borderRadius: Radius.md,
    height: STICKER_SIZE,
    width: STICKER_SIZE,
  },
});

type ExpressionPickerSheetProps = {
  onClose: () => void;
  onSelectExpression: (sticker: Sticker) => void;
  visible: boolean;
};

type StickerWithFileId = Sticker & { fileId: number };

type StickerTileProps = {
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
  sticker: StickerWithFileId;
};

const StickerTile = memo(function StickerTile({ onClose, onSelect, sticker }: StickerTileProps) {
  const label = sticker.name?.trim() || `表情 ${sticker.stickerId ?? sticker.fileId}`;
  const mediaType = sticker.mediaType?.trim() || "image";
  const handlePress = useCallback(() => {
    onSelect(sticker);
    onClose();
  }, [onClose, onSelect, sticker]);

  return (
    <Pressable
      accessibilityHint="点按发送该表情"
      accessibilityLabel={`发送表情 ${label}`}
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.item}
    >
      <CachedImage
        uri={mediaFileUrl(sticker.fileId, mediaType === "image" ? "image" : "other", "medium")}
        contentFit="contain"
        style={styles.sticker}
      />
    </Pressable>
  );
});

function getStickerKey(sticker: StickerWithFileId) {
  return `sticker:${sticker.stickerId ?? sticker.fileId}`;
}

export function ExpressionPickerSheet({
  onClose,
  onSelectExpression,
  visible,
}: ExpressionPickerSheetProps) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<StickerCropSource | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const userStickersQuery = useUserStickersQuery(visible);
  const createStickerMutation = useCreateStickerMutation();
  const { refetch: refetchUserStickers } = userStickersQuery;
  const { mutateAsync: createSticker } = createStickerMutation;
  const stickers = useMemo(
    () => (userStickersQuery.data?.data ?? [])
      .filter((sticker): sticker is StickerWithFileId => typeof sticker.fileId === "number" && sticker.fileId > 0),
    [userStickersQuery.data?.data],
  );

  const handlePickSticker = useCallback(async () => {
    if (uploading || cropSource) {
      return;
    }

    setUploadErrorMessage(null);
    setUploadStatusMessage(null);
    try {
      const [picked] = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (!picked) {
        return;
      }

      if (isGifAttachment(picked)) {
        setUploading(true);
        try {
          const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [picked], { scene: STICKER_UPLOAD_SCENE });
          const uploadedImage = uploaded.uploadedImages[0];
          if (!uploadedImage) {
            throw new Error("表情包上传失败。");
          }

          await createSticker(buildStickerCreateRequest(
            { fileName: picked.fileName, mimeType: "image/webp" },
            { ...uploadedImage, fileName: picked.fileName },
          ));
          setUploadStatusMessage("上传完成，正在刷新");
          await refetchUserStickers();
        }
        finally {
          setUploading(false);
        }
        return;
      }

      setCropSource({
        ...picked,
        width: Math.max(1, picked.width ?? STICKER_CROP_SIZE),
        height: Math.max(1, picked.height ?? STICKER_CROP_SIZE),
      });
    }
    catch (error) {
      setUploadErrorMessage(getStickerUploadErrorMessage(error));
    }
  }, [createSticker, cropSource, refetchUserStickers, uploading]);

  const handleCropCancel = useCallback(() => {
    if (!uploading) {
      setCropSource(null);
    }
  }, [uploading]);

  const handleCropConfirm = useCallback(async (croppedUri: string) => {
    if (!cropSource) {
      throw new Error("未选择原图，请重新选择图片。");
    }

    setUploading(true);
    setUploadErrorMessage(null);
    setUploadStatusMessage(null);
    try {
      const croppedAttachment: MobileMessageAttachment = {
        id: `${cropSource.id}::sticker-crop::${Date.now()}`,
        uri: croppedUri,
        fileName: createStickerCropFileName(cropSource.fileName),
        mimeType: "image/webp",
        kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
        width: STICKER_CROP_SIZE,
        height: STICKER_CROP_SIZE,
      };

      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [croppedAttachment], { scene: STICKER_UPLOAD_SCENE });
      const uploadedImage = uploaded.uploadedImages[0];
      if (!uploadedImage) {
        throw new Error("表情包上传失败。");
      }

      await createSticker(buildStickerCreateRequest(croppedAttachment, uploadedImage));
      setUploadStatusMessage("上传完成，正在刷新");
      await refetchUserStickers();
      setCropSource(null);
    }
    catch (error) {
      setUploadErrorMessage(getStickerUploadErrorMessage(error));
      throw error;
    }
    finally {
      setUploading(false);
    }
  }, [createSticker, cropSource, refetchUserStickers]);

  const renderSticker = useCallback(
    ({ item }: { item: StickerWithFileId }) => (
      <StickerTile onClose={onClose} onSelect={onSelectExpression} sticker={item} />
    ),
    [onClose, onSelectExpression],
  );
  const stickerListHeight = Math.min(
    360,
    Math.max(120, Math.ceil(stickers.length / 3) * (STICKER_SIZE + GRID_GAP)),
  );
  const emptyContent = userStickersQuery.isPending
    ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.textSecondary} size="small" />
        </View>
      )
    : userStickersQuery.isError
      ? (
          <View style={styles.emptyState}>
            <ThemedText themeColor="textSecondary" type="small">表情包加载失败</ThemedText>
          </View>
        )
      : (
          <View style={styles.emptyAction}>
            <SquareUploadButton
              accessibilityLabel="上传表情包"
              borderColor={theme.accent}
              disabled={uploading || !!cropSource}
              onPress={() => void handlePickSticker()}
              size={72}
            >
              {uploading
                ? <ActivityIndicator color={theme.accent} size="small" />
                : <ThemedText themeColor="accent" type="small">+</ThemedText>}
            </SquareUploadButton>
            <ThemedText themeColor="textSecondary" type="small">
              {uploading ? "正在上传表情包..." : "还没有可用的表情包，点加号上传"}
            </ThemedText>
            {uploadErrorMessage
              ? <ThemedText style={[styles.feedbackText, { color: theme.danger }]}>{uploadErrorMessage}</ThemedText>
              : null}
            {uploadStatusMessage && !uploadErrorMessage
              ? <ThemedText style={[styles.feedbackText, { color: theme.success }]}>{uploadStatusMessage}</ThemedText>
              : null}
          </View>
        );

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.title}>表情</ThemedText>

      <FlashList
        contentContainerStyle={styles.listContent}
        data={stickers}
        drawDistance={STICKER_SIZE * 4}
        keyExtractor={getStickerKey}
        ListEmptyComponent={emptyContent}
        numColumns={3}
        renderItem={renderSticker}
        showsVerticalScrollIndicator={false}
        style={[styles.list, { height: stickerListHeight }]}
      />
      <AvatarCropModal
        visible={!!cropSource}
        imageUri={cropSource?.uri ?? ""}
        imageWidth={cropSource?.width ?? STICKER_CROP_SIZE}
        imageHeight={cropSource?.height ?? STICKER_CROP_SIZE}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        outputCompress={0.86}
        outputFormat={ImageManipulator.SaveFormat.WEBP}
        outputSize={STICKER_CROP_SIZE}
        processingErrorMessage="表情处理失败，请重试。"
      />
    </BottomSheetModal>
  );
}

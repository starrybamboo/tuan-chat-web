import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { SquareUploadButton } from "@/components/SquareUploadButton";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { mediaFileUrl } from "@/lib/media-url";

import { buildStickerCreateRequest } from "./expressionStickerUpload";
import { useCreateStickerMutation } from "./useStickerMutations";
import { useUserStickersQuery } from "./useUserStickersQuery";

const STICKER_SIZE = 72;
const GRID_GAP = 12;

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
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
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  item: {
    alignItems: "center",
    borderRadius: Radius.md,
    overflow: "hidden",
    width: STICKER_SIZE,
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

export function ExpressionPickerSheet({
  onClose,
  onSelectExpression,
  visible,
}: ExpressionPickerSheetProps) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const userStickersQuery = useUserStickersQuery(visible);
  const createStickerMutation = useCreateStickerMutation();
  const stickers = (userStickersQuery.data?.data ?? [])
    .filter((sticker): sticker is StickerWithFileId => typeof sticker.fileId === "number" && sticker.fileId > 0);

  const handleUploadSticker = useCallback(async () => {
    if (uploading) {
      return;
    }

    setUploading(true);
    try {
      const [picked] = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (!picked) {
        return;
      }

      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [picked]);
      const uploadedImage = uploaded.uploadedImages[0];
      if (!uploadedImage) {
        throw new Error("表情包上传失败。");
      }

      await createStickerMutation.mutateAsync(buildStickerCreateRequest(picked, uploadedImage));
    }
    catch (error) {
      const message = error instanceof Error && error.message.trim() ? error.message.trim() : "表情包上传失败。";
      Alert.alert("上传失败", message);
    }
    finally {
      setUploading(false);
    }
  }, [createStickerMutation, uploading]);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="42%"
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <ThemedText style={styles.title}>表情</ThemedText>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {userStickersQuery.isPending
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
            : stickers.length === 0
              ? (
                  <View style={styles.emptyAction}>
                    <SquareUploadButton
                      accessibilityLabel="上传表情包"
                      borderColor={theme.accent}
                      disabled={uploading}
                      onPress={() => void handleUploadSticker()}
                      size={72}
                    >
                      <ThemedText themeColor="accent" type="small">
                        {uploading ? "..." : "+"}
                      </ThemedText>
                    </SquareUploadButton>
                    <ThemedText themeColor="textSecondary" type="small">
                      还没有可用的表情包，点加号上传
                    </ThemedText>
                  </View>
                )
              : (
                  <View style={styles.grid}>
                    {stickers.map((sticker) => {
                      const stickerMediaType = sticker.mediaType?.trim() || "image";
                      return (
                        <Pressable
                          key={sticker.stickerId ?? sticker.fileId}
                          onPress={() => {
                            onSelectExpression(sticker);
                            onClose();
                          }}
                          style={styles.item}
                        >
                          <CachedImage
                            uri={mediaFileUrl(sticker.fileId, stickerMediaType === "image" ? "image" : "other", "low")}
                            contentFit="contain"
                            style={styles.sticker}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
      </ScrollView>
    </BottomSheetModal>
  );
}

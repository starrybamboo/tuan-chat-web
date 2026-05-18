import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";

import { Image } from "expo-image";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mediaFileUrl } from "@/lib/media-url";

import { useUserStickersQuery } from "./useUserStickersQuery";

const STICKER_SIZE = 72;
const GRID_GAP = 12;

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: "42%",
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: Spacing.xl,
    width: 36,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
});

interface ExpressionPickerSheetProps {
  onClose: () => void;
  onSelectExpression: (sticker: Sticker) => void;
  visible: boolean;
}

type StickerWithFileId = Sticker & { fileId: number };

export function ExpressionPickerSheet({
  onClose,
  onSelectExpression,
  visible,
}: ExpressionPickerSheetProps) {
  const theme = useTheme();
  const userStickersQuery = useUserStickersQuery(visible);
  const stickers = (userStickersQuery.data?.data ?? [])
    .filter((sticker): sticker is StickerWithFileId => typeof sticker.fileId === "number" && sticker.fileId > 0);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
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
                      <View style={styles.emptyState}>
                        <ThemedText themeColor="textSecondary" type="small">还没有可用的表情包</ThemedText>
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
                              <Image
                                contentFit="contain"
                                source={{ uri: mediaFileUrl(sticker.fileId, stickerMediaType === "image" ? "image" : "other", "low") }}
                                style={styles.sticker}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

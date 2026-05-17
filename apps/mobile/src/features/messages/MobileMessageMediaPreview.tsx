import {
  getFileMessageExtra,
  getImageMessageExtra,
  getSoundMessageExtra,
  getVideoMessageExtra,
} from "@tuanchat/domain/message-extra";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mediaFileUrl, type MobileMediaType } from "@/lib/media-url";

const MAX_IMAGE_WIDTH = 240;
const MAX_IMAGE_HEIGHT = 260;

const styles = StyleSheet.create({
  fileCard: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
    maxWidth: 280,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  image: {
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  mediaCard: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
    maxWidth: 280,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalImage: {
    height: "100%",
    width: "100%",
  },
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.92)",
    flex: 1,
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});

function normalizeMediaType(value: string | null | undefined, fallback: MobileMediaType): MobileMediaType {
  if (value === "image" || value === "audio" || value === "video" || value === "document" || value === "other") {
    return value;
  }
  return fallback;
}

function formatSize(size?: number | null) {
  if (!size || size <= 0) return null;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${size} B`;
}

function formatDuration(second?: number | null) {
  if (!second || second <= 0) return null;
  const total = Math.ceil(second);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function openMediaUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("无法打开媒体", "当前设备暂时无法打开这个文件。");
  }
}

interface MobileMessageMediaPreviewProps {
  compact?: boolean;
  content?: string | null;
  extra?: unknown;
  messageType?: number | null;
}

export function MobileMessageMediaPreview({
  compact = false,
  content,
  extra,
  messageType,
}: MobileMessageMediaPreviewProps) {
  const theme = useTheme();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  if (messageType === MESSAGE_TYPE.IMG) {
    const image = getImageMessageExtra(extra);
    if (!image?.fileId) return null;
    const mediaType = normalizeMediaType(image.mediaType, "image");
    const thumbUrl = mediaFileUrl(image.fileId, mediaType, "medium");
    const highUrl = mediaFileUrl(image.fileId, mediaType, "high");
    const rawWidth = image.width && image.width > 0 ? image.width : MAX_IMAGE_WIDTH;
    const rawHeight = image.height && image.height > 0 ? image.height : MAX_IMAGE_WIDTH;
    const scale = Math.min(MAX_IMAGE_WIDTH / rawWidth, MAX_IMAGE_HEIGHT / rawHeight, 1);
    const width = Math.max(120, Math.round(rawWidth * scale));
    const height = Math.max(96, Math.round(rawHeight * scale));

    return (
      <>
        <Pressable onPress={() => setPreviewImageUrl(highUrl)}>
          <Image
            source={{ uri: thumbUrl }}
            style={[styles.image, { height, width }]}
            resizeMode="cover"
          />
        </Pressable>
        <Modal
          animationType="fade"
          transparent
          visible={previewImageUrl !== null}
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPreviewImageUrl(null)}>
            {previewImageUrl ? (
              <Image source={{ uri: previewImageUrl }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </Modal>
      </>
    );
  }

  if (messageType === MESSAGE_TYPE.VIDEO) {
    const video = getVideoMessageExtra(extra);
    if (!video?.fileId) return null;
    const mediaType = normalizeMediaType(video.mediaType, "video");
    const videoUrl = mediaFileUrl(video.fileId, mediaType, "high");
    const meta = [formatDuration(video.second), formatSize(video.size)].filter(Boolean).join(" · ");

    return (
      <Pressable
        onPress={() => void openMediaUrl(videoUrl)}
        style={[styles.mediaCard, { backgroundColor: theme.backgroundElement }]}
      >
        <SymbolView name={{ ios: "play.circle.fill", android: "play_circle", web: "play_circle" }} size={compact ? 24 : 30} tintColor={theme.accent} />
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={1}>{video.fileName?.trim() || content?.trim() || "视频消息"}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{meta || "点击播放"}</ThemedText>
        </View>
      </Pressable>
    );
  }

  if (messageType === MESSAGE_TYPE.SOUND) {
    const sound = getSoundMessageExtra(extra);
    if (!sound?.fileId) return null;
    const mediaType = normalizeMediaType(sound.mediaType, "audio");
    const audioUrl = mediaFileUrl(sound.fileId, mediaType, "high");
    const meta = [formatDuration(sound.second), formatSize(sound.size)].filter(Boolean).join(" · ");

    return (
      <Pressable
        onPress={() => void openMediaUrl(audioUrl)}
        style={[styles.mediaCard, { backgroundColor: theme.accentMuted }]}
      >
        <SymbolView name={{ ios: "waveform.circle.fill", android: "graphic_eq", web: "graphic_eq" }} size={compact ? 24 : 30} tintColor={theme.accent} />
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={1}>{sound.fileName?.trim() || content?.trim() || "语音消息"}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{meta || "点击播放"}</ThemedText>
        </View>
      </Pressable>
    );
  }

  if (messageType === MESSAGE_TYPE.FILE) {
    const file = getFileMessageExtra(extra);
    if (!file?.fileId) return null;
    const mediaType = normalizeMediaType(file.mediaType, "document");
    const fileUrl = mediaFileUrl(file.fileId, mediaType, "original");
    const size = formatSize(file.size);

    return (
      <Pressable
        onPress={() => void openMediaUrl(fileUrl)}
        style={[styles.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <SymbolView name={{ ios: "doc.fill", android: "description", web: "description" }} size={compact ? 22 : 28} tintColor={theme.textSecondary} />
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={1}>{file.fileName?.trim() || content?.trim() || "文件"}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{size || "点击打开"}</ThemedText>
        </View>
      </Pressable>
    );
  }

  return null;
}

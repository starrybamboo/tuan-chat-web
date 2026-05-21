import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { File, PauseCircle, PlayCircle } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Pressable, StyleSheet, View } from "react-native";

import type { MobileMediaType } from "@/lib/media-url";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mediaFileUrl } from "@/lib/media-url";
import { resolveCachedMediaFileUri } from "@/lib/mobile-media-file-cache";
import {
  getFileMessageExtra,
  getImageMessageExtra,
  getSoundMessageExtra,
  getVideoMessageExtra,
} from "@tuanchat/domain/message-extra";

import {
  activateMobileAudioPlayback,
  deactivateMobileAudioPlayback,
} from "./mobileAudioPlaybackCoordinator";

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
  mediaFallbackButton: {
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
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
  videoCard: {
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    maxWidth: 280,
    overflow: "hidden",
  },
  videoPlayer: {
    aspectRatio: 16 / 9,
    width: "100%",
  },
});

function normalizeMediaType(value: string | null | undefined, fallback: MobileMediaType): MobileMediaType {
  if (value === "image" || value === "audio" || value === "video" || value === "document" || value === "other") {
    return value;
  }
  return fallback;
}

function formatSize(size?: number | null) {
  if (!size || size <= 0)
    return null;
  if (size >= 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024)
    return `${Math.ceil(size / 1024)} KB`;
  return `${size} B`;
}

function formatDuration(second?: number | null) {
  if (!second || second <= 0)
    return null;
  const total = Math.ceil(second);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function openMediaUrl(url: string, options: { fileName?: string | null } = {}) {
  try {
    const resolvedUri = await resolveCachedMediaFileUri(url, {
      fileName: options.fileName,
    });
    await Linking.openURL(resolvedUri ?? url);
  }
  catch {
    Alert.alert("无法打开媒体", "当前设备暂时无法打开这个文件。");
  }
}

function formatSoundPurpose(purpose?: string | null) {
  const normalized = purpose?.trim().toLowerCase();
  if (!normalized)
    return "语音";
  if (normalized === "bgm")
    return "BGM";
  if (normalized === "effect" || normalized === "sfx")
    return "音效";
  if (normalized === "voice")
    return "语音";
  return purpose?.trim() || "音频";
}

type EmbeddedVideoCardProps = {
  compact: boolean;
  content?: string | null;
  fileName?: string | null;
  meta: string;
  url: string;
};

function EmbeddedVideoCard({ compact, content, fileName, meta, url }: EmbeddedVideoCardProps) {
  const theme = useTheme();
  const player = useVideoPlayer(
    { uri: url, useCaching: true },
    (instance) => {
      instance.audioMixingMode = "auto";
    },
  );
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  return (
    <View style={[styles.videoCard, { backgroundColor: theme.backgroundElement }]}>
      <VideoView
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls
        onFirstFrameRender={() => setHasFirstFrame(true)}
        player={player}
        style={styles.videoPlayer}
      />
      <View style={{ gap: 2, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <ThemedText type="smallBold" numberOfLines={1}>{fileName?.trim() || content?.trim() || "视频消息"}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {hasFirstFrame ? meta || "可内嵌播放" : meta || "视频加载中"}
        </ThemedText>
        <Pressable
          onPress={() => void openMediaUrl(url, { fileName })}
          style={({ pressed }) => [
            styles.mediaFallbackButton,
            { backgroundColor: pressed ? theme.backgroundSelected : "transparent" },
          ]}
        >
          <ThemedText type="caption" themeColor="accent">{compact ? "打开" : "系统打开"}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

type EmbeddedAudioCardProps = {
  compact: boolean;
  content?: string | null;
  fileName?: string | null;
  meta: string;
  purpose?: string | null;
  url: string;
};

function EmbeddedAudioCard({ compact, content, fileName, meta, purpose, url }: EmbeddedAudioCardProps) {
  const theme = useTheme();
  const source = useMemo(() => ({ name: fileName?.trim() || content?.trim() || "音频消息", uri: url }), [content, fileName, url]);
  const player = useAudioPlayer(source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const playbackId = useMemo(() => `audio:${url}`, [url]);
  const purposeLabel = formatSoundPurpose(purpose);
  const progressText = [
    formatDuration(status.currentTime),
    formatDuration(status.duration),
  ].filter(Boolean).join(" / ");

  useEffect(() => {
    if (!status.playing) {
      deactivateMobileAudioPlayback(playbackId);
      return;
    }
    activateMobileAudioPlayback({
      id: playbackId,
      pause: () => player.pause(),
    });
  }, [playbackId, player, status.playing]);

  useEffect(() => () => {
    deactivateMobileAudioPlayback(playbackId);
  }, [playbackId]);

  return (
    <View style={[styles.mediaCard, { backgroundColor: theme.accentMuted }]}>
      <Pressable
        accessibilityLabel={status.playing ? "暂停音频" : "播放音频"}
        accessibilityRole="button"
        onPress={() => {
          if (status.playing) {
            player.pause();
            deactivateMobileAudioPlayback(playbackId);
            return;
          }
          activateMobileAudioPlayback({ id: playbackId, pause: () => player.pause() });
          player.play();
        }}
      >
        {status.playing
          ? <PauseCircle size={compact ? 24 : 30} color={theme.accent} weight="fill" />
          : <PlayCircle size={compact ? 24 : 30} color={theme.accent} weight="fill" />}
      </Pressable>
      <View style={styles.textBlock}>
        <ThemedText type="smallBold" numberOfLines={1}>{fileName?.trim() || content?.trim() || purposeLabel}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {[purposeLabel, progressText || meta || "可内嵌播放"].filter(Boolean).join(" · ")}
        </ThemedText>
        <Pressable
          onPress={() => void openMediaUrl(url, { fileName })}
          style={({ pressed }) => [
            styles.mediaFallbackButton,
            { backgroundColor: pressed ? theme.backgroundSelected : "transparent" },
          ]}
        >
          <ThemedText type="caption" themeColor="accent">系统打开</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

type MobileMessageMediaPreviewProps = {
  compact?: boolean;
  content?: string | null;
  extra?: unknown;
  messageType?: number | null;
};

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
    if (!image?.fileId)
      return null;
    const mediaType = normalizeMediaType(image.mediaType, "image");
    const thumbUrl = mediaFileUrl(image.fileId, mediaType, "low");
    const fullSizeUrl = mediaFileUrl(image.fileId, mediaType, "medium");
    const rawWidth = image.width && image.width > 0 ? image.width : MAX_IMAGE_WIDTH;
    const rawHeight = image.height && image.height > 0 ? image.height : MAX_IMAGE_WIDTH;
    const scale = Math.min(MAX_IMAGE_WIDTH / rawWidth, MAX_IMAGE_HEIGHT / rawHeight, 1);
    const width = Math.max(120, Math.round(rawWidth * scale));
    const height = Math.max(96, Math.round(rawHeight * scale));

    return (
      <>
        <Pressable onPress={() => setPreviewImageUrl(fullSizeUrl)}>
          <CachedImage
            uri={thumbUrl}
            style={[styles.image, { height, width }]}
            contentFit="cover"
          />
        </Pressable>
        <Modal
          animationType="fade"
          transparent
          visible={previewImageUrl !== null}
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPreviewImageUrl(null)}>
            {previewImageUrl
              ? (
                  <CachedImage uri={previewImageUrl} style={styles.modalImage} contentFit="contain" />
                )
              : null}
          </Pressable>
        </Modal>
      </>
    );
  }

  if (messageType === MESSAGE_TYPE.VIDEO) {
    const video = getVideoMessageExtra(extra);
    if (!video?.fileId)
      return null;
    const mediaType = normalizeMediaType(video.mediaType, "video");
    const videoUrl = mediaFileUrl(video.fileId, mediaType, "low");
    const meta = [formatDuration(video.second), formatSize(video.size)].filter(Boolean).join(" · ");

    return <EmbeddedVideoCard compact={compact} content={content} fileName={video.fileName} meta={meta} url={videoUrl} />;
  }

  if (messageType === MESSAGE_TYPE.SOUND) {
    const sound = getSoundMessageExtra(extra);
    if (!sound?.fileId)
      return null;
    const mediaType = normalizeMediaType(sound.mediaType, "audio");
    const audioUrl = mediaFileUrl(sound.fileId, mediaType, "low");
    const meta = [formatDuration(sound.second), formatSize(sound.size)].filter(Boolean).join(" · ");

    return (
      <EmbeddedAudioCard
        compact={compact}
        content={content}
        fileName={sound.fileName}
        meta={meta}
        purpose={sound.purpose}
        url={audioUrl}
      />
    );
  }

  if (messageType === MESSAGE_TYPE.FILE) {
    const file = getFileMessageExtra(extra);
    if (!file?.fileId)
      return null;
    const mediaType = normalizeMediaType(file.mediaType, "document");
    const fileUrl = mediaFileUrl(file.fileId, mediaType, "low");
    const size = formatSize(file.size);

    return (
      <Pressable
        onPress={() => void openMediaUrl(fileUrl, { fileName: file.fileName })}
        style={[styles.fileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <File size={compact ? 22 : 28} color={theme.textSecondary} weight="fill" />
        <View style={styles.textBlock}>
          <ThemedText type="smallBold" numberOfLines={1}>{file.fileName?.trim() || content?.trim() || "文件"}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{size || "点击打开"}</ThemedText>
        </View>
      </Pressable>
    );
  }

  return null;
}

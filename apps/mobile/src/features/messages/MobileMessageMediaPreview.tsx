import {
  getFileMessageExtra,
  getImageMessageExtra,
  getSoundMessageExtra,
  getVideoMessageExtra,
} from "@tuanchat/domain/message-extra";
import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useVideoPlayer, VideoView } from "expo-video";
import { File, PauseCircle, PlayCircle } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { mediaFileUrl, normalizeMediaType } from "@/lib/media-url";
import { getCachedMediaFileUriSync, resolveCachedMediaFileUri } from "@/lib/mobile-media-file-cache";

import { resolveMessageMediaUrl } from "./messageMediaSource";
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
  imageFrame: {
    marginTop: Spacing.xs,
    position: "relative",
  },
  imageUploadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: Radius.md,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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
  mediaLoadState: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
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

function normalizeFileMediaType(value: string | null | undefined) {
  return value ? normalizeMediaType(value) : "document";
}

async function openMediaUrl(url: string, options: { fileName?: string | null } = {}) {
  try {
    const resolvedUri = await resolveCachedMediaFileUri(url, {
      fallbackToRemote: false,
      fileName: options.fileName,
    });
    if (!resolvedUri) {
      throw new Error("媒体文件缓存失败");
    }
    await Linking.openURL(resolvedUri);
  }
  catch {
    Alert.alert("无法打开媒体", "当前设备暂时无法打开这个文件。");
  }
}

type CachedMediaFileState = {
  failed: boolean;
  key: string;
  uri: string | null;
};

function useCachedMediaFile(url: string, fileName?: string | null) {
  const key = `${url}\u0000${fileName?.trim() ?? ""}`;
  const syncUri = getCachedMediaFileUriSync(url, { fileName });
  const [state, setState] = useState<CachedMediaFileState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const currentState = state?.key === key ? state : null;

  useEffect(() => {
    if (getCachedMediaFileUriSync(url, { fileName })) {
      return;
    }

    let cancelled = false;
    void resolveCachedMediaFileUri(url, {
      fallbackToRemote: false,
      fileName,
      forceRetry: retryCount > 0,
    }).then((uri) => {
      if (!cancelled) {
        setState({ failed: uri == null, key, uri });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileName, key, retryCount, url]);

  return {
    failed: !syncUri && currentState?.failed === true,
    loading: !syncUri && currentState?.failed !== true,
    retry: () => {
      setState(null);
      setRetryCount(value => value + 1);
    },
    uri: syncUri ?? currentState?.uri ?? null,
  };
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
  const cachedFile = useCachedMediaFile(url, fileName);
  const title = fileName?.trim() || content?.trim() || "视频消息";

  if (!cachedFile.uri) {
    return (
      <MediaFileLoadState
        compact={compact}
        failed={cachedFile.failed}
        loading={cachedFile.loading}
        onRetry={cachedFile.retry}
        title={title}
        typeLabel="视频"
      />
    );
  }

  return (
    <EmbeddedVideoPlayer
      compact={compact}
      fileName={fileName}
      meta={meta}
      remoteUrl={url}
      title={title}
      url={cachedFile.uri}
    />
  );
}

type EmbeddedVideoPlayerProps = {
  compact: boolean;
  fileName?: string | null;
  meta: string;
  remoteUrl: string;
  title: string;
  url: string;
};

function EmbeddedVideoPlayer({ compact, fileName, meta, remoteUrl, title, url }: EmbeddedVideoPlayerProps) {
  const theme = useTheme();
  const player = useVideoPlayer(
    { uri: url },
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
        <ThemedText type="smallBold" numberOfLines={1} accessibilityLabel={title}>{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {hasFirstFrame ? meta || "可内嵌播放" : meta || "视频加载中"}
        </ThemedText>
        <Pressable
          accessibilityLabel={`打开媒体文件 ${title}`}
          accessibilityRole="button"
          onPress={() => void openMediaUrl(remoteUrl, { fileName })}
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
  const cachedFile = useCachedMediaFile(url, fileName);
  const purposeLabel = formatSoundPurpose(purpose);
  const title = fileName?.trim() || content?.trim() || purposeLabel;

  if (!cachedFile.uri) {
    return (
      <MediaFileLoadState
        compact={compact}
        failed={cachedFile.failed}
        loading={cachedFile.loading}
        onRetry={cachedFile.retry}
        title={title}
        typeLabel={purposeLabel}
      />
    );
  }

  return (
    <EmbeddedAudioPlayer
      compact={compact}
      fileName={fileName}
      meta={meta}
      purposeLabel={purposeLabel}
      remoteUrl={url}
      title={title}
      url={cachedFile.uri}
    />
  );
}

type EmbeddedAudioPlayerProps = {
  compact: boolean;
  fileName?: string | null;
  meta: string;
  purposeLabel: string;
  remoteUrl: string;
  title: string;
  url: string;
};

function EmbeddedAudioPlayer({ compact, fileName, meta, purposeLabel, remoteUrl, title, url }: EmbeddedAudioPlayerProps) {
  const theme = useTheme();
  const source = useMemo(() => ({ name: title, uri: url }), [title, url]);
  const player = useAudioPlayer(source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const playbackId = useMemo(() => `audio:${remoteUrl}`, [remoteUrl]);
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
        <ThemedText type="smallBold" numberOfLines={1} accessibilityLabel={title}>{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {[purposeLabel, progressText || meta || "可内嵌播放"].filter(Boolean).join(" · ")}
        </ThemedText>
        <Pressable
          onPress={() => void openMediaUrl(remoteUrl, { fileName })}
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

type MediaFileLoadStateProps = {
  compact: boolean;
  failed: boolean;
  loading: boolean;
  onRetry: () => void;
  title: string;
  typeLabel: string;
};

function MediaFileLoadState({ compact, failed, loading, onRetry, title, typeLabel }: MediaFileLoadStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.mediaCard, styles.mediaLoadState, { backgroundColor: theme.backgroundElement }]}>
      {loading
        ? <ActivityIndicator color={theme.accent} size={compact ? "small" : "large"} />
        : <PlayCircle color={theme.textSecondary} size={compact ? 24 : 30} weight="fill" />}
      <View style={styles.textBlock}>
        <ThemedText type="smallBold" numberOfLines={1}>{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {failed ? `${typeLabel}下载失败` : `${typeLabel}下载中`}
        </ThemedText>
      </View>
      {failed
        ? (
            <Pressable
              accessibilityLabel={`重新下载${typeLabel}`}
              accessibilityRole="button"
              onPress={onRetry}
              style={styles.mediaFallbackButton}
            >
              <ThemedText type="caption" themeColor="accent">重试</ThemedText>
            </Pressable>
          )
        : null}
    </View>
  );
}

type DeferredPlayableMediaCardProps = {
  compact: boolean;
  meta: string;
  onPress: () => void;
  title: string;
  typeLabel: string;
};

function DeferredPlayableMediaCard({ compact, meta, onPress, title, typeLabel }: DeferredPlayableMediaCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={`加载${typeLabel}播放器`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.mediaCard,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}
    >
      <PlayCircle size={compact ? 24 : 30} color={theme.accent} weight="fill" />
      <View style={styles.textBlock}>
        <ThemedText type="smallBold" numberOfLines={1}>{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {[typeLabel, meta || "点击加载播放器"].filter(Boolean).join(" · ")}
        </ThemedText>
      </View>
    </Pressable>
  );
}

type MobileMessageMediaPreviewProps = {
  compact?: boolean;
  content?: string | null;
  deferPlayableMedia?: boolean;
  extra?: unknown;
  messageType?: number | null;
};

type LocalAttachmentPreviewMeta = {
  localUri?: string;
  uploadState?: string;
};

function getLocalAttachmentPreview(extra: unknown): LocalAttachmentPreviewMeta | null {
  const preview = (extra as { tcLocalAttachmentPreview?: LocalAttachmentPreviewMeta } | null | undefined)?.tcLocalAttachmentPreview;
  return preview && typeof preview === "object" ? preview : null;
}

export function MobileMessageMediaPreview({
  compact = false,
  content,
  deferPlayableMedia = false,
  extra,
  messageType,
}: MobileMessageMediaPreviewProps) {
  const theme = useTheme();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [activatedPlayableMediaKey, setActivatedPlayableMediaKey] = useState<string | null>(null);
  const localAttachmentPreview = getLocalAttachmentPreview(extra);

  if (messageType === MESSAGE_TYPE.IMG) {
    const image = getImageMessageExtra(extra);
    const localImageUrl = typeof localAttachmentPreview?.localUri === "string" ? localAttachmentPreview.localUri : "";
    const thumbUrl = localImageUrl || resolveMessageMediaUrl(image, "medium", "image");
    const fullSizeUrl = localImageUrl || resolveMessageMediaUrl(image, "original", "image");
    if (!image || !thumbUrl || !fullSizeUrl)
      return null;
    const rawWidth = image.width && image.width > 0 ? image.width : MAX_IMAGE_WIDTH;
    const rawHeight = image.height && image.height > 0 ? image.height : MAX_IMAGE_WIDTH;
    const scale = Math.min(MAX_IMAGE_WIDTH / rawWidth, MAX_IMAGE_HEIGHT / rawHeight, 1);
    const width = Math.max(120, Math.round(rawWidth * scale));
    const height = Math.max(96, Math.round(rawHeight * scale));

    return (
      <>
        <Pressable
          accessibilityLabel={`查看图片 ${content?.trim() || "图片消息"}`}
          accessibilityRole="button"
          onPress={() => setPreviewImageUrl(fullSizeUrl)}
        >
          <View style={[styles.imageFrame, { height, width }]}>
            <CachedImage
              uri={thumbUrl}
              style={[styles.image, { height, width, marginTop: 0, opacity: localAttachmentPreview ? 0.72 : 1 }]}
              contentFit="cover"
            />
            {localAttachmentPreview
              ? (
                  <View style={styles.imageUploadingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )
              : null}
          </View>
        </Pressable>
        <Modal
          animationType="fade"
          transparent
          visible={previewImageUrl !== null}
          onRequestClose={() => setPreviewImageUrl(null)}
        >
          <Pressable
            accessibilityLabel="关闭图片预览"
            accessibilityRole="button"
            style={styles.modalOverlay}
            onPress={() => setPreviewImageUrl(null)}
          >
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
    const videoUrl = resolveMessageMediaUrl(video, "low", "video");
    if (!video || !videoUrl)
      return null;
    const meta = [formatDuration(video.second), formatSize(video.size)].filter(Boolean).join(" · ");
    const title = video.fileName?.trim() || content?.trim() || "视频消息";
    const playableMediaKey = `video:${videoUrl}`;

    if (deferPlayableMedia && activatedPlayableMediaKey !== playableMediaKey) {
      return (
        <DeferredPlayableMediaCard
          compact={compact}
          meta={meta}
          onPress={() => setActivatedPlayableMediaKey(playableMediaKey)}
          title={title}
          typeLabel="视频"
        />
      );
    }

    return <EmbeddedVideoCard compact={compact} content={content} fileName={video.fileName} meta={meta} url={videoUrl} />;
  }

  if (messageType === MESSAGE_TYPE.SOUND) {
    const sound = getSoundMessageExtra(extra);
    const audioUrl = resolveMessageMediaUrl(sound, "low", "audio");
    if (!sound || !audioUrl)
      return null;
    const meta = [formatDuration(sound.second), formatSize(sound.size)].filter(Boolean).join(" · ");
    const title = sound.fileName?.trim() || content?.trim() || formatSoundPurpose(sound.purpose);
    const playableMediaKey = `audio:${audioUrl}`;

    if (deferPlayableMedia && activatedPlayableMediaKey !== playableMediaKey) {
      return (
        <DeferredPlayableMediaCard
          compact={compact}
          meta={meta}
          onPress={() => setActivatedPlayableMediaKey(playableMediaKey)}
          title={title}
          typeLabel={formatSoundPurpose(sound.purpose)}
        />
      );
    }

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
    const mediaType = normalizeFileMediaType(file.mediaType);
    const fileUrl = mediaFileUrl(file.fileId, mediaType, "low");
    const size = formatSize(file.size);

    return (
      <Pressable
        accessibilityLabel={`打开文件 ${file.fileName?.trim() || content?.trim() || "文件"}`}
        accessibilityRole="button"
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

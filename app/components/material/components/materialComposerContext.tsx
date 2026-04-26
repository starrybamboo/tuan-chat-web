import type { ReactNode } from "react";
import type { MediaAnnotationPreferenceType } from "@/components/chat/utils/mediaAnnotationPreference";

import { produce } from "immer";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { preheatChatMediaPreprocess } from "@/components/chat/utils/attachmentPreprocess";
import { resolveTempAnnotationsForMedia } from "@/components/chat/utils/mediaAnnotationPreference";
import { areAnnotationsEqual, normalizeAnnotations } from "@/types/messageAnnotations";
import {
  buildQueuedFilesSummary,
  ensureMaterialComposerMediaPreferences,
  MATERIAL_COMPOSER_ROOM_ID,
  splitComposerFiles,
} from "./materialComposerShared";

interface EmojiAttachmentMeta {
  width?: number;
  height?: number;
  size?: number;
  fileName?: string;
}

interface QueueFilesOptions {
  showSuccessToast?: boolean;
  showEmptyToast?: boolean;
}

type MaterialComposerPreferenceSource = MediaAnnotationPreferenceType | null;

interface MaterialComposerContextValue {
  roomId: number;
  imgFiles: File[];
  emojiUrls: string[];
  emojiMetaByUrl: Record<string, EmojiAttachmentMeta>;
  fileAttachments: File[];
  audioFile: File | null;
  annotations: string[];
  tempAnnotations: string[];
  tempAnnotationPreferenceSource: MaterialComposerPreferenceSource;
  updateImgFiles: (updater: (draft: File[]) => void) => void;
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateFileAttachments: (updater: (draft: File[]) => void) => void;
  setEmojiMetaByUrl: (url: string, meta: EmojiAttachmentMeta) => void;
  removeEmojiMetaByUrl: (url: string) => void;
  clearEmojiMeta: () => void;
  setAudioFile: (file: File | null) => void;
  setAnnotations: (annotations: string[]) => void;
  setTempAnnotations: (annotations: string[]) => void;
  setTempAnnotationPreferenceSource: (source: MaterialComposerPreferenceSource) => void;
  applyMediaAnnotationPreference: (mediaType: MediaAnnotationPreferenceType) => void;
  queueFiles: (files: Iterable<File>, options?: QueueFilesOptions) => boolean;
  reset: () => void;
}

const MaterialComposerContext = createContext<MaterialComposerContextValue | null>(null);

function isSameFileList(a: File[], b: File[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function isSameStringList(a: string[], b: string[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function isSameEmojiMetaMap(
  current: Record<string, EmojiAttachmentMeta>,
  next: Record<string, EmojiAttachmentMeta>,
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }
  return currentKeys.every((key) => {
    const left = current[key];
    const right = next[key];
    return left?.width === right?.width
      && left?.height === right?.height
      && left?.size === right?.size
      && left?.fileName === right?.fileName;
  });
}

export function MaterialComposerProvider({
  composerKey,
  children,
}: {
  composerKey: string;
  children: ReactNode;
}) {
  const [imgFiles, setImgFilesState] = useState<File[]>([]);
  const [emojiUrls, setEmojiUrlsState] = useState<string[]>([]);
  const [emojiMetaByUrl, setEmojiMetaByUrlState] = useState<Record<string, EmojiAttachmentMeta>>({});
  const [fileAttachments, setFileAttachmentsState] = useState<File[]>([]);
  const [audioFile, setAudioFileState] = useState<File | null>(null);
  const [annotations, setAnnotationsState] = useState<string[]>([]);
  const [tempAnnotations, setTempAnnotationsState] = useState<string[]>([]);
  const [tempAnnotationPreferenceSource, setTempAnnotationPreferenceSourceState] = useState<MaterialComposerPreferenceSource>(null);

  const updateImgFiles = useCallback((updater: (draft: File[]) => void) => {
    setImgFilesState((previous) => {
      const next = produce(previous, (draft) => {
        updater(draft);
      });
      return isSameFileList(previous, next) ? previous : next;
    });
  }, []);

  const updateEmojiUrls = useCallback((updater: (draft: string[]) => void) => {
    setEmojiUrlsState((previous) => {
      const next = produce(previous, (draft) => {
        updater(draft);
      });
      return isSameStringList(previous, next) ? previous : next;
    });
  }, []);

  const updateFileAttachments = useCallback((updater: (draft: File[]) => void) => {
    setFileAttachmentsState((previous) => {
      const next = produce(previous, (draft) => {
        updater(draft);
      });
      return isSameFileList(previous, next) ? previous : next;
    });
  }, []);

  const setEmojiMetaByUrl = useCallback((url: string, meta: EmojiAttachmentMeta) => {
    if (!url) {
      return;
    }
    setEmojiMetaByUrlState((previous) => {
      const next = {
        ...previous,
        [url]: meta,
      };
      return isSameEmojiMetaMap(previous, next) ? previous : next;
    });
  }, []);

  const removeEmojiMetaByUrl = useCallback((url: string) => {
    if (!url) {
      return;
    }
    setEmojiMetaByUrlState((previous) => {
      if (!Object.prototype.hasOwnProperty.call(previous, url)) {
        return previous;
      }
      const next = { ...previous };
      delete next[url];
      return next;
    });
  }, []);

  const clearEmojiMeta = useCallback(() => {
    setEmojiMetaByUrlState((previous) => {
      return Object.keys(previous).length === 0 ? previous : {};
    });
  }, []);

  const setAudioFile = useCallback((file: File | null) => {
    setAudioFileState(previous => previous === file ? previous : file);
  }, []);

  const setAnnotations = useCallback((nextAnnotations: string[]) => {
    const normalized = normalizeAnnotations(nextAnnotations);
    setAnnotationsState(previous => areAnnotationsEqual(previous, normalized) ? previous : normalized);
  }, []);

  const setTempAnnotations = useCallback((nextAnnotations: string[]) => {
    const normalized = normalizeAnnotations(nextAnnotations);
    setTempAnnotationsState(previous => areAnnotationsEqual(previous, normalized) ? previous : normalized);
  }, []);

  const setTempAnnotationPreferenceSource = useCallback((source: MaterialComposerPreferenceSource) => {
    setTempAnnotationPreferenceSourceState(previous => previous === source ? previous : source);
  }, []);

  const applyMediaAnnotationPreference = useCallback((mediaType: MediaAnnotationPreferenceType) => {
    const next = resolveTempAnnotationsForMedia(MATERIAL_COMPOSER_ROOM_ID, mediaType);
    setTempAnnotations(next);
    setTempAnnotationPreferenceSource(mediaType);
  }, [setTempAnnotationPreferenceSource, setTempAnnotations]);

  const reset = useCallback(() => {
    setImgFilesState([]);
    setEmojiUrlsState([]);
    setEmojiMetaByUrlState({});
    setFileAttachmentsState([]);
    setAudioFileState(null);
    setAnnotationsState([]);
    setTempAnnotationsState([]);
    setTempAnnotationPreferenceSourceState(null);
  }, []);

  const queueFiles = useCallback((
    files: Iterable<File>,
    {
      showSuccessToast = true,
      showEmptyToast = true,
    }: QueueFilesOptions = {},
  ) => {
    ensureMaterialComposerMediaPreferences();

    const queued = splitComposerFiles(files);
    const { images, videos, audios, files: genericFiles } = queued;
    const hasSupportedFiles = images.length > 0 || videos.length > 0 || audios.length > 0;
    const hasFiles = hasSupportedFiles || genericFiles.length > 0;

    if (!hasFiles) {
      if (showEmptyToast) {
        toast.error("未检测到可用文件");
      }
      return false;
    }

    if (genericFiles.length > 0) {
      toast.error(
        hasSupportedFiles
          ? `已忽略${genericFiles.length}个文件，当前仅支持图片、视频、音频`
          : "暂不支持发送文件",
      );
    }
    if (!hasSupportedFiles) {
      return false;
    }

    if (images.length > 0) {
      updateImgFiles((draft) => {
        draft.push(...images);
      });
      applyMediaAnnotationPreference("image");
    }

    if (videos.length > 0) {
      updateFileAttachments((draft) => {
        draft.push(...videos);
      });
    }

    if (audios.length > 0) {
      setAudioFile(audios[0]);
      applyMediaAnnotationPreference("audio");
      if (audios.length > 1) {
        toast.error("仅支持添加 1 个音频，已取第一个");
      }
    }

    preheatChatMediaPreprocess({
      imageFiles: images,
      videoFiles: videos,
      audioFiles: audios.length > 0 ? [audios[0]] : [],
    });

    if (showSuccessToast) {
      const summaryParts = buildQueuedFilesSummary(queued);
      toast.success(`已加入输入框：${summaryParts.join("、")}`);
    }

    return true;
  }, [applyMediaAnnotationPreference, setAudioFile, updateFileAttachments, updateImgFiles]);

  useEffect(() => {
    ensureMaterialComposerMediaPreferences();
    queueMicrotask(() => reset());
  }, [composerKey, reset]);

  const value = useMemo<MaterialComposerContextValue>(() => ({
    roomId: MATERIAL_COMPOSER_ROOM_ID,
    imgFiles,
    emojiUrls,
    emojiMetaByUrl,
    fileAttachments,
    audioFile,
    annotations,
    tempAnnotations,
    tempAnnotationPreferenceSource,
    updateImgFiles,
    updateEmojiUrls,
    updateFileAttachments,
    setEmojiMetaByUrl,
    removeEmojiMetaByUrl,
    clearEmojiMeta,
    setAudioFile,
    setAnnotations,
    setTempAnnotations,
    setTempAnnotationPreferenceSource,
    applyMediaAnnotationPreference,
    queueFiles,
    reset,
  }), [
    annotations,
    applyMediaAnnotationPreference,
    audioFile,
    clearEmojiMeta,
    emojiMetaByUrl,
    emojiUrls,
    fileAttachments,
    imgFiles,
    queueFiles,
    removeEmojiMetaByUrl,
    reset,
    setAnnotations,
    setAudioFile,
    setEmojiMetaByUrl,
    setTempAnnotationPreferenceSource,
    setTempAnnotations,
    tempAnnotationPreferenceSource,
    tempAnnotations,
    updateEmojiUrls,
    updateFileAttachments,
    updateImgFiles,
  ]);

  return (
    <MaterialComposerContext value={value}>
      {children}
    </MaterialComposerContext>
  );
}

export function useMaterialComposerContext() {
  const value = use(MaterialComposerContext);
  if (!value) {
    throw new Error("useMaterialComposerContext 必须在 MaterialComposerProvider 内使用");
  }
  return value;
}

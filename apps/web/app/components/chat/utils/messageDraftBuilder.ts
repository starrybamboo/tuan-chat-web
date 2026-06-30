import type {
  MessageDraft,
  UploadedImageMessageDraftAsset,
  UploadedSoundMessageDraftAsset,
  UploadedVideoMessageDraftAsset,
} from "@/types/messageDraft";
import type { UploadUtils } from "@/utils/UploadUtils";

import { ANNOTATION_IDS, hasAnnotation, normalizeAnnotations, setAnnotation } from "@/types/messageAnnotations";
import { buildMessageDraftsFromUploadedMedia } from "@/types/messageDraft";
import { getImageSize } from "@/utils/getImgSize";
import { readMediaDuration } from "@/utils/mediaMetadata";

import { MessageType } from "../../../../api/wsModels";

type EmojiAttachmentMeta = {
  fileId?: number;
  width?: number;
  height?: number;
  mediaType?: string;
  size?: number;
  fileName?: string;
};

type ResolvedEmojiImageMeta = {
  fileId: number;
  width: number;
  height: number;
  size: number;
  fileName: string;
};

type BuildMessageDraftsFromComposerSnapshotParams = {
  inputText: string;
  imgFiles: File[];
  emojiUrls: string[];
  emojiMetaByUrl: Record<string, EmojiAttachmentMeta>;
  fileAttachments: File[];
  audioFile: File | null;
  composerAnnotations: string[];
  tempAnnotations: string[];
  uploadUtils: UploadUtils;
  allowEmptyTextMessage?: boolean;
  textMessageType?: MessageDraft["messageType"];
};

export type ComposerAttachmentUploadFailure = {
  error: Error;
  file: File;
  kind: "audio" | "image" | "video";
};

export type BuildMessageDraftUploadResult = {
  drafts: MessageDraft[];
  failedAttachments: ComposerAttachmentUploadFailure[];
};

type AttachmentUploadSettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; failure: ComposerAttachmentUploadFailure };

function isVideoAttachment(file: File) {
  if (file.type.startsWith("video/")) {
    return true;
  }
  if (file.type.startsWith("audio/")) {
    return false;
  }
  return /\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(file.name || "");
}

function positiveOrFallback(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

async function settleAttachmentUpload<T>(
  file: File,
  kind: ComposerAttachmentUploadFailure["kind"],
  fallbackMessage: string,
  task: () => Promise<T>,
): Promise<AttachmentUploadSettledResult<T>> {
  try {
    return {
      status: "fulfilled",
      value: await task(),
    };
  }
  catch (error) {
    return {
      status: "rejected",
      failure: {
        error: normalizeUploadError(error, fallbackMessage),
        file,
        kind,
      },
    };
  }
}

export async function resolveEmojiImageMeta({
  emojiUrl,
  meta,
  measureImageSize = getImageSize,
}: {
  emojiUrl: string;
  meta: EmojiAttachmentMeta | undefined;
  measureImageSize?: typeof getImageSize;
}): Promise<ResolvedEmojiImageMeta> {
  if (typeof meta?.fileId !== "number") {
    throw new TypeError("表情素材缺少媒体文件 ID，请重新选择表情。");
  }

  let width = meta.width ?? -1;
  let height = meta.height ?? -1;
  let size = meta.size ?? -1;

  if (width <= 0 || height <= 0 || size <= 0) {
    const measured = await measureImageSize(emojiUrl);
    width = width > 0 ? width : measured.width;
    height = height > 0 ? height : measured.height;
    size = size > 0 ? size : measured.size;
  }

  return {
    fileId: meta.fileId,
    width: positiveOrFallback(width, 1),
    height: positiveOrFallback(height, 1),
    size: positiveOrFallback(size, 1),
    fileName: meta.fileName || "emoji",
  };
}

export async function buildMessageDraftsFromComposerSnapshot(
  params: BuildMessageDraftsFromComposerSnapshotParams,
): Promise<MessageDraft[]> {
  const result = await buildMessageDraftUploadResultFromComposerSnapshot(params);
  if (result.failedAttachments.length > 0) {
    throw result.failedAttachments[0]!.error;
  }
  return result.drafts;
}

export async function buildMessageDraftUploadResultFromComposerSnapshot({
  inputText,
  imgFiles,
  emojiUrls,
  emojiMetaByUrl,
  fileAttachments,
  audioFile,
  composerAnnotations,
  tempAnnotations,
  uploadUtils,
  allowEmptyTextMessage = false,
  textMessageType = MessageType.TEXT,
}: BuildMessageDraftsFromComposerSnapshotParams): Promise<BuildMessageDraftUploadResult> {
  const trimmedInputText = inputText.trim();
  const isBlankInput = trimmedInputText.length === 0;
  const hasRawTextInput = inputText.length > 0;
  const mergedComposerAnnotations = normalizeAnnotations([...composerAnnotations, ...tempAnnotations]);
  const useBackgroundAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BACKGROUND);
  const useCgAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.CG);
  const composerAudioPurpose = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)
    ? "bgm"
    : hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)
      ? "se"
      : undefined;

  // 多图发送时保持输入顺序，但让每张图片的尺寸读取和上传并行执行。
  const failedAttachments: ComposerAttachmentUploadFailure[] = [];
  const imageUploadResults = await Promise.all(imgFiles.map(async (imgFile) => {
    return await settleAttachmentUpload(imgFile, "image", `${imgFile.name || "图片"} 上传失败`, async () => {
      const [uploadedImage, { width, height, size }] = await Promise.all([
        uploadUtils.uploadDualImage(imgFile, 1),
        getImageSize(imgFile),
      ]);
      return {
        fileId: uploadedImage.fileId,
        width,
        height,
        size,
        fileName: imgFile.name,
      } satisfies UploadedImageMessageDraftAsset;
    });
  }));
  const uploadedImages: UploadedImageMessageDraftAsset[] = [];
  for (const result of imageUploadResults) {
    if (result.status === "fulfilled") {
      uploadedImages.push(result.value);
      continue;
    }
    failedAttachments.push(result.failure);
  }
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];

  for (const emojiUrl of emojiUrls) {
    const meta = emojiMetaByUrl[emojiUrl];
    const resolvedEmoji = await resolveEmojiImageMeta({ emojiUrl, meta });

    uploadedImages.push({
      fileId: resolvedEmoji.fileId,
      width: resolvedEmoji.width,
      height: resolvedEmoji.height,
      size: resolvedEmoji.size,
      fileName: resolvedEmoji.fileName,
    });
  }

  const videoUploadResults = await Promise.all(fileAttachments.map(async (attachment) => {
    // 直接上传 FILE 消息已临时关闭；这里只有视频附件还能继续发送。
    if (!isVideoAttachment(attachment)) {
      return null;
    }
    return await settleAttachmentUpload(attachment, "video", `${attachment.name || "视频"} 上传失败`, async () => {
      const [uploadedVideo, second] = await Promise.all([
        uploadUtils.uploadVideo(attachment, 1),
        readMediaDuration(attachment),
      ]);
      return {
        fileId: uploadedVideo.fileId,
        fileName: uploadedVideo.fileName,
        size: uploadedVideo.size,
        ...(second != null ? { second } : {}),
      } satisfies UploadedVideoMessageDraftAsset;
    });
  }));
  for (const result of videoUploadResults) {
    if (!result) {
      continue;
    }
    if (result.status === "fulfilled") {
      uploadedVideos.push(result.value);
      continue;
    }
    failedAttachments.push(result.failure);
  }

  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  if (audioFile) {
    const audioResult = await settleAttachmentUpload(audioFile, "audio", `${audioFile.name || "音频"} 上传失败`, async () => {
      const audioSecond = await readMediaDuration(audioFile);
      if (audioSecond == null) {
        throw new Error("无法读取音频时长，请换用可识别的音频文件后重试。");
      }

      const uploadedAudio = await uploadUtils.uploadAudioAsset(audioFile, 1, 0);
      return {
        fileId: uploadedAudio.fileId,
        fileName: audioFile.name,
        size: audioFile.size,
        second: audioSecond,
        purpose: composerAudioPurpose,
      } satisfies UploadedSoundMessageDraftAsset;
    });
    if (audioResult.status === "fulfilled") {
      uploadedSoundMessage = audioResult.value;
    }
    else {
      failedAttachments.push(audioResult.failure);
    }
  }

  let imageAnnotations = mergedComposerAnnotations;
  if (useBackgroundAnnotation) {
    imageAnnotations = setAnnotation(imageAnnotations, ANNOTATION_IDS.BACKGROUND, true);
  }
  if (useCgAnnotation) {
    imageAnnotations = setAnnotation(imageAnnotations, ANNOTATION_IDS.CG, true);
  }

  let soundAnnotations = mergedComposerAnnotations;
  if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)) {
    soundAnnotations = setAnnotation(soundAnnotations, ANNOTATION_IDS.BGM, true);
  }
  if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)) {
    soundAnnotations = setAnnotation(soundAnnotations, ANNOTATION_IDS.SE, true);
  }

  const drafts = buildMessageDraftsFromUploadedMedia({
    inputText: isBlankInput && hasRawTextInput ? inputText : trimmedInputText,
    imageAnnotations,
    soundAnnotations,
    textAnnotations: mergedComposerAnnotations,
    textMessageType,
    uploadedImages,
    uploadedSoundMessage,
    uploadedVideos,
    videoAnnotations: mergedComposerAnnotations,
    allowEmptyTextMessage: allowEmptyTextMessage && fileAttachments.length === 0,
  });
  return { drafts, failedAttachments };
}

function normalizeUploadError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }
  return new Error(fallbackMessage);
}

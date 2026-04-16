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

import { MessageType } from "../../../../api/wsModels";

type EmojiAttachmentMeta = {
  width?: number;
  height?: number;
  size?: number;
  fileName?: string;
  originalUrl?: string;
};

type BuildMessageDraftsFromComposerSnapshotParams = {
  baseMessage?: Partial<MessageDraft>;
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

async function getMessageDraftMediaDuration(file: File): Promise<number | undefined> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<number | undefined>((resolve) => {
      const element = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      const cleanup = () => {
        element.onloadedmetadata = null;
        element.onerror = null;
        URL.revokeObjectURL(objectUrl);
      };

      element.preload = "metadata";
      element.src = objectUrl;
      element.onloadedmetadata = () => {
        const duration = Number.isFinite(element.duration) && element.duration > 0
          ? Math.max(1, Math.round(element.duration))
          : undefined;
        cleanup();
        resolve(duration);
      };
      element.onerror = () => {
        cleanup();
        resolve(undefined);
      };
    });
  }
  catch {
    URL.revokeObjectURL(objectUrl);
    return undefined;
  }
}

function isVideoAttachment(file: File) {
  if (file.type.startsWith("video/")) {
    return true;
  }
  if (file.type.startsWith("audio/")) {
    return false;
  }
  return /\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(file.name || "");
}

function buildMessageDraftIdentityFields(baseMessage?: Partial<MessageDraft>): Partial<MessageDraft> {
  const roleId = typeof baseMessage?.roleId === "number" ? baseMessage.roleId : undefined;
  const avatarId = typeof roleId === "number" && roleId > 0 && typeof baseMessage?.avatarId === "number" && baseMessage.avatarId > 0
    ? baseMessage.avatarId
    : undefined;
  const customRoleName = typeof baseMessage?.customRoleName === "string" && baseMessage.customRoleName.trim()
    ? baseMessage.customRoleName.trim()
    : undefined;

  return {
    roleId,
    avatarId,
    customRoleName,
  };
}

export async function buildMessageDraftsFromComposerSnapshot({
  baseMessage,
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
}: BuildMessageDraftsFromComposerSnapshotParams): Promise<MessageDraft[]> {
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

  const identityFields = buildMessageDraftIdentityFields(baseMessage);
  const uploadedImages: UploadedImageMessageDraftAsset[] = [];
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];

  for (const imgFile of imgFiles) {
    const uploadedImage = await uploadUtils.uploadDualImage(imgFile, 1);
    const { width, height, size } = await getImageSize(imgFile);
    uploadedImages.push({
      originalUrl: uploadedImage.originalUrl,
      url: uploadedImage.url,
      width,
      height,
      size,
      fileName: imgFile.name,
    });
  }

  for (const emojiUrl of emojiUrls) {
    const meta = emojiMetaByUrl[emojiUrl];
    let width = meta?.width ?? -1;
    let height = meta?.height ?? -1;
    let size = meta?.size ?? -1;

    if (width <= 0 || height <= 0 || size <= 0) {
      const measured = await getImageSize(emojiUrl);
      width = width > 0 ? width : measured.width;
      height = height > 0 ? height : measured.height;
      size = size > 0 ? size : measured.size;
    }

    uploadedImages.push({
      originalUrl: meta?.originalUrl ?? emojiUrl,
      url: emojiUrl,
      width,
      height,
      size,
      fileName: meta?.fileName || "emoji",
    });
  }

  for (const attachment of fileAttachments) {
    // 直接上传 FILE 消息已临时关闭；这里只有视频附件还能继续发送。
    if (!isVideoAttachment(attachment)) {
      continue;
    }
    const uploadedVideo = await uploadUtils.uploadVideo(attachment, 1);
    uploadedVideos.push({
      url: uploadedVideo.url,
      fileName: uploadedVideo.fileName,
      size: uploadedVideo.size,
      second: await getMessageDraftMediaDuration(attachment),
    });
  }

  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  if (audioFile) {
    uploadedSoundMessage = {
      url: await uploadUtils.uploadAudio(audioFile, 1, 0),
      fileName: audioFile.name,
      size: audioFile.size,
      // 历史发送逻辑会在探测失败时兜底 1 秒，避免后端音频校验因为 second 缺失而失败。
      second: await getMessageDraftMediaDuration(audioFile) ?? 1,
      purpose: composerAudioPurpose,
    };
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

  return buildMessageDraftsFromUploadedMedia({
    baseMessage: identityFields,
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
}

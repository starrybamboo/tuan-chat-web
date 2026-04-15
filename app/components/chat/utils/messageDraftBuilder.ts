import type { MessageDraft } from "@/types/messageDraft";
import type { UploadUtils } from "@/utils/UploadUtils";

import { ANNOTATION_IDS, hasAnnotation, normalizeAnnotations, setAnnotation } from "@/types/messageAnnotations";
import { getImageSize } from "@/utils/getImgSize";

import { MessageType } from "../../../../api/wsModels";

type EmojiAttachmentMeta = {
  width?: number;
  height?: number;
  size?: number;
  fileName?: string;
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
  allowEmptyTextMessage = true,
  textMessageType = MessageType.TEXT,
}: BuildMessageDraftsFromComposerSnapshotParams): Promise<MessageDraft[]> {
  const trimmedInputText = inputText.trim();
  const isBlankInput = trimmedInputText.length === 0;
  const mergedComposerAnnotations = normalizeAnnotations([...composerAnnotations, ...tempAnnotations]);
  const useBackgroundAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BACKGROUND);
  const useCgAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.CG);
  const composerAudioPurpose = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)
    ? "bgm"
    : hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)
      ? "se"
      : undefined;

  const identityFields = buildMessageDraftIdentityFields(baseMessage);
  const uploadedImages: Array<{ url: string; width: number; height: number; size: number; fileName: string }> = [];
  const uploadedVideos: Array<{ url: string; fileName: string; size: number; second?: number }> = [];

  for (const imgFile of imgFiles) {
    const url = await uploadUtils.uploadImg(imgFile, 1);
    const { width, height, size } = await getImageSize(imgFile);
    uploadedImages.push({
      url,
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

  let uploadedSoundMessage:
    | { url: string; fileName: string; size: number; second?: number; purpose?: string }
    | null = null;

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

  const nextMessages: MessageDraft[] = [];
  let textContent = trimmedInputText;

  for (const image of uploadedImages) {
    let nextAnnotations = mergedComposerAnnotations;
    if (useBackgroundAnnotation) {
      nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND, true);
    }
    if (useCgAnnotation) {
      nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.CG, true);
    }
    nextMessages.push({
      ...identityFields,
      ...(nextAnnotations.length > 0 ? { annotations: nextAnnotations } : {}),
      content: textContent,
      messageType: MessageType.IMG,
      extra: {
        imageMessage: {
          url: image.url,
          width: image.width,
          height: image.height,
          size: image.size,
          fileName: image.fileName,
          background: useBackgroundAnnotation,
        },
      },
    });
    textContent = "";
  }

  if (uploadedSoundMessage) {
    let nextAnnotations = mergedComposerAnnotations;
    if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)) {
      nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.BGM, true);
    }
    if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)) {
      nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.SE, true);
    }
    nextMessages.push({
      ...identityFields,
      ...(nextAnnotations.length > 0 ? { annotations: nextAnnotations } : {}),
      content: textContent,
      messageType: MessageType.SOUND,
      extra: {
        soundMessage: {
          url: uploadedSoundMessage.url,
          fileName: uploadedSoundMessage.fileName,
          size: uploadedSoundMessage.size,
          ...(typeof uploadedSoundMessage.second === "number" ? { second: uploadedSoundMessage.second } : {}),
          ...(uploadedSoundMessage.purpose ? { purpose: uploadedSoundMessage.purpose } : {}),
        },
      },
    });
    textContent = "";
  }

  for (const video of uploadedVideos) {
    nextMessages.push({
      ...identityFields,
      ...(mergedComposerAnnotations.length > 0 ? { annotations: mergedComposerAnnotations } : {}),
      content: textContent,
      messageType: MessageType.VIDEO,
      extra: {
        videoMessage: {
          url: video.url,
          fileName: video.fileName,
          size: video.size,
          ...(typeof video.second === "number" ? { second: video.second } : {}),
        },
      },
    });
    textContent = "";
  }

  const shouldSendEmptyTextMessage = allowEmptyTextMessage
    && isBlankInput
    && uploadedImages.length === 0
    && uploadedVideos.length === 0
    && fileAttachments.length === 0
    && !uploadedSoundMessage;

  if (textContent || shouldSendEmptyTextMessage) {
    nextMessages.push({
      ...identityFields,
      ...(mergedComposerAnnotations.length > 0 ? { annotations: mergedComposerAnnotations } : {}),
      content: textContent,
      // 附件草稿始终保持各自类型；这里只控制独立文本草稿的消息类型。
      messageType: textMessageType,
      extra: {},
    });
  }

  return nextMessages;
}

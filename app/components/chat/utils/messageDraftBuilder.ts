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
  fileId?: number;
  width?: number;
  height?: number;
  mediaType?: string;
  size?: number;
  fileName?: string;
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

export async function buildMessageDraftsFromComposerSnapshot({
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

  // 多图发送时保持输入顺序，但让每张图片的尺寸读取和上传并行执行。
  const uploadedImages: UploadedImageMessageDraftAsset[] = await Promise.all(imgFiles.map(async (imgFile) => {
    const [uploadedImage, { width, height, size }] = await Promise.all([
      uploadUtils.uploadDualImage(imgFile, 1),
      getImageSize(imgFile),
    ]);
    return {
      fileId: uploadedImage.fileId,
      mediaType: uploadedImage.mediaType,
      width,
      height,
      size,
      fileName: imgFile.name,
    };
  }));
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];

  for (const emojiUrl of emojiUrls) {
    const meta = emojiMetaByUrl[emojiUrl];
    if (typeof meta?.fileId !== "number") {
      throw new TypeError("表情素材缺少媒体文件 ID，请重新选择表情。");
    }
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
      fileId: meta.fileId,
      mediaType: meta?.mediaType || "image",
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
      fileId: uploadedVideo.fileId,
      mediaType: uploadedVideo.mediaType,
      fileName: uploadedVideo.fileName,
      size: uploadedVideo.size,
      second: await getMessageDraftMediaDuration(attachment),
    });
  }

  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  if (audioFile) {
    const audioSecond = await getMessageDraftMediaDuration(audioFile);
    if (audioSecond == null) {
      throw new Error("无法读取音频时长，请换用可识别的音频文件后重试。");
    }

    const uploadedAudio = await uploadUtils.uploadAudioAsset(audioFile, 1, 0);
    uploadedSoundMessage = {
      fileId: uploadedAudio.fileId,
      mediaType: uploadedAudio.mediaType,
      fileName: audioFile.name,
      size: audioFile.size,
      second: audioSecond,
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

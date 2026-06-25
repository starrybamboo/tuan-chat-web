import { compressImage, MEDIA_COMPRESSION_PROFILES } from "@/utils/media/imgCompressUtils";
import { normalizeFileMimeType } from "@/utils/media/mediaMime";
import { UploadUtils } from "@/utils/media/UploadUtils";

type ChatMediaPreprocessInput = {
  imageFiles?: File[];
  videoFiles?: File[];
  audioFiles?: File[];
};

const uploadUtils = new UploadUtils();

function runBestEffortPreprocess(task: Promise<unknown>, kind: "图片" | "视频" | "音频", file: File): void {
  void task.catch((error) => {
    // 预处理失败不阻断附件添加；发送时会按原流程重试。
    console.warn(`[chat-media-preprocess] ${kind}预处理失败，将在发送时重试`, {
      name: file.name,
      type: file.type,
      size: file.size,
      error,
    });
  });
}

async function preheatImageFile(imageFile: File): Promise<void> {
  const normalizedFile = await normalizeFileMimeType(imageFile, { expectedMediaType: "image" });
  await Promise.all([
    compressImage(normalizedFile, MEDIA_COMPRESSION_PROFILES.image.low),
    compressImage(normalizedFile, MEDIA_COMPRESSION_PROFILES.image.medium),
  ]);
}

export function preheatChatMediaPreprocess({
  imageFiles = [],
  videoFiles = [],
  audioFiles = [],
}: ChatMediaPreprocessInput): void {
  for (const imageFile of imageFiles) {
    runBestEffortPreprocess(preheatImageFile(imageFile), "图片", imageFile);
  }

  for (const videoFile of videoFiles) {
    runBestEffortPreprocess(uploadUtils.preprocessVideoForUpload(videoFile), "视频", videoFile);
  }

  for (const audioFile of audioFiles) {
    // 聊天音频默认不截断（maxDuration=0），与发送阶段保持一致。
    runBestEffortPreprocess(uploadUtils.preprocessAudioForUpload(audioFile, 0), "音频", audioFile);
  }
}

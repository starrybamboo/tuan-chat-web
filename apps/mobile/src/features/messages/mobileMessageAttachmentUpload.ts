import type {
  UploadedFileMessageDraftAsset,
  UploadedImageMessageDraftAsset,
  UploadedSoundMessageDraftAsset,
  UploadedVideoMessageDraftAsset,
} from "@tuanchat/domain/message-draft";

import { FileSystemUploadType, getInfoAsync, uploadAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";
import { Md5 } from "ts-md5";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { MOBILE_MESSAGE_ATTACHMENT_KIND } from "@/features/messages/mobileMessageAttachment";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";

const CHAT_ATTACHMENT_UPLOAD_SCENE = 1 as const;
const IMMUTABLE_UPLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable";

type OssUploadClient = Pick<TuanChat, "ossController">;

type UploadedMobileMessageAttachments = {
  uploadedFiles: UploadedFileMessageDraftAsset[];
  uploadedImages: UploadedImageMessageDraftAsset[];
  uploadedSoundMessage: UploadedSoundMessageDraftAsset | null;
  uploadedVideos: UploadedVideoMessageDraftAsset[];
};

type AttachmentUploadPayload = {
  md5: string;
  size: number;
  webBlob?: Blob;
};

function getFileExtension(fileName: string): string | null {
  const matchedExtension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return matchedExtension?.[1] ?? null;
}

function resolveUploadExtension(attachment: MobileMessageAttachment): string {
  const extensionFromName = getFileExtension(attachment.fileName);
  if (extensionFromName) {
    return extensionFromName;
  }

  const mimeType = attachment.mimeType?.trim().toLowerCase();
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/webm":
      return "webm";
    default:
      return attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE
        ? "jpg"
        : attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO
          ? "mp4"
          : attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO
            ? "audio"
            : "bin";
  }
}

function buildUploadHeaders(mimeType?: string): Record<string, string> {
  return {
    ...(mimeType ? { "Content-Type": mimeType } : {}),
    "Cache-Control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
  };
}

function assertStringHash(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("计算文件哈希失败。");
  }
  return value.trim();
}

function assertPositiveSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("读取文件大小失败。");
  }
  return value;
}

async function readAttachmentWebBlob(attachment: MobileMessageAttachment): Promise<Blob> {
  const response = await fetch(attachment.uri);
  if (!response.ok) {
    throw new Error("读取附件内容失败。");
  }
  return await response.blob();
}

async function resolveWebAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  const webBlob = await readAttachmentWebBlob(attachment);
  const arrayBuffer = await webBlob.arrayBuffer();
  const hash = new Md5()
    .appendByteArray(new Uint8Array(arrayBuffer))
    .end();

  return {
    md5: assertStringHash(hash),
    size: assertPositiveSize(webBlob.size),
    webBlob,
  };
}

async function resolveNativeAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  const info = await getInfoAsync(attachment.uri, { md5: true });
  if (!info.exists) {
    throw new Error("附件文件不存在。");
  }

  return {
    md5: assertStringHash(info.md5),
    size: assertPositiveSize(info.size),
  };
}

async function resolveAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  if (Platform.OS === "web") {
    return await resolveWebAttachmentUploadPayload(attachment);
  }
  return await resolveNativeAttachmentUploadPayload(attachment);
}

async function uploadAttachmentBinary(
  uploadUrl: string,
  attachment: MobileMessageAttachment,
  payload: AttachmentUploadPayload,
): Promise<void> {
  const headers = buildUploadHeaders(attachment.mimeType);

  if (Platform.OS === "web") {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: payload.webBlob,
    });
    if (!response.ok) {
      throw new Error(`文件传输失败: ${response.status}`);
    }
    return;
  }

  const response = await uploadAsync(uploadUrl, attachment.uri, {
    headers,
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error(`文件传输失败: ${response?.status ?? "unknown"}`);
  }
}

export async function uploadMobileMessageAttachments(
  client: OssUploadClient,
  attachments: MobileMessageAttachment[],
): Promise<UploadedMobileMessageAttachments> {
  const uploadedFiles: UploadedFileMessageDraftAsset[] = [];
  const uploadedImages: UploadedImageMessageDraftAsset[] = [];
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];
  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  for (const attachment of attachments) {
    const payload = await resolveAttachmentUploadPayload(attachment);
    const uploadFileName = `${payload.md5}_${payload.size}.${resolveUploadExtension(attachment)}`;

    let uploadUrlResponse;
    try {
      uploadUrlResponse = await client.ossController.getUploadUrl({
        fileName: uploadFileName,
        scene: CHAT_ATTACHMENT_UPLOAD_SCENE,
        dedupCheck: true,
      });
    }
    catch (error) {
      throw new Error(extractOpenApiErrorMessage(error, "获取附件上传地址失败。"));
    }

    const downloadUrl = uploadUrlResponse.data?.downloadUrl?.trim();
    if (!downloadUrl) {
      throw new Error("获取附件下载地址失败。");
    }

    const uploadUrl = uploadUrlResponse.data?.uploadUrl?.trim();
    if (uploadUrl) {
      await uploadAttachmentBinary(uploadUrl, attachment, payload);
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE) {
      if (!(attachment.width && attachment.width > 0) || !(attachment.height && attachment.height > 0)) {
        throw new Error("读取图片尺寸失败。");
      }

      uploadedImages.push({
        url: downloadUrl,
        width: attachment.width,
        height: attachment.height,
        size: payload.size,
        fileName: attachment.fileName,
      });
      continue;
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO) {
      uploadedVideos.push({
        url: downloadUrl,
        fileName: attachment.fileName,
        size: payload.size,
      });
      continue;
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE) {
      uploadedFiles.push({
        url: downloadUrl,
        fileName: attachment.fileName,
        size: payload.size,
      });
      continue;
    }

    uploadedSoundMessage = {
      url: downloadUrl,
      fileName: attachment.fileName,
      size: payload.size,
    };
  }

  return {
    uploadedFiles,
    uploadedImages,
    uploadedSoundMessage,
    uploadedVideos,
  };
}

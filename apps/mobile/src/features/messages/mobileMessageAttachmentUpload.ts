import type {
  UploadedFileMessageDraftAsset,
  UploadedImageMessageDraftAsset,
  UploadedSoundMessageDraftAsset,
  UploadedVideoMessageDraftAsset,
} from "@tuanchat/domain/message-draft";

import { EncodingType, FileSystemUploadType, getInfoAsync, readAsStringAsync, uploadAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { MobileMediaQuality as MediaQuality, MobileMediaType as MediaType } from "@/lib/media-url";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import type { MediaPrepareUploadResponse } from "@tuanchat/openapi-client/models/MediaPrepareUploadResponse";
import type { MediaUploadTarget } from "@tuanchat/openapi-client/models/MediaUploadTarget";

import { MOBILE_MESSAGE_ATTACHMENT_KIND } from "@/features/messages/mobileMessageAttachment";
import { mediaFileUrl } from "@/lib/media-url";
import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";

const CHAT_ATTACHMENT_UPLOAD_SCENE = 1 as const;
const CLIENT_VARIANT_STRATEGY_ORIGINAL_COPY = "originalCopy";

type MediaUploadClient = Pick<TuanChat, "mediaController">;

type UploadedMobileMessageAttachments = {
  uploadedFiles: UploadedFileMessageDraftAsset[];
  uploadedImages: UploadedImageMessageDraftAsset[];
  uploadedSoundMessage: UploadedSoundMessageDraftAsset | null;
  uploadedVideos: UploadedVideoMessageDraftAsset[];
};

type AttachmentUploadPayload = {
  sha256: string;
  size: number;
  webBlob?: Blob;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain",
  zip: "application/zip",
};

const SHA256_K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2,
];

function getFileExtension(fileName: string): string | null {
  const matchedExtension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return matchedExtension?.[1] ?? null;
}

function normalizeMimeType(mimeType: string | null | undefined): string {
  const [head] = String(mimeType ?? "").trim().toLowerCase().split(";", 1);
  return head === "binary/octet-stream" ? "application/octet-stream" : head;
}

function isGenericMimeType(mimeType: string | null | undefined): boolean {
  const normalized = normalizeMimeType(mimeType);
  return normalized === "" || normalized === "application/octet-stream";
}

function inferMimeTypeFromName(fileName: string): string | undefined {
  const extension = getFileExtension(fileName);
  return extension ? MIME_BY_EXTENSION[extension] : undefined;
}

function resolveAttachmentMimeType(attachment: MobileMessageAttachment): string {
  const declared = normalizeMimeType(attachment.mimeType);
  if (!isGenericMimeType(declared)) {
    return declared;
  }

  const inferred = inferMimeTypeFromName(attachment.fileName);
  if (inferred) {
    return inferred;
  }

  switch (attachment.kind) {
    case MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE:
      return "image/jpeg";
    case MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO:
      return "video/mp4";
    case MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO:
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}

function inferMediaTypeFromMimeType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return "document";
  }
  return "other";
}

function normalizeMediaType(mediaType: string | null | undefined, fallbackMimeType: string): MediaType {
  if (mediaType === "image" || mediaType === "audio" || mediaType === "video" || mediaType === "document" || mediaType === "other") {
    return mediaType;
  }
  return inferMediaTypeFromMimeType(fallbackMimeType);
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
  const bytes = new Uint8Array(await webBlob.arrayBuffer());
  return {
    sha256: await calculateSha256(bytes),
    size: assertPositiveSize(webBlob.size),
    webBlob,
  };
}

async function resolveNativeAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  const [info, base64] = await Promise.all([
    getInfoAsync(attachment.uri),
    readAsStringAsync(attachment.uri, { encoding: EncodingType.Base64 }),
  ]);
  if (!info.exists) {
    throw new Error("附件文件不存在。");
  }

  return {
    sha256: await calculateSha256(base64ToBytes(base64)),
    size: assertPositiveSize(info.size),
  };
}

async function resolveAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  if (Platform.OS === "web") {
    return await resolveWebAttachmentUploadPayload(attachment);
  }
  return await resolveNativeAttachmentUploadPayload(attachment);
}

async function calculateSha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digestInput = new Uint8Array(bytes);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput.buffer as ArrayBuffer);
    return bytesToHex(new Uint8Array(digest));
  }
  return sha256Hex(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, "");
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Map(Array.from(alphabet).map((char, index) => [char, index] as const));
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array(Math.floor(normalized.length * 3 / 4) - padding);
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (const char of normalized) {
    if (char === "=") {
      break;
    }
    const value = lookup.get(char);
    if (value == null) {
      throw new Error("附件 base64 内容无效。");
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset++] = (buffer >> bits) & 0xFF;
    }
  }

  return bytes;
}

function rotr(value: number, bits: number) {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Hex(bytes: Uint8Array): string {
  let h0 = 0x6A09E667;
  let h1 = 0xBB67AE85;
  let h2 = 0x3C6EF372;
  let h3 = 0xA54FF53A;
  let h4 = 0x510E527F;
  let h5 = 0x9B05688C;
  let h6 = 0x1F83D9AB;
  let h7 = 0x5BE0CD19;

  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      words[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(words[i - 15], 7) ^ rotr(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map(value => value.toString(16).padStart(8, "0"))
    .join("");
}

async function uploadAttachmentBinary(
  target: MediaUploadTarget,
  attachment: MobileMessageAttachment,
  payload: AttachmentUploadPayload,
): Promise<void> {
  const uploadUrl = target.uploadUrl?.trim();
  if (!uploadUrl) {
    throw new Error("媒体上传目标缺少 uploadUrl。");
  }

  const headers = target.uploadHeaders ?? {};
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

async function prepareMediaUpload(
  client: MediaUploadClient,
  attachment: MobileMessageAttachment,
  payload: AttachmentUploadPayload,
  mimeType: string,
): Promise<MediaPrepareUploadResponse> {
  try {
    const result = await client.mediaController.prepareUpload({
      fileName: attachment.fileName,
      scene: CHAT_ATTACHMENT_UPLOAD_SCENE,
      sha256: payload.sha256,
      sizeBytes: payload.size,
      mimeType,
      contentType: mimeType,
      hasNovelAiMetadata: false,
      metadata: {
        clientVariantStrategy: CLIENT_VARIANT_STRATEGY_ORIGINAL_COPY,
        clientPlatform: Platform.OS,
      } as any,
    });
    if (!result.success || !result.data?.fileId || !result.data.mediaType) {
      throw new Error(result.errMsg || "准备媒体上传失败。");
    }
    return result.data;
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "准备媒体上传失败。"));
  }
}

async function completeMediaUpload(client: MediaUploadClient, sessionId: number): Promise<void> {
  try {
    const result = await client.mediaController.completeUpload(sessionId);
    if (!result.success) {
      throw new Error(result.errMsg || "完成媒体上传失败。");
    }
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "完成媒体上传失败。"));
  }
}

async function uploadAttachmentThroughMediaService(
  client: MediaUploadClient,
  attachment: MobileMessageAttachment,
): Promise<{ fileId: number; mediaType: MediaType; originalUrl: string; previewUrl: string; size: number }> {
  const mimeType = resolveAttachmentMimeType(attachment);
  const payload = await resolveAttachmentUploadPayload(attachment);
  const prepared = await prepareMediaUpload(client, attachment, payload, mimeType);
  const fileId = prepared.fileId!;
  const mediaType = normalizeMediaType(prepared.mediaType, mimeType);

  if (prepared.uploadRequired) {
    if (!prepared.sessionId || !prepared.uploadTargets) {
      throw new Error("媒体上传响应缺少上传会话。");
    }
    await Promise.all(Object.values(prepared.uploadTargets).map(async (target) => {
      await uploadAttachmentBinary(target, attachment, payload);
    }));
    await completeMediaUpload(client, prepared.sessionId);
  }

  return {
    fileId,
    mediaType,
    originalUrl: mediaFileUrl(fileId, mediaType, "original"),
    previewUrl: mediaFileUrl(fileId, mediaType, mediaType === "document" || mediaType === "other" ? "original" : "high"),
    size: payload.size,
  };
}

export async function uploadMobileMessageAttachments(
  client: MediaUploadClient,
  attachments: MobileMessageAttachment[],
): Promise<UploadedMobileMessageAttachments> {
  const uploadedFiles: UploadedFileMessageDraftAsset[] = [];
  const uploadedImages: UploadedImageMessageDraftAsset[] = [];
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];
  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  for (const attachment of attachments) {
    const uploaded = await uploadAttachmentThroughMediaService(client, attachment);

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE) {
      if (!(attachment.width && attachment.width > 0) || !(attachment.height && attachment.height > 0)) {
        throw new Error("读取图片尺寸失败。");
      }

      uploadedImages.push({
        fileId: uploaded.fileId,
        mediaType: uploaded.mediaType,
        originalUrl: uploaded.originalUrl,
        url: uploaded.previewUrl,
        width: attachment.width,
        height: attachment.height,
        size: uploaded.size,
        fileName: attachment.fileName,
      });
      continue;
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO) {
      uploadedVideos.push({
        fileId: uploaded.fileId,
        mediaType: uploaded.mediaType,
        url: uploaded.previewUrl,
        fileName: attachment.fileName,
        size: uploaded.size,
      });
      continue;
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE) {
      uploadedFiles.push({
        fileId: uploaded.fileId,
        mediaType: uploaded.mediaType,
        url: uploaded.originalUrl,
        fileName: attachment.fileName,
        size: uploaded.size,
      });
      continue;
    }

    uploadedSoundMessage = {
      fileId: uploaded.fileId,
      mediaType: uploaded.mediaType,
      url: uploaded.previewUrl,
      fileName: attachment.fileName,
      size: uploaded.size,
    };
  }

  return {
    uploadedFiles,
    uploadedImages,
    uploadedSoundMessage,
    uploadedVideos,
  };
}

import type {
  UploadedFileMessageDraftAsset,
  UploadedImageMessageDraftAsset,
  UploadedSoundMessageDraftAsset,
  UploadedVideoMessageDraftAsset,
} from "@tuanchat/domain/message-draft";
import type { MediaCompleteUploadRequest } from "@tuanchat/openapi-client/models/MediaCompleteUploadRequest";
import type { MediaPrepareUploadResponse } from "@tuanchat/openapi-client/models/MediaPrepareUploadResponse";
import type { MediaUploadTarget } from "@tuanchat/openapi-client/models/MediaUploadTarget";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import { File as ExpoFile } from "expo-file-system";
import { Platform } from "react-native";

import type { MediaType } from "../../lib/media-url";
import type { ImageDerivativeResult } from "../../lib/mobile-image-compress";
import type { MobileMessageAttachment } from "./mobileMessageAttachment";

import { convertGifAttachmentToAnimatedWebp, isGifAttachment } from "../../lib/mobile-gif-to-webp";
import { compressImageToWebp, IMAGE_COMPRESS_PROFILES } from "../../lib/mobile-image-compress";
import { MOBILE_MESSAGE_ATTACHMENT_KIND } from "./mobileMessageAttachment";

const DEFAULT_ATTACHMENT_UPLOAD_SCENE = 1 as const;
const CLIENT_VARIANT_STRATEGY_ORIGINAL_COPY = "originalCopy";

type MediaUploadClient = Pick<TuanChat, "mediaController">;

type UploadedMobileMessageAttachments = {
  failedAttachments: MobileMessageAttachmentUploadFailure[];
  uploadedFiles: UploadedFileMessageDraftAsset[];
  uploadedImages: UploadedImageMessageDraftAsset[];
  uploadedSoundMessage: UploadedSoundMessageDraftAsset | null;
  uploadedVideos: UploadedVideoMessageDraftAsset[];
};

/** 媒体上传业务场景：1 聊天室，2 表情包，3 角色差分，4 仓库图片。 */
export type MobileAttachmentUploadScene = 1 | 2 | 3 | 4;

export type UploadMobileMessageAttachmentsOptions = {
  /** 允许消息附件批次部分成功；头像、地图等有序单图调用默认保持原子失败。 */
  allowPartialSuccess?: boolean;
  /** 上传业务场景：1 聊天室，2 表情包，3 角色差分，4 仓库图片。 */
  scene?: MobileAttachmentUploadScene;
};

export type MobileMessageAttachmentUploadFailure = {
  attachment: MobileMessageAttachment;
  error: Error;
};

type AttachmentUploadPayload = {
  fileName: string;
  mimeType: string;
  sha256: string;
  size: number;
  uri: string;
  webBlob?: Blob;
};

type ResolvedUploadMedia = {
  derivatives: ImageDerivatives | null;
  original: AttachmentUploadPayload;
  uploadedQualities?: string[];
};

type UploadTargetRetryPolicy = {
  baseDelayMs: number;
  maxAttempts: number;
  maxDelayMs: number;
};

type FailedUploadTarget = {
  credentialExpired?: boolean;
  error: string;
  quality: string;
  retryable: boolean;
};

const DEFAULT_UPLOAD_TARGET_RETRY_POLICY: UploadTargetRetryPolicy = {
  baseDelayMs: 300,
  maxAttempts: 3,
  maxDelayMs: 3000,
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
  0x428A2F98,
  0x71374491,
  0xB5C0FBCF,
  0xE9B5DBA5,
  0x3956C25B,
  0x59F111F1,
  0x923F82A4,
  0xAB1C5ED5,
  0xD807AA98,
  0x12835B01,
  0x243185BE,
  0x550C7DC3,
  0x72BE5D74,
  0x80DEB1FE,
  0x9BDC06A7,
  0xC19BF174,
  0xE49B69C1,
  0xEFBE4786,
  0x0FC19DC6,
  0x240CA1CC,
  0x2DE92C6F,
  0x4A7484AA,
  0x5CB0A9DC,
  0x76F988DA,
  0x983E5152,
  0xA831C66D,
  0xB00327C8,
  0xBF597FC7,
  0xC6E00BF3,
  0xD5A79147,
  0x06CA6351,
  0x14292967,
  0x27B70A85,
  0x2E1B2138,
  0x4D2C6DFC,
  0x53380D13,
  0x650A7354,
  0x766A0ABB,
  0x81C2C92E,
  0x92722C85,
  0xA2BFE8A1,
  0xA81A664B,
  0xC24B8B70,
  0xC76C51A3,
  0xD192E819,
  0xD6990624,
  0xF40E3585,
  0x106AA070,
  0x19A4C116,
  0x1E376C08,
  0x2748774C,
  0x34B0BCB5,
  0x391C0CB3,
  0x4ED8AA4A,
  0x5B9CCA4F,
  0x682E6FF3,
  0x748F82EE,
  0x78A5636F,
  0x84C87814,
  0x8CC70208,
  0x90BEFFFA,
  0xA4506CEB,
  0xBEF9A3F7,
  0xC67178F2,
];

class MobileTargetUploadError extends Error {
  public readonly credentialExpired: boolean;
  public readonly retryable: boolean;
  public readonly status?: number;

  constructor(message: string, options: {
    credentialExpired?: boolean;
    retryable?: boolean;
    status?: number;
  } = {}) {
    super(message);
    this.name = "MobileTargetUploadError";
    this.credentialExpired = options.credentialExpired ?? false;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

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

export function resolveAttachmentMimeTypeForUpload(attachment: MobileMessageAttachment): string {
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

async function readWebBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("读取附件内容失败。");
  }
  return await response.blob();
}

async function readAttachmentWebBlob(attachment: MobileMessageAttachment): Promise<Blob> {
  return await readWebBlob(attachment.uri);
}

async function resolveWebAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  const webBlob = await readAttachmentWebBlob(attachment);
  const bytes = new Uint8Array(await webBlob.arrayBuffer());
  const mimeType = resolveAttachmentMimeTypeForUpload(attachment);
  return {
    fileName: attachment.fileName,
    mimeType,
    sha256: await calculateSha256(bytes),
    size: assertPositiveSize(webBlob.size),
    uri: attachment.uri,
    webBlob,
  };
}

async function resolveNativeAttachmentUploadPayload(attachment: MobileMessageAttachment): Promise<AttachmentUploadPayload> {
  const file = new ExpoFile(attachment.uri);
  const [info, bytes] = await Promise.all([
    Promise.resolve(file.info()),
    file.bytes(),
  ]);
  if (!info.exists) {
    throw new Error("附件文件不存在。");
  }

  const mimeType = resolveAttachmentMimeTypeForUpload(attachment);
  return {
    fileName: attachment.fileName,
    mimeType,
    sha256: await calculateSha256(bytes),
    size: assertPositiveSize(info.size),
    uri: attachment.uri,
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
  fileUri: string,
  options: { webBlob?: Blob } = {},
): Promise<void> {
  const uploadUrl = target.uploadUrl?.trim();
  if (!uploadUrl) {
    throw new Error("媒体上传目标缺少 uploadUrl。");
  }

  const headers = target.uploadHeaders ?? {};
  if (Platform.OS === "web") {
    const blob = options.webBlob ?? await readWebBlob(fileUri);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: blob,
    });
    if (!response.ok) {
      throw createUploadStatusError(response.status);
    }
    return;
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: new ExpoFile(fileUri),
  });
  if (!response.ok) {
    throw createUploadStatusError(response.status);
  }
}

function createUploadStatusError(status: number | undefined): MobileTargetUploadError {
  const credentialExpired = status === 401 || status === 403;
  return new MobileTargetUploadError(`文件传输失败: ${status ?? "unknown"}`, {
    credentialExpired,
    retryable: !credentialExpired && isRetryableUploadStatus(status),
    status,
  });
}

function isRetryableUploadStatus(status: number | undefined): boolean {
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

function normalizeTargetUploadError(error: unknown): MobileTargetUploadError {
  if (error instanceof MobileTargetUploadError) {
    return error;
  }
  if (error instanceof Error) {
    return new MobileTargetUploadError(error.message || "文件传输失败", { retryable: false });
  }
  return new MobileTargetUploadError(String(error || "文件传输失败"), { retryable: false });
}

async function sleepRetryDelay(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return;
  }
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

function resolveRetryDelayMs(failedAttempt: number, policy: UploadTargetRetryPolicy): number {
  const exponentialDelay = policy.baseDelayMs * 2 ** Math.max(0, failedAttempt - 1);
  return Math.min(policy.maxDelayMs, exponentialDelay);
}

async function uploadAttachmentBinaryWithRetry(
  target: MediaUploadTarget,
  fileUri: string,
  options: { retryPolicy?: UploadTargetRetryPolicy; webBlob?: Blob } = {},
): Promise<void> {
  const retryPolicy = options.retryPolicy ?? DEFAULT_UPLOAD_TARGET_RETRY_POLICY;
  let lastError: MobileTargetUploadError | null = null;
  for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
    try {
      await uploadAttachmentBinary(target, fileUri, { webBlob: options.webBlob });
      return;
    }
    catch (error) {
      const uploadError = normalizeTargetUploadError(error);
      lastError = uploadError;
      const canRetryOldUrl = uploadError.retryable
        && !uploadError.credentialExpired
        && attempt < retryPolicy.maxAttempts;
      if (!canRetryOldUrl) {
        throw uploadError;
      }
      await sleepRetryDelay(resolveRetryDelayMs(attempt, retryPolicy));
    }
  }
  throw lastError ?? new MobileTargetUploadError("文件传输失败", { retryable: false });
}

async function prepareMediaUpload(
  client: MediaUploadClient,
  payload: AttachmentUploadPayload,
  mimeType: string,
  scene: MobileAttachmentUploadScene,
  useOriginalCopy: boolean,
  uploadedQualities?: string[],
): Promise<MediaPrepareUploadResponse> {
  try {
    const metadata: Record<string, unknown> = { clientPlatform: Platform.OS };
    if (useOriginalCopy) {
      metadata.clientVariantStrategy = CLIENT_VARIANT_STRATEGY_ORIGINAL_COPY;
    }
    if (uploadedQualities?.length) {
      metadata.uploadedQualities = uploadedQualities;
    }
    const result = await client.mediaController.prepareUpload({
      fileName: payload.fileName,
      scene,
      sha256: payload.sha256,
      sizeBytes: payload.size,
      mimeType,
      contentType: mimeType,
      hasNovelAiMetadata: false,
      metadata: metadata as any,
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

async function completeMediaUpload(
  client: MediaUploadClient,
  sessionId: number,
  request: MediaCompleteUploadRequest,
): Promise<void> {
  try {
    const result = await client.mediaController.completeUpload(sessionId, request);
    if (!result.success) {
      throw new Error(result.errMsg || "完成媒体上传失败。");
    }
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "完成媒体上传失败。"));
  }
}

type ImageDerivatives = {
  low: ImageDerivativeResult;
  medium: ImageDerivativeResult;
};

type UploadableTarget = {
  quality: string;
  target: MediaUploadTarget;
  uri: string;
  webBlob?: Blob;
};

async function generateImageDerivatives(uri: string): Promise<ImageDerivatives> {
  const [low, medium] = await Promise.all([
    compressImageToWebp(uri, IMAGE_COMPRESS_PROFILES.low, { quality: "low" }),
    compressImageToWebp(uri, IMAGE_COMPRESS_PROFILES.medium, { quality: "medium" }),
  ]);
  return { low, medium };
}

async function resolveWebImagePayload(result: ImageDerivativeResult): Promise<AttachmentUploadPayload> {
  const webBlob = await readWebBlob(result.uri);
  const bytes = new Uint8Array(await webBlob.arrayBuffer());
  return {
    fileName: result.fileName,
    mimeType: result.mimeType,
    sha256: await calculateSha256(bytes),
    size: assertPositiveSize(webBlob.size),
    uri: result.uri,
    webBlob,
  };
}

async function resolveNativeImagePayload(result: ImageDerivativeResult): Promise<AttachmentUploadPayload> {
  const bytes = await new ExpoFile(result.uri).bytes();
  return {
    fileName: result.fileName,
    mimeType: result.mimeType,
    sha256: await calculateSha256(bytes),
    size: assertPositiveSize(result.size),
    uri: result.uri,
  };
}

async function resolveImagePayload(result: ImageDerivativeResult): Promise<AttachmentUploadPayload> {
  if (Platform.OS === "web") {
    return await resolveWebImagePayload(result);
  }
  return await resolveNativeImagePayload(result);
}

async function resolveUploadMedia(attachment: MobileMessageAttachment): Promise<ResolvedUploadMedia> {
  const mimeType = resolveAttachmentMimeTypeForUpload(attachment);
  const mediaType = inferMediaTypeFromMimeType(mimeType);
  if (mediaType !== "image") {
    return {
      original: await resolveAttachmentUploadPayload(attachment),
      derivatives: null,
    };
  }

  if (isGifAttachment({ fileName: attachment.fileName, mimeType })) {
    const original = await convertGifAttachmentToAnimatedWebp(attachment);
    return {
      original: await resolveImagePayload(original),
      derivatives: null,
      uploadedQualities: ["original"],
    };
  }

  const original = await compressImageToWebp(attachment.uri, IMAGE_COMPRESS_PROFILES.original, {
    fileName: attachment.fileName,
    quality: "original",
  });
  const payloadPromise = resolveImagePayload(original);
  const derivativesPromise = generateImageDerivatives(original.uri);
  const [payload, derivatives] = await Promise.all([payloadPromise, derivativesPromise]);

  return {
    original: payload,
    derivatives,
    uploadedQualities: ["original", "low", "medium"],
  };
}

function resolveUploadableTargets(
  uploadTargets: Record<string, MediaUploadTarget>,
  payload: AttachmentUploadPayload,
  derivatives: ImageDerivatives | null,
  uploadedQualities?: string[],
): UploadableTarget[] {
  const allowedQualities = uploadedQualities?.length ? new Set(uploadedQualities) : null;
  return Object.entries(uploadTargets).flatMap(([quality, target]) => {
    if (allowedQualities && !allowedQualities.has(quality)) {
      return [];
    }
    if (derivatives && (quality === "low" || quality === "medium")) {
      return [{
        quality,
        target,
        uri: derivatives[quality].uri,
      }];
    }
    if (derivatives && quality !== "original") {
      return [];
    }
    return [{
      quality,
      target,
      uri: payload.uri,
      webBlob: payload.webBlob,
    }];
  });
}

function resolvePrimaryTarget(targets: UploadableTarget[]): UploadableTarget {
  return targets.find(target => target.quality === "original") ?? targets[0]!;
}

async function uploadDerivativeTarget(target: UploadableTarget): Promise<
  | { status: "succeeded"; quality: string }
  | { failedTarget: FailedUploadTarget; status: "failed"; quality: string }
> {
  try {
    await uploadAttachmentBinaryWithRetry(target.target, target.uri, { webBlob: target.webBlob });
    return { status: "succeeded", quality: target.quality };
  }
  catch (error) {
    const uploadError = normalizeTargetUploadError(error);
    return {
      status: "failed",
      quality: target.quality,
      failedTarget: {
        credentialExpired: uploadError.credentialExpired || undefined,
        error: uploadError.message,
        quality: target.quality,
        retryable: uploadError.retryable,
      },
    };
  }
}

async function uploadPreparedTargetsAndComplete(
  client: MediaUploadClient,
  sessionId: number,
  targets: UploadableTarget[],
): Promise<void> {
  if (targets.length === 0) {
    throw new Error("媒体上传响应缺少上传目标。");
  }

  const primary = resolvePrimaryTarget(targets);
  await uploadAttachmentBinaryWithRetry(primary.target, primary.uri, { webBlob: primary.webBlob });

  const availableQualities = [primary.quality];
  const pendingQualities: string[] = [];
  const failedQualities: string[] = [];
  const failedTargets: FailedUploadTarget[] = [];
  const derivativeResults = await Promise.all(targets
    .filter(target => target !== primary)
    .map(uploadDerivativeTarget));

  for (const result of derivativeResults) {
    if (result.status === "succeeded") {
      availableQualities.push(result.quality);
      continue;
    }
    failedTargets.push(result.failedTarget);
    if (result.failedTarget.retryable || result.failedTarget.credentialExpired) {
      pendingQualities.push(result.quality);
      continue;
    }
    failedQualities.push(result.quality);
  }

  await completeMediaUpload(client, sessionId, {
    availableQualities,
    pendingQualities,
    failedQualities,
    degraded: pendingQualities.length > 0 || failedQualities.length > 0,
    failedTargets,
  });
}

async function uploadAttachmentThroughMediaService(
  client: MediaUploadClient,
  attachment: MobileMessageAttachment,
  scene: MobileAttachmentUploadScene,
): Promise<{ fileId: number; mediaType: MediaType; size: number }> {
  const { derivatives, original: payload, uploadedQualities } = await resolveUploadMedia(attachment);

  const prepared = await prepareMediaUpload(client, payload, payload.mimeType, scene, false, uploadedQualities);
  const fileId = prepared.fileId!;
  const resolvedMediaType = normalizeMediaType(prepared.mediaType, payload.mimeType);

  if (prepared.uploadRequired) {
    if (!prepared.sessionId || !prepared.uploadTargets) {
      throw new Error("媒体上传响应缺少上传会话。");
    }
    await uploadPreparedTargetsAndComplete(
      client,
      prepared.sessionId,
      resolveUploadableTargets(prepared.uploadTargets, payload, derivatives, uploadedQualities),
    );
  }

  return {
    fileId,
    mediaType: resolvedMediaType,
    size: payload.size,
  };
}

/** 上传移动端消息附件，并返回可直接写入消息草稿的稳定媒体 fileId 元数据。 */
export async function uploadMobileMessageAttachments(
  client: MediaUploadClient,
  attachments: MobileMessageAttachment[],
  options: UploadMobileMessageAttachmentsOptions = {},
): Promise<UploadedMobileMessageAttachments> {
  const failedAttachments: MobileMessageAttachmentUploadFailure[] = [];
  const uploadedFiles: UploadedFileMessageDraftAsset[] = [];
  const uploadedImages: UploadedImageMessageDraftAsset[] = [];
  const uploadedVideos: UploadedVideoMessageDraftAsset[] = [];
  let uploadedSoundMessage: UploadedSoundMessageDraftAsset | null = null;

  const scene = options.scene ?? DEFAULT_ATTACHMENT_UPLOAD_SCENE;
  const uploadedAttachments = await Promise.all(attachments.map(async (attachment) => {
    try {
      return {
        attachment,
        uploaded: await uploadAttachmentThroughMediaService(client, attachment, scene),
      };
    }
    catch (error) {
      if (!options.allowPartialSuccess) {
        throw error;
      }
      failedAttachments.push({
        attachment,
        error: error instanceof Error ? error : new Error(String(error || "附件上传失败。")),
      });
      return null;
    }
  }));

  for (const item of uploadedAttachments) {
    if (!item) {
      continue;
    }
    const { attachment, uploaded } = item;
    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE) {
      if (!(attachment.width && attachment.width > 0) || !(attachment.height && attachment.height > 0)) {
        throw new Error("读取图片尺寸失败。");
      }

      uploadedImages.push({
        fileId: uploaded.fileId,
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
        fileName: attachment.fileName,
        size: uploaded.size,
      });
      continue;
    }

    if (attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE) {
      uploadedFiles.push({
        fileId: uploaded.fileId,
        mediaType: uploaded.mediaType,
        fileName: attachment.fileName,
        size: uploaded.size,
      });
      continue;
    }

    uploadedSoundMessage = {
      fileId: uploaded.fileId,
      fileName: attachment.fileName,
      size: uploaded.size,
    };
  }

  return {
    failedAttachments,
    uploadedFiles,
    uploadedImages,
    uploadedSoundMessage,
    uploadedVideos,
  };
}

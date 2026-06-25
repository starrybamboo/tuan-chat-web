import type { DocumentPickerAsset } from "expo-document-picker";
import type { ImagePickerAsset } from "expo-image-picker";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

export const MOBILE_MESSAGE_ATTACHMENT_KIND = {
  AUDIO: "audio",
  FILE: "file",
  IMAGE: "image",
  VIDEO: "video",
} as const;

export type MobileMessageAttachmentKind = typeof MOBILE_MESSAGE_ATTACHMENT_KIND[keyof typeof MOBILE_MESSAGE_ATTACHMENT_KIND];

export type MobileMessageAttachment = {
  fileName: string;
  height?: number;
  id: string;
  kind: MobileMessageAttachmentKind;
  mimeType?: string;
  size?: number;
  uri: string;
  width?: number;
};

type DocumentLikeAsset = Pick<DocumentPickerAsset, "mimeType" | "name">;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "avi", "mkv", "wmv", "flv", "mpeg", "mpg", "webm"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "webm", "opus", "flac"]);
const EXTENSION_BY_IMAGE_MIME: Record<string, string> = {
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getFileExtension(fileName: string | undefined): string | null {
  if (!fileName) {
    return null;
  }

  const matchedExtension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return matchedExtension?.[1] ?? null;
}

function createMessageAttachmentId(asset: DocumentPickerAsset): string {
  return `${asset.uri}::${asset.name}::${asset.lastModified}`;
}

function createImagePickerAttachmentId(asset: ImagePickerAsset, fileName: string): string {
  return `${asset.assetId ?? asset.uri}::${fileName}::${asset.fileSize ?? 0}`;
}

function getFileNameFromUri(uri: string): string | null {
  const [uriWithoutQuery] = uri.split("?", 1);
  const rawName = uriWithoutQuery?.split("/").filter(Boolean).pop();
  if (!rawName) {
    return null;
  }

  try {
    return decodeURIComponent(rawName);
  }
  catch {
    return rawName;
  }
}

function getImageExtensionFromMimeType(mimeType: string | null | undefined): string {
  const normalized = mimeType?.trim().toLowerCase();
  return normalized ? EXTENSION_BY_IMAGE_MIME[normalized] ?? "jpg" : "jpg";
}

function getImagePickerFileName(asset: ImagePickerAsset, index: number): string {
  const explicitFileName = asset.fileName?.trim();
  if (explicitFileName) {
    return explicitFileName;
  }

  const uriFileName = getFileNameFromUri(asset.uri);
  if (uriFileName && getFileExtension(uriFileName)) {
    return uriFileName;
  }

  return `image-${index + 1}.${getImageExtensionFromMimeType(asset.mimeType)}`;
}

function getPickerMimeTypes(kind: MobileMessageAttachmentKind): string[] {
  switch (kind) {
    case MOBILE_MESSAGE_ATTACHMENT_KIND.FILE:
      return ["*/*"];
    case MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE:
      return ["image/*"];
    case MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO:
      return ["video/*"];
    case MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO:
      return ["audio/*"];
    default:
      return ["*/*"];
  }
}

function getAttachmentKindByExtension(extension: string | null): MobileMessageAttachmentKind | null {
  if (!extension) {
    return null;
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE;
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO;
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO;
  }
  return null;
}

async function resolveImageDimensions(uri: string): Promise<{ height: number; width: number }> {
  return await new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

async function mapPickedAssetToMessageAttachment(
  asset: DocumentPickerAsset,
  expectedKind: MobileMessageAttachmentKind,
): Promise<MobileMessageAttachment> {
  const resolvedKind = expectedKind === MOBILE_MESSAGE_ATTACHMENT_KIND.FILE
    ? MOBILE_MESSAGE_ATTACHMENT_KIND.FILE
    : inferMobileMessageAttachmentKind(asset) ?? expectedKind;
  if (resolvedKind !== expectedKind) {
    throw new Error(`所选文件不是${getMobileMessageAttachmentKindLabel(expectedKind)}。`);
  }

  const nextAttachment: MobileMessageAttachment = {
    id: createMessageAttachmentId(asset),
    kind: resolvedKind,
    uri: asset.uri,
    fileName: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
  };

  if (resolvedKind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE) {
    const { width, height } = await resolveImageDimensions(asset.uri);
    nextAttachment.width = width;
    nextAttachment.height = height;
  }

  return nextAttachment;
}

async function mapPickedImageToMessageAttachment(
  asset: ImagePickerAsset,
  index: number,
): Promise<MobileMessageAttachment> {
  if (asset.type && asset.type !== "image" && asset.type !== "livePhoto") {
    throw new Error("所选文件不是图片。");
  }

  const fileName = getImagePickerFileName(asset, index);
  const width = asset.width > 0 ? asset.width : undefined;
  const height = asset.height > 0 ? asset.height : undefined;
  const dimensions = width && height
    ? { width, height }
    : await resolveImageDimensions(asset.uri);

  return {
    fileName,
    height: dimensions.height,
    id: createImagePickerAttachmentId(asset, fileName),
    kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
    mimeType: asset.mimeType,
    size: asset.fileSize,
    uri: asset.uri,
    width: dimensions.width,
  };
}

export function inferMobileMessageAttachmentKind(asset: DocumentLikeAsset): MobileMessageAttachmentKind | null {
  const mimeType = asset.mimeType?.trim().toLowerCase();
  if (mimeType?.startsWith("image/")) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE;
  }
  if (mimeType?.startsWith("video/")) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO;
  }
  if (mimeType?.startsWith("audio/")) {
    return MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO;
  }

  return getAttachmentKindByExtension(getFileExtension(asset.name)) ?? MOBILE_MESSAGE_ATTACHMENT_KIND.FILE;
}

export function mergePickedMessageAttachments(
  currentAttachments: MobileMessageAttachment[],
  nextAttachments: MobileMessageAttachment[],
): MobileMessageAttachment[] {
  const pickedAudioAttachment = nextAttachments.find((attachment) => {
    return attachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO;
  });
  const currentWithoutReplacedAudio = pickedAudioAttachment
    ? currentAttachments.filter(attachment => attachment.kind !== MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO)
    : currentAttachments;

  const mergedAttachments = [...currentWithoutReplacedAudio];
  nextAttachments.forEach((nextAttachment) => {
    if (nextAttachment.kind === MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO) {
      return;
    }
    mergedAttachments.push(nextAttachment);
  });

  if (pickedAudioAttachment) {
    mergedAttachments.push(pickedAudioAttachment);
  }

  return mergedAttachments;
}

export function formatMobileMessageAttachmentSize(size?: number): string {
  if (!size || size <= 0) {
    return "大小未知";
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

export function getMobileMessageAttachmentKindLabel(kind: MobileMessageAttachmentKind): string {
  switch (kind) {
    case MOBILE_MESSAGE_ATTACHMENT_KIND.FILE:
      return "文件";
    case MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE:
      return "图片";
    case MOBILE_MESSAGE_ATTACHMENT_KIND.VIDEO:
      return "视频";
    case MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO:
      return "音频";
    default:
      return "附件";
  }
}

export async function pickMobileMessageAttachments(
  kind: MobileMessageAttachmentKind,
): Promise<MobileMessageAttachment[]> {
  if (kind === MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE) {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      base64: false,
      exif: false,
      mediaTypes: ["images"],
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      quality: 1,
      selectionLimit: 0,
    });

    if (result.canceled || !result.assets) {
      return [];
    }

    return await Promise.all(result.assets.map(async (asset, index) => {
      return await mapPickedImageToMessageAttachment(asset, index);
    }));
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: getPickerMimeTypes(kind),
    copyToCacheDirectory: true,
    multiple: kind !== MOBILE_MESSAGE_ATTACHMENT_KIND.AUDIO,
    base64: false,
  });

  if (result.canceled || !result.assets) {
    return [];
  }

  return await Promise.all(result.assets.map(async (asset) => {
    return await mapPickedAssetToMessageAttachment(asset, kind);
  }));
}

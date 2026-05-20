import { getInfoAsync } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

export type ImageCompressProfile = {
  maxWidthOrHeight: number;
  maxSizeKB: number;
  quality: number;
};

export const IMAGE_COMPRESS_PROFILES = {
  low: { maxWidthOrHeight: 200, maxSizeKB: 40, quality: 0.72 },
  medium: { maxWidthOrHeight: 512, maxSizeKB: 150, quality: 0.76 },
} as const satisfies Record<string, ImageCompressProfile>;

export type ImageDerivativeResult = {
  uri: string;
  size: number;
};

async function getFileSize(uri: string): Promise<number> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  }
  const info = await getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("压缩后的图片文件不存在。");
  }
  return info.size;
}

export async function compressImageToWebp(
  uri: string,
  profile: ImageCompressProfile,
): Promise<ImageDerivativeResult> {
  const maxRounds = 4;
  let currentQuality = profile.quality;
  let currentMaxDimension = profile.maxWidthOrHeight;

  for (let round = 0; round < maxRounds; round++) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: currentMaxDimension } }],
      { compress: currentQuality, format: ImageManipulator.SaveFormat.WEBP },
    );

    const size = await getFileSize(result.uri);
    if (size <= profile.maxSizeKB * 1024) {
      return { uri: result.uri, size };
    }

    currentQuality *= 0.65;
    currentMaxDimension = Math.round(currentMaxDimension * 0.75);
  }

  const fallback = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: Math.round(profile.maxWidthOrHeight * 0.5) } }],
    { compress: 0.2, format: ImageManipulator.SaveFormat.WEBP },
  );
  const fallbackSize = await getFileSize(fallback.uri);
  return { uri: fallback.uri, size: fallbackSize };
}

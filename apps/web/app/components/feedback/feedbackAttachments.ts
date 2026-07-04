import type { MediaType } from "@/utils/media/imgCompressUtils";
import type { UploadedMediaAssetResult, UploadUtils } from "@/utils/media/UploadUtils";

import { buildFileToken, normalizeMediaContent } from "@/components/common/content/mediaContent";

export type FeedbackAttachmentItem = {
  id: string;
  file: File;
};

export function formatFeedbackAttachmentSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function appendFeedbackAttachmentTokens(
  content: string,
  uploadedAssets: Pick<UploadedMediaAssetResult, "fileId" | "fileName" | "mediaType">[],
) {
  const tokens = uploadedAssets
    .map(asset => buildFileToken(asset.fileId, asset.mediaType as MediaType, asset.fileName))
    .filter(Boolean);
  const normalizedContent = normalizeMediaContent(content);
  if (tokens.length === 0) {
    return normalizedContent;
  }
  if (!normalizedContent) {
    return tokens.join("\n\n");
  }
  return [normalizedContent, ...tokens].join("\n\n");
}

export async function uploadFeedbackAttachments(
  attachments: readonly FeedbackAttachmentItem[],
  uploadUtils: Pick<UploadUtils, "uploadFileAsset">,
) {
  const uploadedAssets: UploadedMediaAssetResult[] = [];
  for (const attachment of attachments) {
    uploadedAssets.push(await uploadUtils.uploadFileAsset(attachment.file));
  }
  return uploadedAssets;
}

import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";

import { imageMediumUrl, imageOriginalUrl } from "@/utils/mediaUrl";

import type { MaterialPackageDraft } from "./materialPackageEditorShared";

import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";

type MaterialPackageEditorDraftSource = {
  name?: string;
  description?: string;
  coverFileId?: number;
  coverUrl?: string;
  originalCoverUrl?: string;
  isPublic?: boolean;
  content?: MaterialPackageContent;
};

export function buildMaterialPackageEditorDraft(
  pkg?: MaterialPackageEditorDraftSource,
): MaterialPackageDraft {
  return {
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    coverFileId: pkg?.coverFileId,
    coverUrl: imageMediumUrl(pkg?.coverFileId) || (pkg?.coverUrl ?? ""),
    originalCoverUrl: imageOriginalUrl(pkg?.coverFileId) || (pkg?.originalCoverUrl ?? pkg?.coverUrl ?? ""),
    isPublic: pkg?.isPublic ?? false,
    content: pkg?.content ?? createEmptyMaterialPackageContent(),
  };
}

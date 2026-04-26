import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";

import type { MaterialPackageDraft } from "./materialPackageEditorShared";

import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";

type MaterialPackageEditorDraftSource = {
  name?: string;
  description?: string;
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
    coverUrl: pkg?.coverUrl ?? "",
    originalCoverUrl: pkg?.originalCoverUrl ?? pkg?.coverUrl ?? "",
    isPublic: pkg?.isPublic ?? false,
    content: pkg?.content ?? createEmptyMaterialPackageContent(),
  };
}

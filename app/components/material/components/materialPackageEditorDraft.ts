import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";

type MaterialPackageEditorDraftSource = {
  name?: string;
  description?: string;
  coverUrl?: string;
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
    isPublic: pkg?.isPublic ?? true,
    content: pkg?.content ?? createEmptyMaterialPackageContent(),
  };
}

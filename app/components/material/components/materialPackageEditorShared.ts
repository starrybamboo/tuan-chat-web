import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";

export type MaterialPackageDraft = {
  name: string;
  description: string;
  coverFileId?: number;
  coverUrl: string;
  originalCoverUrl: string;
  isPublic: boolean;
  content: MaterialPackageContent;
};

export function createEmptyMaterialPackageContent(): MaterialPackageContent {
  return {
    version: 1,
    root: [],
  };
}

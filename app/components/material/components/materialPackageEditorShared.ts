import type { MaterialPackageContent } from "@tuanchat/openapi-client/models/MaterialPackageContent";

export type MaterialPackageDraft = {
  name: string;
  description: string;
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

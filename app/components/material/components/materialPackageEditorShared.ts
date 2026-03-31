import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";

export type MaterialPackageDraft = {
  name: string;
  description: string;
  coverUrl: string;
  isPublic: boolean;
  content: MaterialPackageContent;
};

export function createEmptyMaterialPackageContent(): MaterialPackageContent {
  return {
    version: 1,
    root: [],
  };
}

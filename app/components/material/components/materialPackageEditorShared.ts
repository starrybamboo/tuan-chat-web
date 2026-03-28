import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";

export function createEmptyMaterialPackageContent(): MaterialPackageContent {
  return {
    version: 1,
    root: [],
  };
}

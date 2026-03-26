import type { ExtensionType } from "@blocksuite/affine/store";

import type { EditorDisposer } from "../blocksuiteEditorAssemblyContext";

export type BlocksuiteExtensionBundle<TApi = undefined> = {
  sharedExtensions?: ExtensionType[];
  pageExtensions?: ExtensionType[];
  edgelessExtensions?: ExtensionType[];
  disposers?: EditorDisposer[];
  api?: TApi;
};

export function mergeBlocksuiteExtensionBundles(...bundles: BlocksuiteExtensionBundle<any>[]) {
  return {
    sharedExtensions: bundles.flatMap(bundle => bundle.sharedExtensions ?? []),
    pageExtensions: bundles.flatMap(bundle => bundle.pageExtensions ?? []),
    edgelessExtensions: bundles.flatMap(bundle => bundle.edgelessExtensions ?? []),
    disposers: bundles.flatMap(bundle => bundle.disposers ?? []),
  };
}

import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import { LinkPreviewServiceIdentifier } from "@blocksuite/affine-shared/services";
import {
  DocModeProvider as DocModeProviderToken,
  EditorSettingExtension,
  FeatureFlagService,
  ParseDocUrlExtension,
} from "@blocksuite/affine/shared/services";

import type { BlocksuiteEditorAssemblyContext } from "./blocksuiteEditorAssemblyContext";

import { getEdgelessSpecs, getPageSpecs } from "../manager/view";
import { filterBlocksuiteDocTitlePageSpecs } from "./blocksuiteCoreSpecFilter";
import { mockEditorSetting, mockParseDocUrlService } from "./mockServices";

function applyBlocksuiteCoreRuntimeOverrides(context: BlocksuiteEditorAssemblyContext) {
  context.storeAny
    ?.get?.(FeatureFlagService)
    ?.setFlag?.("enable_advanced_block_visibility", true);

  try {
    const linkPreviewEndpoint = (import.meta as any)?.env?.VITE_BLOCKSUITE_LINK_PREVIEW_ENDPOINT as string | undefined;
    if (linkPreviewEndpoint) {
      context.storeAny?.get?.(LinkPreviewServiceIdentifier)?.setEndpoint?.(linkPreviewEndpoint);
    }
  }
  catch {
    // ignore
  }

  try {
    const imageProxyEndpoint = (import.meta as any)?.env?.VITE_BLOCKSUITE_IMAGE_PROXY_ENDPOINT as string | undefined;
    if (imageProxyEndpoint) {
      context.storeAny?.get?.(ImageProxyService)?.setImageProxyURL?.(imageProxyEndpoint);
    }
  }
  catch {
    // ignore
  }
}

export function createBlocksuiteNoOpLinkPreviewProvider() {
  return {
    endpoint: "",
    setEndpoint: (_endpoint: string) => {
      // noop
    },
    query: async (_url: string, _signal?: AbortSignal) => {
      return {};
    },
  };
}

export function buildBlocksuiteCoreEditorExtensions(
  context: BlocksuiteEditorAssemblyContext,
  params: { disableDocTitle?: boolean },
) {
  applyBlocksuiteCoreRuntimeOverrides(context);

  return {
    pageSpecs: filterBlocksuiteDocTitlePageSpecs(getPageSpecs(), Boolean(params.disableDocTitle)),
    edgelessSpecs: getEdgelessSpecs(),
    sharedExtensions: [
      EditorSettingExtension({
        setting$: mockEditorSetting(),
      }),
      ParseDocUrlExtension(mockParseDocUrlService(context.storeAny?.doc?.workspace ?? (context.workspace as any))),
      {
        setup: (di: any) => {
          di.override(DocModeProviderToken, context.docModeProvider);
          di.override(LinkPreviewServiceIdentifier, createBlocksuiteNoOpLinkPreviewProvider());
        },
      },
    ],
  };
}

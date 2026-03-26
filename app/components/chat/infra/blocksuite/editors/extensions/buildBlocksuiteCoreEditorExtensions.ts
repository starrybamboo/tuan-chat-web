import { ImageProxyService } from "@blocksuite/affine-shared/adapters";
import { LinkPreviewServiceIdentifier } from "@blocksuite/affine-shared/services";
import { DocTitleViewExtension } from "@blocksuite/affine/fragments/doc-title/view";
import {
  DocModeProvider as DocModeProviderToken,
  EditorSettingExtension,
  FeatureFlagService,
  ParseDocUrlExtension,
  QuickSearchExtension,
} from "@blocksuite/affine/shared/services";

import type { BlocksuiteEditorAssemblyContext } from "../blocksuiteEditorAssemblyContext";
import type { BlocksuiteExtensionBundle } from "./types";

import { getEdgelessSpecs, getPageSpecs } from "../../manager/view";
import { mockEditorSetting, mockParseDocUrlService } from "../mockServices";

function normalizeExtensionHint(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isBlocksuiteDocTitleExtension(extension: any) {
  if (!extension)
    return false;

  if (extension === DocTitleViewExtension || extension?.constructor === DocTitleViewExtension)
    return true;

  const name = normalizeExtensionHint(extension?.name ?? (typeof extension === "function" ? extension.name : ""));
  const id = normalizeExtensionHint(extension?.id ?? extension?.key ?? extension?.type ?? extension?.displayName);

  if (name === "affine-doc-title-fragment" || id === "affine-doc-title-fragment")
    return true;

  return (name.includes("doc") && name.includes("title")) || (id.includes("doc") && id.includes("title"));
}

export function filterBlocksuiteDocTitlePageSpecs(pageSpecs: any[], disableDocTitle: boolean) {
  if (!disableDocTitle)
    return pageSpecs;

  return pageSpecs.filter(extension => !isBlocksuiteDocTitleExtension(extension));
}

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

export function buildBlocksuiteQuickSearchExtension(
  context: BlocksuiteEditorAssemblyContext,
): BlocksuiteExtensionBundle {
  return {
    sharedExtensions: [
      QuickSearchExtension({
        openQuickSearch: async () => {
          const picked = await context.quickSearchOverlay.searchDoc({ action: "insert" });
          if (!picked)
            return null;

          if ("docId" in picked) {
            return { docId: picked.docId };
          }

          return { externalUrl: picked.userInput };
        },
      }),
    ],
  };
}

export function buildBlocksuiteCoreEditorExtensions(
  context: BlocksuiteEditorAssemblyContext,
  params: { disableDocTitle?: boolean },
): BlocksuiteExtensionBundle {
  applyBlocksuiteCoreRuntimeOverrides(context);

  return {
    pageExtensions: filterBlocksuiteDocTitlePageSpecs(getPageSpecs(), Boolean(params.disableDocTitle)),
    edgelessExtensions: getEdgelessSpecs(),
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

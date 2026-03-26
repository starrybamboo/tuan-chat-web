import { RefNodeSlotsProvider } from "@blocksuite/affine/inlines/reference";

import type { CreateBlocksuiteEditorParams } from "./blocksuiteEditorTypes";

import {
  addBlocksuiteEditorDisposer,
  createBlocksuiteEditorAssemblyContext,
  disposeBlocksuiteEditorAssemblyContext,
} from "./blocksuiteEditorAssemblyContext";
import { registerBlocksuiteSlashMenuSelectionGuard } from "./blocksuiteSlashMenuSelectionGuard";
import { buildBlocksuiteCoreEditorExtensions } from "./buildBlocksuiteCoreEditorExtensions";
import { buildBlocksuiteEmbedExtensions } from "./buildBlocksuiteEmbedExtensions";
import {
  buildBlocksuiteLinkedDocExtensions,
  handleBlocksuiteDocLinkNavigation,
} from "./buildBlocksuiteLinkedDocExtensions";
import { buildBlocksuiteMentionExtensions } from "./buildBlocksuiteMentionExtensions";
import { buildBlocksuiteQuickSearchExtension } from "./buildBlocksuiteQuickSearchExtension";
import { ensureTCAffineEditorContainerDefined, TC_AFFINE_EDITOR_CONTAINER_TAG } from "./tcAffineEditorContainer";

/**
 * 项目自己的 editor 装配层。
 *
 * 这里只负责三件事：
 * 1. 创建 editor 容器和实例级上下文
 * 2. 调用不同 builder 组装 page / edgeless extensions
 * 3. 绑定最终导航与 scoped style
 */
export function createBlocksuiteEditorClient(params: CreateBlocksuiteEditorParams): HTMLElement {
  const context = createBlocksuiteEditorAssemblyContext(params);
  addBlocksuiteEditorDisposer(context, registerBlocksuiteSlashMenuSelectionGuard());

  ensureTCAffineEditorContainerDefined();

  const editor = document.createElement(TC_AFFINE_EDITOR_CONTAINER_TAG) as unknown as HTMLElement;
  editor.setAttribute("data-tc-blocksuite-root", "");

  (editor as any).__tc_dispose = () => {
    disposeBlocksuiteEditorAssemblyContext(context);
  };

  (editor as any).autofocus = params.autofocus ?? true;
  (editor as any).disableDocTitle = params.disableDocTitle ?? false;
  (editor as any).doc = context.storeAny;

  const core = buildBlocksuiteCoreEditorExtensions(context, {
    disableDocTitle: params.disableDocTitle,
  });
  const mention = buildBlocksuiteMentionExtensions(context);
  const quickSearch = buildBlocksuiteQuickSearchExtension(context);
  const linkedDoc = buildBlocksuiteLinkedDocExtensions(context, {
    getMentionMenuGroup: mention.getMentionMenuGroup,
  });
  const embed = buildBlocksuiteEmbedExtensions();

  const sharedExtensions = [
    ...core.sharedExtensions,
    ...mention.sharedExtensions,
    ...quickSearch.sharedExtensions,
    ...linkedDoc.sharedExtensions,
    ...embed.sharedExtensions,
  ];

  (editor as any).pageSpecs = [
    ...core.pageSpecs,
    ...sharedExtensions,
  ];
  (editor as any).edgelessSpecs = [
    ...core.edgelessSpecs,
    ...embed.edgelessExtensions,
    ...sharedExtensions,
  ];

  try {
    const std = (editor as any).std;
    const refProvider = std?.get?.(RefNodeSlotsProvider);
    refProvider?.docLinkClicked?.subscribe?.(({ pageId: docId }: { pageId: string }) => {
      handleBlocksuiteDocLinkNavigation({
        docId,
        editor: editor as any,
        workspace: params.workspace,
        onNavigateToDoc: params.onNavigateToDoc,
        spaceId: params.spaceId,
      });
    });
  }
  catch {
    // best-effort; doc link jumping is optional when host-side routing is absent
  }

  const style = document.createElement("style");
  style.textContent = `
    [data-tc-blocksuite-root] .affine-reference svg {
      display: inline-block;
      vertical-align: sub;
    }
    [data-tc-blocksuite-root] .affine-reference {
      display: inline-flex;
      align-items: center;
      line-height: 24px;
      margin: 0 2px;
    }
  `;
  editor.appendChild(style);

  return editor;
}

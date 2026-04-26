import type { MenuConfig, PopupTarget } from "@blocksuite/affine/components/context-menu";
import type { SlashMenuActionItem, SlashMenuContext, SlashMenuItem } from "@blocksuite/affine/widgets/slash-menu";
import type { BlockComponent, BlockStdScope } from "@blocksuite/std";

import { focusBlockEnd } from "@blocksuite/affine-shared/commands";
import { menu, popMenu } from "@blocksuite/affine/components/context-menu";
import { BlockSelection, TextSelection } from "@blocksuite/std";
import { html } from "lit";

import { groupBlocksuiteSlashMenuItems, resolveBlocksuiteSlashMenuItems } from "../manager/slashMenuRuntime";

type BlocksuiteEditorElement = HTMLElement & {
  std?: BlockStdScope;
};

const BLOCKSUITE_RIGHT_CLICK_MENU_SEARCH_PLACEHOLDER = "搜索命令";

function createPopupTargetFromPoint(x: number, y: number): PopupTarget {
  const pointRect = new DOMRect(x, y, 0, 0);
  return {
    targetRect: {
      getBoundingClientRect: () => pointRect,
    },
    root: document.body,
    popupStart: () => () => {},
  };
}

function shouldIgnoreBlocksuiteContextMenuTarget(target: Element): boolean {
  return Boolean(target.closest("affine-menu, mobile-menu, affine-slash-menu, inner-slash-menu"));
}

function isRootLikeBlock(block: BlockComponent | null): boolean {
  return block?.model.flavour === "affine:page" || block?.model.flavour === "affine:note";
}

function resolveBlockById(
  editor: BlocksuiteEditorElement,
  blockId: string | null | undefined,
): BlockComponent | null {
  if (!blockId) {
    return null;
  }

  const block = editor.std?.view.getBlock(blockId) as BlockComponent | null;
  return block && !isRootLikeBlock(block) ? block : null;
}

function resolveSelectedContextBlock(
  editor: BlocksuiteEditorElement,
  lastSelectionBlockId: string | null,
): BlockComponent | null {
  const selection = tryGetSelection(editor);
  const selectedBlockId = selection?.find(TextSelection)?.blockId
    ?? selection?.find(BlockSelection)?.blockId
    ?? lastSelectionBlockId;
  return resolveBlockById(editor, selectedBlockId);
}

function resolveDirectContextBlock(
  editor: BlocksuiteEditorElement,
  target: Element,
): BlockComponent | null {
  return resolveBlockById(editor, target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId);
}

function syncSelectionToBlock(std: BlockStdScope, block: BlockComponent) {
  if (block.model.text) {
    std.command.exec(focusBlockEnd, {
      focusBlock: block,
      force: true,
    });
    return;
  }

  std.host.selection.setGroup("note", [
    std.host.selection.create(BlockSelection, {
      blockId: block.blockId,
    }),
  ]);
}

function tryGetSelection(editor: BlocksuiteEditorElement) {
  try {
    return editor.std?.host.selection;
  }
  catch {
    return null;
  }
}

function createSearchText(item: SlashMenuItem): string {
  const searchAlias = item.searchAlias?.join(" ") ?? "";
  return [item.name, item.description ?? "", searchAlias].join(" ").trim();
}

function renderSlashMenuLabel(item: SlashMenuItem) {
  return () => html`
    <div style="display:flex;min-width:0;flex:1;flex-direction:column;">
      <span>${item.name}</span>
      ${item.description
        ? html`
            <span
              style="font-size:12px;line-height:16px;color:var(--affine-text-secondary-color);white-space:normal;"
            >
              ${item.description}
            </span>
          `
        : null}
    </div>
  `;
}

function buildSlashActionMenuItem(item: SlashMenuActionItem, context: SlashMenuContext, block: BlockComponent): MenuConfig {
  return menu.action({
    label: renderSlashMenuLabel(item),
    name: createSearchText(item),
    prefix: item.icon,
    select: () => {
      syncSelectionToBlock(context.std, block);
      item.action(context);
    },
  });
}

function buildSlashContextMenuItems(
  items: SlashMenuItem[],
  context: SlashMenuContext,
  block: BlockComponent,
): MenuConfig[] {
  return groupBlocksuiteSlashMenuItems(items).map(group =>
    menu.group({
      items: group.items.map((item) => {
        if ("subMenu" in item) {
          return menu.subMenu({
            label: renderSlashMenuLabel(item),
            name: createSearchText(item),
            prefix: item.icon,
            options: {
              items: buildSlashContextMenuItems(item.subMenu, context, block),
              search: {
                placeholder: BLOCKSUITE_RIGHT_CLICK_MENU_SEARCH_PLACEHOLDER,
              },
              title: {
                text: item.name,
              },
            },
          });
        }

        return buildSlashActionMenuItem(item, context, block);
      }),
    }),
  );
}

export function installBlocksuiteSlashContextMenu(editor: BlocksuiteEditorElement) {
  let activeMenu: { close: () => void } | null = null;
  let lastSelectionBlockId: string | null = null;
  let selectionSubscription: { unsubscribe: () => void } | null = null;

  const closeActiveMenu = () => {
    activeMenu?.close();
    activeMenu = null;
  };

  const syncLastSelectionBlockId = () => {
    const selection = tryGetSelection(editor);
    const blockId = selection?.find(TextSelection)?.blockId ?? selection?.find(BlockSelection)?.blockId;
    if (blockId) {
      lastSelectionBlockId = blockId;
    }
  };

  const ensureSelectionSubscription = () => {
    if (selectionSubscription) {
      return;
    }

    const selection = tryGetSelection(editor);
    if (!selection) {
      return;
    }

    syncLastSelectionBlockId();
    selectionSubscription = selection.slots.changed.subscribe(() => {
      syncLastSelectionBlockId();
    });
  };

  const onContextMenu = (event: MouseEvent) => {
    const { std } = editor;
    if (!std || !(event.target instanceof Element) || shouldIgnoreBlocksuiteContextMenuTarget(event.target)) {
      return;
    }

    ensureSelectionSubscription();

    const block = resolveSelectedContextBlock(editor, lastSelectionBlockId) ?? resolveDirectContextBlock(editor, event.target);
    if (!block) {
      return;
    }

    const context: SlashMenuContext = {
      model: block.model,
      std,
    };
    const items = resolveBlocksuiteSlashMenuItems(context);
    if (!items.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    syncSelectionToBlock(std, block);
    closeActiveMenu();
    activeMenu = popMenu(createPopupTargetFromPoint(event.clientX, event.clientY), {
      options: {
        items: buildSlashContextMenuItems(items, context, block),
        onClose: () => {
          activeMenu = null;
        },
        search: {
          placeholder: BLOCKSUITE_RIGHT_CLICK_MENU_SEARCH_PLACEHOLDER,
        },
      },
    });
  };

  editor.addEventListener("contextmenu", onContextMenu);

  return () => {
    closeActiveMenu();
    selectionSubscription?.unsubscribe();
    editor.removeEventListener("contextmenu", onContextMenu);
  };
}

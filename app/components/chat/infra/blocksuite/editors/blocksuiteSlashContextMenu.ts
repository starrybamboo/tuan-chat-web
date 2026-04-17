import { menu, popMenu, type MenuConfig, type PopupTarget } from "@blocksuite/affine/components/context-menu";
import { focusBlockEnd } from "@blocksuite/affine-shared/commands";
import { getClosestBlockComponentByPoint } from "@blocksuite/affine-shared/utils";
import type { SlashMenuActionItem, SlashMenuContext, SlashMenuItem } from "@blocksuite/affine/widgets/slash-menu";
import { Point } from "@blocksuite/global/gfx";
import { html } from "lit";

import type { BlockStdScope } from "@blocksuite/std";

import { BlockComponent, BlockSelection } from "@blocksuite/std";
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

function shouldHandleBlocksuiteContextMenuTarget(target: Element): boolean {
  if (target.closest("affine-menu, mobile-menu, affine-slash-menu, inner-slash-menu")) {
    return false;
  }

  return Boolean(
    target.closest(".playground-page-editor-container, .affine-page-root-block-container"),
  );
}

function isRootLikeBlock(block: BlockComponent | null): boolean {
  return block?.model.flavour === "affine:page" || block?.model.flavour === "affine:note";
}

function resolveBlocksuiteContextBlock(
  editor: BlocksuiteEditorElement,
  target: Element,
  event: MouseEvent,
): BlockComponent | null {
  const blockId = target.closest<HTMLElement>("[data-block-id]")?.dataset.blockId;
  const directBlock = blockId ? (editor.std?.view.getBlock(blockId) as BlockComponent | null) : null;
  if (directBlock && !isRootLikeBlock(directBlock)) {
    return directBlock;
  }

  return getClosestBlockComponentByPoint(new Point(event.clientX, event.clientY));
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

  const closeActiveMenu = () => {
    activeMenu?.close();
    activeMenu = null;
  };

  const onContextMenu = (event: MouseEvent) => {
    const { std } = editor;
    if (!std || !(event.target instanceof Element) || !shouldHandleBlocksuiteContextMenuTarget(event.target)) {
      return;
    }

    const block = resolveBlocksuiteContextBlock(editor, event.target, event);
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
    editor.removeEventListener("contextmenu", onContextMenu);
  };
}

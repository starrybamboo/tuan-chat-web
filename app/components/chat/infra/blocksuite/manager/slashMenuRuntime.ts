import type { SlashMenuContext, SlashMenuItem } from "@blocksuite/affine/widgets/slash-menu";

import { SlashMenuExtension } from "@blocksuite/affine/widgets/slash-menu";

import { translateBlocksuiteSlashItem } from "../i18n/blocksuiteUiLocale";
import {
  FILTERED_SURFACE_REF_SLASH_ITEM_NAMES,
  FILTERED_SURFACE_REF_SLASH_ITEM_PREFIXES,
} from "./featureSet";

type SlashMenuGroup = {
  items: SlashMenuItem[];
  key: string;
  name?: string;
};

const FILTERED_SURFACE_REF_SLASH_ITEM_NAME_SET = new Set<string>(FILTERED_SURFACE_REF_SLASH_ITEM_NAMES);

function parseSlashMenuGroup(group: string | undefined) {
  if (!group) {
    return null;
  }

  const matched = group.match(/^(\d+)_([^@]+)@(\d+)$/);
  if (!matched) {
    return null;
  }

  const [, groupIndex, groupName, itemIndex] = matched;
  return {
    groupIndex: Number(groupIndex),
    itemIndex: Number(itemIndex),
    key: `${groupIndex}_${groupName}`,
    name: groupName,
  };
}

function compareSlashMenuItems(a: SlashMenuItem, b: SlashMenuItem) {
  if (a.group === undefined && b.group === undefined) {
    return 0;
  }
  if (a.group === undefined) {
    return -1;
  }
  if (b.group === undefined) {
    return 1;
  }

  const aGroup = parseSlashMenuGroup(a.group);
  const bGroup = parseSlashMenuGroup(b.group);
  if (!aGroup || !bGroup) {
    return 0;
  }

  if (aGroup.groupIndex !== bGroup.groupIndex) {
    return aGroup.groupIndex - bGroup.groupIndex;
  }

  if (aGroup.name !== bGroup.name) {
    return aGroup.name.localeCompare(bGroup.name);
  }

  return aGroup.itemIndex - bGroup.itemIndex;
}

export function shouldHideUnsupportedSlashItem(item: SlashMenuItem): boolean {
  const name = String(item?.name ?? "");
  if (!name) {
    return false;
  }

  if (FILTERED_SURFACE_REF_SLASH_ITEM_NAME_SET.has(name)) {
    return true;
  }

  return FILTERED_SURFACE_REF_SLASH_ITEM_PREFIXES.some(prefix => name.startsWith(prefix));
}

export function transformBlocksuiteSlashItemForUi(item: SlashMenuItem): SlashMenuItem {
  const shouldHide = shouldHideUnsupportedSlashItem(item);
  const localized = translateBlocksuiteSlashItem(item);
  if (!shouldHide) {
    return localized;
  }

  return {
    ...localized,
    when: () => false,
  };
}

function buildBlocksuiteSlashMenuItems(
  items: SlashMenuItem[],
  context: SlashMenuContext,
): SlashMenuItem[] {
  return items
    .map(transformBlocksuiteSlashItemForUi)
    .filter(item => (item.when ? item.when(context) : true))
    .sort(compareSlashMenuItems)
    .map((item) => {
      if ("subMenu" in item) {
        return {
          ...item,
          subMenu: buildBlocksuiteSlashMenuItems(item.subMenu, context),
        };
      }

      return { ...item };
    });
}

export function resolveBlocksuiteSlashMenuItems(context: SlashMenuContext): SlashMenuItem[] {
  const config = context.std.get(SlashMenuExtension).config;
  if (config.disableWhen?.(context)) {
    return [];
  }

  const items = typeof config.items === "function" ? config.items(context) : config.items;
  return buildBlocksuiteSlashMenuItems(items, context);
}

export function groupBlocksuiteSlashMenuItems(items: SlashMenuItem[]): SlashMenuGroup[] {
  const groups: SlashMenuGroup[] = [];

  for (const item of items) {
    const parsedGroup = parseSlashMenuGroup(item.group);
    const key = parsedGroup?.key ?? "__ungrouped__";
    const lastGroup = groups.at(-1);

    if (lastGroup?.key === key) {
      lastGroup.items.push(item);
      continue;
    }

    groups.push({
      items: [item],
      key,
      name: parsedGroup?.name,
    });
  }

  return groups;
}

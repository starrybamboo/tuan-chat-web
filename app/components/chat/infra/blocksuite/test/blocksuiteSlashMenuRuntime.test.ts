import type { SlashMenuContext, SlashMenuItem } from "@blocksuite/affine/widgets/slash-menu";

import { SlashMenuExtension } from "@blocksuite/affine/widgets/slash-menu";
import { describe, expect, it } from "vitest";

import { groupBlocksuiteSlashMenuItems, resolveBlocksuiteSlashMenuItems } from "../manager/slashMenuRuntime";

function createSlashMenuContext(items: SlashMenuItem[]): SlashMenuContext {
  return {
    model: {
      flavour: "affine:paragraph",
      id: "block-1",
      store: {},
    } as never,
    std: {
      get: (token: unknown) => {
        if (token === SlashMenuExtension) {
          return {
            config: {
              items,
            },
          };
        }

        throw new Error(`Unexpected token: ${String(token)}`);
      },
    } as never,
  };
}

describe("blocksuiteSlashMenuRuntime", () => {
  it("会按共享规则过滤并中文化 slash menu 条目", () => {
    const items: SlashMenuItem[] = [
      {
        action: () => {},
        description: "Headings in the largest font.",
        group: "0_Basic@1",
        name: "Heading 1",
      },
      {
        action: () => {},
        group: "1_Content & Media@0",
        name: "Mind Map",
      },
      {
        action: () => {},
        group: "1_Content & Media@1",
        name: "Table View",
        searchAlias: ["database"],
      },
      {
        action: () => {},
        group: "1_Content & Media@2",
        name: "Group: 临时分组",
      },
    ];

    const localized = resolveBlocksuiteSlashMenuItems(createSlashMenuContext(items));

    expect(localized).toHaveLength(2);
    expect(localized.map(item => item.name)).toEqual(["标题 1", "表格视图"]);
    expect(localized[0]?.group).toBe("0_基础@1");
    expect(localized[1]?.group).toBe("1_内容与媒体@1");
    expect(localized[1]?.searchAlias).toContain("database");
  });

  it("会保留 slash menu 的分组顺序并输出中文组名", () => {
    const localized = resolveBlocksuiteSlashMenuItems(createSlashMenuContext([
      {
        action: () => {},
        group: "0_Basic@1",
        name: "Heading 1",
      },
      {
        action: () => {},
        group: "1_Content & Media@0",
        name: "Table View",
      },
      {
        action: () => {},
        group: "1_Content & Media@1",
        name: "Image",
      },
    ]));

    const groups = groupBlocksuiteSlashMenuItems(localized);

    expect(groups.map(group => group.name)).toEqual(["基础", "内容与媒体"]);
    expect(groups[0]?.items.map(item => item.name)).toEqual(["标题 1"]);
    expect(groups[1]?.items.map(item => item.name)).toEqual(["表格视图", "图片"]);
  });
});

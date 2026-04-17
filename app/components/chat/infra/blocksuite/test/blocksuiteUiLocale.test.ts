import { describe, expect, it } from "vitest";

import {
  localizeBlocksuiteFilterableListOptions,
  translateBlocksuiteSlashGroup,
  translateBlocksuiteSlashItem,
  translateBlocksuiteUiText,
} from "../i18n/blocksuiteUiLocale";

describe("blocksuiteUiLocale", () => {
  it("会翻译常见 blocksuite UI 文案", () => {
    expect(translateBlocksuiteUiText("More")).toBe("更多");
    expect(translateBlocksuiteUiText("Fit to screen")).toBe("适应屏幕");
    expect(translateBlocksuiteUiText("Mention Role")).toBe("提及角色");
    expect(translateBlocksuiteUiText("Type '/' for commands")).toBe("输入“/”查看命令");
    expect(translateBlocksuiteUiText("Frame: 房间结构")).toBe("框架：房间结构");
  });

  it("会翻译 slash menu 分组和条目", () => {
    expect(translateBlocksuiteSlashGroup("4_Content & Media@5")).toBe("4_内容与媒体@5");

    const translated = translateBlocksuiteSlashItem({
      name: "Heading 1",
      description: "Headings in the largest font.",
      group: "0_Basic@1",
      searchAlias: ["heading"],
      tooltip: {
        figure: {} as never,
        caption: "Heading #1",
      },
      action: () => {},
    });

    expect(translated.name).toBe("标题 1");
    expect(translated.description).toBe("使用最大的标题字号。");
    expect(translated.group).toBe("0_基础@1");
    expect(translated.tooltip?.caption).toBe("标题 1");
    expect(translated.searchAlias).toContain("heading");
  });

  it("会把 filterable list 的占位符和候选项翻成中文", () => {
    const localized = localizeBlocksuiteFilterableListOptions({
      items: [
        {
          name: "Table View",
          aliases: ["database"],
        },
      ],
    });

    expect(localized.placeholder).toBe("搜索");
    expect(localized.items?.[0]?.name).toBe("表格视图");
    expect(localized.items?.[0]?.aliases).toContain("database");
    expect(localized.items?.[0]?.aliases).toContain("表格视图");
  });
});

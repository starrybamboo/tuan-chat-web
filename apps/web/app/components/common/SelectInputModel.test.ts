import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";

import {
  findBoundaryOptionIndex,
  findRelativeOptionIndex,
  findTypeaheadOptionIndex,
  normalizeSelectOptions,
  normalizeSelectValue,
} from "./SelectInputModel";

describe("normalizeSelectOptions", () => {
  it("保留数值 value，并把禁用标题与 optgroup 转为分组行", () => {
    const options = normalizeSelectOptions([
      createElement("option", { key: "empty", value: "" }, "请选择"),
      createElement("option", { key: "special", disabled: true }, "特殊角色"),
      createElement(Fragment, { key: "fragment" },
        createElement("option", { value: -1 }, "旁白"),
      ),
      createElement("optgroup", { key: "rooms", label: "房间角色" },
        createElement("option", { value: 42 }, "阿斯特拉"),
      ),
      createElement("option", { key: "locked", value: "locked", disabled: true }, "已停用"),
    ]);

    expect(options.map(option => [option.kind, option.value, option.labelText, option.disabled])).toEqual([
      ["option", "", "请选择", false],
      ["group", "", "特殊角色", true],
      ["option", "-1", "旁白", false],
      ["group", "", "房间角色", true],
      ["option", "42", "阿斯特拉", false],
      ["option", "locked", "已停用", true],
    ]);
  });

  it("兼容原生 select 的数值与数组值输入", () => {
    expect(normalizeSelectValue(42)).toBe("42");
    expect(normalizeSelectValue(["space", "public"])).toBe("space");
    expect(normalizeSelectValue(undefined)).toBe("");
  });
});

describe("SelectInput 键盘索引", () => {
  const options = normalizeSelectOptions([
    createElement("option", { key: "private", value: "private" }, "Private"),
    createElement("option", { key: "heading", disabled: true }, "范围"),
    createElement("option", { key: "space", value: "space" }, "Space"),
    createElement("option", { key: "locked", value: "locked", disabled: true }, "Locked"),
    createElement("option", { key: "public", value: "public" }, "Public"),
  ]);

  it("方向键循环时跳过分组和禁用项", () => {
    expect(findBoundaryOptionIndex(options, "first")).toBe(0);
    expect(findBoundaryOptionIndex(options, "last")).toBe(4);
    expect(findRelativeOptionIndex(options, 0, 1)).toBe(2);
    expect(findRelativeOptionIndex(options, 4, 1)).toBe(0);
    expect(findRelativeOptionIndex(options, 0, -1)).toBe(4);
  });

  it("类型搜索从当前项之后循环匹配", () => {
    expect(findTypeaheadOptionIndex(options, "p", 0)).toBe(4);
    expect(findTypeaheadOptionIndex(options, "sp", 4)).toBe(2);
    expect(findTypeaheadOptionIndex(options, "locked", 0)).toBe(-1);
  });
});

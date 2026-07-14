import { describe, expect, it } from "vitest";

import {
  choiceControlClassName,
  fileInputClassName,
  formControlClassName,
  formControlShellClassName,
  rangeInputClassName,
} from "./FormField";

describe("formControlClassName", () => {
  it("默认使用统一的中等尺寸、内容表面和蓝色焦点态", () => {
    const className = formControlClassName();

    expect(className).toContain("min-h-control-default");
    expect(className).toContain("bg-base-100");
    expect(className).toContain("focus:border-info");
    expect(className).toContain("focus:ring-info/20");
  });

  it("支持紧凑控件、弱化表面和业务附加类", () => {
    const className = formControlClassName({
      density: "compact",
      surface: "muted",
      className: "pr-12",
    });

    expect(className).toContain("min-h-control-compact");
    expect(className).toContain("bg-base-200");
    expect(className).toContain("pr-12");
  });

  it("错误态统一切换到错误边框和焦点环", () => {
    const className = formControlClassName({ invalid: true });

    expect(className).toContain("border-error");
    expect(className).toContain("focus:border-error");
    expect(className).toContain("focus:ring-error/20");
    expect(className).not.toContain("focus:border-info");
  });

  it("复选、单选与开关共享两档密度和蓝色状态语义", () => {
    expect(choiceControlClassName({ kind: "checkbox", density: "compact" }))
      .toContain("tc-choice-control tc-checkbox tc-choice-compact");
    expect(choiceControlClassName({ kind: "radio" })).toContain("tc-radio tc-choice-default");
    expect(choiceControlClassName({ kind: "switch" })).toContain("tc-switch tc-choice-default");
  });

  it("滑杆和文件选择器使用项目原语与两档密度", () => {
    expect(rangeInputClassName({ density: "compact" })).toBe("tc-range tc-range-compact");
    expect(rangeInputClassName()).toBe("tc-range tc-range-default");
    expect(fileInputClassName({ density: "compact" })).toBe("tc-file-input tc-file-input-compact");
    expect(fileInputClassName()).toBe("tc-file-input tc-file-input-default");
  });

  it("复合输入使用统一外壳并让内部输入保持透明", () => {
    const shellClassName = formControlShellClassName({ invalid: true });
    expect(shellClassName).toContain("focus-within:ring-error/20");
    expect(shellClassName).toContain("focus-within:ring-1");
    expect(shellClassName).toContain("focus-within:ring-inset");
    const bareClassName = formControlClassName({ appearance: "bare" });
    expect(bareClassName).toContain("border-0");
    expect(bareClassName).toContain("bg-transparent");
    expect(bareClassName).toContain("focus:ring-0");
    expect(bareClassName).toContain("focus:shadow-none");
    expect(bareClassName).toContain("focus-visible:outline-none");
    expect(bareClassName).not.toContain("border-base-300");
  });
});

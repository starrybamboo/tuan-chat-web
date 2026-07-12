import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ControlGroup, controlGroupClassName } from "./ControlGroup";
import { DialogActions } from "./DialogFrame";
import { Disclosure } from "./Disclosure";
import { FieldDescription, FieldError, FieldGroup, FieldLabel } from "./FormField";
import { DropdownMenu, MenuSurface } from "./MenuPopover";
import { Badge, InlineAlert, LoadingIndicator, PongLoader, StatusIndicator } from "./StatusPrimitives";

describe("布局与反馈原语", () => {
  it("告警与加载指示保留可访问语义", () => {
    const alert = renderToStaticMarkup(createElement(InlineAlert, { tone: "error", children: "保存失败" }));
    const loading = renderToStaticMarkup(createElement(LoadingIndicator, { label: "正在保存", size: "compact" }));
    const pong = renderToStaticMarkup(createElement(PongLoader, { label: "正在加载好友" }));
    const indicator = renderToStaticMarkup(createElement(
      StatusIndicator,
      {
        indicator: createElement(Badge, { tone: "info", children: "3" }),
        children: createElement("span", null, "通知"),
      },
    ));

    expect(alert).toContain('role="alert"');
    expect(alert).toContain("border-error/25");
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-label="正在保存"');
    expect(pong).toContain('aria-label="正在加载好友"');
    expect(pong).toContain("▐⠂       ▌");
    expect(pong).toContain("font-mono");
    expect(indicator).toContain("absolute right-0 top-0");
  });

  it("折叠区使用原生 details 与 summary", () => {
    const markup = renderToStaticMarkup(createElement(
      Disclosure,
      { title: "高级设置", defaultOpen: true, children: createElement("p", null, "设置内容") },
    ));

    expect(markup).toContain("<details");
    expect(markup).toContain("<summary");
    expect(markup).toContain("open=\"\"");
  });

  it("组合控件和弹窗操作区统一结构类", () => {
    const group = renderToStaticMarkup(createElement(
      ControlGroup,
      null,
      createElement("button", { type: "button" }, "一"),
      createElement("button", { type: "button" }, "二"),
    ));
    const actions = renderToStaticMarkup(createElement(DialogActions, { bordered: true, children: "操作" }));

    expect(group).toContain('role="group"');
    expect(group).toContain("rounded-l-none");
    expect(actions).toContain("border-t border-base-300");
    expect(controlGroupClassName({ orientation: "vertical" })).toContain("rounded-t-none");
  });

  it("菜单原语提供角色、展开状态和统一表面", () => {
    const surface = renderToStaticMarkup(createElement(
      MenuSurface,
      { as: "ul", ariaLabel: "操作", children: createElement("li", null, "项目") },
    ));
    const dropdown = renderToStaticMarkup(createElement(
      DropdownMenu,
      {
        open: true,
        ariaLabel: "更多操作",
        trigger: createElement("button", { type: "button" as const }, "打开"),
        children: createElement("li", null, createElement("button", { type: "button" }, "删除")),
      },
    ));

    expect(surface).toContain('role="menu"');
    expect(surface).toContain("tc-menu");
    expect(dropdown).toContain('aria-expanded="true"');
    expect(dropdown).toContain("删除");
  });

  it("自定义字段结构保留标签、说明与错误角色", () => {
    const markup = renderToStaticMarkup(createElement(
      FieldGroup,
      null,
      createElement(FieldLabel, { htmlFor: "name" }, "名称"),
      createElement(FieldDescription, null, "请输入名称"),
      createElement(FieldError, null, "名称无效"),
    ));

    expect(markup).toContain('for="name"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("space-y-1.5");
  });
});

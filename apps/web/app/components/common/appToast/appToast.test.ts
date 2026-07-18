import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";

import { appToast, AppToastCard } from "./appToast";

const mocks = vi.hoisted(() => ({
  dismissMock: vi.fn<(toastId?: string) => void>(),
  removeMock: vi.fn<(toastId?: string) => void>(),
  toastBlankMock: vi.fn<(message: unknown, options?: unknown) => unknown>(),
  toastCustomMock: vi.fn<(render: unknown, options?: unknown) => unknown>(),
  toastErrorMock: vi.fn<(message: unknown, options?: unknown) => unknown>(),
  toastLoadingMock: vi.fn<(message: unknown, options?: unknown) => unknown>(),
  toastSuccessMock: vi.fn<(message: unknown, options?: unknown) => unknown>(),
}));

vi.mock("react-hot-toast", () => {
  const toast = Object.assign(mocks.toastBlankMock, {
    custom: mocks.toastCustomMock,
    dismiss: mocks.dismissMock,
    error: mocks.toastErrorMock,
    loading: mocks.toastLoadingMock,
    remove: mocks.removeMock,
    success: mocks.toastSuccessMock,
  });

  return {
    default: toast,
    toast,
    Toaster: () => null,
  };
});

describe("appToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("保留字符串错误 toast 的兼容调用", async () => {
    appToast.error("保存失败", { id: "save-error" });

    expect(mocks.toastErrorMock).toHaveBeenCalledWith("保存失败", expect.objectContaining({
      id: "save-error",
      iconTheme: {
        primary: "var(--color-error)",
        secondary: "var(--color-base-100)",
      },
      style: expect.objectContaining({
        background: "color-mix(in oklab, var(--color-error) 28%, var(--color-base-100))",
        border: "1px solid color-mix(in oklab, var(--color-error) 56%, var(--color-base-100))",
        color: "var(--color-error)",
      }),
    }));
    expect(mocks.toastCustomMock).not.toHaveBeenCalled();
  });

  it("结构化成功 toast 会转为 custom toast 并补默认时长", async () => {
    appToast.success({
      title: "反馈已提交",
      description: "我们会在反馈中心跟进这个问题。",
      terms: [{
        label: "反馈中心",
        description: "集中查看问题处理进度的页面。",
      }],
    }, { id: "feedback-created" });

    expect(mocks.toastCustomMock).toHaveBeenCalledWith(expect.any(Function), {
      id: "feedback-created",
      duration: 6000,
      style: expect.objectContaining({
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
      }),
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    });
  });

  it("结构化错误 toast 使用 alert 语义", async () => {
    appToast.error({
      title: "无法发送旁白",
      description: "旁白只能由主持人发送。",
    });

    expect(mocks.toastCustomMock).toHaveBeenCalledWith(expect.any(Function), {
      duration: 6000,
      style: expect.objectContaining({
        background: "transparent",
        border: "none",
        boxShadow: "none",
      }),
      ariaProps: {
        role: "alert",
        "aria-live": "assertive",
      },
    });
  });

  it("结构化 loading toast 默认保持常驻", async () => {
    appToast.loading({
      title: "正在导出",
      description: "请稍候。",
    });

    expect(mocks.toastCustomMock).toHaveBeenCalledWith(expect.any(Function), {
      duration: Infinity,
      style: expect.objectContaining({
        background: "transparent",
        border: "none",
        boxShadow: "none",
      }),
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    });
  });

  it("结构化 toast 使用不透明的语义色表面", () => {
    const markup = renderToStaticMarkup(createElement(AppToastCard, {
      toastId: "save-error",
      tone: "error",
      content: {
        title: "保存失败",
        description: "请检查网络状态。",
      },
    }));

    expect(markup).toContain("color-mix(in oklab, var(--color-error) 28%, var(--color-base-100))");
    expect(markup).toContain("shadow-xl");
    expect(markup).not.toContain("transparent");
  });

  it.each([
    ["solid", "background:var(--color-error)", "color:var(--color-error-content)"],
    ["soft", "background:color-mix(in oklab, var(--color-error) 28%, var(--color-base-100))", "color:var(--color-error)"],
    ["outline", "background:var(--color-base-100)", "var(--color-error) 60%"],
    ["ghost", "background:var(--color-base-100)", "border:1px solid transparent"],
  ] as const)("结构化 toast 支持 %s 外观且保持不透明", (appearance, surface, detail) => {
    const markup = renderToStaticMarkup(createElement(AppToastCard, {
      toastId: `toast-${appearance}`,
      tone: "error",
      appearance,
      content: { title: appearance },
    }));

    expect(markup).toContain(surface);
    expect(markup).toContain(detail);
  });

  it("消费 appearance 选项而不传给 react-hot-toast", () => {
    appToast.info("信息已更新", { appearance: "outline", id: "info-outline" });

    expect(mocks.toastBlankMock).toHaveBeenCalledWith("信息已更新", expect.objectContaining({
      id: "info-outline",
      style: expect.objectContaining({
        background: "var(--color-base-100)",
        border: "1px solid color-mix(in oklab, var(--color-info) 60%, var(--color-base-100))",
      }),
    }));
    expect(mocks.toastBlankMock.mock.calls[0]?.[1]).not.toHaveProperty("appearance");
  });

  it("带问题引用的 Toast 展示首条建议和帮助入口", () => {
    const markup = renderToStaticMarkup(createElement(AppToastCard, {
      toastId: "space-archived",
      tone: "error",
      content: {
        title: "当前空间已归档",
        description: "普通成员不能继续新增消息。",
        supportIssueId: "space-archived",
      },
    }));

    expect(markup).toContain("联系主持人解除归档");
    expect(markup).toContain('aria-label="查看问题帮助"');
    expect(markup).toContain('title="查看问题帮助"');
  });

  it("不带问题引用的结构化 Toast 不展示帮助入口", () => {
    const markup = renderToStaticMarkup(createElement(AppToastCard, {
      toastId: "plain-error",
      tone: "error",
      content: {
        title: "保存失败",
        description: "请稍后重试。",
      },
    }));

    expect(markup).not.toContain("查看问题帮助");
  });

  it("保留 custom toast 的高级入口", async () => {
    const render = vi.fn<() => null>(() => null);

    appToast.custom(render, { id: "custom-toast" });

    expect(mocks.toastCustomMock).toHaveBeenCalledWith(render, { id: "custom-toast" });
  });
});

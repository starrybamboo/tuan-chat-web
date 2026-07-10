import { vi } from "vitest";

import { appToast } from "./appToast";

const mocks = vi.hoisted(() => ({
  dismissMock: vi.fn(),
  removeMock: vi.fn(),
  toastBlankMock: vi.fn(),
  toastCustomMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastLoadingMock: vi.fn(),
  toastSuccessMock: vi.fn(),
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
        background: "var(--color-base-100)",
        border: "1px solid var(--color-base-300)",
        color: "var(--color-base-content)",
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
        background: "var(--color-base-100)",
        border: "1px solid var(--color-base-300)",
        color: "var(--color-base-content)",
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
        background: "var(--color-base-100)",
        border: "1px solid var(--color-base-300)",
        color: "var(--color-base-content)",
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
        background: "var(--color-base-100)",
        border: "1px solid var(--color-base-300)",
        color: "var(--color-base-content)",
      }),
      ariaProps: {
        role: "status",
        "aria-live": "polite",
      },
    });
  });

  it("保留 custom toast 的高级入口", async () => {
    const render = vi.fn(() => null);

    appToast.custom(render, { id: "custom-toast" });

    expect(mocks.toastCustomMock).toHaveBeenCalledWith(render, { id: "custom-toast" });
  });
});

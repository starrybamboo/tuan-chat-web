import { beforeEach, describe, expect, it, vi } from "vitest";

const alertMock = vi.fn();
const platformState = { OS: "ios" };

vi.mock("react-native", () => ({
  Alert: {
    alert: (...args: unknown[]) => alertMock(...args),
  },
  Platform: platformState,
}));

describe("confirmAction", () => {
  beforeEach(() => {
    alertMock.mockReset();
    platformState.OS = "ios";
  });

  it("在 web 端使用 window.confirm", async () => {
    platformState.OS = "web";
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("window", { confirm: confirmMock });

    const { confirmAction } = await import("./confirm");

    await expect(confirmAction({
      title: "删除消息",
      message: "确定要删除这条消息吗？",
      confirmText: "删除",
      destructive: true,
    })).resolves.toBe(true);

    expect(confirmMock).toHaveBeenCalledWith("删除消息\n\n确定要删除这条消息吗？");
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("在原生端使用 Alert.alert 并解析确认结果", async () => {
    alertMock.mockImplementation((_title, _message, buttons, options) => {
      expect(options?.cancelable).toBe(true);
      buttons[1]?.onPress?.();
    });

    const { confirmAction } = await import("./confirm");

    await expect(confirmAction({
      title: "删除消息",
      message: "确定要删除这条消息吗？",
      confirmText: "删除",
      destructive: true,
    })).resolves.toBe(true);

    expect(alertMock).toHaveBeenCalledTimes(1);
  });
});

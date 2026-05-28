import { describe, expect, it, vi } from "vitest";

import { runCreateRoomPostCreateSteps } from "./createRoomInitialImportFlow";

describe("runCreateRoomPostCreateSteps", () => {
  it("先导入初始对话，再通知创建成功", async () => {
    const importInitialMessages = vi.fn().mockResolvedValue(undefined);
    const onImportError = vi.fn();
    const onImportSuccess = vi.fn();
    const onSuccess = vi.fn();
    const setImportProgress = vi.fn();
    const setSubmitPhase = vi.fn();

    await runCreateRoomPostCreateSteps({
      roomId: 22,
      initialImportMessages: [{ content: "开场" }],
      importInitialMessages,
      onImportError,
      onImportSuccess,
      onSuccess,
      setImportProgress,
      setSubmitPhase,
    });

    expect(setSubmitPhase).toHaveBeenNthCalledWith(1, "importing");
    expect(importInitialMessages).toHaveBeenCalledWith(22, [{ content: "开场" }], expect.any(Function));
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
    expect(onImportError).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(22);
    expect(importInitialMessages.mock.invocationCallOrder[0]).toBeLessThan(onSuccess.mock.invocationCallOrder[0]);
  });

  it("初始对话导入失败也会保留已创建房间", async () => {
    const importError = new Error("导入失败");
    const onImportError = vi.fn();
    const onSuccess = vi.fn();

    await runCreateRoomPostCreateSteps({
      roomId: 22,
      initialImportMessages: [{ content: "开场" }],
      importInitialMessages: vi.fn().mockRejectedValue(importError),
      onImportError,
      onImportSuccess: vi.fn(),
      onSuccess,
      setImportProgress: vi.fn(),
      setSubmitPhase: vi.fn(),
    });

    expect(onImportError).toHaveBeenCalledWith(importError);
    expect(onSuccess).toHaveBeenCalledWith(22);
  });
});

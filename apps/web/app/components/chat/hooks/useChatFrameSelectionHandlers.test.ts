import { describe, expect, it, vi } from "vitest";

import useChatFrameSelectionHandlers from "./useChatFrameSelectionHandlers";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});

function useTestHandlers(overrides?: Partial<Parameters<typeof useChatFrameSelectionHandlers>[0]>) {
  return useChatFrameSelectionHandlers({
    contextMenuMessageId: 2,
    deleteMessage: vi.fn(),
    deleteMessages: vi.fn(),
    selectedMessageIds: new Set([1, 2, 3]),
    exitSelection: vi.fn(),
    closeContextMenu: vi.fn(),
    toggleUseChatBubbleStyle: vi.fn(),
    setReplyMessage: vi.fn(),
    ...overrides,
  });
}

describe("useChatFrameSelectionHandlers", () => {
  it("右键目标属于多选集合时会批量删除所有已选消息", () => {
    const deleteMessage = vi.fn();
    const deleteMessages = vi.fn();
    const exitSelection = vi.fn();
    const handlers = useTestHandlers({
      contextMenuMessageId: 2,
      deleteMessage,
      deleteMessages,
      selectedMessageIds: new Set([1, 2, 3]),
      exitSelection,
    });

    handlers.handleDelete();

    expect(deleteMessages).toHaveBeenCalledWith([1, 2, 3]);
    expect(deleteMessage).not.toHaveBeenCalled();
    expect(exitSelection).toHaveBeenCalledOnce();
  });

  it("右键目标不在多选集合内时只删除当前消息", () => {
    const deleteMessage = vi.fn();
    const deleteMessages = vi.fn();
    const exitSelection = vi.fn();
    const handlers = useTestHandlers({
      contextMenuMessageId: 4,
      deleteMessage,
      deleteMessages,
      selectedMessageIds: new Set([1, 2, 3]),
      exitSelection,
    });

    handlers.handleDelete();

    expect(deleteMessage).toHaveBeenCalledWith(4);
    expect(deleteMessages).not.toHaveBeenCalled();
    expect(exitSelection).not.toHaveBeenCalled();
  });
});

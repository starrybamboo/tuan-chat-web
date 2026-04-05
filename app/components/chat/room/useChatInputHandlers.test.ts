import type { KeyboardEvent } from "react";
import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  toastErrorMock: vi.fn(),
  preheatChatMediaPreprocessMock: vi.fn(),
  applyRoomMediaAnnotationPreferenceToComposerMock: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
    useRef: <T>(value: T) => ({ current: value }),
  };
});

vi.mock("react-hot-toast", () => {
  const toast = Object.assign(mocks.toastMock, {
    error: mocks.toastErrorMock,
  });
  return { toast };
});

vi.mock("@/components/chat/utils/attachmentPreprocess", () => ({
  preheatChatMediaPreprocess: mocks.preheatChatMediaPreprocessMock,
}));

vi.mock("@/components/chat/utils/mediaAnnotationPreference", () => ({
  applyRoomMediaAnnotationPreferenceToComposer: mocks.applyRoomMediaAnnotationPreferenceToComposerMock,
}));

import useChatInputHandlers from "./useChatInputHandlers";

function createKeyboardEvent(key: string, options?: { shiftKey?: boolean }) {
  return {
    key,
    shiftKey: options?.shiftKey ?? false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

describe("useChatInputHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createHook() {
    const handleMessageSubmit = vi.fn();
    const hook = useChatInputHandlers({
      atMentionRef: { current: null },
      handleMessageSubmit,
      handleQuickRewrite: vi.fn(),
      insertLLMMessageIntoText: vi.fn(),
      llmMessageRef: { current: "" },
      originalTextBeforeRewriteRef: { current: "" },
      roomId: 1,
      setInputText: vi.fn(),
      setLLMMessage: vi.fn(),
    });
    return {
      handleMessageSubmit,
      ...hook,
    };
  }

  it("组合输入期间点击发送会在 compositionend 后再提交", async () => {
    const { handleMessageSubmit, onCompositionStart, onCompositionEnd, requestMessageSubmit } = createHook();

    onCompositionStart();
    requestMessageSubmit();

    expect(handleMessageSubmit).not.toHaveBeenCalled();

    onCompositionEnd();
    await Promise.resolve();

    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });

  it("组合输入期间重复点击发送只会补提一次", async () => {
    const { handleMessageSubmit, onCompositionStart, onCompositionEnd, requestMessageSubmit } = createHook();

    onCompositionStart();
    requestMessageSubmit();
    requestMessageSubmit();

    onCompositionEnd();
    await Promise.resolve();

    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });

  it("非组合输入时按 Enter 会立即提交", () => {
    const { handleKeyDown, handleMessageSubmit } = createHook();

    const event = createKeyboardEvent("Enter");
    handleKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });
});

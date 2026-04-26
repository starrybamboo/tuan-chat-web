import type { KeyboardEvent } from "react";

import { vi } from "vitest";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";

import useChatInputHandlers from "./useChatInputHandlers";

const mocks = vi.hoisted(() => ({
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
  const toast = Object.assign(vi.fn(), {
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
    useChatComposerStore.getState().reset();
  });

  function useTestHook() {
    const handleMessageSubmit = vi.fn();
    const hook = useChatInputHandlers({
      atMentionRef: { current: null },
      handleMessageSubmit,
      roomId: 1,
    });
    return {
      handleMessageSubmit,
      ...hook,
    };
  }

  it("组合输入期间点击发送会在 compositionend 后再提交", async () => {
    const { handleMessageSubmit, onCompositionStart, onCompositionEnd, requestMessageSubmit } = useTestHook();

    onCompositionStart();
    requestMessageSubmit();

    expect(handleMessageSubmit).not.toHaveBeenCalled();

    onCompositionEnd();
    await Promise.resolve();

    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });

  it("组合输入期间重复点击发送只会补提一次", async () => {
    const { handleMessageSubmit, onCompositionStart, onCompositionEnd, requestMessageSubmit } = useTestHook();

    onCompositionStart();
    requestMessageSubmit();
    requestMessageSubmit();

    onCompositionEnd();
    await Promise.resolve();

    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });

  it("非组合输入时按 Enter 会立即提交", () => {
    const { handleKeyDown, handleMessageSubmit } = useTestHook();

    const event = createKeyboardEvent("Enter");
    handleKeyDown(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(handleMessageSubmit).toHaveBeenCalledTimes(1);
  });

  it("按 Tab 时不再拦截默认行为", () => {
    const { handleKeyDown, handleMessageSubmit } = useTestHook();

    const event = createKeyboardEvent("Tab");
    handleKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(handleMessageSubmit).not.toHaveBeenCalled();
  });

  it("粘贴普通文件时会提示不支持且不会写入草稿", () => {
    const { handlePasteFiles } = useTestHook();
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });

    handlePasteFiles([pdfFile]);

    expect(useChatComposerStore.getState().fileAttachments).toEqual([]);
    expect(useChatComposerStore.getState().imgFiles).toEqual([]);
    expect(useChatComposerStore.getState().audioFile).toBeNull();
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("暂不支持发送文件");
    expect(mocks.preheatChatMediaPreprocessMock).not.toHaveBeenCalled();
  });

  it("粘贴视频和普通文件时只保留视频附件", () => {
    const { handlePasteFiles } = useTestHook();
    const videoFile = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });

    handlePasteFiles([videoFile, pdfFile]);

    expect(useChatComposerStore.getState().fileAttachments).toEqual([videoFile]);
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("已忽略1个文件，当前仅支持图片、视频、音频");
    expect(mocks.preheatChatMediaPreprocessMock).toHaveBeenCalledWith({
      imageFiles: [],
      videoFiles: [videoFile],
      audioFiles: [],
    });
  });
});

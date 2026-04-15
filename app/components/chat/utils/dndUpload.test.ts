import { vi } from "vitest";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";

const mocks = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  preheatChatMediaPreprocessMock: vi.fn(),
  applyRoomMediaAnnotationPreferenceToComposerMock: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccessMock,
    error: mocks.toastErrorMock,
  },
}));

vi.mock("@/components/chat/utils/attachmentPreprocess", () => ({
  preheatChatMediaPreprocess: mocks.preheatChatMediaPreprocessMock,
}));

vi.mock("@/components/chat/utils/mediaAnnotationPreference", () => ({
  applyRoomMediaAnnotationPreferenceToComposer: mocks.applyRoomMediaAnnotationPreferenceToComposerMock,
}));

import { addDroppedFilesToComposer, getFileDragOverlayText } from "./dndUpload";

function createDataTransfer(files: File[]): DataTransfer {
  return {
    types: ["Files"],
    files: files as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  } as unknown as DataTransfer;
}

describe("dndUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatComposerStore.getState().reset();
  });

  it("仅拖入普通文件时会提示不支持", () => {
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });
    const dataTransfer = createDataTransfer([pdfFile]);

    expect(getFileDragOverlayText(dataTransfer)).toBe("暂不支持发送文件");
    expect(addDroppedFilesToComposer(dataTransfer, 1)).toBe(true);
    expect(useChatComposerStore.getState().fileAttachments).toEqual([]);
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("暂不支持发送文件");
    expect(mocks.toastSuccessMock).not.toHaveBeenCalled();
    expect(mocks.preheatChatMediaPreprocessMock).not.toHaveBeenCalled();
  });

  it("混合拖入视频和普通文件时只加入视频", () => {
    const videoFile = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const pdfFile = new File(["pdf"], "notes.pdf", { type: "application/pdf" });
    const dataTransfer = createDataTransfer([videoFile, pdfFile]);

    expect(getFileDragOverlayText(dataTransfer)).toBe("松开添加视频");
    expect(addDroppedFilesToComposer(dataTransfer, 1)).toBe(true);
    expect(useChatComposerStore.getState().fileAttachments).toEqual([videoFile]);
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("已忽略1个文件，当前仅支持图片、视频、音频");
    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("已添加1个视频");
    expect(mocks.preheatChatMediaPreprocessMock).toHaveBeenCalledWith({
      imageFiles: [],
      videoFiles: [videoFile],
      audioFiles: [],
    });
  });
});

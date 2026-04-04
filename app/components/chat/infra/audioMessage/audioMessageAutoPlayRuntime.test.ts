import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueFromWsMock: vi.fn(),
  enqueueFromLocalSendMock: vi.fn(),
  requestPlayBgmMessageWithUrlMock: vi.fn(),
}));

vi.mock("@/components/chat/infra/audioMessage/audioMessageBgmCoordinator", () => ({
  requestPlayBgmMessageWithUrl: mocks.requestPlayBgmMessageWithUrlMock,
}));

vi.mock("@/components/chat/stores/audioMessageAutoPlayStore", () => ({
  useAudioMessageAutoPlayStore: {
    getState: () => ({
      enqueueFromWs: mocks.enqueueFromWsMock,
      enqueueFromLocalSend: mocks.enqueueFromLocalSendMock,
    }),
  },
}));

import { triggerAudioAutoPlay } from "./audioMessageAutoPlayRuntime";

describe("audioMessageAutoPlayRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("WS 未入队时不应 seed BGM 播放", () => {
    mocks.enqueueFromWsMock.mockReturnValue(undefined);

    const result = triggerAudioAutoPlay({
      source: "ws",
      roomId: 1,
      messageId: 10,
      purpose: "bgm",
      url: "https://static.example.com/bgm.mp3",
    });

    expect(result).toBeUndefined();
    expect(mocks.requestPlayBgmMessageWithUrlMock).not.toHaveBeenCalled();
  });

  it("WS 入队成功时才 seed BGM 播放", () => {
    const event = {
      roomId: 1,
      messageId: 10,
      purpose: "bgm",
      sequence: 1,
      createdAtMs: 1,
    };
    mocks.enqueueFromWsMock.mockReturnValue(event);

    const result = triggerAudioAutoPlay({
      source: "ws",
      roomId: 1,
      messageId: 10,
      purpose: "bgm",
      url: "https://static.example.com/bgm.mp3",
    });

    expect(result).toEqual(event);
    expect(mocks.requestPlayBgmMessageWithUrlMock).toHaveBeenCalledWith(
      1,
      10,
      "https://static.example.com/bgm.mp3",
    );
  });

  it("本地发送音效只入队，不触发 BGM seed 播放", () => {
    const event = {
      roomId: 2,
      messageId: 20,
      purpose: "se",
      sequence: 2,
      createdAtMs: 2,
    };
    mocks.enqueueFromLocalSendMock.mockReturnValue(event);

    const result = triggerAudioAutoPlay({
      source: "localSend",
      roomId: 2,
      messageId: 20,
      purpose: "se",
      url: "https://static.example.com/se.mp3",
    });

    expect(result).toEqual(event);
    expect(mocks.requestPlayBgmMessageWithUrlMock).not.toHaveBeenCalled();
  });
});

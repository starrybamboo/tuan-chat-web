import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockAudioElement = {
  preload: string;
  loop: boolean;
  crossOrigin: string;
  src: string;
  volume: number;
  currentTime: number;
  paused: boolean;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
};

function createMockAudioElement(): MockAudioElement {
  const audio: MockAudioElement = {
    preload: "",
    loop: false,
    crossOrigin: "",
    src: "",
    volume: 1,
    currentTime: 0,
    paused: true,
    play: vi.fn(async function (this: MockAudioElement) {
      this.paused = false;
    }),
    pause: vi.fn(function (this: MockAudioElement) {
      this.paused = true;
    }),
    load: vi.fn(),
  };
  return audio;
}

describe("audioMessageBgmCoordinator", () => {
  const createdAudios: MockAudioElement[] = [];
  let frameTime = 0;

  beforeEach(() => {
    createdAudios.length = 0;
    frameTime = 0;
    vi.resetModules();
    vi.stubGlobal("Audio", vi.fn(() => {
      const audio = createMockAudioElement();
      createdAudios.push(audio);
      return audio;
    }));
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frameTime += 100;
      queueMicrotask(() => callback(frameTime));
      return 1;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("可见播放器开始真实播放后才接管同一条消息的 fallback BGM 播放", async () => {
    const coordinator = await import("./audioMessageBgmCoordinator");
    const roomId = 12277;
    const messageId = 179547;

    const fallbackStarted = await coordinator.requestPlayBgmMessageWithUrl(
      roomId,
      messageId,
      "https://example.com/test-bgm.webm",
    );

    expect(fallbackStarted).toBe(true);
    expect(createdAudios).toHaveLength(1);
    const fallbackAudio = createdAudios[0];
    expect(fallbackAudio.play).toHaveBeenCalledTimes(1);
    expect(fallbackAudio.paused).toBe(false);

    fallbackAudio.currentTime = 4.2;

    let visualPlaying = false;
    let visualVolumeRatio = 1;
    let visualCurrentTime = 0;

    const visualController = {
      id: coordinator.createBgmControllerId(roomId, messageId),
      roomId,
      messageId,
      play: vi.fn(async () => {
        queueMicrotask(() => {
          visualPlaying = true;
        });
        return true;
      }),
      playFromStart: vi.fn(async () => {
        visualCurrentTime = 0;
        queueMicrotask(() => {
          visualPlaying = true;
        });
        return true;
      }),
      stop: vi.fn(() => {
        visualPlaying = false;
      }),
      isPlaying: vi.fn(() => visualPlaying),
      getVolumeRatio: vi.fn(() => visualVolumeRatio),
      setVolumeRatio: vi.fn((value: number) => {
        visualVolumeRatio = value;
      }),
      getCurrentTimeSec: vi.fn(() => visualCurrentTime),
      setCurrentTimeSec: vi.fn((value: number) => {
        visualCurrentTime = value;
      }),
    };

    coordinator.registerBgmMessageController(visualController);
    const handedOver = await coordinator.requestPlayBgmMessage(roomId, messageId);

    expect(handedOver).toBe(true);
    expect(visualController.play).toHaveBeenCalledTimes(1);
    expect(visualController.setVolumeRatio).toHaveBeenCalledWith(1);
    expect(visualController.setCurrentTimeSec).toHaveBeenCalledWith(4.2);
    expect(fallbackAudio.pause).toHaveBeenCalledTimes(1);
    expect(coordinator.isBgmMessagePlaying(roomId, messageId)).toBe(true);
  });

  it("可见播放器未真正开始播放时保留 fallback BGM", async () => {
    const coordinator = await import("./audioMessageBgmCoordinator");
    const roomId = 12277;
    const messageId = 179548;

    const fallbackStarted = await coordinator.requestPlayBgmMessageWithUrl(
      roomId,
      messageId,
      "https://example.com/test-bgm-2.webm",
    );

    expect(fallbackStarted).toBe(true);
    expect(createdAudios).toHaveLength(1);
    const fallbackAudio = createdAudios[0];
    expect(fallbackAudio.paused).toBe(false);

    let visualPlaying = false;
    const visualController = {
      id: coordinator.createBgmControllerId(roomId, messageId),
      roomId,
      messageId,
      play: vi.fn(async () => true),
      playFromStart: vi.fn(async () => {
        visualPlaying = false;
        return true;
      }),
      stop: vi.fn(() => {
        visualPlaying = false;
      }),
      isPlaying: vi.fn(() => visualPlaying),
      getVolumeRatio: vi.fn(() => 1),
      setVolumeRatio: vi.fn(),
      getCurrentTimeSec: vi.fn(() => 0),
      setCurrentTimeSec: vi.fn(),
    };

    coordinator.registerBgmMessageController(visualController);
    const handedOver = await coordinator.requestPlayBgmMessage(roomId, messageId);

    expect(handedOver).toBe(false);
    expect(visualController.stop).toHaveBeenCalledTimes(1);
    expect(fallbackAudio.pause).not.toHaveBeenCalled();
    expect(fallbackAudio.paused).toBe(false);
    expect(coordinator.isBgmMessagePlaying(roomId, messageId)).toBe(true);
  });
});

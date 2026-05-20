import { describe, expect, it, vi } from "vitest";

import {
  activateMobileAudioPlayback,
  deactivateMobileAudioPlayback,
  getActiveMobileAudioPlaybackId,
} from "./mobileAudioPlaybackCoordinator";

describe("mobileAudioPlaybackCoordinator", () => {
  it("启动新音频时暂停旧音频", () => {
    const firstPause = vi.fn();
    const secondPause = vi.fn();

    activateMobileAudioPlayback({ id: "first", pause: firstPause });
    activateMobileAudioPlayback({ id: "second", pause: secondPause });

    expect(firstPause).toHaveBeenCalledTimes(1);
    expect(secondPause).not.toHaveBeenCalled();
    expect(getActiveMobileAudioPlaybackId()).toBe("second");
  });

  it("重复激活同一音频不会暂停自己", () => {
    const pause = vi.fn();

    activateMobileAudioPlayback({ id: "same", pause });
    activateMobileAudioPlayback({ id: "same", pause });

    expect(pause).not.toHaveBeenCalled();
    expect(getActiveMobileAudioPlaybackId()).toBe("same");
  });

  it("只有当前活跃音频可以清空活跃状态", () => {
    activateMobileAudioPlayback({ id: "current", pause: vi.fn() });

    deactivateMobileAudioPlayback("other");
    expect(getActiveMobileAudioPlaybackId()).toBe("current");

    deactivateMobileAudioPlayback("current");
    expect(getActiveMobileAudioPlaybackId()).toBeNull();
  });
});

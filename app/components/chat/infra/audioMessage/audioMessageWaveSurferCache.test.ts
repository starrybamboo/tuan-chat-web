import { describe, expect, it, vi } from "vitest";

import { loadAudioMessageWaveSurferModule } from "./audioMessageWaveSurferCache";

describe("loadAudioMessageWaveSurferModule", () => {
  it("uses the optimized dependency import when it succeeds", async () => {
    const optimizedModule = { default: { create: vi.fn() } };
    const optimized = vi.fn().mockResolvedValue(optimizedModule);
    const devUrl = vi.fn();

    await expect(loadAudioMessageWaveSurferModule({ optimized, devUrl })).resolves.toBe(optimizedModule);
    expect(devUrl).not.toHaveBeenCalled();
  });

  it("falls back to the direct dev ESM URL when Vite's optimized dependency URL is stale", async () => {
    const devModule = { default: { create: vi.fn() } };
    const optimized = vi.fn().mockRejectedValue(new TypeError(
      "Failed to fetch dynamically imported module: http://localhost:5177/node_modules/.vite-tuan-chat-web/deps/wavesurfer__js.js?v=ff65493e",
    ));
    const devUrl = vi.fn().mockResolvedValue(devModule);

    await expect(loadAudioMessageWaveSurferModule({ optimized, devUrl })).resolves.toBe(devModule);
    expect(devUrl).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-import failures", async () => {
    const error = new Error("wavesurfer init failed");
    const optimized = vi.fn().mockRejectedValue(error);
    const devUrl = vi.fn();

    await expect(loadAudioMessageWaveSurferModule({ optimized, devUrl })).rejects.toBe(error);
    expect(devUrl).not.toHaveBeenCalled();
  });
});

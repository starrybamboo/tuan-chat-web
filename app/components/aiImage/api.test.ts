import { afterEach, describe, expect, it, vi } from "vitest";

import { augmentNovelImageViaProxy, buildNovelAiDirectorToolPayload, generateNovelImageViaProxy } from "@/components/aiImage/api";

describe("aiImage api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a colorize payload with prompt and defry", () => {
    expect(buildNovelAiDirectorToolPayload({
      requestType: "colorize",
      imageBase64: "abc123",
      width: 1024,
      height: 768,
      prompt: " warm sunset palette ",
      defry: 2,
    })).toEqual({
      req_type: "colorize",
      use_new_shared_trial: true,
      image: "abc123",
      width: 1024,
      height: 768,
      prompt: "warm sunset palette",
      defry: 2,
    });
  });

  it("includes emotion-specific fields for emotion requests", () => {
    expect(buildNovelAiDirectorToolPayload({
      requestType: "emotion",
      imageBase64: "emotion-base64",
      width: 832,
      height: 1216,
      prompt: "soft smile",
      defry: 4,
      emotion: "happy",
    })).toEqual({
      req_type: "emotion",
      use_new_shared_trial: true,
      image: "emotion-base64",
      width: 832,
      height: 1216,
      prompt: "soft smile",
      defry: 4,
      emotion: "happy",
    });
  });

  it("posts director tool requests to the augment-image proxy", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(pngBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await augmentNovelImageViaProxy({
      requestType: "lineart",
      imageBase64: "image-base64",
      width: 1024,
      height: 1024,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toMatch(/\/api\/novelapi\/ai\/augment-image$/);
    expect(requestInit).toEqual(expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
        "Accept": "application/octet-stream",
      }),
    }));

    expect(JSON.parse(String(requestInit?.body))).toEqual({
      req_type: "lineart",
      use_new_shared_trial: true,
      image: "image-base64",
      width: 1024,
      height: 1024,
    });
    expect(result.dataUrls).toHaveLength(1);
    expect(result.dataUrls[0]).toMatch(/^data:image\/png;base64,/);
  });

  it("does not force add_original_image for infill requests", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn().mockResolvedValue(new Response(pngBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await generateNovelImageViaProxy({
      mode: "infill",
      sourceImageBase64: "source-base64",
      maskBase64: "mask-base64",
      strength: 0.7,
      noise: 0.2,
      prompt: "repair face",
      negativePrompt: "",
      model: "nai-diffusion-4-5-curated",
      width: 1024,
      height: 1024,
      imageCount: 1,
      steps: 23,
      scale: 5,
      sampler: "k_euler_a",
      noiseSchedule: "karras",
      cfgRescale: 0,
      ucPreset: 0,
      smea: false,
      smeaDyn: false,
      qualityToggle: false,
      dynamicThresholding: false,
      seed: 1,
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const requestBody = JSON.parse(String(requestInit?.body));
    expect(requestBody.action).toBe("infill");
    expect(requestBody.parameters.image).toBe("source-base64");
    expect(requestBody.parameters.mask).toBe("mask-base64");
    expect(requestBody.parameters.noise).toBe(0.2);
    expect(requestBody.parameters.inpaintImg2ImgStrength).toBe(0.7);
    expect(requestBody.parameters.add_original_image).toBeUndefined();
  });
});

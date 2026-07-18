import { afterEach, describe, expect, it, vi } from "vitest";

import {
  augmentNovelImageViaProxy,
  buildNovelAiDirectorToolPayload,
  generateNovelImageViaProxy,
  resolveNovelAiCfgDelaySigma,
} from "@/components/aiImage/api";

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

  it("posts director tool requests to the augment-image proxy", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response(pngBytes, {
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
    expect(requestInit?.method).toBe("POST");
    const requestHeaders = new Headers(requestInit?.headers);
    expect(requestHeaders.get("Content-Type")).toBe("application/json");
    expect(requestHeaders.get("Accept")).toBe("application/octet-stream");

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

  it("aligns infill requests with the official request structure", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response(pngBytes, {
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
      strength: 1,
      noise: 0,
      prompt: "repair face",
      negativePrompt: "",
      width: 832,
      height: 1216,
      imageCount: 1,
      steps: 23,
      scale: 5,
      sampler: "k_euler_a",
      noiseSchedule: "karras",
      cfgRescale: 0,
      ucPreset: 0,
      qualityToggle: false,
      cfgDelay: true,
      dynamicThresholding: false,
      overlayOriginalImage: false,
      seed: 1,
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(requestInit?.method).toBe("POST");
    const requestHeaders = new Headers(requestInit?.headers);
    expect(requestHeaders.get("Accept")).toBe("application/octet-stream");
    expect(requestHeaders.get("Content-Type")).toBeNull();
    expect(requestInit?.body).toBeInstanceOf(FormData);
    const formData = requestInit?.body as FormData;
    expect(formData.get("use_new_shared_trial")).toBe("true");
    const requestPart = formData.get("request") as Blob;
    const requestBody = JSON.parse(await requestPart.text());
    expect(requestBody.action).toBe("infill");
    expect(requestBody.parameters.image).toBe("source-base64");
    expect(requestBody.parameters.mask).toBe("mask-base64");
    expect(requestBody.parameters.strength).toBe(0.7);
    expect(requestBody.parameters.noise).toBe(0);
    expect(requestBody.parameters.inpaintImg2ImgStrength).toBe(1);
    expect(requestBody.parameters.img2img).toBeUndefined();
    expect(requestBody.parameters.add_original_image).toBe(false);
    expect(requestBody.parameters.autoSmea).toBe(false);
    expect(requestBody.parameters.normalize_reference_strength_multiple).toBe(true);
    expect(requestBody.parameters.image_format).toBe("png");
    expect(requestBody.parameters.stream).toBe("msgpack");
    expect(requestBody.parameters.extra_noise_seed).toBe(0);
    expect(requestBody.parameters.use_coords).toBe(false);
    expect(requestBody.parameters.qualityToggle).toBe(false);
    expect(requestBody.parameters.skip_cfg_above_sigma).toBe(19);
  });

  it("keeps Inpaint repair strength and original-image overlay as independent controls", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response(pngBytes, {
      status: 200,
      headers: { "Content-Type": "image/png" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await generateNovelImageViaProxy({
      mode: "infill",
      sourceImageBase64: "source-base64",
      maskBase64: "mask-base64",
      strength: 0.65,
      noise: 0,
      prompt: "repair face",
      negativePrompt: "",
      width: 832,
      height: 1216,
      imageCount: 1,
      steps: 23,
      scale: 5,
      sampler: "k_euler_a",
      noiseSchedule: "karras",
      cfgRescale: 0,
      ucPreset: 0,
      qualityToggle: true,
      cfgDelay: false,
      dynamicThresholding: false,
      overlayOriginalImage: true,
      seed: 1,
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    if (!requestInit?.body)
      throw new Error("missing multipart request body");
    const requestPart = (requestInit.body as FormData).get("request") as Blob;
    const requestBody = JSON.parse(await requestPart.text());
    expect(requestBody.parameters.img2img).toEqual({ strength: 0.65, color_correct: true });
    expect(requestBody.parameters.add_original_image).toBe(true);
    expect(requestBody.parameters.skip_cfg_above_sigma).toBeNull();
  });

  it("scales Variety+ sigma from the official V4 latent baseline", () => {
    expect(resolveNovelAiCfgDelaySigma(832, 1216)).toBe(19);
    expect(resolveNovelAiCfgDelaySigma(1664, 2432)).toBe(38);
  });

  it("strips whole-line comments before sending prompt payloads", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>().mockResolvedValue(new Response(pngBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await generateNovelImageViaProxy({
      mode: "txt2img",
      strength: 0.7,
      noise: 0.2,
      prompt: "1girl\n// cinematic lighting\ncity lights",
      negativePrompt: "// blurry\nbad hands",
      width: 1407,
      height: 702,
      imageCount: 1,
      steps: 23,
      scale: 5,
      sampler: "k_euler_a",
      noiseSchedule: "karras",
      cfgRescale: 0,
      ucPreset: 0,
      qualityToggle: false,
      cfgDelay: false,
      dynamicThresholding: false,
      seed: 1,
    });

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const formData = requestInit?.body as FormData;
    const requestPart = formData.get("request") as Blob;
    const requestBody = JSON.parse(await requestPart.text());
    expect(requestBody.input).toBe("1girl\ncity lights");
    expect(requestBody.parameters.negative_prompt).toBe("bad hands");
    expect(requestBody.parameters.width).toBe(1408);
    expect(requestBody.parameters.height).toBe(704);
  });
});

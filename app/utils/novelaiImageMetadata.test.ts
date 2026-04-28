import { gzipSync, strToU8 } from "fflate";

import {
  embedNovelAiMetadataIntoPngBytes,
  extractNovelAiMetadataFromPngBytes,
  extractNovelAiMetadataFromStealthPixels,
  normalizeNovelAiMetadata,
} from "./novelaiImageMetadata";

function uint32Be(value: number) {
  return new Uint8Array([
    (value >>> 24) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 8) & 0xFF,
    value & 0xFF,
  ]);
}

function concatBytes(...parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function asciiBytes(value: string) {
  return new TextEncoder().encode(value);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function makeChunk(type: string, data: Uint8Array) {
  return concatBytes(
    uint32Be(data.length),
    asciiBytes(type),
    data,
    new Uint8Array(4),
  );
}

function buildPngWithTextChunks(entries: Record<string, string>) {
  const signature = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const textChunks = Object.entries(entries).map(([key, value]) => {
    const keyBytes = asciiBytes(key);
    const valueBytes = asciiBytes(value);
    const payload = new Uint8Array(keyBytes.length + 1 + valueBytes.length);
    payload.set(keyBytes, 0);
    payload[keyBytes.length] = 0;
    payload.set(valueBytes, keyBytes.length + 1);
    return makeChunk("tEXt", payload);
  });
  return concatBytes(signature, ...textChunks, makeChunk("IEND", new Uint8Array()));
}

function encodeStealthPayload(metadata: Record<string, unknown>, width = 64, height = 64) {
  const magic = asciiBytes("stealth_pngcomp");
  const gzipBytes = gzipSync(strToU8(JSON.stringify(metadata)));
  const payload = concatBytes(magic, uint32Be(gzipBytes.length * 8), gzipBytes);
  const bits = new Uint8Array(payload.length * 8);
  for (let byteIndex = 0; byteIndex < payload.length; byteIndex += 1) {
    const value = payload[byteIndex];
    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      bits[byteIndex * 8 + bitIndex] = (value >> (7 - bitIndex)) & 1;
    }
  }

  expect(width * height).toBeGreaterThanOrEqual(bits.length);

  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (let index = 0; index < bits.length; index += 1) {
    const x = Math.floor(index / height);
    const y = index % height;
    const alphaIndex = (y * width + x) * 4 + 3;
    data[alphaIndex] = 0xFE | bits[index];
  }

  return { width, height, data };
}

describe("novelaiImageMetadata", () => {
  it("extracts PNG Comment metadata into UI settings", () => {
    const comment = {
      input: "masterpiece, catgirl",
      model: "nai-diffusion-4-5-curated",
      action: "img2img",
      parameters: {
        seed: 42,
        width: 832,
        height: 1216,
        n_samples: 3,
        steps: 28,
        scale: 6.5,
        sampler: "k_euler_a",
        negative_prompt: "lowres, blurry",
        noise_schedule: "karras",
        cfg_rescale: 0.3,
        ucPreset: 1,
        qualityToggle: true,
        dynamic_thresholding: false,
        strength: 0.45,
        noise: 0.15,
      },
    };
    const pngBytes = buildPngWithTextChunks({
      Source: "NovelAI",
      Comment: JSON.stringify(comment),
    });

    const result = extractNovelAiMetadataFromPngBytes(pngBytes);

    expect(result?.source).toBe("png-text");
    expect(result?.settings).toMatchObject({
      mode: "img2img",
      model: "nai-diffusion-4-5-curated",
      prompt: "masterpiece, catgirl",
      negativePrompt: "lowres, blurry",
      seed: 42,
      width: 832,
      height: 1216,
      imageCount: 3,
      steps: 28,
      scale: 6.5,
      sampler: "k_euler_a",
      noiseSchedule: "karras",
      cfgRescale: 0.3,
      ucPreset: 1,
      qualityToggle: true,
      dynamicThresholding: false,
      strength: 0.45,
      noise: 0.15,
    });
  });

  it("extracts stealth metadata from alpha-channel LSBs", () => {
    const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGD4DwABBAEAeG4G3QAAAABJRU5ErkJggg==";
    const stealth = encodeStealthPayload({
      Source: "NovelAI",
      Comment: JSON.stringify({
        input: "best quality, city at night",
        model: "nai-diffusion-4-5-curated",
        action: "generate",
        parameters: {
          seed: 777,
          width: 1024,
          height: 1024,
          steps: 30,
          scale: 5,
          sampler: "k_euler",
          negative_prompt: "bad hands",
          use_coords: true,
          v4_prompt: {
            caption: {
              base_caption: "best quality, city at night",
              char_captions: [
                {
                  char_caption: "girl",
                  centers: [{ x: 0.25, y: 0.75 }],
                },
              ],
            },
            use_coords: true,
            use_order: false,
          },
          v4_negative_prompt: {
            caption: {
              base_caption: "bad hands",
              char_captions: [
                {
                  char_caption: "extra fingers",
                  centers: [{ x: 0.25, y: 0.75 }],
                },
              ],
            },
          },
          reference_image_multiple: [imageBase64],
          reference_strength_multiple: [0.6],
          reference_information_extracted_multiple: [0.85],
          reference_image: imageBase64,
          reference_strength: 0.95,
          reference_information_extracted: 0.7,
        },
      }),
    });

    const result = extractNovelAiMetadataFromStealthPixels(stealth);

    expect(result?.source).toBe("stealth");
    expect(result?.settings.prompt).toBe("best quality, city at night");
    expect(result?.settings.negativePrompt).toBe("bad hands");
    expect(result?.settings.v4UseCoords).toBe(true);
    expect(result?.settings.v4UseOrder).toBe(false);
    expect(result?.settings.v4Chars).toEqual([
      {
        prompt: "girl",
        negativePrompt: "extra fingers",
        centerX: 0.25,
        centerY: 0.75,
      },
    ]);
    expect(result?.settings.vibeTransferReferences).toEqual([
      {
        imageBase64,
        strength: 0.6,
        informationExtracted: 0.85,
      },
    ]);
    expect(result?.settings.preciseReference).toEqual({
      imageBase64,
      strength: 0.95,
      informationExtracted: 0.7,
    });
  });

  it("supports legacy uc metadata", () => {
    const result = normalizeNovelAiMetadata({
      Comment: JSON.stringify({
        input: "1girl",
        model: "nai-diffusion-3",
        action: "generate",
        parameters: {
          uc: "lowres",
          sm: true,
          sm_dyn: true,
        },
      }),
    });

    expect(result).toMatchObject({
      prompt: "1girl",
      negativePrompt: "lowres",
      model: "nai-diffusion-3",
      smea: true,
      smeaDyn: true,
    });
  });

  it("recognizes infill metadata when mask is present", () => {
    const result = normalizeNovelAiMetadata({
      Comment: JSON.stringify({
        input: "repair torn sleeve",
        model: "nai-diffusion-4-5-curated-inpainting",
        action: "infill",
        parameters: {
          image: "iVBORw0KGgoAAAANSUhEUgAA",
          mask: "iVBORw0KGgoAAAANSUhEUgAB",
          seed: 31415,
          width: 1024,
          height: 1024,
          steps: 28,
          strength: 0.55,
          negative_prompt: "extra fingers",
        },
      }),
    });

    expect(result).toMatchObject({
      mode: "infill",
      model: "nai-diffusion-4-5-curated-inpainting",
      prompt: "repair torn sleeve",
      negativePrompt: "extra fingers",
      seed: 31415,
      width: 1024,
      height: 1024,
      steps: 28,
      strength: 0.55,
    });
  });

  it("returns null when metadata does not expose importable settings", () => {
    expect(normalizeNovelAiMetadata({ Source: "NovelAI" })).toBeNull();
    expect(extractNovelAiMetadataFromPngBytes(buildPngWithTextChunks({ Software: "NovelAI" }))).toBeNull();
  });

  it("re-embeds png metadata into a composited png", () => {
    const sourceMetadataBytes = buildPngWithTextChunks({
      Source: "NovelAI",
      Comment: JSON.stringify({
        input: "repair torn sleeve",
        model: "nai-diffusion-4-5-curated-inpainting",
        action: "infill",
        parameters: {
          seed: 31415,
          width: 1024,
          height: 1024,
          steps: 28,
          strength: 0.55,
          negative_prompt: "extra fingers",
        },
      }),
    });
    const metadata = extractNovelAiMetadataFromPngBytes(sourceMetadataBytes);
    const blankPngBytes = decodeBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGD4DwABBAEAeG4G3QAAAABJRU5ErkJggg==");

    const embedded = extractNovelAiMetadataFromPngBytes(
      embedNovelAiMetadataIntoPngBytes(blankPngBytes, metadata),
    );

    expect(embedded?.settings).toMatchObject({
      mode: "infill",
      prompt: "repair torn sleeve",
      negativePrompt: "extra fingers",
      seed: 31415,
      steps: 28,
      strength: 0.55,
    });
  });

  it("converts stealth metadata into png text metadata when re-embedding", () => {
    const stealth = encodeStealthPayload({
      Source: "NovelAI",
      Comment: JSON.stringify({
        input: "best quality, city at night",
        model: "nai-diffusion-4-5-curated",
        action: "generate",
        parameters: {
          seed: 777,
          width: 1024,
          height: 1024,
          steps: 30,
          scale: 5,
          sampler: "k_euler",
          negative_prompt: "bad hands",
        },
      }),
    });
    const metadata = extractNovelAiMetadataFromStealthPixels(stealth);
    const blankPngBytes = decodeBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGD4DwABBAEAeG4G3QAAAABJRU5ErkJggg==");

    const embedded = extractNovelAiMetadataFromPngBytes(
      embedNovelAiMetadataIntoPngBytes(blankPngBytes, metadata),
    );

    expect(embedded?.source).toBe("png-text");
    expect(embedded?.settings).toMatchObject({
      mode: "txt2img",
      prompt: "best quality, city at night",
      negativePrompt: "bad hands",
      seed: 777,
      sampler: "k_euler",
    });
  });
});

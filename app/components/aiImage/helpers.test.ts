import { describe, expect, it } from "vitest";

import {
  buildDirectorToolHistoryRow,
  buildImportedSourceImagePayloadFromDataUrl,
  clampSimpleModeDimension,
  cleanImportedPromptText,
  fitNovelAiImageSizeWithinAreaLimit,
  generatedItemKey,
  getClosestValidImageSize,
  getNovelAiFreeGenerationViolation,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
  mergeTagString,
  resolveEditorImageMode,
  resolveHistoryRowClickMode,
  resolveImportedValue,
  resolveSimpleGenerateMode,
  sanitizeNovelAiTagInput,
  shouldKeepSimpleTagsEditor,
  toggleNovelAiLineComments,
} from "@/components/aiImage/helpers";

describe("aiImage helpers", () => {
  it("uses batch identity for generated items when available", () => {
    expect(generatedItemKey({
      dataUrl: "data:image/png;base64,aaa",
      batchId: "batch-a",
      batchIndex: 0,
    })).toBe("batch:batch-a:0");
  });

  it("keeps same dataUrl rows distinct once they have different batch ids", () => {
    const first = historyRowResultMatchKey({
      dataUrl: "data:image/png;base64,shared",
      batchId: "batch-a",
      batchIndex: 0,
    });
    const second = historyRowResultMatchKey({
      dataUrl: "data:image/png;base64,shared",
      batchId: "batch-b",
      batchIndex: 0,
    });

    expect(first).not.toBe(second);
  });

  it("falls back to dataUrl matching for legacy history rows without batch ids", () => {
    expect(historyRowResultMatchKey({
      dataUrl: "data:image/png;base64,legacy",
      batchId: undefined,
      batchIndex: undefined,
    })).toBe("data:data:image/png;base64,legacy");
  });

  it("reuses the shared history row key when legacy rows become preview items", () => {
    const row = {
      id: undefined,
      dataUrl: "data:image/png;base64,legacy-row",
      batchId: "",
      batchIndex: 1,
      createdAt: 42,
      seed: 31415,
      mode: "txt2img" as const,
      prompt: "1girl",
      negativePrompt: "lowres",
      width: 832,
      height: 1216,
      model: "nai-diffusion-4-curated-preview",
    };

    expect(historyRowKey(row)).toBe("temp:42-31415-1");
    expect(generatedItemKey(historyRowToGeneratedItem(row))).toBe("batch:temp:42-31415-1:1");
  });

  it("builds a director tool history row from the source history context", () => {
    const sourceHistoryRow = {
      createdAt: 12,
      mode: "txt2img" as const,
      model: "nai-diffusion-4-5-curated",
      seed: 42,
      width: 1024,
      height: 1024,
      prompt: "1girl, city lights",
      negativePrompt: "lowres",
      steps: 23,
      scale: 5,
      noiseSchedule: "karras",
      qualityToggle: true,
      v4Chars: [{ prompt: "blue hair", negativePrompt: "", centerX: 0.5, centerY: 0.5 }],
      referenceImages: [{ name: "ref.png", dataUrl: "data:image/png;base64,ref", strength: 0.4, informationExtracted: 1 }],
      preciseReference: { name: "precise.png", dataUrl: "data:image/png;base64,precise", strength: 0.6, informationExtracted: 1 },
      dataUrl: "data:image/png;base64,source-image",
    };

    const row = buildDirectorToolHistoryRow({
      createdAt: 99,
      output: {
        dataUrl: "data:image/png;base64,director-output",
        seed: -1,
        width: 1024,
        height: 1024,
        model: "nai-diffusion-4-5-curated",
        batchId: "director-batch",
        batchIndex: 0,
        batchSize: 1,
        toolLabel: "Line Art",
      },
      source: {
        dataUrl: "data:image/png;base64,source-image",
        seed: 42,
        width: 1024,
        height: 1024,
        model: "nai-diffusion-4-5-curated",
        batchId: "source-batch",
        batchIndex: 0,
        batchSize: 1,
      },
      toolLabel: "Line Art",
      sourceHistoryRow,
    });

    expect(row).toMatchObject({
      createdAt: 99,
      mode: "txt2img",
      seed: -1,
      width: 1024,
      height: 1024,
      prompt: "1girl, city lights",
      negativePrompt: "lowres",
      dataUrl: "data:image/png;base64,director-output",
      sourceDataUrl: "data:image/png;base64,source-image",
      toolLabel: "Line Art",
      batchId: "director-batch",
      batchIndex: 0,
      batchSize: 1,
    });
    expect(row.v4Chars).toEqual(sourceHistoryRow.v4Chars);
    expect(row.referenceImages).toEqual(sourceHistoryRow.referenceImages);
    expect(row.preciseReference).toEqual(sourceHistoryRow.preciseReference);
    expect(row.v4Chars).not.toBe(sourceHistoryRow.v4Chars);
    expect(row.referenceImages).not.toBe(sourceHistoryRow.referenceImages);
    expect(row.preciseReference).not.toBe(sourceHistoryRow.preciseReference);
  });

  it("falls back to img2img metadata when the director source has no history row", () => {
    expect(buildDirectorToolHistoryRow({
      createdAt: 7,
      output: {
        dataUrl: "data:image/png;base64,director-output",
        seed: -1,
        width: 768,
        height: 768,
        model: "nai-diffusion-4-5-curated",
        batchId: "director-batch",
        batchIndex: 0,
        batchSize: 1,
      },
      source: {
        dataUrl: "data:image/png;base64,source-image",
        seed: 0,
        width: 768,
        height: 768,
        model: "nai-diffusion-4-5-curated",
        batchId: "source-batch",
        batchIndex: 0,
        batchSize: 1,
      },
      toolLabel: "Sketch",
      sourceHistoryRow: null,
    })).toMatchObject({
      createdAt: 7,
      mode: "img2img",
      prompt: "",
      negativePrompt: "",
      sourceDataUrl: "data:image/png;base64,source-image",
      toolLabel: "Sketch",
    });
  });

  it("falls back to defaults for missing imported values only when clean imports is enabled", () => {
    expect(resolveImportedValue(undefined, false, 23)).toBeUndefined();
    expect(resolveImportedValue(undefined, true, 23)).toBe(23);
    expect(resolveImportedValue(false, true, true)).toBe(false);
    expect(resolveImportedValue(0, true, 5)).toBe(0);
  });

  it("reconstructs a source image payload from a history data url", () => {
    expect(buildImportedSourceImagePayloadFromDataUrl({
      dataUrl: "data:image/png;base64,abc123",
      name: "history-image.png",
      width: 832,
      height: 1216,
    })).toEqual({
      dataUrl: "data:image/png;base64,abc123",
      imageBase64: "abc123",
      name: "history-image.png",
      width: 832,
      height: 1216,
    });
  });

  it("maps Ctrl/Cmd and Shift modifiers to the expected history import actions", () => {
    expect(resolveHistoryRowClickMode({ ctrlKey: false, metaKey: false, shiftKey: false })).toBe("preview");
    expect(resolveHistoryRowClickMode({ ctrlKey: true, metaKey: false, shiftKey: false })).toBe("settings");
    expect(resolveHistoryRowClickMode({ ctrlKey: false, metaKey: false, shiftKey: true })).toBe("seed");
    expect(resolveHistoryRowClickMode({ ctrlKey: false, metaKey: true, shiftKey: true })).toBe("settings-with-seed");
  });

  it("maps history source images back to editable img2img mode", () => {
    expect(resolveEditorImageMode("data:image/png;base64,abc123")).toBe("img2img");
    expect(resolveEditorImageMode("not-a-data-url")).toBe("txt2img");
    expect(resolveEditorImageMode("")).toBe("txt2img");
  });

  it("keeps simple mode generation on infill after an inpaint save", () => {
    expect(resolveSimpleGenerateMode("infill")).toBe("infill");
    expect(resolveSimpleGenerateMode("txt2img")).toBe("txt2img");
  });

  it("keeps the simple tags editor active for infill even without prompt text", () => {
    expect(shouldKeepSimpleTagsEditor({
      mode: "infill",
      prompt: "",
      negativePrompt: "",
      hasConvertedDraft: false,
    })).toBe(true);
    expect(shouldKeepSimpleTagsEditor({
      mode: "txt2img",
      prompt: "",
      negativePrompt: "",
      hasConvertedDraft: false,
    })).toBe(false);
  });

  it("allows the 1408x704 / 704x1408 presets in simple mode clamping", () => {
    expect(clampSimpleModeDimension(1408, 704, 704)).toBe(1408);
    expect(clampSimpleModeDimension(704, 1408, 1408)).toBe(704);
  });

  it("rounds custom dimensions to the nearest multiple of 64", () => {
    expect(getClosestValidImageSize(1407, 702)).toEqual({ width: 1408, height: 704 });
  });

  it("fits oversized dimensions back into the allowed area when explicitly requested", () => {
    expect(fitNovelAiImageSizeWithinAreaLimit(1792, 1024)).toEqual({ width: 1344, height: 768 });
  });

  it("permits the updated 1408x704 size for generation", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "txt2img",
      width: 1408,
      height: 704,
      imageCount: 1,
      steps: 23,
    })).toBeNull();
  });

  it("permits img2img generation when a source image is provided", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "img2img",
      width: 704,
      height: 1408,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
    })).toBeNull();
  });

  it("blocks imported source images when the total area exceeds 1024x1024", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "infill",
      width: 1024,
      height: 1024,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
      sourceImageWidth: 1536,
      sourceImageHeight: 960,
      maskBase64: "mask123",
    })).toContain("总面积不能超过 1024x1024");
  });

  it("allows imported source images to exceed 1024 on one side when the area still fits", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "infill",
      width: 1408,
      height: 704,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
      sourceImageWidth: 1408,
      sourceImageHeight: 704,
      maskBase64: "mask123",
    })).toBeNull();
  });

  it("blocks generation when the rounded size exceeds the allowed area", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "txt2img",
      width: 1472,
      height: 768,
      imageCount: 1,
      steps: 23,
    })).toContain("宽高乘积不超过 1024x1024");
  });

  it("deduplicates merged style tags while keeping quick mode tags editable", () => {
    expect(mergeTagString("1girl, best quality, cinematic lighting", [
      "cinematic lighting",
      "soft light",
      "best quality",
    ])).toBe("cinematic lighting, soft light, best quality, 1girl");
  });

  it("cleans imported metadata prompt text by removing brackets and spacing commas", () => {
    expect(cleanImportedPromptText("masterpiece,[1girl],best quality,{blue eyes}"))
      .toBe("masterpiece, 1girl, best quality, blue eyes");
  });

  it("ignores whole-line comments in tag text", () => {
    expect(sanitizeNovelAiTagInput("1girl,\n// cinematic lighting\ncity lights"))
      .toBe("1girl,\ncity lights");
  });

  it("toggles whole-line comments with stable selection ranges", () => {
    expect(toggleNovelAiLineComments({
      value: "1girl\ncity lights",
      selectionStart: 0,
      selectionEnd: 17,
    })).toEqual({
      value: "// 1girl\n// city lights",
      selectionStart: 0,
      selectionEnd: 23,
    });

    expect(toggleNovelAiLineComments({
      value: "// 1girl\n// city lights",
      selectionStart: 0,
      selectionEnd: 23,
    })).toEqual({
      value: "1girl\ncity lights",
      selectionStart: 0,
      selectionEnd: 17,
    });
  });
});

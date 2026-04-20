import { describe, expect, it } from "vitest";

import {
  buildImportedSourceImagePayloadFromDataUrl,
  cleanImportedPromptText,
  clampSimpleModeDimension,
  generatedItemKey,
  insertNovelAiRandomTags,
  mergeTagString,
  resolveEditorImageMode,
  resolveNovelAiRandomTagTarget,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
  getNovelAiFreeGenerationViolation,
  resolveImportedValue,
} from "@/components/aiImage/helpers";

function createSequentialRandom(values: number[]) {
  let index = 0;
  return () => {
    const nextValue = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return nextValue;
  };
}

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

  it("maps history source images back to editable img2img mode", () => {
    expect(resolveEditorImageMode("data:image/png;base64,abc123")).toBe("img2img");
    expect(resolveEditorImageMode("not-a-data-url")).toBe("txt2img");
    expect(resolveEditorImageMode("")).toBe("txt2img");
  });

  it("allows the new 832x1216 / 1216x832 preset sizes in simple mode clamping", () => {
    expect(clampSimpleModeDimension(1216, 832, 832)).toBe(1216);
    expect(clampSimpleModeDimension(832, 1216, 1216)).toBe(832);
  });

  it("permits the updated preset sizes for generation", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "txt2img",
      width: 1216,
      height: 832,
      imageCount: 1,
      steps: 23,
    })).toBeNull();
  });

  it("permits img2img generation when a source image is provided", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "img2img",
      width: 832,
      height: 1216,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
    })).toBeNull();
  });

  it("blocks imported non-preset source images when either side exceeds 1024", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "infill",
      width: 1024,
      height: 960,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
      sourceImageWidth: 1536,
      sourceImageHeight: 960,
      maskBase64: "mask123",
    })).toContain("任意一边不能超过 1024");
  });

  it("allows imported preset source images to exceed 1024 on one side", () => {
    expect(getNovelAiFreeGenerationViolation({
      mode: "infill",
      width: 1216,
      height: 832,
      imageCount: 1,
      steps: 23,
      sourceImageBase64: "abc123",
      sourceImageWidth: 1216,
      sourceImageHeight: 832,
      maskBase64: "mask123",
    })).toBeNull();
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

  it("inserts usable prompt tags instead of randomizer syntax", () => {
    const inserted = insertNovelAiRandomTags({
      kind: "prompt",
      random: createSequentialRandom(Array(8).fill(0)),
      value: "1girl, blue eyes",
      selectionStart: 17,
      selectionEnd: 17,
    });

    expect(inserted.value).toBe("1girl, blue eyes, cinematic lighting, dramatic shadows, volumetric lighting, rim light, backlighting, depth of field, bokeh, dynamic angle");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd)).toBe("cinematic lighting, dramatic shadows, volumetric lighting, rim light, backlighting, depth of field, bokeh, dynamic angle");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split(", ")).toHaveLength(8);
    expect(inserted.insertedText).toBe("cinematic lighting, dramatic shadows, volumetric lighting, rim light, backlighting, depth of field, bokeh, dynamic angle");
  });

  it("preserves the selected tag as the first usable prompt tag", () => {
    const inserted = insertNovelAiRandomTags({
      kind: "prompt",
      random: createSequentialRandom(Array(7).fill(0)),
      value: "1girl, blue eyes, smile",
      selectionStart: 7,
      selectionEnd: 16,
    });

    expect(inserted.value).toBe("1girl, blue eyes, cinematic lighting, dramatic shadows, volumetric lighting, rim light, backlighting, depth of field, bokeh, smile");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd)).toBe("blue eyes, cinematic lighting, dramatic shadows, volumetric lighting, rim light, backlighting, depth of field, bokeh");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split(", ")).toHaveLength(8);
  });

  it("uses a negative tag pool for usable undesired content tags", () => {
    const inserted = insertNovelAiRandomTags({
      kind: "negative",
      random: createSequentialRandom(Array(8).fill(0)),
      value: "lowres",
      selectionStart: 6,
      selectionEnd: 6,
    });

    expect(inserted.value).toBe("lowres, blurry, bad anatomy, bad hands, extra fingers, missing fingers, deformed, text, watermark");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split(", ")).toHaveLength(8);
  });

  it("reuses the previous random tag range when there is no active selection", () => {
    const insertedText = "cinematic lighting, dramatic shadows";
    expect(resolveNovelAiRandomTagTarget({
      currentValue: `1girl, ${insertedText}`,
      selectionStart: 0,
      selectionEnd: 0,
      previousInsertion: {
        selectionStart: 7,
        selectionEnd: 7 + insertedText.length,
        insertedText,
      },
    })).toEqual({
      selectionStart: 7,
      selectionEnd: 7 + insertedText.length,
    });
  });

  it("falls back to the current caret when the previous random range was edited", () => {
    expect(resolveNovelAiRandomTagTarget({
      currentValue: "1girl, cinematic lighting, edited manually",
      selectionStart: 0,
      selectionEnd: 0,
      previousInsertion: {
        selectionStart: 7,
        selectionEnd: 42,
        insertedText: "cinematic lighting, dramatic shadows",
      },
    })).toEqual({
      selectionStart: 0,
      selectionEnd: 0,
    });
  });
});

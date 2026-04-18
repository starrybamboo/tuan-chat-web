import { describe, expect, it } from "vitest";

import {
  cleanImportedPromptText,
  clampSimpleModeDimension,
  generatedItemKey,
  insertNovelAiRandomizerTag,
  mergeTagString,
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

  it("inserts a NovelAI randomizer template with tag separators when appending to prompt tags", () => {
    const inserted = insertNovelAiRandomizerTag({
      kind: "prompt",
      random: createSequentialRandom(Array(10).fill(0)),
      value: "1girl, blue eyes",
      selectionStart: 17,
      selectionEnd: 17,
    });

    expect(inserted.value).toBe("1girl, blue eyes, ||cinematic lighting|dramatic shadows|volumetric lighting|rim light|backlighting|depth of field|bokeh|dynamic angle|dutch angle|wind-blown hair||");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd)).toBe("cinematic lighting|dramatic shadows|volumetric lighting|rim light|backlighting|depth of field|bokeh|dynamic angle|dutch angle|wind-blown hair");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split("|")).toHaveLength(10);
  });

  it("wraps the current selection into the first randomizer option", () => {
    const inserted = insertNovelAiRandomizerTag({
      kind: "prompt",
      random: createSequentialRandom(Array(9).fill(0)),
      value: "1girl, blue eyes, smile",
      selectionStart: 7,
      selectionEnd: 16,
    });

    expect(inserted.value).toBe("1girl, ||blue eyes|cinematic lighting|dramatic shadows|volumetric lighting|rim light|backlighting|depth of field|bokeh|dynamic angle|dutch angle||, smile");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd)).toBe("blue eyes|cinematic lighting|dramatic shadows|volumetric lighting|rim light|backlighting|depth of field|bokeh|dynamic angle|dutch angle");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split("|")).toHaveLength(10);
  });

  it("uses a negative tag pool for undesired content randomizers", () => {
    const inserted = insertNovelAiRandomizerTag({
      kind: "negative",
      random: createSequentialRandom(Array(10).fill(0)),
      value: "lowres",
      selectionStart: 6,
      selectionEnd: 6,
    });

    expect(inserted.value).toBe("lowres, ||lowres|blurry|bad anatomy|bad hands|extra fingers|missing fingers|deformed|text|watermark|logo||");
    expect(inserted.value.slice(inserted.selectionStart, inserted.selectionEnd).split("|")).toHaveLength(10);
  });
});

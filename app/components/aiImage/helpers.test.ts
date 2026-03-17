import { describe, expect, it } from "vitest";

import {
  generatedItemKey,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
  resolveImportedValue,
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

  it("falls back to defaults for missing imported values only when clean imports is enabled", () => {
    expect(resolveImportedValue(undefined, false, 23)).toBeUndefined();
    expect(resolveImportedValue(undefined, true, 23)).toBe(23);
    expect(resolveImportedValue(false, true, true)).toBe(false);
    expect(resolveImportedValue(0, true, 5)).toBe(0);
  });
});

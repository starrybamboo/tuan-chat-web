import { describe, expect, it, vi } from "vitest";

import type { InpaintDialogSource } from "@/components/aiImage/types";

import { saveInpaintMaskAction } from "@/components/aiImage/controller/inpaintActions";

describe("saveInpaintMaskAction", () => {
  it("persists an imported source before enabling infill", () => {
    const source: InpaintDialogSource = {
      dataUrl: "data:image/png;base64,source",
      imageBase64: "source",
      width: 1024,
      height: 1024,
      seed: 123,
      model: "nai-diffusion-4-5-curated",
      mode: "pro",
      prompt: "1girl",
      negativePrompt: "lowres",
      strength: 1,
      focusedArea: null,
      overlayOriginalImage: true,
    };
    const syncInpaintSourceForUi = vi.fn();
    const setProInfillMaskDataUrl = vi.fn();
    const setModeForUi = vi.fn();

    saveInpaintMaskAction({
      inpaintDialogSource: source,
      payload: {
        prompt: "1girl",
        negativePrompt: "lowres",
        strength: 0.8,
        maskDataUrl: "data:image/png;base64,mask",
        focusedArea: null,
        overlayOriginalImage: true,
      },
      setSimpleInfillPrompt: vi.fn(),
      setSimpleInfillNegativePrompt: vi.fn(),
      setSimpleEditorMode: vi.fn(),
      setSimplePromptTab: vi.fn(),
      setSimpleInfillStrength: vi.fn(),
      setSimpleInfillMaskDataUrl: vi.fn(),
      setSimpleInfillFocusedArea: vi.fn(),
      setSimpleOverlayOriginalImage: vi.fn(),
      setProInfillPrompt: vi.fn(),
      setProInfillNegativePrompt: vi.fn(),
      setProInfillStrength: vi.fn(),
      setProInfillMaskDataUrl,
      setProInfillFocusedArea: vi.fn(),
      setProOverlayOriginalImage: vi.fn(),
      setError: vi.fn(),
      setModeForUi,
      setInpaintDialogSource: vi.fn(),
      syncInpaintSourceForUi,
    });

    expect(syncInpaintSourceForUi).toHaveBeenCalledWith("pro", source);
    expect(setProInfillMaskDataUrl).toHaveBeenCalledWith("data:image/png;base64,mask");
    expect(setModeForUi).toHaveBeenCalledWith("pro", "infill");
  });
});

import { describe, expect, it } from "vitest";

import { buildGenerateContext } from "@/components/aiImage/controller/generateActions";

describe("generateActions", () => {
  it("appends infill tags after the source prompt", () => {
    const context = buildGenerateContext({
      currentMode: "infill",
      uiMode: "simple",
      simpleInfillPrompt: "1girl, city lights",
      proInfillPrompt: "",
      simpleInfillNegativePrompt: "lowres",
      proInfillNegativePrompt: "",
      infillAppendPrompt: "cinematic lighting, city lights, bloom",
      prompt: "should be ignored",
      negativePrompt: "should also be ignored",
      simplePrompt: "",
      promptText: "",
      simpleNegativePrompt: "",
      negativePromptText: "",
      activeStyleTags: ["style should not merge"],
      activeStyleNegativeTags: ["negative style should not merge"],
      width: 1024,
      height: 1024,
      strength: 0.6,
      noise: 0,
      sourceImageBase64: "abc123",
      sourceImageDataUrl: "data:image/png;base64,abc123",
      sourceImageWidth: 1024,
      sourceImageHeight: 1024,
      maskBase64: "mask123",
      maskDataUrl: "data:image/png;base64,mask123",
      focusedArea: { left: 100, top: 120, width: 300, height: 400 },
      overlayOriginalImage: true,
      v4Chars: [],
      v4UseCoords: false,
      v4UseOrder: true,
    });

    expect(context.effectiveMode).toBe("infill");
    expect(context.effectivePrompt).toBe("1girl, city lights, cinematic lighting, bloom");
    expect(context.effectiveNegative).toBe("lowres");
    expect(context.effectiveFocusedArea).toEqual({ left: 100, top: 120, width: 300, height: 400 });
    expect(context.effectiveOverlayOriginalImage).toBe(true);
  });

  it("keeps txt2img style-tag merging unchanged", () => {
    const context = buildGenerateContext({
      currentMode: "txt2img",
      uiMode: "simple",
      simpleInfillPrompt: "",
      proInfillPrompt: "",
      simpleInfillNegativePrompt: "",
      proInfillNegativePrompt: "",
      infillAppendPrompt: "should be ignored",
      simplePrompt: "1girl",
      simpleNegativePrompt: "lowres",
      promptText: "",
      negativePromptText: "",
      activeStyleTags: ["cinematic lighting"],
      activeStyleNegativeTags: ["blurry"],
      width: 1024,
      height: 1024,
      strength: 0.6,
      noise: 0,
      v4Chars: [],
      v4UseCoords: false,
      v4UseOrder: true,
    });

    expect(context.effectivePrompt).toBe("cinematic lighting, 1girl");
    expect(context.effectiveNegative).toBe("blurry, lowres");
  });
});

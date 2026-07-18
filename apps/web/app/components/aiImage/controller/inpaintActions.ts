import type { AiImageGenerationMode, InpaintDialogSource, InpaintFocusRect, UiMode } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import {
  DEFAULT_INPAINT_NEGATIVE_PROMPT,
  DEFAULT_INPAINT_PROMPT,
  DEFAULT_INPAINT_STRENGTH,
} from "@/components/aiImage/constants";
import { clampRange, dataUrlToBase64 } from "@/components/aiImage/helpers";

type BuildInpaintSourceStateArgs = {
  sourceImageDataUrl: string;
  readImageSize: (dataUrl: string) => Promise<{ width: number; height: number }>;
  history: AiImageHistoryRow[];
  uiMode: UiMode;
  simpleInfillPrompt: string;
  proInfillPrompt: string;
  simpleInfillNegativePrompt: string;
  proInfillNegativePrompt: string;
  infillMaskDataUrl: string;
  width: number;
  height: number;
  seed: number;
  model: string;
  currentInfillStrength: number;
  infillFocusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
};

export async function buildInpaintSourceStateAction(args: BuildInpaintSourceStateArgs): Promise<InpaintDialogSource | null> {
  if (!args.sourceImageDataUrl)
    return null;

  const sourceImageBase64 = dataUrlToBase64(args.sourceImageDataUrl);
  if (!sourceImageBase64)
    throw new Error("当前 Inpaint 源图读取失败。");

  let sourceImageSize: { width: number; height: number } | null = null;
  try {
    sourceImageSize = await args.readImageSize(args.sourceImageDataUrl);
  }
  catch {
    // Fall back to the current canvas size.
  }

  const matchedSourceHistoryRow = args.history.find(row =>
    row.dataUrl === args.sourceImageDataUrl
    || row.sourceDataUrl === args.sourceImageDataUrl,
  ) || null;
  const currentInfillPrompt = args.uiMode === "simple" ? args.simpleInfillPrompt : args.proInfillPrompt;
  const currentInfillNegativePrompt = args.uiMode === "simple" ? args.simpleInfillNegativePrompt : args.proInfillNegativePrompt;
  const sourcePrompt = String(matchedSourceHistoryRow?.prompt || "").trim();
  const sourceNegativePrompt = String(matchedSourceHistoryRow?.negativePrompt || "").trim();

  return {
    dataUrl: args.sourceImageDataUrl,
    imageBase64: sourceImageBase64,
    maskDataUrl: args.infillMaskDataUrl,
    width: sourceImageSize?.width ?? args.width,
    height: sourceImageSize?.height ?? args.height,
    seed: args.seed,
    model: args.model,
    mode: args.uiMode,
    prompt: sourcePrompt || currentInfillPrompt || DEFAULT_INPAINT_PROMPT,
    negativePrompt: sourceNegativePrompt || currentInfillNegativePrompt || DEFAULT_INPAINT_NEGATIVE_PROMPT,
    strength: args.currentInfillStrength,
    focusedArea: args.infillFocusedArea,
    overlayOriginalImage: args.overlayOriginalImage,
  };
}

type SaveInpaintMaskArgs = {
  inpaintDialogSource: InpaintDialogSource | null;
  payload: {
    prompt: string;
    negativePrompt: string;
    strength: number;
    maskDataUrl: string;
    focusedArea: InpaintFocusRect | null;
    overlayOriginalImage: boolean;
  };
  setSimpleInfillPrompt: (value: string) => void;
  setSimpleInfillNegativePrompt: (value: string) => void;
  setSimpleEditorMode: (value: "text" | "tags") => void;
  setSimplePromptTab: (value: "prompt" | "negative") => void;
  setSimpleInfillStrength: (value: number) => void;
  setSimpleInfillMaskDataUrl: (value: string) => void;
  setSimpleInfillFocusedArea: (value: InpaintFocusRect | null) => void;
  setSimpleOverlayOriginalImage: (value: boolean) => void;
  setProInfillPrompt: (value: string) => void;
  setProInfillNegativePrompt: (value: string) => void;
  setProInfillStrength: (value: number) => void;
  setProInfillMaskDataUrl: (value: string) => void;
  setProInfillFocusedArea: (value: InpaintFocusRect | null) => void;
  setProOverlayOriginalImage: (value: boolean) => void;
  setError: (value: string) => void;
  setModeForUi: (mode: UiMode, nextMode: AiImageGenerationMode) => void;
  setInpaintDialogSource: (value: InpaintDialogSource | null) => void;
  syncInpaintSourceForUi: (mode: UiMode, source: InpaintDialogSource) => void;
};

export function saveInpaintMaskAction(args: SaveInpaintMaskArgs) {
  if (!args.inpaintDialogSource)
    return;

  args.syncInpaintSourceForUi(args.inpaintDialogSource.mode, args.inpaintDialogSource);
  const payload = args.payload;
  const nextStrength = clampRange(Number(payload.strength), 0.01, 1, DEFAULT_INPAINT_STRENGTH);
  if (args.inpaintDialogSource.mode === "simple") {
    args.setSimpleInfillPrompt(String(payload.prompt || "").trim() || DEFAULT_INPAINT_PROMPT);
    args.setSimpleInfillNegativePrompt(String(payload.negativePrompt || "").trim() || DEFAULT_INPAINT_NEGATIVE_PROMPT);
    args.setSimpleEditorMode("tags");
    args.setSimplePromptTab("prompt");
    args.setSimpleInfillStrength(nextStrength);
    args.setSimpleInfillMaskDataUrl(payload.maskDataUrl);
    args.setSimpleInfillFocusedArea(payload.focusedArea);
    args.setSimpleOverlayOriginalImage(payload.overlayOriginalImage);
  }
  else {
    args.setProInfillPrompt(String(payload.prompt || "").trim() || DEFAULT_INPAINT_PROMPT);
    args.setProInfillNegativePrompt(String(payload.negativePrompt || "").trim() || DEFAULT_INPAINT_NEGATIVE_PROMPT);
    args.setProInfillStrength(nextStrength);
    args.setProInfillMaskDataUrl(payload.maskDataUrl);
    args.setProInfillFocusedArea(payload.focusedArea);
    args.setProOverlayOriginalImage(payload.overlayOriginalImage);
  }

  args.setError("");
  args.setModeForUi(args.inpaintDialogSource.mode, "infill");
  args.setInpaintDialogSource(null);
}

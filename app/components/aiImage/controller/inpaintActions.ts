import { clampRange, dataUrlToBase64 } from "@/components/aiImage/helpers";

const DEFAULT_INPAINT_PROMPT = "very aesthetic, masterpiece, no text";
const DEFAULT_INPAINT_NEGATIVE_PROMPT = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
const DEFAULT_INPAINT_STRENGTH = 1;

export async function buildBaseImageInpaintStateAction(args: Record<string, any>) {
  if (!args.sourceImageDataUrl)
    return null;

  const sourceImageBase64 = dataUrlToBase64(args.sourceImageDataUrl);
  if (!sourceImageBase64)
    throw new Error("当前 Base Img 读取失败，无法启动 Inpaint。");

  let sourceImageSize: { width: number; height: number } | null = null;
  try {
    sourceImageSize = await args.readImageSize(args.sourceImageDataUrl);
  }
  catch {
    // Fall back to the current canvas size.
  }

  const matchedSourceHistoryRow = args.history.find((row: any) =>
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
  };
}

export function saveInpaintMaskAction(args: Record<string, any>) {
  if (!args.inpaintDialogSource)
    return;

  const payload = args.payload;
  const nextStrength = clampRange(Number(payload.strength), 0.01, 1, DEFAULT_INPAINT_STRENGTH);
  if (args.inpaintDialogSource.mode === "simple") {
    args.setSimpleInfillPrompt(String(payload.prompt || "").trim() || DEFAULT_INPAINT_PROMPT);
    args.setSimpleInfillNegativePrompt(String(payload.negativePrompt || "").trim() || DEFAULT_INPAINT_NEGATIVE_PROMPT);
    args.setSimpleEditorMode("tags");
    args.setSimplePromptTab("prompt");
    args.setSimpleInfillStrength(nextStrength);
    args.setSimpleInfillMaskDataUrl(payload.maskDataUrl);
  }
  else {
    args.setProInfillPrompt(String(payload.prompt || "").trim() || DEFAULT_INPAINT_PROMPT);
    args.setProInfillNegativePrompt(String(payload.negativePrompt || "").trim() || DEFAULT_INPAINT_NEGATIVE_PROMPT);
    args.setProInfillStrength(nextStrength);
    args.setProInfillMaskDataUrl(payload.maskDataUrl);
  }

  args.setError("");
  args.setModeForUi(args.inpaintDialogSource.mode, "infill");
  args.setInpaintDialogSource(null);
}

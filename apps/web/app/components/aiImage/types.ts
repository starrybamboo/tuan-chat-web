import type {
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/media/novelaiImageMetadata";

export type UiMode = "simple" | "pro";

export type AiImageGenerationMode = "txt2img" | "infill";

export type V4CharGender = "female" | "male" | "other";

export type V4PromptCenter = {
  x: number;
  y: number;
};

export type V4CharPayload = {
  prompt: string;
  negativePrompt: string;
  centerX: number;
  centerY: number;
};

export type V4CharEditorRow = {
  id: string;
  gender?: V4CharGender;
} & V4CharPayload;

export type GeneratedImageItem = {
  dataUrl: string;
  seed: number;
  width: number;
  height: number;
  model: string;
  batchId: string;
  batchIndex: number;
  batchSize: number;
  toolLabel?: string;
};

export type ResolutionPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type ImageImportSource = "picker" | "paste" | "drop";

export type InternalHistoryImageDragPayload = {
  dataUrl: string;
  name: string;
};

export type ImportedSourceImagePayload = {
  dataUrl: string;
  imageBase64: string;
  name?: string;
  width?: number;
  height?: number;
};

export type InpaintDialogSource = {
  dataUrl: string;
  imageBase64: string;
  maskDataUrl?: string;
  width: number;
  height: number;
  seed: number;
  model: string;
  mode: UiMode;
  prompt: string;
  negativePrompt: string;
  strength: number;
  focusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
};

export type InpaintFocusRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type InpaintSubmitPayload = {
  prompt: string;
  negativePrompt: string;
  strength: number;
  maskDataUrl: string;
  focusedArea: InpaintFocusRect | null;
  overlayOriginalImage: boolean;
};

export type PendingMetadataImportState = {
  sourceImage: ImportedSourceImagePayload;
  metadata: NovelAiImageMetadataResult | null;
  source?: ImageImportSource;
  imageCount: number;
};

export type NovelAiDirectorRequestType
  = | "declutter"
    | "lineart"
    | "sketch"
    | "colorize";

export type MetadataImportSelectionState = {
  prompt: boolean;
  undesiredContent: boolean;
  characters: boolean;
  appendCharacters: boolean;
  settings: boolean;
  seed: boolean;
  cleanImports: boolean;
};

export type HistoryRowClickMode = "preview" | "settings" | "seed" | "settings-with-seed";

export type ResolutionSelection = ResolutionPreset["id"] | "custom";
export type ProFeatureSectionKey = "characterPrompts";
export type DirectorToolId = "declutter" | "lineArt" | "sketch" | "colorize";
export type ActivePreviewAction = "" | DirectorToolId;

export type DirectorToolOption = {
  id: DirectorToolId;
  label: string;
  description: string;
  requestType: NovelAiDirectorRequestType;
  parameterMode: "none" | "colorize";
};

export type CurrentResultCard = {
  item: GeneratedImageItem;
  index: number;
  row: AiImageHistoryRow | null;
};

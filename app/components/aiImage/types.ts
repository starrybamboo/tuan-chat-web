import type {
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import type { NovelAiImageMetadataResult } from "@/utils/novelaiImageMetadata";

export type UiMode = "simple" | "pro";

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

export type VibeTransferReferencePayload = {
  imageBase64: string;
  strength: number;
  informationExtracted: number;
};

export type VibeTransferReferenceRow = {
  id: string;
  dataUrl: string;
  lockInformationExtracted?: boolean;
  name: string;
} & VibeTransferReferencePayload;

export type PreciseReferencePayload = {
  imageBase64: string;
  strength: number;
  informationExtracted: number;
};

export type PreciseReferenceRow = {
  dataUrl: string;
  name: string;
} & PreciseReferencePayload;

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
};

export type InpaintSubmitPayload = {
  prompt: string;
  negativePrompt: string;
  strength: number;
  maskDataUrl: string;
};

export type PendingMetadataImportState = {
  sourceImage: ImportedSourceImagePayload;
  metadata: NovelAiImageMetadataResult | null;
  source?: ImageImportSource;
  imageCount: number;
};

export type NovelAiDirectorRequestType
  = | "bg-removal"
    | "declutter"
    | "declutter-keep-bubbles"
    | "lineart"
    | "sketch"
    | "colorize"
    | "emotion";

export type NovelAiEmotion
  = | "neutral"
    | "happy"
    | "sad"
    | "angry"
    | "scared"
    | "surprised"
    | "tired"
    | "excited"
    | "nervous"
    | "thinking"
    | "confused"
    | "shy"
    | "disgusted"
    | "smug"
    | "bored"
    | "laughing"
    | "irritated"
    | "aroused"
    | "embarrassed"
    | "worried"
    | "love"
    | "determined"
    | "hurt"
    | "playful";

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
export type ProFeatureSectionKey = "baseImage" | "characterPrompts" | "vibeTransfer" | "preciseReference";
export type DirectorToolId = "removeBackground" | "declutter" | "lineArt" | "sketch" | "colorize" | "emotion";
export type ActivePreviewAction = "" | "upscale" | DirectorToolId;

export type DirectorToolOption = {
  id: DirectorToolId;
  label: string;
  description: string;
  requestType: NovelAiDirectorRequestType;
  parameterMode: "none" | "colorize" | "emotion";
};

export type CurrentResultCard = {
  item: GeneratedImageItem;
  index: number;
  row: AiImageHistoryRow | null;
};

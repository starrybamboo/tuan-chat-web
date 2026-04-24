import type { DragEvent } from "react";

import type {
  ActivePreviewAction,
  DirectorToolId,
  DirectorToolOption,
  GeneratedImageItem,
  NovelAiEmotion,
} from "@/components/aiImage/types";

export interface AiImagePreviewPaneProps {
  isDirectorToolsOpen: boolean;
  previewMeta: string;
  results: GeneratedImageItem[];
  selectedPreviewResult: GeneratedImageItem | null;
  selectedResultIndex: number;
  selectedHistoryPreviewKey: string | null;
  isSelectedPreviewPinned: boolean;
  isBusy: boolean;
  isGeneratingImage: boolean;
  isDirectorImageDragOver: boolean;
  pendingPreviewAction: ActivePreviewAction;
  activeDirectorTool: DirectorToolId;
  directorTool: DirectorToolOption;
  directorSourceItems: GeneratedImageItem[];
  directorInputPreview: GeneratedImageItem | null;
  directorOutputPreview: GeneratedImageItem | null;
  directorColorizePrompt: string;
  directorColorizeDefry: number;
  directorEmotion: NovelAiEmotion;
  directorEmotionExtraPrompt: string;
  directorEmotionDefry: number;
  onToggleDirectorTools: () => void;
  onRunUpscale: () => void | Promise<void>;
  onRunDirectorInputUpscale: () => void | Promise<void>;
  onUseSelectedResultAsBaseImage: () => void;
  onPickDirectorSourceImages: (files: FileList | File[]) => void | Promise<void>;
  onSelectDirectorSourceItem: (item: GeneratedImageItem) => void;
  onRemoveDirectorSourceItem: (item: GeneratedImageItem) => void;
  onAddDirectorDisplayedToSourceRail: () => void;
  onDirectorImageDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDirectorImageDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDirectorImageDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDirectorImageDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDirectorColorizePromptChange: (value: string) => void;
  onDirectorColorizeDefryChange: (value: number) => void;
  onDirectorEmotionChange: (value: NovelAiEmotion) => void;
  onDirectorEmotionExtraPromptChange: (value: string) => void;
  onDirectorEmotionDefryChange: (value: number) => void;
  onActiveDirectorToolChange: (value: DirectorToolId) => void;
  onRunDirectorTool: () => void | Promise<void>;
  onSelectCurrentResult: (index: number) => void;
  onOpenPreviewImage: () => void;
  onTogglePinnedPreview: () => void;
  onOpenInpaint: () => void;
  onCopySelectedPreviewImage: () => void | Promise<void>;
  onCopyDirectorInputImage: () => void | Promise<void>;
  onCopyDirectorOutputImage: () => void | Promise<void>;
  onDownloadCurrent: () => void;
  onDownloadDirectorOutputImage: () => void;
  onApplySelectedPreviewSeed: () => void;
  formatDirectorEmotionLabel: (value: NovelAiEmotion) => string;
}

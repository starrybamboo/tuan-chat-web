import type { ComponentProps } from "react";

import { useMemo } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { AiImageWorkspace } from "@/components/aiImage/AiImageWorkspace";
import { InpaintDialog } from "@/components/aiImage/InpaintDialog";
import { MetadataImportDialog } from "@/components/aiImage/MetadataImportDialog";
import { PreviewImageDialog } from "@/components/aiImage/PreviewImageDialog";
import { StylePickerDialog } from "@/components/aiImage/StylePickerDialog";
import { buildInpaintDialogProps, buildMetadataImportDialogProps, buildPreviewImageDialogProps, buildStylePickerDialogProps, buildWorkspaceProps } from "@/components/aiImage/controller/buildViewModels";
import { generatedItemKey } from "@/components/aiImage/helpers";

type WorkspaceProps = ComponentProps<typeof AiImageWorkspace>;
type PreviewPaneProps = ComponentProps<typeof AiImagePreviewPane>;
type HistoryPaneProps = Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
type MetadataImportDialogProps = ComponentProps<typeof MetadataImportDialog>;
type PreviewImageDialogProps = ComponentProps<typeof PreviewImageDialog>;
type InpaintDialogProps = ComponentProps<typeof InpaintDialog>;
type StylePickerDialogProps = ComponentProps<typeof StylePickerDialog>;

export function useAiImageWorkspaceProps(args: WorkspaceProps) {
  const {
    isDirectorToolsOpen,
    previewPaneProps,
    historyPaneProps,
    pinnedPreviewResult,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed,
  } = args;

  return useMemo(() => buildWorkspaceProps({
    isDirectorToolsOpen,
    previewPaneProps,
    historyPaneProps,
    pinnedPreviewResult,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed,
  }), [
    historyPaneProps,
    isDirectorToolsOpen,
    onApplyPinnedPreviewSeed,
    onClearPinnedPreview,
    onJumpToPinnedPreview,
    pinnedPreviewResult,
    previewPaneProps,
  ]);
}

export function useAiImageDialogViewModels(args: {
  metadataImportDialogProps: MetadataImportDialogProps;
  previewImageDialogProps: PreviewImageDialogProps;
  inpaintDialogProps: InpaintDialogProps;
  stylePickerDialogProps: StylePickerDialogProps;
}) {
  const {
    metadataImportDialogProps,
    previewImageDialogProps,
    inpaintDialogProps,
    stylePickerDialogProps,
  } = args;

  const stableMetadataImportDialogProps = useMemo(() => buildMetadataImportDialogProps(metadataImportDialogProps), [
    metadataImportDialogProps,
  ]);
  const stablePreviewImageDialogProps = useMemo(() => buildPreviewImageDialogProps(previewImageDialogProps), [
    previewImageDialogProps,
  ]);
  const stableInpaintDialogProps = useMemo(() => buildInpaintDialogProps(inpaintDialogProps), [
    inpaintDialogProps,
  ]);
  const stableStylePickerDialogProps = useMemo(() => buildStylePickerDialogProps(stylePickerDialogProps), [
    stylePickerDialogProps,
  ]);

  return {
    metadataImportDialogProps: stableMetadataImportDialogProps,
    previewImageDialogProps: stablePreviewImageDialogProps,
    inpaintDialogProps: stableInpaintDialogProps,
    stylePickerDialogProps: stableStylePickerDialogProps,
  };
}

export function createAiImageWorkspaceProps(args: {
  isDirectorToolsOpen: boolean;
  previewPaneProps: PreviewPaneProps;
  historyPaneProps: HistoryPaneProps;
  pinnedPreviewResult: WorkspaceProps["pinnedPreviewResult"];
  onClearPinnedPreview: WorkspaceProps["onClearPinnedPreview"];
  onJumpToPinnedPreview: WorkspaceProps["onJumpToPinnedPreview"];
  onApplyPinnedPreviewSeed: WorkspaceProps["onApplyPinnedPreviewSeed"];
}): WorkspaceProps {
  return {
    isDirectorToolsOpen: args.isDirectorToolsOpen,
    previewPaneProps: args.previewPaneProps,
    historyPaneProps: args.historyPaneProps,
    pinnedPreviewResult: args.pinnedPreviewResult,
    onClearPinnedPreview: args.onClearPinnedPreview,
    onJumpToPinnedPreview: args.onJumpToPinnedPreview,
    onApplyPinnedPreviewSeed: args.onApplyPinnedPreviewSeed,
  };
}

export function createAiImagePreviewPaneProps(args: PreviewPaneProps): PreviewPaneProps {
  return args;
}

export function createAiImageHistoryPaneProps(args: {
  history: HistoryPaneProps["history"];
  mode: HistoryPaneProps["mode"];
  currentResultCards: HistoryPaneProps["currentResultCards"];
  archivedHistoryRows: HistoryPaneProps["archivedHistoryRows"];
  selectedHistoryPreviewKey: HistoryPaneProps["selectedHistoryPreviewKey"];
  selectedResultIndex: HistoryPaneProps["selectedResultIndex"];
  directorInputPreview: PreviewPaneProps["directorInputPreview"];
  isHistoryExpanded: HistoryPaneProps["isHistoryExpanded"];
  onHistoryExpandedChange: HistoryPaneProps["onHistoryExpandedChange"];
  onSelectCurrentResult: HistoryPaneProps["onSelectCurrentResult"];
  onHistoryRowClick: HistoryPaneProps["onHistoryRowClick"];
  onHistoryImageDragStart: HistoryPaneProps["onHistoryImageDragStart"];
  onDeleteHistoryRow: HistoryPaneProps["onDeleteHistoryRow"];
  onDownloadAll: HistoryPaneProps["onDownloadAll"];
  onClearHistory: HistoryPaneProps["onClearHistory"];
}): HistoryPaneProps {
  return {
    history: args.history,
    mode: args.mode,
    currentResultCards: args.currentResultCards,
    archivedHistoryRows: args.archivedHistoryRows,
    selectedHistoryPreviewKey: args.selectedHistoryPreviewKey,
    selectedResultIndex: args.selectedResultIndex,
    directorInputPreviewKey: args.directorInputPreview ? generatedItemKey(args.directorInputPreview) : undefined,
    isHistoryExpanded: args.isHistoryExpanded,
    onHistoryExpandedChange: args.onHistoryExpandedChange,
    onSelectCurrentResult: args.onSelectCurrentResult,
    onHistoryRowClick: args.onHistoryRowClick,
    onHistoryImageDragStart: args.onHistoryImageDragStart,
    onDeleteHistoryRow: args.onDeleteHistoryRow,
    onDownloadAll: args.onDownloadAll,
    onClearHistory: args.onClearHistory,
  };
}

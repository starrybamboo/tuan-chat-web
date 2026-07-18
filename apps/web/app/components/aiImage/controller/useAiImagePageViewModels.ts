import type { ComponentProps } from "react";

import type { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import type { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";

import { generatedItemKey } from "@/components/aiImage/helpers";

type PreviewPaneProps = ComponentProps<typeof AiImagePreviewPane>;
type HistoryPaneProps = Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;

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
  onCurrentResultCardClick: HistoryPaneProps["onCurrentResultCardClick"];
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
    onCurrentResultCardClick: args.onCurrentResultCardClick,
    onHistoryRowClick: args.onHistoryRowClick,
    onHistoryImageDragStart: args.onHistoryImageDragStart,
    onDeleteHistoryRow: args.onDeleteHistoryRow,
    onDownloadAll: args.onDownloadAll,
    onClearHistory: args.onClearHistory,
  };
}
